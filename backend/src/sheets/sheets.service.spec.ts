import { Test, TestingModule } from "@nestjs/testing";
import { SheetsService } from "./sheets.service";
import { PrismaService } from "../prisma.service";
import { StorageService } from "../storage/storage.service";
import { ImageProcessingService } from "./image-processing.service";
import {
	NotFoundException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";

describe("SheetsService", () => {
	let service: SheetsService;
	let prisma: PrismaService;
	let storageService: StorageService;

	const mockPrismaService = {
		template: {
			findUnique: jest.fn(),
			findMany: jest.fn(),
		},
		answerSheet: {
			create: jest.fn(),
			findMany: jest.fn(),
			findUnique: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
		},
		regionCrop: {
			create: jest.fn(),
		},
	};

	const mockStorageService = {
		uploadBase64: jest.fn(),
		deleteFile: jest.fn(),
	};

	const mockImageProcessingService = {
		cropRegions: jest.fn(),
		processSheet: jest.fn(),
	};

	const mockUserId = "user-123";
	const mockTemplateId = "template-123";
	const mockSheetId = "sheet-123";

	const mockTemplate = {
		id: mockTemplateId,
		name: "Test Template",
		createdById: mockUserId,
		regions: [
			{
				id: "region-1",
				label: "Q1",
				bboxX: 10,
				bboxY: 10,
				bboxWidth: 100,
				bboxHeight: 50,
			},
		],
	};

	const mockSheet = {
		id: mockSheetId,
		templateId: mockTemplateId,
		studentId: "student-123",
		studentName: "John Doe",
		originalUrl: "http://example.com/sheet.jpg",
		status: "UPLOADED",
		createdAt: new Date(),
		template: mockTemplate,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SheetsService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: StorageService, useValue: mockStorageService },
				{
					provide: ImageProcessingService,
					useValue: mockImageProcessingService,
				},
			],
		}).compile();

		service = module.get<SheetsService>(SheetsService);
		prisma = module.get<PrismaService>(PrismaService);
		storageService = module.get<StorageService>(StorageService);

		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("uploadSheet", () => {
		const uploadInput = {
			templateId: mockTemplateId,
			imageData: "base64-image-data",
			fileName: "test-sheet.jpg",
			studentId: "student-123",
			studentName: "John Doe",
		};

		it("should upload a sheet successfully", async () => {
			mockPrismaService.template.findUnique.mockResolvedValue(mockTemplate);
			mockStorageService.uploadBase64.mockResolvedValue({
				url: "http://example.com/uploaded-sheet.jpg",
				key: "sheets/uploaded-sheet.jpg",
			});
			mockPrismaService.answerSheet.create.mockResolvedValue(mockSheet);

			const result = await service.uploadSheet(uploadInput, mockUserId);

			expect(result.id).toBe(mockSheetId);
			expect(mockStorageService.uploadBase64).toHaveBeenCalledWith(
				uploadInput.imageData,
				uploadInput.fileName,
				"sheets",
			);
		});

		it("should throw NotFoundException if template not found", async () => {
			mockPrismaService.template.findUnique.mockResolvedValue(null);

			await expect(
				service.uploadSheet(uploadInput, mockUserId),
			).rejects.toThrow(NotFoundException);
		});

		it("should throw ForbiddenException if user does not own template", async () => {
			mockPrismaService.template.findUnique.mockResolvedValue({
				...mockTemplate,
				createdById: "other-user",
			});

			await expect(
				service.uploadSheet(uploadInput, mockUserId),
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe("batchUpload", () => {
		it("should upload multiple sheets", async () => {
			const batchInput = {
				templateId: mockTemplateId,
				sheets: [
					{
						imageData: "base64-data-1",
						fileName: "sheet1.jpg",
						studentId: "student-1",
						studentName: "Student One",
					},
					{
						imageData: "base64-data-2",
						fileName: "sheet2.jpg",
						studentId: "student-2",
						studentName: "Student Two",
					},
				],
			};

			mockPrismaService.template.findUnique.mockResolvedValue(mockTemplate);
			mockStorageService.uploadBase64.mockResolvedValue({
				url: "http://example.com/sheet.jpg",
				key: "sheets/sheet.jpg",
			});
			mockPrismaService.answerSheet.create.mockResolvedValue(mockSheet);

			const result = await service.batchUpload(batchInput, mockUserId);

			expect(result).toHaveLength(2);
			expect(result[0].success).toBe(true);
		});
	});

	describe("findAll", () => {
		it("should return sheets for a user", async () => {
			mockPrismaService.template.findMany.mockResolvedValue([mockTemplate]);
			mockPrismaService.answerSheet.findMany.mockResolvedValue([mockSheet]);

			const result = await service.findAll(mockUserId);

			expect(result).toHaveLength(1);
			expect(mockPrismaService.answerSheet.findMany).toHaveBeenCalled();
		});

		it("should filter by templateId if provided", async () => {
			mockPrismaService.template.findMany.mockResolvedValue([mockTemplate]);
			mockPrismaService.answerSheet.findMany.mockResolvedValue([mockSheet]);

			const result = await service.findAll(mockUserId, mockTemplateId);

			expect(result).toHaveLength(1);
		});
	});

	describe("findOne", () => {
		it("should return a sheet by id", async () => {
			mockPrismaService.answerSheet.findUnique.mockResolvedValue({
				...mockSheet,
				template: mockTemplate,
			});

			const result = await service.findOne(mockSheetId, mockUserId);

			expect(result.id).toBe(mockSheetId);
		});

		it("should throw NotFoundException if sheet not found", async () => {
			mockPrismaService.answerSheet.findUnique.mockResolvedValue(null);

			await expect(service.findOne("non-existent", mockUserId)).rejects.toThrow(
				NotFoundException,
			);
		});
	});
});
