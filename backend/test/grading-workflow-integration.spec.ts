import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { GradingWorkflowService } from "../src/grading/services/grading-workflow.service";
import { GradingService } from "../src/grading/grading.service";
import { PrismaService } from "../src/prisma.service";
import { MLService } from "../src/ml/ml.service";
import { TensorFlowInferenceService } from "../src/ml/tensorflow-inference.service";
import { PythonMLClientService } from "../src/ml/python-ml-client.service";
import { ConfigService } from "@nestjs/config";

/**
 * Full End-to-End Integration Test for Teacher Grading Workflow
 *
 * This test simulates the complete workflow a teacher would follow:
 * 1. Create an exam paper
 * 2. Add questions to the exam
 * 3. Set expected responses / marking guide
 * 4. Add moderation samples (optional but recommended)
 * 5. Upload student submissions (scripts)
 * 6. Run batch grading
 * 7. Review low-confidence results
 * 8. Approve high-confidence results
 * 9. Finalize and publish results
 *
 * Per Specification Section 5A: Comprehensive Grading System Design
 */
describe("Teacher Script Grading Workflow - Full Integration Test", () => {
	let app: INestApplication;
	let workflowService: GradingWorkflowService;
	let gradingService: GradingService;
	let prismaService: jest.Mocked<PrismaService>;
	let mlService: MLService;

	// Test data state - simulates database state
	const testState: {
		examPaper: any;
		questions: any[];
		expectedResponses: any[];
		moderationSamples: any[];
		studentSubmissions: any[];
		gradingSession: any;
		studentResponses: any[];
	} = {
		examPaper: null,
		questions: [],
		expectedResponses: [],
		moderationSamples: [],
		studentSubmissions: [],
		gradingSession: null,
		studentResponses: [],
	};

	const teacherId = "teacher-e2e-test";
	let nextId = 1;
	const generateId = () => `test-id-${nextId++}`;

	beforeAll(async () => {
		// Create comprehensive mocks that simulate actual database behavior
		const mockPrismaService = createMockPrismaService();

		const mockConfigService = {
			get: jest.fn((key: string) => {
				const config: Record<string, any> = {
					"ml.usePythonService": false,
					"ml.confidenceThreshold": 0.7,
				};
				return config[key];
			}),
		};

		const mockTFInference = {
			predict: jest.fn(),
		};

		const mockPythonClient = {
			isServiceAvailable: jest.fn().mockReturnValue(false),
			predict: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GradingWorkflowService,
				GradingService,
				MLService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: ConfigService, useValue: mockConfigService },
				{ provide: TensorFlowInferenceService, useValue: mockTFInference },
				{ provide: PythonMLClientService, useValue: mockPythonClient },
			],
		}).compile();

		workflowService = module.get<GradingWorkflowService>(
			GradingWorkflowService,
		);
		gradingService = module.get<GradingService>(GradingService);
		prismaService = module.get(PrismaService);
		mlService = module.get<MLService>(MLService);

		// Setup MLService mocks
		setupMLServiceMocks();
	});

	function createMockPrismaService() {
		return {
			examPaperSetup: {
				create: jest.fn().mockImplementation((data) => {
					testState.examPaper = {
						id: generateId(),
						...data.data,
						createdAt: new Date(),
						updatedAt: new Date(),
						questions: [],
					};
					return Promise.resolve(testState.examPaper);
				}),
				update: jest.fn().mockImplementation(({ where, data }) => {
					if (testState.examPaper && testState.examPaper.id === where.id) {
						testState.examPaper = { ...testState.examPaper, ...data };
					}
					return Promise.resolve(testState.examPaper);
				}),
				findFirst: jest.fn().mockImplementation(({ where, include }) => {
					if (
						testState.examPaper &&
						testState.examPaper.teacherId === where.teacherId
					) {
						return Promise.resolve({
							...testState.examPaper,
							questions: include?.questions ? testState.questions : undefined,
							expectedResponses: include?.expectedResponses
								? testState.expectedResponses
								: undefined,
							moderationSamples: include?.moderationSamples
								? testState.moderationSamples.filter(
										(s: any) =>
											!include.moderationSamples.where ||
											s.isVerified ===
												include.moderationSamples.where.isVerified,
									)
								: undefined,
							studentSubmissions: include?.studentSubmissions
								? testState.studentSubmissions
								: undefined,
							gradingSession: include?.gradingSession
								? testState.gradingSession
								: undefined,
						});
					}
					return Promise.resolve(null);
				}),
				findMany: jest.fn().mockResolvedValue([]),
				delete: jest.fn(),
			},
			examQuestion: {
				create: jest.fn().mockImplementation((data) => {
					const question = {
						id: generateId(),
						...data.data,
						createdAt: new Date(),
					};
					testState.questions.push(question);
					return Promise.resolve(question);
				}),
				update: jest.fn(),
				delete: jest.fn(),
				findFirst: jest.fn(),
				deleteMany: jest.fn().mockImplementation(() => {
					testState.questions = [];
					return Promise.resolve({ count: 0 });
				}),
			},
			expectedResponse: {
				create: jest.fn().mockImplementation((data) => {
					const response = {
						id: generateId(),
						...data.data,
						createdAt: new Date(),
						updatedAt: new Date(),
					};
					testState.expectedResponses.push(response);
					return Promise.resolve(response);
				}),
				upsert: jest.fn(),
				deleteMany: jest.fn().mockImplementation(() => {
					testState.expectedResponses = [];
					return Promise.resolve({ count: 0 });
				}),
			},
			moderationSample: {
				create: jest.fn().mockImplementation((data) => {
					const sample = {
						id: generateId(),
						...data.data,
						createdAt: new Date(),
					};
					testState.moderationSamples.push(sample);
					return Promise.resolve(sample);
				}),
				findMany: jest
					.fn()
					.mockImplementation(() =>
						Promise.resolve(testState.moderationSamples),
					),
				findFirst: jest.fn().mockImplementation(({ where }) => {
					const sample = testState.moderationSamples.find(
						(s: any) => s.id === where.id,
					);
					if (sample) {
						return Promise.resolve({
							...sample,
							examPaper: testState.examPaper,
						});
					}
					return Promise.resolve(null);
				}),
				update: jest.fn().mockImplementation(({ where, data }) => {
					const idx = testState.moderationSamples.findIndex(
						(s: any) => s.id === where.id,
					);
					if (idx >= 0) {
						testState.moderationSamples[idx] = {
							...testState.moderationSamples[idx],
							...data,
						};
					}
					return Promise.resolve(testState.moderationSamples[idx]);
				}),
				count: jest
					.fn()
					.mockImplementation(() =>
						Promise.resolve(testState.moderationSamples.length),
					),
			},
			studentExamSubmission: {
				create: jest.fn().mockImplementation((data) => {
					const submission = {
						id: generateId(),
						...data.data,
						createdAt: new Date(),
						updatedAt: new Date(),
						responses: [],
					};
					testState.studentSubmissions.push(submission);
					return Promise.resolve(submission);
				}),
				update: jest.fn().mockImplementation(({ where, data }) => {
					const idx = testState.studentSubmissions.findIndex(
						(s: any) => s.id === where.id,
					);
					if (idx >= 0) {
						testState.studentSubmissions[idx] = {
							...testState.studentSubmissions[idx],
							...data,
						};
					}
					return Promise.resolve(testState.studentSubmissions[idx]);
				}),
				updateMany: jest.fn().mockImplementation(({ where, data }) => {
					let count = 0;
					testState.studentSubmissions.forEach((s: any) => {
						if (
							where.status === s.status ||
							(where.status &&
								where.status.in &&
								where.status.in.includes(s.status))
						) {
							Object.assign(s, data);
							count++;
						}
					});
					return Promise.resolve({ count });
				}),
				findFirst: jest.fn(),
				findMany: jest.fn().mockImplementation(({ where }) => {
					let filtered = testState.studentSubmissions;
					if (where?.status) {
						if (typeof where.status === "string") {
							filtered = filtered.filter((s: any) => s.status === where.status);
						} else if (where.status.in) {
							filtered = filtered.filter((s: any) =>
								where.status.in.includes(s.status),
							);
						}
					}
					return Promise.resolve(filtered);
				}),
			},
			studentResponse: {
				create: jest.fn().mockImplementation((data) => {
					const response = {
						id: generateId(),
						...data.data,
						createdAt: new Date(),
						updatedAt: new Date(),
					};
					testState.studentResponses.push(response);
					return Promise.resolve(response);
				}),
				update: jest.fn().mockImplementation(({ where, data }) => {
					const idx = testState.studentResponses.findIndex(
						(r: any) => r.id === where.id,
					);
					if (idx >= 0) {
						testState.studentResponses[idx] = {
							...testState.studentResponses[idx],
							...data,
						};
					}
					return Promise.resolve(testState.studentResponses[idx]);
				}),
				updateMany: jest.fn().mockImplementation(({ where, data }) => {
					let count = 0;
					testState.studentResponses.forEach((r: any) => {
						if (
							(!where.confidence ||
								(where.confidence.gte &&
									r.confidence >= where.confidence.gte)) &&
							(!where.needsReview || r.needsReview === where.needsReview)
						) {
							Object.assign(r, data);
							count++;
						}
					});
					return Promise.resolve({ count });
				}),
				findFirst: jest.fn().mockImplementation(({ where }) => {
					const response = testState.studentResponses.find(
						(r: any) => r.id === where.id,
					);
					if (response) {
						return Promise.resolve({
							...response,
							submission: {
								...testState.studentSubmissions.find(
									(s: any) => s.id === response.submissionId,
								),
								examPaper: testState.examPaper,
							},
						});
					}
					return Promise.resolve(null);
				}),
				findMany: jest.fn().mockImplementation(({ where }) => {
					let filtered = testState.studentResponses;
					if (where?.questionId) {
						filtered = filtered.filter(
							(r: any) => r.questionId === where.questionId,
						);
					}
					if (where?.needsReview !== undefined) {
						filtered = filtered.filter(
							(r: any) => r.needsReview === where.needsReview,
						);
					}
					// Add question relation
					return Promise.resolve(
						filtered.map((r: any) => ({
							...r,
							question: testState.questions.find(
								(q: any) => q.id === r.questionId,
							),
						})),
					);
				}),
			},
			examGradingSession: {
				create: jest.fn(),
				update: jest.fn().mockImplementation(({ where, data }) => {
					if (testState.gradingSession) {
						testState.gradingSession = { ...testState.gradingSession, ...data };
						if (data.gradedSubmissions?.increment) {
							testState.gradingSession.gradedSubmissions =
								(testState.gradingSession.gradedSubmissions || 0) +
								data.gradedSubmissions.increment;
						}
					}
					return Promise.resolve(testState.gradingSession);
				}),
				upsert: jest.fn().mockImplementation(({ create }) => {
					testState.gradingSession = {
						id: generateId(),
						...create,
						createdAt: new Date(),
					};
					return Promise.resolve(testState.gradingSession);
				}),
				findUnique: jest
					.fn()
					.mockImplementation(() => Promise.resolve(testState.gradingSession)),
			},
		};
	}

	function setupMLServiceMocks() {
		// Mock gradeExamResponse with realistic behavior
		jest
			.spyOn(mlService, "gradeExamResponse")
			.mockImplementation(async (input) => {
				// Simulate varying confidence levels
				const random = Math.random();
				let confidence: number;
				let correctness: "CORRECT" | "PARTIAL" | "INCORRECT";
				let score: number;

				if (random > 0.7) {
					// High confidence - correct
					confidence = 0.95 + Math.random() * 0.05;
					correctness = "CORRECT";
					score = input.maxMarks;
				} else if (random > 0.4) {
					// Medium confidence - partial
					confidence = 0.8 + Math.random() * 0.15;
					correctness = "PARTIAL";
					score = Math.round(input.maxMarks * 0.5 * 100) / 100;
				} else {
					// Low confidence - needs review
					confidence = 0.5 + Math.random() * 0.3;
					correctness = Math.random() > 0.5 ? "PARTIAL" : "INCORRECT";
					score =
						correctness === "PARTIAL"
							? Math.round(input.maxMarks * 0.3 * 100) / 100
							: 0;
				}

				return {
					extractedAnswer: `Extracted answer for Q${input.questionNumber}`,
					score,
					correctness,
					confidence,
					explanation: `Grading explanation for Q${input.questionNumber}`,
				};
			});

		// Mock calibrateGrading
		jest.spyOn(mlService, "calibrateGrading").mockResolvedValue({
			accuracy: 0.85,
			averageDeviation: 1.2,
		});

		// Mock generateExpectedResponse
		jest
			.spyOn(mlService, "generateExpectedResponse")
			.mockImplementation(async (input) => ({
				answer: `AI-generated answer for: ${input.questionText.substring(0, 20)}...`,
				keywords: JSON.stringify(["key1", "key2"]),
				markingScheme: JSON.stringify({
					full: input.marks,
					partial: input.marks * 0.5,
				}),
				confidence: 0.9,
			}));
	}

	afterAll(async () => {
		// Cleanup
	});

	describe("Complete Grading Workflow Scenario", () => {
		// ==================
		// STEP 1: Create Exam Paper
		// ==================
		it("Step 1: Teacher creates a new exam paper", async () => {
			console.log("\n📝 Step 1: Creating exam paper...");

			const paper = await workflowService.createExamPaper(
				{
					title: "End of Year Mathematics Examination",
					subject: "Mathematics",
					description:
						"Comprehensive test covering algebra, geometry, and calculus",
					totalMarks: 100,
					duration: 180, // 3 hours
				},
				teacherId,
			);

			expect(paper).toBeDefined();
			expect(paper.id).toBeDefined();
			expect(paper.status).toBe("DRAFT");
			expect(paper.title).toBe("End of Year Mathematics Examination");

			console.log(
				`   ✅ Created exam paper: ${paper.id} with status ${paper.status}`,
			);
		});

		// ==================
		// STEP 1.5: Add Questions
		// ==================
		it("Step 1.5: Teacher adds questions to the exam", async () => {
			console.log("\n📝 Step 1.5: Adding questions...");

			const questions = [
				{
					questionNumber: 1,
					questionText: "Solve the quadratic equation: x² + 5x + 6 = 0",
					questionType: "SHORT_ANSWER",
					marks: 15,
				},
				{
					questionNumber: 2,
					questionText: "Find the derivative of f(x) = 3x² + 2x - 5",
					questionType: "SHORT_ANSWER",
					marks: 20,
				},
				{
					questionNumber: 3,
					questionText: "Calculate the area of a circle with radius 7cm",
					questionType: "NUMERIC",
					marks: 10,
				},
				{
					questionNumber: 4,
					questionText:
						"Explain the Pythagorean theorem and provide an example",
					questionType: "LONG_ANSWER",
					marks: 25,
				},
				{
					questionNumber: 5,
					questionText:
						"Which of the following is a prime number? A) 4 B) 6 C) 7 D) 9",
					questionType: "MCQ",
					marks: 5,
					metadata: JSON.stringify({
						options: ["A", "B", "C", "D"],
						correct: "C",
					}),
				},
			];

			for (const q of questions) {
				await workflowService.addQuestion(
					{
						examPaperId: testState.examPaper.id,
						questionNumber: q.questionNumber,
						questionText: q.questionText,
						questionType: q.questionType as any,
						marks: q.marks,
						metadata: q.metadata,
					},
					teacherId,
				);
			}

			expect(testState.questions).toHaveLength(5);
			console.log(
				`   ✅ Added ${testState.questions.length} questions (total marks: ${testState.questions.reduce((sum: number, q: any) => sum + q.marks, 0)})`,
			);
		});

		// ==================
		// STEP 2: Set Expected Responses
		// ==================
		it("Step 2: Teacher sets expected responses / marking guide", async () => {
			console.log("\n📝 Step 2: Setting expected responses...");

			const expectedResponses = [
				{
					questionId: testState.questions[0].id,
					expectedAnswer: "x = -2, x = -3",
					keywords: JSON.stringify([
						"quadratic formula",
						"factoring",
						"-2",
						"-3",
					]),
					markingScheme: JSON.stringify({
						fullMarks: "Both roots correct",
						partial: "One root correct",
					}),
				},
				{
					questionId: testState.questions[1].id,
					expectedAnswer: "f'(x) = 6x + 2",
					keywords: JSON.stringify(["derivative", "6x", "+2"]),
					markingScheme: JSON.stringify({
						fullMarks: "Correct derivative",
						partial: "Correct method, arithmetic error",
					}),
				},
				{
					questionId: testState.questions[2].id,
					expectedAnswer: "153.94 cm² (or 49π cm²)",
					keywords: JSON.stringify(["πr²", "154", "49π"]),
					markingScheme: JSON.stringify({
						fullMarks: "Correct area with units",
					}),
				},
				{
					questionId: testState.questions[3].id,
					expectedAnswer:
						"In a right triangle, a² + b² = c² where c is the hypotenuse",
					keywords: JSON.stringify([
						"right triangle",
						"hypotenuse",
						"a² + b² = c²",
						"example",
					]),
					markingScheme: JSON.stringify({
						fullMarks: "Clear explanation + correct example",
						partial: "Explanation only OR formula only",
					}),
				},
				{
					questionId: testState.questions[4].id,
					expectedAnswer: "C",
					keywords: JSON.stringify(["7", "prime"]),
					markingScheme: JSON.stringify({ fullMarks: "Correct answer C" }),
				},
			];

			for (const response of expectedResponses) {
				await workflowService.addExpectedResponse(
					{
						examPaperId: testState.examPaper.id,
						...response,
					},
					teacherId,
				);
			}

			expect(testState.expectedResponses).toHaveLength(5);
			console.log(
				`   ✅ Set ${testState.expectedResponses.length} expected responses with marking schemes`,
			);
		});

		// ==================
		// STEP 3: Add Moderation Samples
		// ==================
		it("Step 3: Teacher adds moderation samples for calibration", async () => {
			console.log("\n📝 Step 3: Adding moderation samples...");

			const samples = [
				{
					studentName: "Sample Student 1",
					imageUrl: "https://storage.example.com/moderation/sample1.jpg",
					totalScore: 85,
					feedback: "Excellent work on algebra and calculus sections",
					questionScores: JSON.stringify([
						{
							questionId: testState.questions[0].id,
							score: 15,
							comment: "Perfect",
						},
						{
							questionId: testState.questions[1].id,
							score: 20,
							comment: "Correct",
						},
						{
							questionId: testState.questions[2].id,
							score: 8,
							comment: "Minor rounding error",
						},
						{
							questionId: testState.questions[3].id,
							score: 22,
							comment: "Good explanation, could be more detailed",
						},
						{
							questionId: testState.questions[4].id,
							score: 5,
							comment: "Correct",
						},
					]),
				},
				{
					studentName: "Sample Student 2",
					imageUrl: "https://storage.example.com/moderation/sample2.jpg",
					totalScore: 65,
					feedback: "Need to work on essay questions",
					questionScores: JSON.stringify([
						{
							questionId: testState.questions[0].id,
							score: 12,
							comment: "One root incorrect",
						},
						{
							questionId: testState.questions[1].id,
							score: 15,
							comment: "Arithmetic error",
						},
						{
							questionId: testState.questions[2].id,
							score: 10,
							comment: "Correct",
						},
						{
							questionId: testState.questions[3].id,
							score: 15,
							comment: "Incomplete explanation",
						},
						{
							questionId: testState.questions[4].id,
							score: 5,
							comment: "Correct",
						},
					]),
				},
				{
					studentName: "Sample Student 3",
					imageUrl: "https://storage.example.com/moderation/sample3.jpg",
					totalScore: 45,
					feedback: "Needs significant improvement",
					questionScores: JSON.stringify([
						{
							questionId: testState.questions[0].id,
							score: 5,
							comment: "Wrong approach",
						},
						{
							questionId: testState.questions[1].id,
							score: 10,
							comment: "Partial credit",
						},
						{
							questionId: testState.questions[2].id,
							score: 5,
							comment: "Wrong formula",
						},
						{
							questionId: testState.questions[3].id,
							score: 10,
							comment: "Very brief",
						},
						{
							questionId: testState.questions[4].id,
							score: 5,
							comment: "Correct",
						},
					]),
				},
			];

			for (const sample of samples) {
				await workflowService.addModerationSample(
					{
						examPaperId: testState.examPaper.id,
						...sample,
					},
					teacherId,
				);
			}

			// Verify samples
			for (const sample of testState.moderationSamples) {
				await workflowService.verifyModerationSample(
					sample.id,
					true,
					teacherId,
				);
			}

			expect(testState.moderationSamples).toHaveLength(3);
			expect(testState.moderationSamples.every((s: any) => s.isVerified)).toBe(
				true,
			);
			console.log(
				`   ✅ Added and verified ${testState.moderationSamples.length} moderation samples`,
			);
		});

		// ==================
		// STEP 3.5: Run Calibration
		// ==================
		it("Step 3.5: System calibrates grading model", async () => {
			console.log("\n📝 Step 3.5: Running calibration...");

			const calibrationResult = await workflowService.runCalibration(
				testState.examPaper.id,
				teacherId,
			);

			expect(calibrationResult.isCalibrated).toBe(true);
			expect(calibrationResult.accuracy).toBeGreaterThanOrEqual(0.8);
			console.log(
				`   ✅ Calibration complete - Accuracy: ${(calibrationResult.accuracy * 100).toFixed(1)}%`,
			);
			console.log(`   ✅ ${calibrationResult.message}`);
		});

		// ==================
		// STEP 4: Upload Student Submissions
		// ==================
		it("Step 4: Teacher uploads student scripts for grading", async () => {
			console.log("\n📝 Step 4: Uploading student submissions...");

			const students = [
				{
					name: "Alice Johnson",
					email: "alice@student.edu",
					imageUrl: "https://storage.example.com/submissions/alice.jpg",
				},
				{
					name: "Bob Smith",
					email: "bob@student.edu",
					imageUrl: "https://storage.example.com/submissions/bob.jpg",
				},
				{
					name: "Carol Davis",
					email: "carol@student.edu",
					imageUrl: "https://storage.example.com/submissions/carol.jpg",
				},
				{
					name: "David Wilson",
					email: "david@student.edu",
					imageUrl: "https://storage.example.com/submissions/david.jpg",
				},
				{
					name: "Eve Thompson",
					email: "eve@student.edu",
					imageUrl: "https://storage.example.com/submissions/eve.jpg",
				},
			];

			for (const student of students) {
				await workflowService.addStudentSubmission(
					{
						examPaperId: testState.examPaper.id,
						studentName: student.name,
						studentEmail: student.email,
						imageUrl: student.imageUrl,
					},
					teacherId,
				);
			}

			expect(testState.studentSubmissions).toHaveLength(5);
			expect(
				testState.studentSubmissions.every((s: any) => s.status === "UPLOADED"),
			).toBe(true);
			console.log(
				`   ✅ Uploaded ${testState.studentSubmissions.length} student scripts`,
			);
		});

		// ==================
		// STEP 4.5: Start Batch Grading
		// ==================
		it("Step 4.5: System performs batch grading", async () => {
			console.log("\n📝 Step 4.5: Starting batch grading...");

			const session = await workflowService.startBatchGrading(
				{ examPaperId: testState.examPaper.id },
				teacherId,
			);

			expect(session).toBeDefined();
			expect(session.status).toBe("GRADING");
			console.log(`   ✅ Grading session started: ${session.id}`);
			console.log(
				`   ✅ Processing ${session.totalSubmissions} submissions...`,
			);

			// Give the async process time to complete (in real scenario this would be checked via polling)
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Check that responses were created
			expect(testState.studentResponses.length).toBeGreaterThan(0);
			console.log(
				`   ✅ Generated ${testState.studentResponses.length} graded responses`,
			);
		});

		// ==================
		// STEP 5: Review Results
		// ==================
		it("Step 5: Teacher reviews low-confidence results", async () => {
			console.log("\n📝 Step 5: Reviewing grading results...");

			const reviewNeeded = await workflowService.getResponsesNeedingReview(
				testState.examPaper.id,
				teacherId,
			);

			console.log(
				`   📊 Total responses needing review: ${reviewNeeded.totalNeedingReview}`,
			);
			console.log(
				`   📊 High priority (< 80% confidence): ${reviewNeeded.byPriority?.high || 0}`,
			);
			console.log(
				`   📊 Medium priority (80-95% confidence): ${reviewNeeded.byPriority?.medium || 0}`,
			);

			// Teacher reviews a few low-confidence responses
			const lowConfidenceResponses = testState.studentResponses.filter(
				(r: any) => r.confidence < 0.8,
			);
			let reviewedCount = 0;

			for (const response of lowConfidenceResponses.slice(0, 3)) {
				// Teacher reviews and adjusts score
				const adjustedScore = Math.round(response.maxScore * 0.7 * 100) / 100;

				await workflowService.reviewResponse(
					{
						responseId: response.id,
						teacherOverride: adjustedScore,
						teacherComment:
							"Reviewed and adjusted based on partial understanding shown",
						needsReview: false,
					},
					teacherId,
				);
				reviewedCount++;
			}

			console.log(
				`   ✅ Teacher manually reviewed ${reviewedCount} low-confidence responses`,
			);
		});

		// ==================
		// STEP 5.5: Batch Approve High Confidence
		// ==================
		it("Step 5.5: Teacher batch approves high-confidence results", async () => {
			console.log("\n📝 Step 5.5: Batch approving high-confidence results...");

			const result = await workflowService.batchApproveHighConfidence(
				testState.examPaper.id,
				teacherId,
			);

			console.log(`   ✅ ${result.message}`);
		});

		// ==================
		// STEP 6: Finalize and Publish
		// ==================
		it("Step 6: Teacher finalizes and publishes results", async () => {
			console.log("\n📝 Step 6: Finalizing grading...");

			const finalPaper = await workflowService.finalizeGrading(
				testState.examPaper.id,
				teacherId,
				true, // publish results
			);

			expect(testState.examPaper.status).toBe("COMPLETED");
			console.log(`   ✅ Grading finalized and results published`);
			console.log(`   ✅ Exam paper status: ${testState.examPaper.status}`);
		});

		// ==================
		// Summary
		// ==================
		it("Workflow Summary", () => {
			console.log("\n" + "=".repeat(60));
			console.log("📋 GRADING WORKFLOW SUMMARY");
			console.log("=".repeat(60));
			console.log(`Exam: ${testState.examPaper?.title}`);
			console.log(`Subject: ${testState.examPaper?.subject}`);
			console.log(`Total Marks: ${testState.examPaper?.totalMarks}`);
			console.log(`Questions: ${testState.questions.length}`);
			console.log(`Expected Responses: ${testState.expectedResponses.length}`);
			console.log(`Moderation Samples: ${testState.moderationSamples.length}`);
			console.log(
				`Student Submissions: ${testState.studentSubmissions.length}`,
			);
			console.log(`Graded Responses: ${testState.studentResponses.length}`);
			console.log(`Final Status: ${testState.examPaper?.status}`);
			console.log("=".repeat(60));
			console.log("✅ Complete grading workflow executed successfully!");
			console.log("=".repeat(60) + "\n");

			expect(testState.examPaper).toBeDefined();
			expect(testState.examPaper.status).toBe("COMPLETED");
		});
	});
});
