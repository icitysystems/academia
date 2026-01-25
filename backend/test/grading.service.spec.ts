import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { GradingService } from "../src/grading/grading.service";
import { PrismaService } from "../src/prisma.service";
import { MLService } from "../src/ml/ml.service";

describe("GradingService", () => {
	let service: GradingService;
	let prismaService: jest.Mocked<PrismaService>;
	let mlService: jest.Mocked<MLService>;

	const mockTeacher = {
		id: "teacher-123",
		email: "teacher@example.com",
		name: "Test Teacher",
		role: "FACULTY",
	};

	const mockModel = {
		id: "model-123",
		name: "Test Model",
		templateId: "template-123",
		status: "ACTIVE",
		accuracy: 0.95,
	};

	const mockTemplate = {
		id: "template-123",
		name: "Math Test Template",
		createdById: mockTeacher.id,
	};

	const mockJob = {
		id: "job-123",
		templateId: mockTemplate.id,
		modelId: mockModel.id,
		teacherId: mockTeacher.id,
		status: "PENDING",
		totalSheets: 2,
		processedSheets: 0,
		createdAt: new Date(),
	};

	const mockSheet = {
		id: "sheet-123",
		templateId: mockTemplate.id,
		studentId: "student-123",
		status: "UPLOADED",
		imageUrl: "https://example.com/sheet.jpg",
		template: mockTemplate,
	};

	const mockResult = {
		id: "result-123",
		jobId: mockJob.id,
		sheetId: mockSheet.id,
		regionId: "region-123",
		predictedCorrectness: "CORRECT",
		confidence: 0.92,
		assignedScore: 10,
		needsReview: false,
		job: mockJob,
	};

	beforeEach(async () => {
		const mockPrismaService = {
			gradingJob: {
				create: jest.fn(),
				update: jest.fn(),
				findUnique: jest.fn(),
				findMany: jest.fn(),
			},
			gradingResult: {
				create: jest.fn(),
				findUnique: jest.fn(),
				findMany: jest.fn(),
				update: jest.fn(),
				groupBy: jest.fn(),
			},
			answerSheet: {
				findUnique: jest.fn(),
				update: jest.fn(),
			},
		};

		const mockMLService = {
			getActiveModel: jest.fn(),
			gradeSheet: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GradingService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: MLService, useValue: mockMLService },
			],
		}).compile();

		service = module.get<GradingService>(GradingService);
		prismaService = module.get(PrismaService);
		mlService = module.get(MLService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("startBatchGrading", () => {
		const sheetIds = ["sheet-1", "sheet-2"];

		it("should create and start a grading job", async () => {
			mlService.getActiveModel = jest.fn().mockResolvedValue(mockModel);
			prismaService.gradingJob.create = jest.fn().mockResolvedValue(mockJob);
			prismaService.gradingJob.findUnique = jest
				.fn()
				.mockResolvedValue(mockJob);
			prismaService.gradingJob.update = jest.fn().mockResolvedValue(mockJob);
			mlService.gradeSheet = jest.fn().mockResolvedValue({
				predictions: [
					{
						regionId: "region-1",
						predictedCorrectness: "CORRECT",
						confidence: 0.95,
						assignedScore: 10,
						needsReview: false,
					},
				],
			});
			prismaService.gradingResult.create = jest
				.fn()
				.mockResolvedValue(mockResult);
			prismaService.answerSheet.update = jest.fn().mockResolvedValue(mockSheet);

			const result = await service.startBatchGrading(
				mockTemplate.id,
				sheetIds,
				mockTeacher.id,
			);

			expect(result.id).toBe(mockJob.id);
			expect(prismaService.gradingJob.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					templateId: mockTemplate.id,
					modelId: mockModel.id,
					teacherId: mockTeacher.id,
					status: "PENDING",
					totalSheets: sheetIds.length,
				}),
			});
		});

		it("should throw BadRequestException when no active model exists", async () => {
			mlService.getActiveModel = jest.fn().mockResolvedValue(null);

			await expect(
				service.startBatchGrading(mockTemplate.id, sheetIds, mockTeacher.id),
			).rejects.toThrow(BadRequestException);
		});
	});

	describe("getJob", () => {
		it("should return a grading job by ID", async () => {
			prismaService.gradingJob.findUnique = jest.fn().mockResolvedValue({
				...mockJob,
				model: mockModel,
				template: mockTemplate,
				results: [mockResult],
			});

			const result = await service.getJob(mockJob.id, mockTeacher.id);

			expect(result.id).toBe(mockJob.id);
			expect(prismaService.gradingJob.findUnique).toHaveBeenCalledWith({
				where: { id: mockJob.id },
				include: expect.any(Object),
			});
		});

		it("should throw NotFoundException for non-existent job", async () => {
			prismaService.gradingJob.findUnique = jest.fn().mockResolvedValue(null);

			await expect(
				service.getJob("invalid-id", mockTeacher.id),
			).rejects.toThrow(NotFoundException);
		});

		it("should throw NotFoundException if user does not own the job", async () => {
			prismaService.gradingJob.findUnique = jest
				.fn()
				.mockResolvedValue(mockJob);

			await expect(service.getJob(mockJob.id, "other-teacher")).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe("getJobs", () => {
		it("should return all grading jobs for a teacher", async () => {
			const jobs = [mockJob];
			prismaService.gradingJob.findMany = jest.fn().mockResolvedValue(jobs);

			const result = await service.getJobs(mockTeacher.id);

			expect(result).toEqual(jobs);
			expect(prismaService.gradingJob.findMany).toHaveBeenCalledWith({
				where: { teacherId: mockTeacher.id },
				include: expect.any(Object),
				orderBy: { createdAt: "desc" },
			});
		});

		it("should filter by templateId if provided", async () => {
			prismaService.gradingJob.findMany = jest
				.fn()
				.mockResolvedValue([mockJob]);

			await service.getJobs(mockTeacher.id, mockTemplate.id);

			expect(prismaService.gradingJob.findMany).toHaveBeenCalledWith({
				where: {
					teacherId: mockTeacher.id,
					templateId: mockTemplate.id,
				},
				include: expect.any(Object),
				orderBy: { createdAt: "desc" },
			});
		});
	});

	describe("getSheetResults", () => {
		it("should return grading results for a sheet", async () => {
			const sheetWithResults = {
				...mockSheet,
				gradingResults: [mockResult],
			};
			prismaService.answerSheet.findUnique = jest
				.fn()
				.mockResolvedValue(sheetWithResults);

			const result = await service.getSheetResults(
				mockSheet.id,
				mockTeacher.id,
			);

			expect(result).toEqual([mockResult]);
		});

		it("should throw NotFoundException for non-existent sheet", async () => {
			prismaService.answerSheet.findUnique = jest.fn().mockResolvedValue(null);

			await expect(
				service.getSheetResults("invalid-id", mockTeacher.id),
			).rejects.toThrow(NotFoundException);
		});

		it("should throw NotFoundException if user does not own the template", async () => {
			const sheetOwnedByOther = {
				...mockSheet,
				template: { ...mockTemplate, createdById: "other-teacher" },
			};
			prismaService.answerSheet.findUnique = jest
				.fn()
				.mockResolvedValue(sheetOwnedByOther);

			await expect(
				service.getSheetResults(mockSheet.id, mockTeacher.id),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe("reviewResult", () => {
		it("should update a grading result with review", async () => {
			prismaService.gradingResult.findUnique = jest
				.fn()
				.mockResolvedValue(mockResult);
			prismaService.gradingResult.update = jest.fn().mockResolvedValue({
				...mockResult,
				assignedScore: 8,
				needsReview: false,
				reviewedAt: new Date(),
			});

			const result = await service.reviewResult(mockResult.id, mockTeacher.id, {
				assignedScore: 8,
			});

			expect(result.assignedScore).toBe(8);
			expect(result.needsReview).toBe(false);
			expect(prismaService.gradingResult.update).toHaveBeenCalledWith({
				where: { id: mockResult.id },
				data: expect.objectContaining({
					assignedScore: 8,
					needsReview: false,
					reviewedAt: expect.any(Date),
				}),
			});
		});

		it("should throw NotFoundException for non-existent result", async () => {
			prismaService.gradingResult.findUnique = jest
				.fn()
				.mockResolvedValue(null);

			await expect(
				service.reviewResult("invalid-id", mockTeacher.id, {
					assignedScore: 8,
				}),
			).rejects.toThrow(NotFoundException);
		});

		it("should throw NotFoundException if user does not own the job", async () => {
			const resultOwnedByOther = {
				...mockResult,
				job: { ...mockJob, teacherId: "other-teacher" },
			};
			prismaService.gradingResult.findUnique = jest
				.fn()
				.mockResolvedValue(resultOwnedByOther);

			await expect(
				service.reviewResult(mockResult.id, mockTeacher.id, {
					assignedScore: 8,
				}),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe("getResultsNeedingReview", () => {
		it("should return results that need review", async () => {
			const resultsNeedingReview = [
				{ ...mockResult, needsReview: true, confidence: 0.6 },
			];
			prismaService.gradingResult.findMany = jest
				.fn()
				.mockResolvedValue(resultsNeedingReview);

			const result = await service.getResultsNeedingReview(
				mockTemplate.id,
				mockTeacher.id,
			);

			expect(result).toEqual(resultsNeedingReview);
			expect(prismaService.gradingResult.findMany).toHaveBeenCalledWith({
				where: {
					needsReview: true,
					job: {
						templateId: mockTemplate.id,
						teacherId: mockTeacher.id,
					},
				},
				include: expect.any(Object),
				orderBy: { confidence: "asc" },
			});
		});
	});

	describe("getGradingStats", () => {
		it("should return grading statistics", async () => {
			const jobs = [mockJob];
			const results = [
				mockResult,
				{ ...mockResult, id: "result-2", needsReview: true },
				{ ...mockResult, id: "result-3", reviewedAt: new Date() },
			];

			prismaService.gradingJob.findMany = jest.fn().mockResolvedValue(jobs);
			prismaService.gradingResult.findMany = jest
				.fn()
				.mockResolvedValue(results);
			prismaService.gradingResult.groupBy = jest.fn().mockResolvedValue([
				{
					predictedCorrectness: "CORRECT",
					_count: 2,
					_avg: { confidence: 0.9 },
				},
				{
					predictedCorrectness: "INCORRECT",
					_count: 1,
					_avg: { confidence: 0.8 },
				},
			]);

			const stats = await service.getGradingStats(
				mockTemplate.id,
				mockTeacher.id,
			);

			expect(stats.totalJobs).toBe(1);
			expect(stats.totalResults).toBe(3);
			expect(stats.needsReview).toBe(1);
			expect(stats.reviewed).toBe(1);
			expect(stats.scoreDistribution).toHaveLength(2);
		});
	});
});
