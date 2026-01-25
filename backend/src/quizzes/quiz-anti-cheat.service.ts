import { Injectable, Logger, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import * as crypto from "crypto";

export interface AntiCheatConfig {
	browserLockdown: boolean;
	tabSwitchLimit: number;
	copyPasteDisabled: boolean;
	rightClickDisabled: boolean;
	questionRandomization: boolean;
	optionRandomization: boolean;
	oneQuestionAtATime: boolean;
	timePerQuestion?: number; // seconds
	ipRestriction: boolean;
	webcamRequired: boolean;
	fullscreenRequired: boolean;
}

export interface AttemptViolation {
	type: string;
	timestamp: Date;
	details?: string;
	severity: "low" | "medium" | "high";
}

export interface AntiCheatSession {
	attemptId: string;
	startedAt: Date;
	ipAddress: string;
	userAgent: string;
	violations: AttemptViolation[];
	tabSwitchCount: number;
	suspicionScore: number;
	isTerminated: boolean;
}

@Injectable()
export class QuizAntiCheatService {
	private readonly logger = new Logger(QuizAntiCheatService.name);
	private activeSessions: Map<string, AntiCheatSession> = new Map();

	constructor(private prisma: PrismaService) {}

	/**
	 * Initialize anti-cheat session for a quiz attempt
	 */
	async initSession(
		attemptId: string,
		userId: string,
		quizId: string,
		ipAddress: string,
		userAgent: string,
	): Promise<AntiCheatSession> {
		// Check for concurrent sessions
		const existingAttempts = await this.prisma.quizAttempt.findMany({
			where: {
				quizId,
				studentId: userId,
				status: "IN_PROGRESS",
				id: { not: attemptId },
			},
		});

		if (existingAttempts.length > 0) {
			throw new ForbiddenException(
				"You already have an active quiz session. Complete it first.",
			);
		}

		// Check IP restrictions
		const quiz = await this.prisma.onlineQuiz.findUnique({
			where: { id: quizId },
		});

		if (quiz?.allowedIPs) {
			const allowedIPs: string[] = JSON.parse(quiz.allowedIPs);
			if (allowedIPs.length > 0 && !allowedIPs.includes(ipAddress)) {
				throw new ForbiddenException(
					"Access denied: Your IP address is not allowed for this quiz.",
				);
			}
		}

		const session: AntiCheatSession = {
			attemptId,
			startedAt: new Date(),
			ipAddress,
			userAgent,
			violations: [],
			tabSwitchCount: 0,
			suspicionScore: 0,
			isTerminated: false,
		};

		this.activeSessions.set(attemptId, session);

		// Store initial session data
		await this.prisma.quizAttempt.update({
			where: { id: attemptId },
			data: {
				ipAddress,
				userAgent,
				antiCheatData: JSON.stringify({
					sessionStart: session.startedAt,
					violations: [],
				}),
			},
		});

		return session;
	}

	/**
	 * Report a violation during quiz attempt
	 */
	async reportViolation(
		attemptId: string,
		type: string,
		details?: string,
	): Promise<{ terminated: boolean; warningMessage?: string }> {
		const session = this.activeSessions.get(attemptId);
		if (!session) {
			return { terminated: false };
		}

		const severity = this.getViolationSeverity(type);
		const violation: AttemptViolation = {
			type,
			timestamp: new Date(),
			details,
			severity,
		};

		session.violations.push(violation);

		// Update suspicion score
		const scoreIncrease = {
			low: 5,
			medium: 15,
			high: 30,
		}[severity];

		session.suspicionScore += scoreIncrease;

		// Handle specific violations
		if (type === "TAB_SWITCH") {
			session.tabSwitchCount++;
		}

		// Update database
		await this.prisma.quizAttempt.update({
			where: { id: attemptId },
			data: {
				antiCheatData: JSON.stringify({
					violations: session.violations,
					suspicionScore: session.suspicionScore,
					tabSwitchCount: session.tabSwitchCount,
				}),
			},
		});

		// Check if attempt should be terminated
		const config = await this.getQuizAntiCheatConfig(attemptId);

		if (
			session.suspicionScore >= 100 ||
			(config.tabSwitchLimit > 0 &&
				session.tabSwitchCount >= config.tabSwitchLimit)
		) {
			await this.terminateAttempt(attemptId, "Maximum violations exceeded");
			return {
				terminated: true,
				warningMessage:
					"Your quiz has been terminated due to suspected cheating.",
			};
		}

		// Generate warning message
		const warningsRemaining = Math.max(
			0,
			config.tabSwitchLimit - session.tabSwitchCount,
		);
		const warningMessage =
			session.tabSwitchCount > 0
				? `Warning: Tab switching detected. ${warningsRemaining} warnings remaining.`
				: undefined;

		return { terminated: false, warningMessage };
	}

	/**
	 * Terminate a quiz attempt due to cheating
	 */
	async terminateAttempt(attemptId: string, reason: string): Promise<void> {
		const session = this.activeSessions.get(attemptId);
		if (session) {
			session.isTerminated = true;
		}

		await this.prisma.quizAttempt.update({
			where: { id: attemptId },
			data: {
				status: "TERMINATED",
				submittedAt: new Date(),
				terminationReason: reason,
				antiCheatData: JSON.stringify({
					...(session || {}),
					terminatedAt: new Date(),
					terminationReason: reason,
				}),
			},
		});

		this.activeSessions.delete(attemptId);
		this.logger.warn(`Quiz attempt ${attemptId} terminated: ${reason}`);
	}

	/**
	 * Validate quiz submission integrity
	 */
	async validateSubmission(
		attemptId: string,
	): Promise<{ valid: boolean; flags: string[] }> {
		const attempt = await this.prisma.quizAttempt.findUnique({
			where: { id: attemptId },
			include: {
				responses: true,
				quiz: true,
			},
		});

		if (!attempt) {
			return { valid: false, flags: ["Attempt not found"] };
		}

		const flags: string[] = [];
		const session = this.activeSessions.get(attemptId);
		const antiCheatData = attempt.antiCheatData
			? JSON.parse(attempt.antiCheatData)
			: {};

		// Check timing anomalies
		if (attempt.startedAt && attempt.submittedAt) {
			const duration =
				(attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000;
			const expectedMin = (attempt.quiz.duration || 30) * 60 * 0.1; // 10% of time

			if (duration < expectedMin && attempt.responses.length > 5) {
				flags.push("Suspiciously fast completion");
			}
		}

		// Check response patterns
		const responseTimes: number[] = [];
		let prevTime: Date | null = null;

		for (const response of attempt.responses) {
			if (prevTime && response.answeredAt) {
				const timeDiff =
					(response.answeredAt.getTime() - prevTime.getTime()) / 1000;
				responseTimes.push(timeDiff);
			}
			prevTime = response.answeredAt;
		}

		// Check for uniform response times (possible bot)
		if (responseTimes.length > 5) {
			const avg =
				responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
			const variance =
				responseTimes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) /
				responseTimes.length;

			if (variance < 1 && avg < 5) {
				flags.push("Uniform response pattern detected");
			}
		}

		// Check violations
		const violations = antiCheatData.violations || session?.violations || [];
		if (violations.length > 3) {
			flags.push(`${violations.length} anti-cheat violations recorded`);
		}

		// Check IP consistency
		if (
			attempt.ipAddress &&
			session?.ipAddress &&
			attempt.ipAddress !== session.ipAddress
		) {
			flags.push("IP address changed during quiz");
		}

		return {
			valid: flags.length === 0,
			flags,
		};
	}

	/**
	 * Get shuffled questions for a quiz attempt
	 */
	async getShuffledQuestions(
		quizId: string,
		attemptId: string,
	): Promise<string[]> {
		const quiz = await this.prisma.onlineQuiz.findUnique({
			where: { id: quizId },
		});

		const questions = await this.prisma.quizQuestion.findMany({
			where: { quizId },
			select: { id: true, orderIndex: true },
			orderBy: { orderIndex: "asc" },
		});

		const questionIds = questions.map((q) => q.id);

		if (!quiz?.shuffleQuestions) {
			return questionIds;
		}

		// Use attempt ID as seed for consistent shuffling per attempt
		const seed = this.hashToNumber(attemptId);
		return this.seededShuffle(questionIds, seed);
	}

	/**
	 * Get shuffled options for a question
	 */
	async getShuffledOptions(
		questionId: string,
		attemptId: string,
	): Promise<string[]> {
		const question = await this.prisma.quizQuestion.findUnique({
			where: { id: questionId },
			include: { quiz: true },
		});

		if (!question) return [];

		const options: string[] = JSON.parse(question.options || "[]");

		if (!question.quiz.shuffleOptions) {
			return options;
		}

		// Use question + attempt ID as seed
		const seed = this.hashToNumber(questionId + attemptId);
		return this.seededShuffle(options, seed);
	}

	/**
	 * End session when quiz is submitted
	 */
	async endSession(attemptId: string): Promise<void> {
		this.activeSessions.delete(attemptId);
	}

	/**
	 * Get quiz anti-cheat configuration
	 */
	private async getQuizAntiCheatConfig(
		attemptId: string,
	): Promise<AntiCheatConfig> {
		const attempt = await this.prisma.quizAttempt.findUnique({
			where: { id: attemptId },
			include: { quiz: true },
		});

		if (!attempt?.quiz) {
			return this.getDefaultConfig();
		}

		const quiz = attempt.quiz;

		return {
			browserLockdown: quiz.browserLockdown || false,
			tabSwitchLimit: quiz.tabSwitchLimit || 3,
			copyPasteDisabled: quiz.copyPasteDisabled || true,
			rightClickDisabled: quiz.rightClickDisabled || true,
			questionRandomization: quiz.shuffleQuestions || false,
			optionRandomization: quiz.shuffleOptions || false,
			oneQuestionAtATime: quiz.oneQuestionAtATime || false,
			timePerQuestion: quiz.timePerQuestion || undefined,
			ipRestriction: !!quiz.allowedIPs,
			webcamRequired: quiz.webcamRequired || false,
			fullscreenRequired: quiz.fullscreenRequired || false,
		};
	}

	private getDefaultConfig(): AntiCheatConfig {
		return {
			browserLockdown: false,
			tabSwitchLimit: 3,
			copyPasteDisabled: true,
			rightClickDisabled: true,
			questionRandomization: false,
			optionRandomization: false,
			oneQuestionAtATime: false,
			ipRestriction: false,
			webcamRequired: false,
			fullscreenRequired: false,
		};
	}

	private getViolationSeverity(type: string): "low" | "medium" | "high" {
		const severityMap: Record<string, "low" | "medium" | "high"> = {
			TAB_SWITCH: "medium",
			COPY_ATTEMPT: "medium",
			PASTE_ATTEMPT: "high",
			RIGHT_CLICK: "low",
			PRINT_SCREEN: "high",
			FULLSCREEN_EXIT: "medium",
			WINDOW_BLUR: "low",
			DEVELOPER_TOOLS: "high",
			MULTIPLE_MONITORS: "medium",
			SCREEN_SHARE: "high",
		};

		return severityMap[type] || "low";
	}

	private hashToNumber(str: string): number {
		const hash = crypto.createHash("md5").update(str).digest("hex");
		return parseInt(hash.substring(0, 8), 16);
	}

	private seededShuffle<T>(array: T[], seed: number): T[] {
		const result = [...array];
		let m = result.length;
		let t: T;
		let i: number;

		const random = () => {
			seed = (seed * 9301 + 49297) % 233280;
			return seed / 233280;
		};

		while (m) {
			i = Math.floor(random() * m--);
			t = result[m];
			result[m] = result[i];
			result[i] = t;
		}

		return result;
	}
}
