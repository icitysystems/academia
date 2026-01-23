import {
	Injectable,
	NotFoundException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
	CreateQuizInput,
	UpdateQuizInput,
	QuizFilterInput,
	CreateQuizQuestionInput,
	UpdateQuizQuestionInput,
	StartAttemptInput,
	SubmitResponseInput,
	SubmitAttemptInput,
	GradeAttemptInput,
} from "./dto/quiz.dto";

@Injectable()
export class QuizzesService {
	constructor(private prisma: PrismaService) {}

	// ========== Quiz Management ==========

	async createQuiz(createdById: string, input: CreateQuizInput) {
		return this.prisma.onlineQuiz.create({
			data: {
				lessonId: input.lessonId,
				classSubjectId: input.classSubjectId,
				title: input.title,
				description: input.description,
				instructions: input.instructions,
				createdById,
				type: input.type || "QUIZ",
				totalMarks: input.totalMarks,
				passingMarks: input.passingMarks,
				duration: input.duration,
				maxAttempts: input.maxAttempts || 1,
				shuffleQuestions: input.shuffleQuestions || false,
				shuffleOptions: input.shuffleOptions || false,
				showResults: input.showResults || "IMMEDIATELY",
				showCorrectAnswers: input.showCorrectAnswers !== false,
				showFeedback: input.showFeedback !== false,
				availableFrom: input.availableFrom,
				availableUntil: input.availableUntil,
				accessCode: input.accessCode,
				status: "DRAFT",
			},
		});
	}

	async updateQuiz(quizId: string, userId: string, input: UpdateQuizInput) {
		const quiz = await this.prisma.onlineQuiz.findUnique({
			where: { id: quizId },
		});

		if (!quiz) {
			throw new NotFoundException("Quiz not found");
		}
		if (quiz.createdById !== userId) {
			throw new ForbiddenException("Not authorized to update this quiz");
		}

		return this.prisma.onlineQuiz.update({
			where: { id: quizId },
			data: {
				title: input.title,
				description: input.description,
				instructions: input.instructions,
				type: input.type,
				totalMarks: input.totalMarks,
				passingMarks: input.passingMarks,
				duration: input.duration,
				maxAttempts: input.maxAttempts,
				shuffleQuestions: input.shuffleQuestions,
				shuffleOptions: input.shuffleOptions,
				showResults: input.showResults,
				showCorrectAnswers: input.showCorrectAnswers,
				showFeedback: input.showFeedback,
				availableFrom: input.availableFrom,
				availableUntil: input.availableUntil,
				accessCode: input.accessCode,
				status: input.status,
			},
		});
	}

	async deleteQuiz(quizId: string, userId: string) {
		const quiz = await this.prisma.onlineQuiz.findUnique({
			where: { id: quizId },
		});

		if (!quiz) {
			throw new NotFoundException("Quiz not found");
		}
		if (quiz.createdById !== userId) {
			throw new ForbiddenException("Not authorized to delete this quiz");
		}

		// Check for attempts
		const attemptCount = await this.prisma.quizAttempt.count({
			where: { quizId },
		});

		if (attemptCount > 0) {
			throw new BadRequestException(
				"Cannot delete quiz with attempts. Archive it instead.",
			);
		}

		await this.prisma.onlineQuiz.delete({ where: { id: quizId } });
		return true;
	}

	async publishQuiz(quizId: string, userId: string) {
		const quiz = await this.prisma.onlineQuiz.findUnique({
			where: { id: quizId },
			include: { _count: { select: { questions: true } } },
		});

		if (!quiz) {
			throw new NotFoundException("Quiz not found");
		}
		if (quiz.createdById !== userId) {
			throw new ForbiddenException("Not authorized to publish this quiz");
		}
		if (quiz._count.questions === 0) {
			throw new BadRequestException("Cannot publish quiz without questions");
		}

		return this.prisma.onlineQuiz.update({
			where: { id: quizId },
			data: { status: "PUBLISHED" },
		});
	}

	async closeQuiz(quizId: string, userId: string) {
		const quiz = await this.prisma.onlineQuiz.findUnique({
			where: { id: quizId },
		});

		if (!quiz) {
			throw new NotFoundException("Quiz not found");
		}
		if (quiz.createdById !== userId) {
			throw new ForbiddenException("Not authorized to close this quiz");
		}

		return this.prisma.onlineQuiz.update({
			where: { id: quizId },
			data: { status: "CLOSED" },
		});
	}

	async getQuiz(quizId: string) {
		const quiz = await this.prisma.onlineQuiz.findUnique({
			where: { id: quizId },
			include: {
				questions: { orderBy: { orderIndex: "asc" } },
				_count: { select: { questions: true, attempts: true } },
			},
		});

		if (!quiz) {
			throw new NotFoundException("Quiz not found");
		}

		return {
			...quiz,
			totalQuestions: quiz._count.questions,
		};
	}

	async getQuizzes(filter: QuizFilterInput, createdById?: string) {
		const where: any = {};

		if (filter.search) {
			where.OR = [
				{ title: { contains: filter.search, mode: "insensitive" } },
				{ description: { contains: filter.search, mode: "insensitive" } },
			];
		}

		if (filter.classSubjectId) where.classSubjectId = filter.classSubjectId;
		if (filter.lessonId) where.lessonId = filter.lessonId;
		if (filter.type) where.type = filter.type;
		if (filter.status) where.status = filter.status;
		if (createdById) where.createdById = createdById;

		const page = filter.page || 1;
		const pageSize = filter.pageSize || 10;

		const [quizzes, total] = await Promise.all([
			this.prisma.onlineQuiz.findMany({
				where,
				include: {
					_count: { select: { questions: true } },
				},
				skip: (page - 1) * pageSize,
				take: pageSize,
				orderBy: { createdAt: "desc" },
			}),
			this.prisma.onlineQuiz.count({ where }),
		]);

		return {
			quizzes: quizzes.map((q) => ({
				...q,
				totalQuestions: q._count.questions,
			})),
			total,
			page,
			pageSize,
		};
	}

	async getMyQuizzes(createdById: string, filter: QuizFilterInput) {
		return this.getQuizzes(filter, createdById);
	}

	// ========== Question Management ==========

	async addQuestion(userId: string, input: CreateQuizQuestionInput) {
		const quiz = await this.prisma.onlineQuiz.findUnique({
			where: { id: input.quizId },
		});

		if (!quiz) {
			throw new NotFoundException("Quiz not found");
		}
		if (quiz.createdById !== userId) {
			throw new ForbiddenException("Not authorized to add questions");
		}

		return this.prisma.quizQuestion.create({
			data: {
				quizId: input.quizId,
				type: input.type,
				questionText: input.questionText,
				questionMedia: input.questionMedia,
				options: input.options,
				correctAnswer: input.correctAnswer,
				explanation: input.explanation,
				marks: input.marks,
				negativeMarks: input.negativeMarks || 0,
				difficulty: input.difficulty || "MEDIUM",
				topic: input.topic,
				orderIndex: input.orderIndex,
				isRequired: input.isRequired !== false,
			},
		});
	}

	async updateQuestion(
		questionId: string,
		userId: string,
		input: UpdateQuizQuestionInput,
	) {
		const question = await this.prisma.quizQuestion.findUnique({
			where: { id: questionId },
			include: { quiz: true },
		});

		if (!question) {
			throw new NotFoundException("Question not found");
		}
		if (question.quiz.createdById !== userId) {
			throw new ForbiddenException("Not authorized to update this question");
		}

		return this.prisma.quizQuestion.update({
			where: { id: questionId },
			data: {
				type: input.type,
				questionText: input.questionText,
				questionMedia: input.questionMedia,
				options: input.options,
				correctAnswer: input.correctAnswer,
				explanation: input.explanation,
				marks: input.marks,
				negativeMarks: input.negativeMarks,
				difficulty: input.difficulty,
				topic: input.topic,
				orderIndex: input.orderIndex,
				isRequired: input.isRequired,
			},
		});
	}

	async deleteQuestion(questionId: string, userId: string) {
		const question = await this.prisma.quizQuestion.findUnique({
			where: { id: questionId },
			include: { quiz: true },
		});

		if (!question) {
			throw new NotFoundException("Question not found");
		}
		if (question.quiz.createdById !== userId) {
			throw new ForbiddenException("Not authorized to delete this question");
		}

		await this.prisma.quizQuestion.delete({ where: { id: questionId } });
		return true;
	}

	async reorderQuestions(
		quizId: string,
		userId: string,
		questionIds: string[],
	) {
		const quiz = await this.prisma.onlineQuiz.findUnique({
			where: { id: quizId },
		});

		if (!quiz) {
			throw new NotFoundException("Quiz not found");
		}
		if (quiz.createdById !== userId) {
			throw new ForbiddenException("Not authorized to reorder questions");
		}

		// Update order index for each question
		const updates = questionIds.map((id, index) =>
			this.prisma.quizQuestion.update({
				where: { id },
				data: { orderIndex: index },
			}),
		);

		await this.prisma.$transaction(updates);
		return true;
	}

	// ========== Quiz Taking ==========

	async startAttempt(studentId: string, input: StartAttemptInput) {
		const quiz = await this.prisma.onlineQuiz.findUnique({
			where: { id: input.quizId },
			include: { questions: true },
		});

		if (!quiz) {
			throw new NotFoundException("Quiz not found");
		}
		if (quiz.status !== "PUBLISHED") {
			throw new BadRequestException("Quiz is not available");
		}

		// Check access code
		if (quiz.accessCode && quiz.accessCode !== input.accessCode) {
			throw new ForbiddenException("Invalid access code");
		}

		// Check availability window
		const now = new Date();
		if (quiz.availableFrom && now < quiz.availableFrom) {
			throw new BadRequestException("Quiz is not yet available");
		}
		if (quiz.availableUntil && now > quiz.availableUntil) {
			throw new BadRequestException("Quiz is no longer available");
		}

		// Check max attempts
		const existingAttempts = await this.prisma.quizAttempt.count({
			where: { quizId: input.quizId, studentId },
		});

		if (existingAttempts >= quiz.maxAttempts) {
			throw new BadRequestException("Maximum attempts reached");
		}

		// Check for in-progress attempt
		const inProgress = await this.prisma.quizAttempt.findFirst({
			where: {
				quizId: input.quizId,
				studentId,
				status: "IN_PROGRESS",
			},
		});

		if (inProgress) {
			return inProgress;
		}

		// Create new attempt
		const maxScore = quiz.questions.reduce((sum, q) => sum + q.marks, 0);

		return this.prisma.quizAttempt.create({
			data: {
				quizId: input.quizId,
				studentId,
				enrollmentId: input.enrollmentId,
				attemptNumber: existingAttempts + 1,
				status: "IN_PROGRESS",
				maxScore,
			},
			include: {
				quiz: {
					include: {
						questions: {
							orderBy: quiz.shuffleQuestions
								? undefined
								: { orderIndex: "asc" },
						},
					},
				},
			},
		});
	}

	async submitResponse(studentId: string, input: SubmitResponseInput) {
		const attempt = await this.prisma.quizAttempt.findUnique({
			where: { id: input.attemptId },
			include: { quiz: true },
		});

		if (!attempt) {
			throw new NotFoundException("Attempt not found");
		}
		if (attempt.studentId !== studentId) {
			throw new ForbiddenException("Not your attempt");
		}
		if (attempt.status !== "IN_PROGRESS") {
			throw new BadRequestException("Attempt already submitted");
		}

		// Get question to check answer
		const question = await this.prisma.quizQuestion.findUnique({
			where: { id: input.questionId },
		});

		if (!question) {
			throw new NotFoundException("Question not found");
		}

		// Auto-grade if possible (MCQ, true/false)
		let isCorrect: boolean | undefined;
		let marksAwarded: number | undefined;

		if (question.correctAnswer && input.response) {
			if (["MCQ", "TRUE_FALSE"].includes(question.type)) {
				isCorrect = input.response === question.correctAnswer;
				marksAwarded = isCorrect
					? question.marks
					: question.negativeMarks > 0
					? -question.negativeMarks
					: 0;
			}
		}

		// Upsert response
		return this.prisma.quizResponse.upsert({
			where: {
				attemptId_questionId: {
					attemptId: input.attemptId,
					questionId: input.questionId,
				},
			},
			create: {
				attemptId: input.attemptId,
				questionId: input.questionId,
				response: input.response,
				isCorrect,
				marksAwarded,
				timeSpent: input.timeSpent,
				flagged: input.flagged || false,
			},
			update: {
				response: input.response,
				isCorrect,
				marksAwarded,
				timeSpent: input.timeSpent,
				flagged: input.flagged,
				answeredAt: new Date(),
			},
		});
	}

	async submitAttempt(studentId: string, input: SubmitAttemptInput) {
		const attempt = await this.prisma.quizAttempt.findUnique({
			where: { id: input.attemptId },
			include: {
				quiz: true,
				responses: true,
			},
		});

		if (!attempt) {
			throw new NotFoundException("Attempt not found");
		}
		if (attempt.studentId !== studentId) {
			throw new ForbiddenException("Not your attempt");
		}
		if (attempt.status !== "IN_PROGRESS") {
			throw new BadRequestException("Attempt already submitted");
		}

		// Calculate score
		const totalScore = attempt.responses.reduce(
			(sum, r) => sum + (r.marksAwarded || 0),
			0,
		);
		const maxScore = attempt.maxScore || 0;
		const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
		const passed = attempt.quiz.passingMarks
			? totalScore >= attempt.quiz.passingMarks
			: percentage >= 50;

		// Calculate time spent
		const timeSpent = Math.floor(
			(new Date().getTime() - attempt.startedAt.getTime()) / 1000,
		);

		return this.prisma.quizAttempt.update({
			where: { id: input.attemptId },
			data: {
				status: "SUBMITTED",
				submittedAt: new Date(),
				timeSpent,
				totalScore,
				percentage,
				passed,
			},
			include: {
				quiz: true,
				responses: { include: { question: true } },
			},
		});
	}

	async getAttempt(attemptId: string, userId: string) {
		const attempt = await this.prisma.quizAttempt.findUnique({
			where: { id: attemptId },
			include: {
				quiz: {
					include: { questions: { orderBy: { orderIndex: "asc" } } },
				},
				responses: { include: { question: true } },
			},
		});

		if (!attempt) {
			throw new NotFoundException("Attempt not found");
		}

		// Check access: student or quiz creator
		if (attempt.studentId !== userId && attempt.quiz.createdById !== userId) {
			throw new ForbiddenException("Access denied");
		}

		return attempt;
	}

	async getMyAttempts(studentId: string, quizId?: string) {
		const where: any = { studentId };
		if (quizId) where.quizId = quizId;

		return this.prisma.quizAttempt.findMany({
			where,
			include: { quiz: true },
			orderBy: { startedAt: "desc" },
		});
	}

	async getQuizAttempts(quizId: string, userId: string) {
		const quiz = await this.prisma.onlineQuiz.findUnique({
			where: { id: quizId },
		});

		if (!quiz) {
			throw new NotFoundException("Quiz not found");
		}
		if (quiz.createdById !== userId) {
			throw new ForbiddenException("Not authorized");
		}

		return this.prisma.quizAttempt.findMany({
			where: { quizId },
			include: { student: true },
			orderBy: { startedAt: "desc" },
		});
	}

	// ========== Grading ==========

	async gradeAttempt(graderId: string, input: GradeAttemptInput) {
		const attempt = await this.prisma.quizAttempt.findUnique({
			where: { id: input.attemptId },
			include: { quiz: true, responses: true },
		});

		if (!attempt) {
			throw new NotFoundException("Attempt not found");
		}
		if (attempt.quiz.createdById !== graderId) {
			throw new ForbiddenException("Not authorized to grade");
		}

		// Apply manual grades
		if (input.manualGrades) {
			for (const grade of input.manualGrades) {
				await this.prisma.quizResponse.update({
					where: { id: grade.responseId },
					data: {
						marksAwarded: grade.marksAwarded,
						feedback: grade.feedback,
						isCorrect: grade.marksAwarded > 0,
					},
				});
			}
		}

		// Recalculate score
		const responses = await this.prisma.quizResponse.findMany({
			where: { attemptId: input.attemptId },
		});

		const totalScore = responses.reduce(
			(sum, r) => sum + (r.marksAwarded || 0),
			0,
		);
		const maxScore = attempt.maxScore || 0;
		const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
		const passed = attempt.quiz.passingMarks
			? totalScore >= attempt.quiz.passingMarks
			: percentage >= 50;

		return this.prisma.quizAttempt.update({
			where: { id: input.attemptId },
			data: {
				status: "GRADED",
				totalScore,
				percentage,
				passed,
				feedback: input.feedback,
				gradedAt: new Date(),
				gradedById: graderId,
			},
			include: {
				quiz: true,
				responses: { include: { question: true } },
			},
		});
	}

	// ========== Statistics ==========

	async getQuizStats(quizId: string, userId: string) {
		const quiz = await this.prisma.onlineQuiz.findUnique({
			where: { id: quizId },
		});

		if (!quiz) {
			throw new NotFoundException("Quiz not found");
		}
		if (quiz.createdById !== userId) {
			throw new ForbiddenException("Not authorized");
		}

		const attempts = await this.prisma.quizAttempt.findMany({
			where: { quizId, status: { in: ["SUBMITTED", "GRADED"] } },
		});

		const totalAttempts = attempts.length;
		const totalPassed = attempts.filter((a) => a.passed).length;
		const scores = attempts.map((a) => a.totalScore || 0);
		const times = attempts.map((a) => a.timeSpent || 0);

		return {
			totalAttempts,
			totalPassed,
			averageScore:
				scores.length > 0
					? scores.reduce((a, b) => a + b, 0) / scores.length
					: 0,
			averageTimeSpent:
				times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
			passRate: totalAttempts > 0 ? (totalPassed / totalAttempts) * 100 : 0,
		};
	}
}
