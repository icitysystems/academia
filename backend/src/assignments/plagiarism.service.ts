import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma.service";
import * as crypto from "crypto";

export interface PlagiarismResult {
	submissionId: string;
	overallScore: number; // 0-100 (percentage of plagiarized content)
	matches: PlagiarismMatch[];
	checkTime: Date;
	status: "clean" | "suspicious" | "plagiarized";
}

export interface PlagiarismMatch {
	sourceType: "internal" | "external" | "web";
	sourceId?: string; // ID of matched submission if internal
	sourceName: string;
	similarity: number; // 0-100
	matchedText: string;
	matchedLength: number;
}

interface TextFingerprint {
	hash: string;
	ngrams: string[];
	wordCount: number;
}

@Injectable()
export class PlagiarismService {
	private readonly logger = new Logger(PlagiarismService.name);
	private readonly ngramSize = 5;
	private readonly similarityThreshold = 0.3; // 30% threshold for flagging

	constructor(
		private prisma: PrismaService,
		private configService: ConfigService,
	) {}

	/**
	 * Check a submission for plagiarism
	 */
	async checkSubmission(submissionId: string): Promise<PlagiarismResult> {
		const submission = await this.prisma.assignmentSubmission.findUnique({
			where: { id: submissionId },
			include: {
				assignment: true,
			},
		});

		if (!submission) {
			throw new Error("Submission not found");
		}

		const content = submission.content || "";
		if (!content.trim()) {
			return {
				submissionId,
				overallScore: 0,
				matches: [],
				checkTime: new Date(),
				status: "clean",
			};
		}

		const matches: PlagiarismMatch[] = [];

		// Check against other submissions for the same assignment
		const internalMatches = await this.checkInternalSimilarity(
			submissionId,
			submission.assignmentId,
			content,
		);
		matches.push(...internalMatches);

		// Check against database of all submissions (course-wide)
		const courseMatches = await this.checkCourseSimilarity(
			submissionId,
			submission.assignment.lessonId,
			content,
		);
		matches.push(...courseMatches);

		// Calculate overall score
		const overallScore = this.calculateOverallScore(matches, content);

		// Store the result
		await this.prisma.plagiarismCheck.upsert({
			where: { submissionId },
			create: {
				submissionId,
				score: overallScore,
				matches: JSON.stringify(matches),
				status: this.getStatus(overallScore),
			},
			update: {
				score: overallScore,
				matches: JSON.stringify(matches),
				status: this.getStatus(overallScore),
				checkedAt: new Date(),
			},
		});

		return {
			submissionId,
			overallScore,
			matches,
			checkTime: new Date(),
			status: this.getStatus(overallScore),
		};
	}

	/**
	 * Check similarity against other submissions for the same assignment
	 */
	private async checkInternalSimilarity(
		submissionId: string,
		assignmentId: string,
		content: string,
	): Promise<PlagiarismMatch[]> {
		const otherSubmissions = await this.prisma.assignmentSubmission.findMany({
			where: {
				assignmentId,
				id: { not: submissionId },
				content: { not: null },
			},
			include: {
				student: { select: { name: true } },
			},
		});

		const matches: PlagiarismMatch[] = [];
		const sourceFingerprint = this.createFingerprint(content);

		for (const other of otherSubmissions) {
			if (!other.content) continue;

			const targetFingerprint = this.createFingerprint(other.content);
			const similarity = this.calculateSimilarity(
				sourceFingerprint,
				targetFingerprint,
			);

			if (similarity >= this.similarityThreshold) {
				const matchedText = this.findMatchedText(content, other.content);
				matches.push({
					sourceType: "internal",
					sourceId: other.id,
					sourceName: `Submission by ${other.student?.name || "Unknown"}`,
					similarity: Math.round(similarity * 100),
					matchedText: matchedText.substring(0, 200),
					matchedLength: matchedText.length,
				});
			}
		}

		return matches;
	}

	/**
	 * Check similarity against other course submissions
	 */
	private async checkCourseSimilarity(
		submissionId: string,
		lessonId: string | null,
		content: string,
	): Promise<PlagiarismMatch[]> {
		if (!lessonId) return [];

		// Get the course for this lesson
		const lesson = await this.prisma.courseLesson.findUnique({
			where: { id: lessonId },
			include: {
				module: {
					include: { course: true },
				},
			},
		});

		if (!lesson?.module?.course) return [];

		// Find other assignments in the same course
		const courseAssignments = await this.prisma.assignment.findMany({
			where: {
				lesson: {
					module: {
						courseId: lesson.module.courseId,
					},
				},
				id: { not: lesson.id },
			},
			select: { id: true },
		});

		const assignmentIds = courseAssignments.map((a) => a.id);
		if (assignmentIds.length === 0) return [];

		// Get submissions from other assignments
		const otherSubmissions = await this.prisma.assignmentSubmission.findMany({
			where: {
				assignmentId: { in: assignmentIds },
				id: { not: submissionId },
				content: { not: null },
			},
			include: {
				assignment: { select: { title: true } },
			},
			take: 100, // Limit for performance
		});

		const matches: PlagiarismMatch[] = [];
		const sourceFingerprint = this.createFingerprint(content);

		for (const other of otherSubmissions) {
			if (!other.content) continue;

			const targetFingerprint = this.createFingerprint(other.content);
			const similarity = this.calculateSimilarity(
				sourceFingerprint,
				targetFingerprint,
			);

			if (similarity >= this.similarityThreshold * 1.5) {
				// Higher threshold for cross-assignment
				matches.push({
					sourceType: "internal",
					sourceId: other.id,
					sourceName: `${other.assignment.title}`,
					similarity: Math.round(similarity * 100),
					matchedText: this.findMatchedText(content, other.content).substring(
						0,
						200,
					),
					matchedLength: 0,
				});
			}
		}

		return matches;
	}

	/**
	 * Create a text fingerprint using n-grams
	 */
	private createFingerprint(text: string): TextFingerprint {
		const normalized = this.normalizeText(text);
		const words = normalized.split(/\s+/).filter((w) => w.length > 0);
		const ngrams: string[] = [];

		for (let i = 0; i <= words.length - this.ngramSize; i++) {
			const ngram = words.slice(i, i + this.ngramSize).join(" ");
			ngrams.push(ngram);
		}

		const hash = crypto.createHash("md5").update(normalized).digest("hex");

		return {
			hash,
			ngrams,
			wordCount: words.length,
		};
	}

	/**
	 * Normalize text for comparison
	 */
	private normalizeText(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^\w\s]/g, "") // Remove punctuation
			.replace(/\s+/g, " ") // Normalize whitespace
			.trim();
	}

	/**
	 * Calculate Jaccard similarity between two fingerprints
	 */
	private calculateSimilarity(
		fp1: TextFingerprint,
		fp2: TextFingerprint,
	): number {
		if (fp1.ngrams.length === 0 || fp2.ngrams.length === 0) {
			return 0;
		}

		const set1 = new Set(fp1.ngrams);
		const set2 = new Set(fp2.ngrams);

		const intersection = new Set([...set1].filter((x) => set2.has(x)));
		const union = new Set([...set1, ...set2]);

		return intersection.size / union.size;
	}

	/**
	 * Find the matched text between two documents
	 */
	private findMatchedText(text1: string, text2: string): string {
		const words1 = this.normalizeText(text1).split(/\s+/);
		const words2Set = new Set(this.normalizeText(text2).split(/\s+/));

		const matchedWords = words1.filter((w) => words2Set.has(w));
		return matchedWords.slice(0, 50).join(" ");
	}

	/**
	 * Calculate overall plagiarism score
	 */
	private calculateOverallScore(
		matches: PlagiarismMatch[],
		originalContent: string,
	): number {
		if (matches.length === 0) return 0;

		// Weighted average of similarities
		const maxSimilarity = Math.max(...matches.map((m) => m.similarity));
		const avgSimilarity =
			matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length;

		// Combine max and average (max has more weight)
		return Math.round(maxSimilarity * 0.7 + avgSimilarity * 0.3);
	}

	/**
	 * Determine status based on score
	 */
	private getStatus(score: number): "clean" | "suspicious" | "plagiarized" {
		if (score < 20) return "clean";
		if (score < 50) return "suspicious";
		return "plagiarized";
	}

	/**
	 * Get plagiarism report for a submission
	 */
	async getReport(submissionId: string): Promise<PlagiarismResult | null> {
		const check = await this.prisma.plagiarismCheck.findUnique({
			where: { submissionId },
		});

		if (!check) return null;

		return {
			submissionId,
			overallScore: check.score,
			matches: JSON.parse(check.matches || "[]"),
			checkTime: check.checkedAt,
			status: check.status as "clean" | "suspicious" | "plagiarized",
		};
	}

	/**
	 * Batch check multiple submissions
	 */
	async batchCheck(submissionIds: string[]): Promise<PlagiarismResult[]> {
		const results: PlagiarismResult[] = [];

		for (const id of submissionIds) {
			try {
				const result = await this.checkSubmission(id);
				results.push(result);
			} catch (error) {
				this.logger.error(`Failed to check submission ${id}: ${error}`);
			}
		}

		return results;
	}
}
