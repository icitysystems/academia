import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { GradingWorkflowService } from "../src/grading/services/grading-workflow.service";
import { PrismaService } from "../src/prisma.service";
import { MLService } from "../src/ml/ml.service";

/**
 * Comprehensive Test Suite for Grading Workflow Service
 * Tests the complete teacher workflow as per Specification Section 5A:
 * 1. Exam Paper Setup (5A.1)
 * 2. Expected Responses / Marking Guide (5A.2)
 * 3. Moderation Samples (5A.3)
 * 4. Student Submissions & Batch Grading (5A.4)
 * 5. Review & Adjustment (5A.5)
 * 6. Finalization & Reporting (5A.6)
 */
describe("GradingWorkflowService", () => {
	let service: GradingWorkflowService;
	let prismaService: jest.Mocked<PrismaService>;
	let mlService: jest.Mocked<MLService>;

	const mockTeacherId = "teacher-123";

	// Mock data for the complete workflow
	const mockExamPaper = {
		id: "exam-paper-123",
		title: "Mathematics Final Exam",
		subject: "Mathematics",
		description: "End of term examination",
		paperType: "EXAM",
		totalMarks: 100,
		duration: 120,
		teacherId: mockTeacherId,
		status: "DRAFT",
		createdAt: new Date(),
		updatedAt: new Date(),
		questions: [],
	};

	const mockQuestion = {
		id: "question-1",
		examPaperId: mockExamPaper.id,
		questionNumber: 1,
		questionText: "What is 2 + 2?",
		questionType: "SHORT_ANSWER",
		marks: 10,
		imageUrl: null,
		metadata: null,
		orderIndex: 0,
		createdAt: new Date(),
	};

	const mockExpectedResponse = {
		id: "expected-1",
		examPaperId: mockExamPaper.id,
		questionId: mockQuestion.id,
		expectedAnswer: "4",
		markingScheme: JSON.stringify({ fullMarks: "4", partialMarks: "four" }),
		keywords: JSON.stringify(["4", "four"]),
		isAIGenerated: false,
		alternativeAnswers: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	const mockModerationSample = {
		id: "moderation-1",
		examPaperId: mockExamPaper.id,
		studentName: "Sample Student",
		imageUrl: "https://example.com/sample.jpg",
		totalScore: 85,
		feedback: "Good work overall",
		questionScores: JSON.stringify([
			{ questionId: mockQuestion.id, score: 10, comment: "Correct" },
		]),
		isVerified: false,
		createdAt: new Date(),
	};

	const mockStudentSubmission = {
		id: "submission-1",
		examPaperId: mockExamPaper.id,
		studentId: "student-1",
		studentName: "John Doe",
		studentEmail: "john@example.com",
		imageUrl: "https://example.com/submission.jpg",
		thumbnailUrl: null,
		status: "UPLOADED",
		totalScore: null,
		percentage: null,
		grade: null,
		feedback: null,
		gradedAt: null,
		reviewedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		responses: [],
		sessionId: null,
	};

	const mockGradingSession = {
		id: "session-1",
		examPaperId: mockExamPaper.id,
		status: "PENDING",
		totalSubmissions: 1,
		gradedSubmissions: 0,
		reviewedSubmissions: 0,
		calibrationAccuracy: null,
		averageConfidence: null,
		errorMessage: null,
		startedAt: null,
		completedAt: null,
		createdAt: new Date(),
	};

	const mockStudentResponse = {
		id: "response-1",
		submissionId: mockStudentSubmission.id,
		questionId: mockQuestion.id,
		extractedAnswer: "4",
		assignedScore: 10,
		maxScore: 10,
		predictedCorrectness: "CORRECT",
		confidence: 0.96,
		explanation: "Answer matches expected response",
		teacherOverride: null,
		teacherComment: null,
		needsReview: false,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(async () => {
		const mockPrismaService = {
			examPaperSetup: {
				create: jest.fn(),
				update: jest.fn(),
				findFirst: jest.fn(),
				findMany: jest.fn(),
				delete: jest.fn(),
			},
			examQuestion: {
				create: jest.fn(),
				update: jest.fn(),
				delete: jest.fn(),
				findFirst: jest.fn(),
				deleteMany: jest.fn(),
			},
			expectedResponse: {
				create: jest.fn(),
				upsert: jest.fn(),
				deleteMany: jest.fn(),
			},
			moderationSample: {
				create: jest.fn(),
				findMany: jest.fn(),
				findFirst: jest.fn(),
				update: jest.fn(),
				count: jest.fn(),
			},
			studentExamSubmission: {
				create: jest.fn(),
				update: jest.fn(),
				updateMany: jest.fn(),
				findFirst: jest.fn(),
				findMany: jest.fn(),
			},
			studentResponse: {
				create: jest.fn(),
				update: jest.fn(),
				updateMany: jest.fn(),
				findFirst: jest.fn(),
				findMany: jest.fn(),
			},
			examGradingSession: {
				create: jest.fn(),
				update: jest.fn(),
				upsert: jest.fn(),
				findUnique: jest.fn(),
			},
		};

		const mockMLService = {
			generateExpectedResponse: jest.fn(),
			calibrateGrading: jest.fn(),
			gradeExamResponse: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GradingWorkflowService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: MLService, useValue: mockMLService },
			],
		}).compile();

		service = module.get<GradingWorkflowService>(GradingWorkflowService);
		prismaService = module.get(PrismaService);
		mlService = module.get(MLService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	// ============================
	// STEP 1: Exam Paper Setup (5A.1)
	// ============================
	describe("Step 1: Exam Paper Setup (5A.1)", () => {
		describe("createExamPaper", () => {
			it("should create a new exam paper with DRAFT status", async () => {
				prismaService.examPaperSetup.create = jest
					.fn()
					.mockResolvedValue(mockExamPaper);

				const result = await service.createExamPaper(
					{
						title: "Mathematics Final Exam",
						subject: "Mathematics",
						description: "End of term examination",
						totalMarks: 100,
						duration: 120,
					},
					mockTeacherId,
				);

				expect(result.id).toBe(mockExamPaper.id);
				expect(result.status).toBe("DRAFT");
				expect(prismaService.examPaperSetup.create).toHaveBeenCalledWith({
					data: expect.objectContaining({
						title: "Mathematics Final Exam",
						subject: "Mathematics",
						teacherId: mockTeacherId,
						status: "DRAFT",
					}),
					include: { questions: true },
				});
			});
		});

		describe("updateExamPaper", () => {
			it("should update an existing exam paper", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				prismaService.examPaperSetup.update = jest.fn().mockResolvedValue({
					...mockExamPaper,
					title: "Updated Title",
				});

				const result = await service.updateExamPaper(
					{ id: mockExamPaper.id, title: "Updated Title" },
					mockTeacherId,
				);

				expect(result.title).toBe("Updated Title");
			});

			it("should throw NotFoundException if exam paper not found", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(null);

				await expect(
					service.updateExamPaper(
						{ id: "invalid-id", title: "Test" },
						mockTeacherId,
					),
				).rejects.toThrow(NotFoundException);
			});
		});

		describe("getExamPaper", () => {
			it("should return exam paper with all relations", async () => {
				const paperWithRelations = {
					...mockExamPaper,
					questions: [mockQuestion],
					expectedResponses: [mockExpectedResponse],
					moderationSamples: [mockModerationSample],
					studentSubmissions: [mockStudentSubmission],
					gradingSession: mockGradingSession,
				};
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(paperWithRelations);

				const result = await service.getExamPaper(
					mockExamPaper.id,
					mockTeacherId,
				);

				expect(result).toEqual(paperWithRelations);
				expect(result.questions).toHaveLength(1);
			});

			it("should throw NotFoundException for non-existent paper", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(null);

				await expect(
					service.getExamPaper("invalid-id", mockTeacherId),
				).rejects.toThrow(NotFoundException);
			});
		});

		describe("addQuestion", () => {
			it("should add a question to the exam paper", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				prismaService.examQuestion.create = jest
					.fn()
					.mockResolvedValue(mockQuestion);
				prismaService.examPaperSetup.update = jest.fn().mockResolvedValue({
					...mockExamPaper,
					status: "QUESTIONS_ADDED",
				});

				const result = await service.addQuestion(
					{
						examPaperId: mockExamPaper.id,
						questionNumber: 1,
						questionText: "What is 2 + 2?",
						questionType: "SHORT_ANSWER" as any,
						marks: 10,
					},
					mockTeacherId,
				);

				expect(result.id).toBe(mockQuestion.id);
				expect(prismaService.examQuestion.create).toHaveBeenCalled();
			});

			it("should update paper status to QUESTIONS_ADDED on first question", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				prismaService.examQuestion.create = jest
					.fn()
					.mockResolvedValue(mockQuestion);
				prismaService.examPaperSetup.update = jest.fn();

				await service.addQuestion(
					{
						examPaperId: mockExamPaper.id,
						questionNumber: 1,
						questionText: "What is 2 + 2?",
						questionType: "SHORT_ANSWER" as any,
						marks: 10,
					},
					mockTeacherId,
				);

				expect(prismaService.examPaperSetup.update).toHaveBeenCalledWith({
					where: { id: mockExamPaper.id },
					data: { status: "QUESTIONS_ADDED" },
				});
			});
		});

		describe("bulkAddQuestions", () => {
			it("should add multiple questions at once", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				prismaService.examQuestion.deleteMany = jest
					.fn()
					.mockResolvedValue({ count: 0 });
				prismaService.examQuestion.create = jest
					.fn()
					.mockResolvedValue(mockQuestion);
				prismaService.examPaperSetup.update = jest.fn();

				const questions = [
					{
						questionNumber: 1,
						questionText: "Q1",
						questionType: "SHORT_ANSWER" as any,
						marks: 10,
					},
					{
						questionNumber: 2,
						questionText: "Q2",
						questionType: "MCQ" as any,
						marks: 5,
					},
				];

				const result = await service.bulkAddQuestions(
					{
						examPaperId: mockExamPaper.id,
						questions,
					},
					mockTeacherId,
				);

				expect(prismaService.examQuestion.deleteMany).toHaveBeenCalled();
				expect(prismaService.examQuestion.create).toHaveBeenCalledTimes(2);
			});
		});
	});

	// ============================
	// STEP 2: Expected Responses (5A.2)
	// ============================
	describe("Step 2: Expected Responses / Marking Guide (5A.2)", () => {
		describe("addExpectedResponse", () => {
			it("should add an expected response for a question", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				prismaService.expectedResponse.create = jest
					.fn()
					.mockResolvedValue(mockExpectedResponse);

				const result = await service.addExpectedResponse(
					{
						examPaperId: mockExamPaper.id,
						questionId: mockQuestion.id,
						expectedAnswer: "4",
						keywords: JSON.stringify(["4", "four"]),
					},
					mockTeacherId,
				);

				expect(result.expectedAnswer).toBe("4");
				expect(prismaService.expectedResponse.create).toHaveBeenCalledWith({
					data: expect.objectContaining({
						expectedAnswer: "4",
						isAIGenerated: false,
					}),
				});
			});
		});

		describe("bulkAddExpectedResponses", () => {
			it("should add multiple expected responses and update status", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				prismaService.expectedResponse.deleteMany = jest
					.fn()
					.mockResolvedValue({ count: 0 });
				prismaService.expectedResponse.create = jest
					.fn()
					.mockResolvedValue(mockExpectedResponse);
				prismaService.examPaperSetup.update = jest.fn();

				const responses = [
					{ questionId: "q1", expectedAnswer: "4" },
					{ questionId: "q2", expectedAnswer: "5" },
				];

				await service.bulkAddExpectedResponses(
					{
						examPaperId: mockExamPaper.id,
						responses,
					},
					mockTeacherId,
				);

				expect(prismaService.examPaperSetup.update).toHaveBeenCalledWith({
					where: { id: mockExamPaper.id },
					data: { status: "RESPONSES_SET" },
				});
			});
		});

		describe("requestAIProposedResponses", () => {
			it("should generate AI proposed responses for all questions", async () => {
				const paperWithQuestions = {
					...mockExamPaper,
					questions: [mockQuestion],
				};
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(paperWithQuestions);
				mlService.generateExpectedResponse = jest.fn().mockResolvedValue({
					answer: "4",
					keywords: ["4", "four"],
					markingScheme: { fullMarks: "4" },
					confidence: 0.95,
				});

				const result = await service.requestAIProposedResponses(
					mockExamPaper.id,
					mockTeacherId,
				);

				expect(result.examPaperId).toBe(mockExamPaper.id);
				expect(result.responses).toHaveLength(1);
				expect(mlService.generateExpectedResponse).toHaveBeenCalledWith(
					expect.objectContaining({
						questionText: mockQuestion.questionText,
						questionType: mockQuestion.questionType,
					}),
				);
			});

			it("should throw BadRequestException if no questions exist", async () => {
				const paperWithNoQuestions = { ...mockExamPaper, questions: [] };
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(paperWithNoQuestions);

				await expect(
					service.requestAIProposedResponses(mockExamPaper.id, mockTeacherId),
				).rejects.toThrow(BadRequestException);
			});
		});
	});

	// ============================
	// STEP 3: Moderation Samples (5A.3)
	// ============================
	describe("Step 3: Moderation Samples (5A.3)", () => {
		describe("addModerationSample", () => {
			it("should add a moderation sample with isVerified=false", async () => {
				prismaService.examPaperSetup.findFirst = jest.fn().mockResolvedValue({
					...mockExamPaper,
					status: "RESPONSES_SET",
				});
				prismaService.moderationSample.create = jest
					.fn()
					.mockResolvedValue(mockModerationSample);
				prismaService.moderationSample.count = jest.fn().mockResolvedValue(1);

				const result = await service.addModerationSample(
					{
						examPaperId: mockExamPaper.id,
						studentName: "Sample Student",
						imageUrl: "https://example.com/sample.jpg",
						totalScore: 85,
						questionScores: JSON.stringify([
							{ questionId: mockQuestion.id, score: 10 },
						]),
					},
					mockTeacherId,
				);

				expect(result.isVerified).toBe(false);
				expect(prismaService.moderationSample.create).toHaveBeenCalledWith({
					data: expect.objectContaining({
						isVerified: false,
					}),
				});
			});

			it("should update paper status to MODERATION_READY when >= 3 samples", async () => {
				prismaService.examPaperSetup.findFirst = jest.fn().mockResolvedValue({
					...mockExamPaper,
					status: "RESPONSES_SET",
				});
				prismaService.moderationSample.create = jest
					.fn()
					.mockResolvedValue(mockModerationSample);
				prismaService.moderationSample.count = jest.fn().mockResolvedValue(3);
				prismaService.examPaperSetup.update = jest.fn();

				await service.addModerationSample(
					{
						examPaperId: mockExamPaper.id,
						studentName: "Sample Student",
						imageUrl: "https://example.com/sample.jpg",
						totalScore: 85,
						questionScores: JSON.stringify([]),
					},
					mockTeacherId,
				);

				expect(prismaService.examPaperSetup.update).toHaveBeenCalledWith({
					where: { id: mockExamPaper.id },
					data: { status: "MODERATION_READY" },
				});
			});
		});

		describe("verifyModerationSample", () => {
			it("should verify a moderation sample", async () => {
				prismaService.moderationSample.findFirst = jest.fn().mockResolvedValue({
					...mockModerationSample,
					examPaper: mockExamPaper,
				});
				prismaService.moderationSample.update = jest.fn().mockResolvedValue({
					...mockModerationSample,
					isVerified: true,
				});

				const result = await service.verifyModerationSample(
					mockModerationSample.id,
					true,
					mockTeacherId,
				);

				expect(result.isVerified).toBe(true);
			});

			it("should throw NotFoundException if sample not found", async () => {
				prismaService.moderationSample.findFirst = jest
					.fn()
					.mockResolvedValue(null);

				await expect(
					service.verifyModerationSample("invalid-id", true, mockTeacherId),
				).rejects.toThrow(NotFoundException);
			});
		});

		describe("runCalibration", () => {
			it("should run calibration with verified samples", async () => {
				const paperWithSamples = {
					...mockExamPaper,
					questions: [mockQuestion],
					expectedResponses: [mockExpectedResponse],
					moderationSamples: [
						{ ...mockModerationSample, isVerified: true },
						{ ...mockModerationSample, id: "mod-2", isVerified: true },
					],
				};
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(paperWithSamples);
				mlService.calibrateGrading = jest.fn().mockResolvedValue({
					accuracy: 0.9,
					averageDeviation: 0.5,
				});

				const result = await service.runCalibration(
					mockExamPaper.id,
					mockTeacherId,
				);

				expect(result.isCalibrated).toBe(true);
				expect(result.accuracy).toBe(0.9);
				expect(result.message).toContain("successful");
			});

			it("should return isCalibrated=false if accuracy < 0.8", async () => {
				const paperWithSamples = {
					...mockExamPaper,
					questions: [mockQuestion],
					expectedResponses: [mockExpectedResponse],
					moderationSamples: [
						{ ...mockModerationSample, isVerified: true },
						{ ...mockModerationSample, id: "mod-2", isVerified: true },
					],
				};
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(paperWithSamples);
				mlService.calibrateGrading = jest.fn().mockResolvedValue({
					accuracy: 0.6,
					averageDeviation: 2.0,
				});

				const result = await service.runCalibration(
					mockExamPaper.id,
					mockTeacherId,
				);

				expect(result.isCalibrated).toBe(false);
				expect(result.message).toContain("below threshold");
			});

			it("should throw BadRequestException if < 2 verified samples", async () => {
				const paperWithFewSamples = {
					...mockExamPaper,
					moderationSamples: [{ ...mockModerationSample, isVerified: true }],
				};
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(paperWithFewSamples);

				await expect(
					service.runCalibration(mockExamPaper.id, mockTeacherId),
				).rejects.toThrow(BadRequestException);
			});
		});
	});

	// ============================
	// STEP 4: Student Submissions & Grading (5A.4)
	// ============================
	describe("Step 4: Student Submissions & Batch Grading (5A.4)", () => {
		describe("addStudentSubmission", () => {
			it("should add a student submission with UPLOADED status", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				prismaService.studentExamSubmission.create = jest
					.fn()
					.mockResolvedValue(mockStudentSubmission);

				const result = await service.addStudentSubmission(
					{
						examPaperId: mockExamPaper.id,
						studentName: "John Doe",
						studentEmail: "john@example.com",
						imageUrl: "https://example.com/submission.jpg",
					},
					mockTeacherId,
				);

				expect(result.status).toBe("UPLOADED");
				expect(prismaService.studentExamSubmission.create).toHaveBeenCalledWith(
					{
						data: expect.objectContaining({
							status: "UPLOADED",
							studentName: "John Doe",
						}),
					},
				);
			});
		});

		describe("bulkUploadSubmissions", () => {
			it("should add multiple student submissions", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				prismaService.studentExamSubmission.create = jest
					.fn()
					.mockResolvedValue(mockStudentSubmission);

				const submissions = [
					{ studentName: "Student 1", imageUrl: "url1" },
					{ studentName: "Student 2", imageUrl: "url2" },
					{ studentName: "Student 3", imageUrl: "url3" },
				];

				const result = await service.bulkUploadSubmissions(
					{
						examPaperId: mockExamPaper.id,
						submissions,
					},
					mockTeacherId,
				);

				expect(
					prismaService.studentExamSubmission.create,
				).toHaveBeenCalledTimes(3);
			});
		});

		describe("getStudentSubmissions", () => {
			it("should return all submissions for an exam paper", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				prismaService.studentExamSubmission.findMany = jest
					.fn()
					.mockResolvedValue([
						mockStudentSubmission,
						{ ...mockStudentSubmission, id: "sub-2", studentName: "Jane Doe" },
					]);

				const result = await service.getStudentSubmissions(
					mockExamPaper.id,
					mockTeacherId,
				);

				expect(result).toHaveLength(2);
			});

			it("should filter by status if provided", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				prismaService.studentExamSubmission.findMany = jest
					.fn()
					.mockResolvedValue([]);

				await service.getStudentSubmissions(
					mockExamPaper.id,
					mockTeacherId,
					"GRADED",
				);

				expect(
					prismaService.studentExamSubmission.findMany,
				).toHaveBeenCalledWith(
					expect.objectContaining({
						where: expect.objectContaining({
							status: "GRADED",
						}),
					}),
				);
			});
		});

		describe("startBatchGrading", () => {
			it("should start batch grading and create a grading session", async () => {
				const paperWithResponses = {
					...mockExamPaper,
					questions: [mockQuestion],
					expectedResponses: [mockExpectedResponse],
					moderationSamples: [],
				};
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(paperWithResponses);
				prismaService.studentExamSubmission.findMany = jest
					.fn()
					.mockResolvedValue([mockStudentSubmission]);
				prismaService.examGradingSession.upsert = jest
					.fn()
					.mockResolvedValue(mockGradingSession);
				prismaService.examPaperSetup.update = jest.fn();
				prismaService.studentExamSubmission.update = jest.fn();
				prismaService.studentResponse.create = jest.fn();
				prismaService.studentResponse.findMany = jest
					.fn()
					.mockResolvedValue([mockStudentResponse]);
				prismaService.examGradingSession.update = jest.fn();
				mlService.gradeExamResponse = jest.fn().mockResolvedValue({
					extractedAnswer: "4",
					score: 10,
					correctness: "CORRECT",
					confidence: 0.96,
					explanation: "Correct answer",
				});

				const result = await service.startBatchGrading(
					{ examPaperId: mockExamPaper.id },
					mockTeacherId,
				);

				expect(result.id).toBe(mockGradingSession.id);
				expect(prismaService.examGradingSession.upsert).toHaveBeenCalled();
				expect(prismaService.examPaperSetup.update).toHaveBeenCalledWith({
					where: { id: mockExamPaper.id },
					data: { status: "GRADING_ACTIVE" },
				});
			});

			it("should throw BadRequestException if no expected responses", async () => {
				const paperWithoutResponses = {
					...mockExamPaper,
					expectedResponses: [],
				};
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(paperWithoutResponses);

				await expect(
					service.startBatchGrading(
						{ examPaperId: mockExamPaper.id },
						mockTeacherId,
					),
				).rejects.toThrow(BadRequestException);
			});

			it("should throw BadRequestException if no submissions to grade", async () => {
				const paperWithResponses = {
					...mockExamPaper,
					expectedResponses: [mockExpectedResponse],
				};
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(paperWithResponses);
				prismaService.studentExamSubmission.findMany = jest
					.fn()
					.mockResolvedValue([]);

				await expect(
					service.startBatchGrading(
						{ examPaperId: mockExamPaper.id },
						mockTeacherId,
					),
				).rejects.toThrow(BadRequestException);
			});
		});
	});

	// ============================
	// STEP 5: Review & Adjustment (5A.5)
	// ============================
	describe("Step 5: Review & Adjustment (5A.5)", () => {
		describe("getResponsesNeedingReview", () => {
			it("should return responses needing review ordered by confidence (lowest first)", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				const lowConfidenceResponse = {
					...mockStudentResponse,
					confidence: 0.5,
					needsReview: true,
				};
				const medConfidenceResponse = {
					...mockStudentResponse,
					id: "r2",
					confidence: 0.85,
					needsReview: true,
				};
				prismaService.studentResponse.findMany = jest
					.fn()
					.mockResolvedValue([lowConfidenceResponse, medConfidenceResponse]);

				const result = await service.getResponsesNeedingReview(
					mockExamPaper.id,
					mockTeacherId,
				);

				expect(result.totalNeedingReview).toBe(2);
				expect(result.grouped.highPriority).toHaveLength(1);
				expect(result.grouped.mediumPriority).toHaveLength(1);
			});
		});

		describe("batchApproveHighConfidence", () => {
			it("should auto-approve responses with high confidence", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				prismaService.studentResponse.updateMany = jest
					.fn()
					.mockResolvedValue({ count: 5 });

				const result = await service.batchApproveHighConfidence(
					mockExamPaper.id,
					mockTeacherId,
				);

				expect(result.approvedCount).toBe(5);
				expect(result.message).toContain(
					"5 high-confidence responses auto-approved",
				);
			});
		});

		describe("reviewResponse", () => {
			it("should allow teacher to override a response score", async () => {
				prismaService.studentResponse.findFirst = jest.fn().mockResolvedValue({
					...mockStudentResponse,
					submission: {
						...mockStudentSubmission,
						examPaper: mockExamPaper,
					},
				});
				prismaService.studentResponse.update = jest.fn().mockResolvedValue({
					...mockStudentResponse,
					teacherOverride: 8,
					teacherComment: "Partial credit for explanation",
					needsReview: false,
				});

				const result = await service.reviewResponse(
					{
						responseId: mockStudentResponse.id,
						teacherOverride: 8,
						teacherComment: "Partial credit for explanation",
					},
					mockTeacherId,
				);

				expect(result.teacherOverride).toBe(8);
				expect(result.needsReview).toBe(false);
			});

			it("should throw NotFoundException if response not found or not owned", async () => {
				prismaService.studentResponse.findFirst = jest
					.fn()
					.mockResolvedValue(null);

				await expect(
					service.reviewResponse(
						{ responseId: "invalid-id", teacherOverride: 5 },
						mockTeacherId,
					),
				).rejects.toThrow(NotFoundException);
			});
		});
	});

	// ============================
	// STEP 6: Finalization (5A.6)
	// ============================
	describe("Step 6: Finalization & Reporting (5A.6)", () => {
		describe("getGradingSummary", () => {
			it("should return comprehensive grading statistics", async () => {
				const paperWithQuestions = {
					...mockExamPaper,
					questions: [mockQuestion],
				};
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(paperWithQuestions);
				prismaService.studentExamSubmission.findMany = jest
					.fn()
					.mockResolvedValue([
						{
							...mockStudentSubmission,
							status: "GRADED",
							totalScore: 85,
							responses: [mockStudentResponse],
						},
						{
							...mockStudentSubmission,
							id: "sub-2",
							status: "GRADED",
							totalScore: 90,
							responses: [mockStudentResponse],
						},
					]);
				// Mock for analyzeQuestionDifficulty - needs to return responses per question
				prismaService.studentResponse.findMany = jest.fn().mockResolvedValue([
					{ ...mockStudentResponse, question: mockQuestion },
					{
						...mockStudentResponse,
						id: "r2",
						assignedScore: 8,
						predictedCorrectness: "PARTIAL",
						question: mockQuestion,
					},
				]);

				const result = await service.getGradingSummary(
					mockExamPaper.id,
					mockTeacherId,
				);

				expect(result).toBeDefined();
				expect(result.totalSubmissions).toBe(2);
			});
		});

		describe("finalizeGrading", () => {
			it("should finalize grading and update paper status to COMPLETED", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				prismaService.studentExamSubmission.updateMany = jest
					.fn()
					.mockResolvedValue({ count: 5 });
				prismaService.examPaperSetup.update = jest.fn().mockResolvedValue({
					...mockExamPaper,
					status: "COMPLETED",
				});

				const result = await service.finalizeGrading(
					mockExamPaper.id,
					mockTeacherId,
					true, // publishResults
				);

				expect(prismaService.examPaperSetup.update).toHaveBeenCalledWith({
					where: { id: mockExamPaper.id },
					data: { status: "COMPLETED" },
				});
			});

			it("should mark submissions as REVIEWED when publishing results", async () => {
				prismaService.examPaperSetup.findFirst = jest
					.fn()
					.mockResolvedValue(mockExamPaper);
				prismaService.studentExamSubmission.updateMany = jest
					.fn()
					.mockResolvedValue({ count: 5 });
				prismaService.examPaperSetup.update = jest.fn();

				await service.finalizeGrading(mockExamPaper.id, mockTeacherId, true);

				expect(
					prismaService.studentExamSubmission.updateMany,
				).toHaveBeenCalledWith({
					where: {
						examPaperId: mockExamPaper.id,
						status: "GRADED",
					},
					data: expect.objectContaining({
						status: "REVIEWED",
					}),
				});
			});
		});
	});

	// ============================
	// Complete Workflow Integration Test
	// ============================
	describe("Complete Workflow Integration", () => {
		it("should complete the entire grading workflow from start to finish", async () => {
			// This test verifies the complete workflow steps work together

			// Step 1: Create exam paper
			prismaService.examPaperSetup.create = jest
				.fn()
				.mockResolvedValue(mockExamPaper);
			const paper = await service.createExamPaper(
				{ title: "Test Exam", subject: "Math", totalMarks: 100 },
				mockTeacherId,
			);
			expect(paper.status).toBe("DRAFT");

			// Step 1.5: Add questions
			prismaService.examPaperSetup.findFirst = jest
				.fn()
				.mockResolvedValue(mockExamPaper);
			prismaService.examQuestion.create = jest
				.fn()
				.mockResolvedValue(mockQuestion);
			prismaService.examPaperSetup.update = jest.fn();
			await service.addQuestion(
				{
					examPaperId: paper.id,
					questionNumber: 1,
					questionText: "Q1",
					questionType: "SHORT_ANSWER" as any,
					marks: 10,
				},
				mockTeacherId,
			);

			// Step 2: Add expected responses
			prismaService.expectedResponse.create = jest
				.fn()
				.mockResolvedValue(mockExpectedResponse);
			await service.addExpectedResponse(
				{
					examPaperId: paper.id,
					questionId: mockQuestion.id,
					expectedAnswer: "4",
				},
				mockTeacherId,
			);

			// Step 3: Add moderation samples
			prismaService.moderationSample.create = jest
				.fn()
				.mockResolvedValue(mockModerationSample);
			prismaService.moderationSample.count = jest.fn().mockResolvedValue(3);
			await service.addModerationSample(
				{
					examPaperId: paper.id,
					studentName: "Sample",
					imageUrl: "url",
					totalScore: 85,
					questionScores: "[]",
				},
				mockTeacherId,
			);

			// Step 4: Upload submissions and start grading
			prismaService.studentExamSubmission.create = jest
				.fn()
				.mockResolvedValue(mockStudentSubmission);
			await service.addStudentSubmission(
				{ examPaperId: paper.id, studentName: "John", imageUrl: "url" },
				mockTeacherId,
			);

			// Start batch grading
			const paperForGrading = {
				...mockExamPaper,
				questions: [mockQuestion],
				expectedResponses: [mockExpectedResponse],
				moderationSamples: [mockModerationSample],
			};
			prismaService.examPaperSetup.findFirst = jest
				.fn()
				.mockResolvedValue(paperForGrading);
			prismaService.studentExamSubmission.findMany = jest
				.fn()
				.mockResolvedValue([mockStudentSubmission]);
			prismaService.examGradingSession.upsert = jest
				.fn()
				.mockResolvedValue(mockGradingSession);
			prismaService.studentExamSubmission.update = jest.fn();
			prismaService.studentResponse.create = jest.fn();
			prismaService.studentResponse.findMany = jest
				.fn()
				.mockResolvedValue([mockStudentResponse]);
			prismaService.examGradingSession.update = jest.fn();
			mlService.gradeExamResponse = jest.fn().mockResolvedValue({
				extractedAnswer: "4",
				score: 10,
				correctness: "CORRECT",
				confidence: 0.96,
				explanation: "Correct",
			});

			const session = await service.startBatchGrading(
				{ examPaperId: paper.id },
				mockTeacherId,
			);
			expect(session).toBeDefined();

			// Step 5: Review responses
			prismaService.studentResponse.findFirst = jest.fn().mockResolvedValue({
				...mockStudentResponse,
				submission: { ...mockStudentSubmission, examPaper: mockExamPaper },
			});
			prismaService.studentResponse.update = jest.fn().mockResolvedValue({
				...mockStudentResponse,
				teacherOverride: 10,
				needsReview: false,
			});
			await service.reviewResponse(
				{ responseId: mockStudentResponse.id, teacherOverride: 10 },
				mockTeacherId,
			);

			// Step 6: Finalize grading
			prismaService.examPaperSetup.findFirst = jest
				.fn()
				.mockResolvedValue(mockExamPaper);
			prismaService.studentExamSubmission.updateMany = jest
				.fn()
				.mockResolvedValue({ count: 1 });
			prismaService.examPaperSetup.update = jest.fn().mockResolvedValue({
				...mockExamPaper,
				status: "COMPLETED",
			});
			const finalPaper = await service.finalizeGrading(
				paper.id,
				mockTeacherId,
				true,
			);

			// Workflow complete!
			expect(prismaService.examPaperSetup.update).toHaveBeenCalledWith({
				where: { id: paper.id },
				data: { status: "COMPLETED" },
			});
		});
	});
});
