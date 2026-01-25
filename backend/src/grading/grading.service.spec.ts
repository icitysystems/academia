import { Test, TestingModule } from "@nestjs/testing";
import { GradingService } from "./grading.service";
import { PrismaService } from "../prisma.service";
import { MLService } from "../ml/ml.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("GradingService", () => {
	let service: GradingService;
	let prisma: PrismaService;
	let mlService: MLService;

	const mockPrismaService = {
		gradingJob: {
			create: jest.fn(),
			findUnique: jest.fn(),
			findMany: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
		},
		gradingResult: {
			create: jest.fn(),
			findMany: jest.fn(),
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

	const mockUserId = "teacher-123";
	const mockTemplateId = "template-123";
	const mockJobId = "job-123";

	const mockGradingJob = {
		id: mockJobId,
		templateId: mockTemplateId,
		modelId: "model-123",
		teacherId: mockUserId,
		status: "PENDING",
		totalSheets: 5,
		processedSheets: 0,
		createdAt: new Date(),
		startedAt: null,
		completedAt: null,
	};

	const mockModel = {
		id: "model-123",
		templateId: mockTemplateId,
		status: "ACTIVE",
		accuracy: 0.95,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GradingService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: MLService, useValue: mockMLService },
			],
		}).compile();

		service = module.get<GradingService>(GradingService);
		prisma = module.get<PrismaService>(PrismaService);
		mlService = module.get<MLService>(MLService);

		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("startBatchGrading", () => {
		it("should create a grading job when active model exists", async () => {
			const sheetIds = ["sheet-1", "sheet-2", "sheet-3"];

			mockMLService.getActiveModel.mockResolvedValue(mockModel);
			mockPrismaService.gradingJob.create.mockResolvedValue(mockGradingJob);
			mockPrismaService.gradingJob.findUnique.mockResolvedValue(mockGradingJob);
			mockPrismaService.gradingJob.update.mockResolvedValue(mockGradingJob);

			const result = await service.startBatchGrading(
				mockTemplateId,
				sheetIds,
				mockUserId,
			);

			expect(result.id).toBe(mockJobId);
			expect(result.totalSheets).toBe(5);
			expect(mockMLService.getActiveModel).toHaveBeenCalledWith(mockTemplateId);
			expect(mockPrismaService.gradingJob.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						templateId: mockTemplateId,
						teacherId: mockUserId,
						status: "PENDING",
					}),
				}),
			);
		});

		it("should throw BadRequestException if no active model", async () => {
			const sheetIds = ["sheet-1"];

			mockMLService.getActiveModel.mockResolvedValue(null);

			await expect(
				service.startBatchGrading(mockTemplateId, sheetIds, mockUserId),
			).rejects.toThrow(BadRequestException);
		});
	});

	describe("getJob", () => {
		it("should return a grading job by id", async () => {
			mockPrismaService.gradingJob.findUnique.mockResolvedValue({
				...mockGradingJob,
				results: [],
			});

			const result = await service.getJob(mockJobId, mockUserId);

			expect(result.id).toBe(mockJobId);
			expect(mockPrismaService.gradingJob.findUnique).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: mockJobId },
				}),
			);
		});

		it("should throw NotFoundException if job not found", async () => {
			mockPrismaService.gradingJob.findUnique.mockResolvedValue(null);

			await expect(service.getJob("non-existent", mockUserId)).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe("getJobs", () => {
		it("should return all grading jobs for a teacher", async () => {
			const jobs = [mockGradingJob];
			mockPrismaService.gradingJob.findMany.mockResolvedValue(jobs);

			const result = await service.getJobs(mockUserId);

			expect(result).toHaveLength(1);
			expect(mockPrismaService.gradingJob.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { teacherId: mockUserId },
				}),
			);
		});

		it("should filter by templateId if provided", async () => {
			const jobs = [mockGradingJob];
			mockPrismaService.gradingJob.findMany.mockResolvedValue(jobs);

			const result = await service.getJobs(mockUserId, mockTemplateId);

			expect(result).toHaveLength(1);
			expect(mockPrismaService.gradingJob.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { teacherId: mockUserId, templateId: mockTemplateId },
				}),
			);
		});
	});
});
