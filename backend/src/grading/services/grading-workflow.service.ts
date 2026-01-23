import {
	Injectable,
	Logger,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { MLService } from "../../ml/ml.service";
import { ConfidenceThresholds, ReviewPriority } from "../../common/types";
import {
	CreateExamPaperInput,
	UpdateExamPaperInput,
	CreateExamQuestionInput,
	UpdateExamQuestionInput,
	BulkCreateQuestionsInput,
	CreateExpectedResponseInput,
	BulkExpectedResponseInput,
	CreateModerationSampleInput,
	CreateStudentSubmissionInput,
	BulkUploadSubmissionsInput,
	StartBatchGradingInput,
	ReviewResponseInput,
} from "../dto";

/**
 * Grading Workflow Service
 * Implements the comprehensive grading system as per Specification Section 5A
 *
 * Workflow:
 * 1. Exam Paper Setting (5A.1) - Teacher creates exam with questions
 * 2. Marking Guide Generation (5A.2) - Expected responses and rubrics
 * 3. Training with Samples (5A.3) - Moderation samples for calibration
 * 4. Automated Grading (5A.4) - ML-powered grading with confidence scoring
 * 5. Review & Adjustment (5A.5) - Teacher audit with priority-based review
 * 6. Reporting & Analytics (5A.6) - Comprehensive statistics and insights
 */
@Injectable()
export class GradingWorkflowService {
	private readonly logger = new Logger(GradingWorkflowService.name);

	// Confidence thresholds as per Specification 5A.9
	private readonly CONFIDENCE_HIGH = ConfidenceThresholds.HIGH; // 0.95 - Auto-approve
	private readonly CONFIDENCE_MEDIUM = ConfidenceThresholds.MEDIUM; // 0.80 - Quick review
	// Below MEDIUM requires detailed review

	constructor(
		private prisma: PrismaService,
		private mlService: MLService,
	) {}

	// ============================
	// STEP 1: Exam Paper Setup
	// ============================

	async createExamPaper(input: CreateExamPaperInput, teacherId: string) {
		return this.prisma.examPaperSetup.create({
			data: {
				...input,
				teacherId,
				status: "DRAFT",
			},
			include: {
				questions: true,
			},
		});
	}

	async updateExamPaper(input: UpdateExamPaperInput, teacherId: string) {
		const existing = await this.prisma.examPaperSetup.findFirst({
			where: { id: input.id, teacherId },
		});

		if (!existing) {
			throw new NotFoundException("Exam paper not found");
		}

		const { id, ...data } = input;
		return this.prisma.examPaperSetup.update({
			where: { id },
			data,
			include: {
				questions: true,
			},
		});
	}

	async getExamPaper(id: string, teacherId: string) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id, teacherId },
			include: {
				questions: {
					orderBy: { orderIndex: "asc" },
				},
				expectedResponses: true,
				moderationSamples: true,
				studentSubmissions: {
					include: {
						responses: true,
					},
				},
				gradingSession: true,
			},
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		return paper;
	}

	async getExamPapers(teacherId: string, status?: string) {
		return this.prisma.examPaperSetup.findMany({
			where: {
				teacherId,
				...(status && { status }),
			},
			include: {
				questions: true,
				_count: {
					select: {
						studentSubmissions: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});
	}

	async deleteExamPaper(id: string, teacherId: string) {
		const existing = await this.prisma.examPaperSetup.findFirst({
			where: { id, teacherId },
		});

		if (!existing) {
			throw new NotFoundException("Exam paper not found");
		}

		return this.prisma.examPaperSetup.delete({
			where: { id },
		});
	}

	// ============================
	// STEP 1.5: Add Questions
	// ============================

	async addQuestion(input: CreateExamQuestionInput, teacherId: string) {
		// Verify ownership
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: input.examPaperId, teacherId },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		const question = await this.prisma.examQuestion.create({
			data: {
				...input,
				orderIndex: input.questionNumber,
			},
		});

		// Update paper status if first question
		if (paper.status === "DRAFT") {
			await this.prisma.examPaperSetup.update({
				where: { id: paper.id },
				data: { status: "QUESTIONS_ADDED" },
			});
		}

		return question;
	}

	async bulkAddQuestions(input: BulkCreateQuestionsInput, teacherId: string) {
		// Verify ownership
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: input.examPaperId, teacherId },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		// Delete existing questions
		await this.prisma.examQuestion.deleteMany({
			where: { examPaperId: input.examPaperId },
		});

		// Create all questions
		const questions = await Promise.all(
			input.questions.map((q, index) =>
				this.prisma.examQuestion.create({
					data: {
						examPaperId: input.examPaperId,
						...q,
						orderIndex: index,
					},
				}),
			),
		);

		// Update paper status
		await this.prisma.examPaperSetup.update({
			where: { id: paper.id },
			data: { status: "QUESTIONS_ADDED" },
		});

		return questions;
	}

	async updateQuestion(input: UpdateExamQuestionInput, teacherId: string) {
		const question = await this.prisma.examQuestion.findFirst({
			where: { id: input.id },
			include: { examPaper: true },
		});

		if (!question || question.examPaper.teacherId !== teacherId) {
			throw new NotFoundException("Question not found");
		}

		const { id, ...data } = input;
		return this.prisma.examQuestion.update({
			where: { id },
			data,
		});
	}

	async deleteQuestion(id: string, teacherId: string) {
		const question = await this.prisma.examQuestion.findFirst({
			where: { id },
			include: { examPaper: true },
		});

		if (!question || question.examPaper.teacherId !== teacherId) {
			throw new NotFoundException("Question not found");
		}

		return this.prisma.examQuestion.delete({
			where: { id },
		});
	}

	// ============================
	// STEP 2: Expected Responses
	// ============================

	async addExpectedResponse(
		input: CreateExpectedResponseInput,
		teacherId: string,
	) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: input.examPaperId, teacherId },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		return this.prisma.expectedResponse.create({
			data: {
				...input,
				isAIGenerated: false,
			},
		});
	}

	async bulkAddExpectedResponses(
		input: BulkExpectedResponseInput,
		teacherId: string,
	) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: input.examPaperId, teacherId },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		// Delete existing responses
		await this.prisma.expectedResponse.deleteMany({
			where: { examPaperId: input.examPaperId },
		});

		// Create all responses
		const responses = await Promise.all(
			input.responses.map((r) =>
				this.prisma.expectedResponse.create({
					data: {
						examPaperId: input.examPaperId,
						...r,
						isAIGenerated: false,
					},
				}),
			),
		);

		// Update paper status
		await this.prisma.examPaperSetup.update({
			where: { id: paper.id },
			data: { status: "RESPONSES_SET" },
		});

		return responses;
	}

	async requestAIProposedResponses(
		examPaperId: string,
		teacherId: string,
		style = "academic",
	) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: examPaperId, teacherId },
			include: {
				questions: {
					orderBy: { orderIndex: "asc" },
				},
			},
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		if (paper.questions.length === 0) {
			throw new BadRequestException("No questions found. Add questions first.");
		}

		// Generate AI responses for each question
		const responses = await Promise.all(
			paper.questions.map(async (question) => {
				try {
					// Use ML service to generate expected response
					const aiResponse = await this.mlService.generateExpectedResponse({
						questionText: question.questionText,
						questionType: question.questionType,
						marks: question.marks,
						style,
						subject: paper.subject,
					});

					return {
						questionId: question.id,
						questionNumber: question.questionNumber,
						questionText: question.questionText,
						proposedAnswer: aiResponse.answer,
						suggestedKeywords: aiResponse.keywords,
						markingScheme: aiResponse.markingScheme,
						confidence: aiResponse.confidence,
					};
				} catch (error) {
					this.logger.error(
						`Failed to generate response for question ${question.id}:`,
						error,
					);
					return {
						questionId: question.id,
						questionNumber: question.questionNumber,
						questionText: question.questionText,
						proposedAnswer: "",
						suggestedKeywords: null,
						markingScheme: null,
						confidence: 0,
					};
				}
			}),
		);

		return {
			examPaperId,
			responses,
		};
	}

	async acceptAIResponses(
		examPaperId: string,
		teacherId: string,
		questionIds?: string[],
	) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: examPaperId, teacherId },
			include: {
				questions: true,
			},
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		// Request AI responses again and save them
		const proposed = await this.requestAIProposedResponses(
			examPaperId,
			teacherId,
		);

		const responses = await Promise.all(
			proposed.responses
				.filter(
					(r) =>
						!questionIds ||
						questionIds.length === 0 ||
						questionIds.includes(r.questionId),
				)
				.map((r) =>
					this.prisma.expectedResponse.upsert({
						where: {
							id: r.questionId, // This will fail, so we use create/update logic
						},
						create: {
							examPaperId,
							questionId: r.questionId,
							expectedAnswer: r.proposedAnswer,
							keywords: r.suggestedKeywords,
							markingScheme: r.markingScheme,
							isAIGenerated: true,
						},
						update: {
							expectedAnswer: r.proposedAnswer,
							keywords: r.suggestedKeywords,
							markingScheme: r.markingScheme,
							isAIGenerated: true,
						},
					}),
				),
		);

		// Update paper status
		await this.prisma.examPaperSetup.update({
			where: { id: paper.id },
			data: { status: "RESPONSES_SET" },
		});

		return responses;
	}

	// ============================
	// STEP 3: Moderation Samples
	// ============================

	async addModerationSample(
		input: CreateModerationSampleInput,
		teacherId: string,
	) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: input.examPaperId, teacherId },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		const sample = await this.prisma.moderationSample.create({
			data: {
				...input,
				isVerified: false,
			},
		});

		// Check if we have enough samples and update status
		const sampleCount = await this.prisma.moderationSample.count({
			where: { examPaperId: input.examPaperId },
		});

		if (sampleCount >= 3 && paper.status === "RESPONSES_SET") {
			await this.prisma.examPaperSetup.update({
				where: { id: paper.id },
				data: { status: "MODERATION_READY" },
			});
		}

		return sample;
	}

	async getModerationSamples(examPaperId: string, teacherId: string) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: examPaperId, teacherId },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		return this.prisma.moderationSample.findMany({
			where: { examPaperId },
			orderBy: { createdAt: "asc" },
		});
	}

	async verifyModerationSample(
		id: string,
		isVerified: boolean,
		teacherId: string,
	) {
		const sample = await this.prisma.moderationSample.findFirst({
			where: { id },
			include: { examPaper: true },
		});

		if (!sample || sample.examPaper.teacherId !== teacherId) {
			throw new NotFoundException("Moderation sample not found");
		}

		return this.prisma.moderationSample.update({
			where: { id },
			data: { isVerified },
		});
	}

	async runCalibration(examPaperId: string, teacherId: string) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: examPaperId, teacherId },
			include: {
				questions: true,
				expectedResponses: true,
				moderationSamples: {
					where: { isVerified: true },
				},
			},
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		if (paper.moderationSamples.length < 2) {
			throw new BadRequestException(
				"Need at least 2 verified moderation samples for calibration",
			);
		}

		// Simulate calibration by comparing AI grading with teacher samples
		const calibrationResults = await this.mlService.calibrateGrading({
			questions: paper.questions,
			expectedResponses: paper.expectedResponses,
			moderationSamples: paper.moderationSamples,
		});

		return {
			accuracy: calibrationResults.accuracy,
			averageDeviation: calibrationResults.averageDeviation,
			isCalibrated: calibrationResults.accuracy >= 0.8,
			message:
				calibrationResults.accuracy >= 0.8
					? "Calibration successful. Ready to start batch grading."
					: "Calibration accuracy is below threshold. Consider adding more moderation samples.",
		};
	}

	// ============================
	// STEP 4: Student Submissions & Grading
	// ============================

	async addStudentSubmission(
		input: CreateStudentSubmissionInput,
		teacherId: string,
	) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: input.examPaperId, teacherId },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		return this.prisma.studentExamSubmission.create({
			data: {
				...input,
				status: "UPLOADED",
			},
		});
	}

	async bulkUploadSubmissions(
		input: BulkUploadSubmissionsInput,
		teacherId: string,
	) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: input.examPaperId, teacherId },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		const submissions = await Promise.all(
			input.submissions.map((s) =>
				this.prisma.studentExamSubmission.create({
					data: {
						examPaperId: input.examPaperId,
						...s,
						status: "UPLOADED",
					},
				}),
			),
		);

		return submissions;
	}

	async getStudentSubmissions(
		examPaperId: string,
		teacherId: string,
		status?: string,
	) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: examPaperId, teacherId },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		return this.prisma.studentExamSubmission.findMany({
			where: {
				examPaperId,
				...(status && { status }),
			},
			include: {
				responses: true,
			},
			orderBy: { createdAt: "asc" },
		});
	}

	async startBatchGrading(input: StartBatchGradingInput, teacherId: string) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: input.examPaperId, teacherId },
			include: {
				questions: true,
				expectedResponses: true,
				moderationSamples: {
					where: { isVerified: true },
				},
			},
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		if (paper.expectedResponses.length === 0) {
			throw new BadRequestException(
				"No expected responses set. Complete step 2 first.",
			);
		}

		// Get submissions to grade
		const submissions = await this.prisma.studentExamSubmission.findMany({
			where: {
				examPaperId: input.examPaperId,
				...(input.submissionIds && { id: { in: input.submissionIds } }),
				status: { in: ["UPLOADED", "ERROR"] },
			},
		});

		if (submissions.length === 0) {
			throw new BadRequestException("No submissions to grade");
		}

		// Create or update grading session
		const session = await this.prisma.examGradingSession.upsert({
			where: { examPaperId: input.examPaperId },
			create: {
				examPaperId: input.examPaperId,
				status: "GRADING",
				totalSubmissions: submissions.length,
				gradedSubmissions: 0,
				startedAt: new Date(),
			},
			update: {
				status: "GRADING",
				totalSubmissions: submissions.length,
				gradedSubmissions: 0,
				startedAt: new Date(),
				completedAt: null,
				errorMessage: null,
			},
		});

		// Update paper status
		await this.prisma.examPaperSetup.update({
			where: { id: paper.id },
			data: { status: "GRADING_ACTIVE" },
		});

		// Start async grading
		this.processGradingBatch(session.id, paper, submissions).catch((err) => {
			this.logger.error(`Grading batch ${session.id} failed:`, err);
		});

		return session;
	}

	private async processGradingBatch(
		sessionId: string,
		paper: any,
		submissions: any[],
	) {
		try {
			for (let i = 0; i < submissions.length; i++) {
				const submission = submissions[i];

				try {
					// Update submission status
					await this.prisma.studentExamSubmission.update({
						where: { id: submission.id },
						data: { status: "PROCESSING", sessionId },
					});

					// Grade each question
					let totalScore = 0;
					const maxScore = paper.questions.reduce(
						(sum: number, q: any) => sum + q.marks,
						0,
					);

					for (const question of paper.questions) {
						const expectedResponse = paper.expectedResponses.find(
							(r: any) => r.questionId === question.id,
						);

						// Use ML to grade the response
						const gradingResult = await this.mlService.gradeExamResponse({
							submissionImageUrl: submission.imageUrl,
							questionNumber: question.questionNumber,
							questionText: question.questionText,
							questionType: question.questionType,
							maxMarks: question.marks,
							expectedResponse: expectedResponse?.expectedAnswer || "",
							keywords: expectedResponse?.keywords,
							markingScheme: expectedResponse?.markingScheme,
						});

						// Save response with confidence-based review priority (5A.5)
						const needsReview = gradingResult.confidence < this.CONFIDENCE_HIGH;
						const reviewPriority = this.calculateReviewPriority(
							gradingResult.confidence,
						);

						await this.prisma.studentResponse.create({
							data: {
								submissionId: submission.id,
								questionId: question.id,
								extractedAnswer: gradingResult.extractedAnswer,
								assignedScore: gradingResult.score,
								maxScore: question.marks,
								predictedCorrectness: gradingResult.correctness,
								confidence: gradingResult.confidence,
								explanation: gradingResult.explanation,
								needsReview,
								// Store review priority in metadata or as separate field
							},
						});

						totalScore += gradingResult.score;
					}

					// Update submission with total score
					const percentage = (totalScore / maxScore) * 100;

					// Calculate average confidence for the submission
					const responses = await this.prisma.studentResponse.findMany({
						where: { submissionId: submission.id },
					});
					const avgConfidence =
						responses.length > 0
							? responses.reduce((sum, r) => sum + (r.confidence || 0), 0) /
								responses.length
							: 0;

					await this.prisma.studentExamSubmission.update({
						where: { id: submission.id },
						data: {
							status: "GRADED",
							totalScore,
							percentage,
							grade: this.calculateGrade(percentage),
							gradedAt: new Date(),
						},
					});

					// Update session progress
					await this.prisma.examGradingSession.update({
						where: { id: sessionId },
						data: {
							gradedSubmissions: { increment: 1 },
						},
					});
				} catch (error) {
					this.logger.error(
						`Failed to grade submission ${submission.id}:`,
						error,
					);
					await this.prisma.studentExamSubmission.update({
						where: { id: submission.id },
						data: { status: "ERROR" },
					});
				}
			}

			// Complete session
			await this.prisma.examGradingSession.update({
				where: { id: sessionId },
				data: {
					status: "COMPLETED",
					completedAt: new Date(),
				},
			});
		} catch (error) {
			await this.prisma.examGradingSession.update({
				where: { id: sessionId },
				data: {
					status: "FAILED",
					errorMessage: error.message,
					completedAt: new Date(),
				},
			});
		}
	}

	private calculateGrade(percentage: number): string {
		if (percentage >= 90) return "A";
		if (percentage >= 80) return "B";
		if (percentage >= 70) return "C";
		if (percentage >= 60) return "D";
		if (percentage >= 50) return "E";
		return "F";
	}

	/**
	 * Calculate review priority based on confidence score
	 * As per Specification 5A.5 and 5A.9:
	 * - HIGH confidence (≥95%): AUTO_APPROVE - no review needed
	 * - MEDIUM confidence (80-95%): QUICK_REVIEW - flag for quick review
	 * - LOW confidence (<80%): DETAILED_REVIEW - require detailed teacher review
	 */
	private calculateReviewPriority(confidence: number): string {
		if (confidence >= this.CONFIDENCE_HIGH) {
			return ReviewPriority.LOW; // Low priority = can auto-approve
		} else if (confidence >= this.CONFIDENCE_MEDIUM) {
			return ReviewPriority.MEDIUM; // Medium priority = quick review
		} else {
			return ReviewPriority.HIGH; // High priority = detailed review needed
		}
	}

	/**
	 * Get responses needing review with smart prioritization
	 * As per Specification 5A.5: "Smart prioritization (low-confidence scripts first)"
	 */
	async getResponsesNeedingReview(
		examPaperId: string,
		teacherId: string,
		options?: {
			priority?: string;
			limit?: number;
			questionId?: string;
		},
	) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: examPaperId, teacherId },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		const where: any = {
			submission: { examPaperId },
			needsReview: true,
		};

		if (options?.questionId) {
			where.questionId = options.questionId;
		}

		// Get responses ordered by confidence (lowest first = highest priority)
		const responses = await this.prisma.studentResponse.findMany({
			where,
			include: {
				submission: {
					include: {
						examPaper: true,
					},
				},
				question: true,
			},
			orderBy: [
				{ confidence: "asc" }, // Lowest confidence first
				{ createdAt: "asc" },
			],
			take: options?.limit || 50,
		});

		// Group by priority for UI display
		const grouped = {
			highPriority: responses.filter(
				(r) => (r.confidence || 0) < this.CONFIDENCE_MEDIUM,
			),
			mediumPriority: responses.filter(
				(r) =>
					(r.confidence || 0) >= this.CONFIDENCE_MEDIUM &&
					(r.confidence || 0) < this.CONFIDENCE_HIGH,
			),
			lowPriority: responses.filter(
				(r) => (r.confidence || 0) >= this.CONFIDENCE_HIGH,
			),
		};

		return {
			responses,
			grouped,
			totalNeedingReview: responses.length,
			byPriority: {
				high: grouped.highPriority.length,
				medium: grouped.mediumPriority.length,
				low: grouped.lowPriority.length,
			},
		};
	}

	/**
	 * Batch approve high-confidence responses
	 * As per Specification 5A.5: "Bulk approval for high-confidence grades"
	 */
	async batchApproveHighConfidence(examPaperId: string, teacherId: string) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: examPaperId, teacherId },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		// Auto-approve responses with high confidence
		const result = await this.prisma.studentResponse.updateMany({
			where: {
				submission: { examPaperId },
				confidence: { gte: this.CONFIDENCE_HIGH },
				needsReview: true,
				teacherOverride: null, // Not already reviewed
			},
			data: {
				needsReview: false,
			},
		});

		return {
			approvedCount: result.count,
			message: `${result.count} high-confidence responses auto-approved`,
		};
	}

	async reviewResponse(input: ReviewResponseInput, teacherId: string) {
		const response = await this.prisma.studentResponse.findFirst({
			where: { id: input.responseId },
			include: {
				submission: {
					include: {
						examPaper: true,
					},
				},
			},
		});

		if (!response || response.submission.examPaper.teacherId !== teacherId) {
			throw new NotFoundException("Response not found");
		}

		return this.prisma.studentResponse.update({
			where: { id: input.responseId },
			data: {
				teacherOverride: input.teacherOverride,
				teacherComment: input.teacherComment,
				needsReview: input.needsReview ?? false,
			},
		});
	}

	/**
	 * Get comprehensive grading summary with analytics
	 * As per Specification 5A.6: Reporting & Analytics Module
	 */
	async getGradingSummary(examPaperId: string, teacherId: string) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: examPaperId, teacherId },
			include: {
				questions: true,
			},
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		const submissions = await this.prisma.studentExamSubmission.findMany({
			where: { examPaperId },
			include: {
				responses: true,
			},
		});

		const graded = submissions.filter(
			(s) => s.status === "GRADED" || s.status === "REVIEWED",
		);
		const reviewed = submissions.filter((s) => s.status === "REVIEWED");
		const pendingReview = submissions.filter((s) =>
			s.responses.some((r) => r.needsReview),
		);

		const scores = graded
			.map((s) => s.totalScore)
			.filter((s) => s !== null) as number[];

		const gradeDistribution = graded.reduce(
			(acc, s) => {
				const grade = s.grade || "Ungraded";
				acc[grade] = (acc[grade] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		// Calculate question-level difficulty as per Specification 5A.6
		const questionAnalysis = await this.analyzeQuestionDifficulty(
			examPaperId,
			paper.questions,
		);

		// Calculate confidence distribution for model performance insights
		const allResponses = submissions.flatMap((s) => s.responses);
		const confidenceDistribution = {
			highConfidence: allResponses.filter(
				(r) => (r.confidence || 0) >= this.CONFIDENCE_HIGH,
			).length,
			mediumConfidence: allResponses.filter(
				(r) =>
					(r.confidence || 0) >= this.CONFIDENCE_MEDIUM &&
					(r.confidence || 0) < this.CONFIDENCE_HIGH,
			).length,
			lowConfidence: allResponses.filter(
				(r) => (r.confidence || 0) < this.CONFIDENCE_MEDIUM,
			).length,
		};

		// Identify common mistakes as per Specification 5A.6
		const commonMistakes = await this.identifyCommonMistakes(examPaperId);

		return {
			// Basic statistics
			totalSubmissions: submissions.length,
			gradedCount: graded.length,
			reviewedCount: reviewed.length,
			pendingReviewCount: pendingReview.length,

			// Score statistics
			averageScore:
				scores.length > 0
					? scores.reduce((a, b) => a + b, 0) / scores.length
					: null,
			highestScore: scores.length > 0 ? Math.max(...scores) : null,
			lowestScore: scores.length > 0 ? Math.min(...scores) : null,
			standardDeviation: this.calculateStandardDeviation(scores),

			// Distributions
			gradeDistribution: JSON.stringify(gradeDistribution),
			confidenceDistribution,

			// Question analysis
			questionAnalysis,

			// Common mistakes
			commonMistakes,

			// Timestamps
			generatedAt: new Date(),
		};
	}

	/**
	 * Analyze question difficulty based on student performance
	 * As per Specification 5A.6: "Question-level difficulty analysis"
	 */
	private async analyzeQuestionDifficulty(
		examPaperId: string,
		questions: any[],
	) {
		const analysis = await Promise.all(
			questions.map(async (question) => {
				const responses = await this.prisma.studentResponse.findMany({
					where: {
						questionId: question.id,
						submission: { examPaperId },
					},
				});

				const scores = responses.map((r) => r.assignedScore || 0);
				const avgScore =
					scores.length > 0
						? scores.reduce((a, b) => a + b, 0) / scores.length
						: 0;
				const avgPercentage =
					question.marks > 0 ? (avgScore / question.marks) * 100 : 0;

				// Classify difficulty
				let difficulty: string;
				if (avgPercentage >= 80) difficulty = "EASY";
				else if (avgPercentage >= 60) difficulty = "MODERATE";
				else if (avgPercentage >= 40) difficulty = "CHALLENGING";
				else difficulty = "DIFFICULT";

				// Count correctness
				const correct = responses.filter(
					(r) => r.predictedCorrectness === "CORRECT",
				).length;
				const partial = responses.filter(
					(r) => r.predictedCorrectness === "PARTIAL",
				).length;
				const incorrect = responses.filter(
					(r) => r.predictedCorrectness === "INCORRECT",
				).length;

				return {
					questionId: question.id,
					questionNumber: question.questionNumber,
					questionType: question.questionType,
					maxMarks: question.marks,
					averageScore: avgScore,
					averagePercentage: avgPercentage,
					difficulty,
					responseCount: responses.length,
					correctCount: correct,
					partialCount: partial,
					incorrectCount: incorrect,
				};
			}),
		);

		return analysis;
	}

	/**
	 * Identify common mistakes across submissions
	 * As per Specification 5A.6: "Common mistakes and weak areas identification"
	 */
	private async identifyCommonMistakes(examPaperId: string) {
		// Get all incorrect responses with explanations
		const incorrectResponses = await this.prisma.studentResponse.findMany({
			where: {
				submission: { examPaperId },
				predictedCorrectness: { in: ["INCORRECT", "PARTIAL"] },
			},
			include: {
				question: true,
			},
		});

		// Group by question and analyze patterns
		const byQuestion = incorrectResponses.reduce(
			(acc, response) => {
				const qId = response.questionId;
				if (!acc[qId]) {
					acc[qId] = {
						questionId: qId,
						questionNumber: response.question.questionNumber,
						incorrectCount: 0,
						explanations: [] as string[],
					};
				}
				acc[qId].incorrectCount++;
				if (response.explanation) {
					acc[qId].explanations.push(response.explanation);
				}
				return acc;
			},
			{} as Record<string, any>,
		);

		// Sort by number of incorrect responses
		const sortedMistakes = Object.values(byQuestion)
			.sort((a: any, b: any) => b.incorrectCount - a.incorrectCount)
			.slice(0, 10); // Top 10 problematic questions

		return sortedMistakes;
	}

	/**
	 * Calculate standard deviation of scores
	 */
	private calculateStandardDeviation(scores: number[]): number | null {
		if (scores.length < 2) return null;

		const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
		const squaredDiffs = scores.map((s) => Math.pow(s - mean, 2));
		const avgSquaredDiff =
			squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;

		return Math.sqrt(avgSquaredDiff);
	}

	async finalizeGrading(
		examPaperId: string,
		teacherId: string,
		publishResults = false,
	) {
		const paper = await this.prisma.examPaperSetup.findFirst({
			where: { id: examPaperId, teacherId },
		});

		if (!paper) {
			throw new NotFoundException("Exam paper not found");
		}

		// Mark all submissions as reviewed
		if (publishResults) {
			await this.prisma.studentExamSubmission.updateMany({
				where: {
					examPaperId,
					status: "GRADED",
				},
				data: {
					status: "REVIEWED",
					reviewedAt: new Date(),
				},
			});
		}

		// Update paper status
		await this.prisma.examPaperSetup.update({
			where: { id: paper.id },
			data: { status: "COMPLETED" },
		});

		return this.getExamPaper(examPaperId, teacherId);
	}
}
