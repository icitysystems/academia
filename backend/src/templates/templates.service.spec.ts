import { Test, TestingModule } from "@nestjs/testing";
import { TemplatesService } from "./templates.service";
import { PrismaService } from "../prisma.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("TemplatesService", () => {
	let service: TemplatesService;
	let prisma: PrismaService;

	const mockPrismaService = {
		template: {
			create: jest.fn(),
			findMany: jest.fn(),
			findUnique: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
		},
		templateRegion: {
			create: jest.fn(),
			update: jest.fn(),
			delete: jest.fn(),
			updateMany: jest.fn(),
		},
	};

	const mockUserId = "user-123";
	const mockTemplateId = "template-123";

	const mockTemplate = {
		id: mockTemplateId,
		name: "Test Template",
		description: "A test template",
		imageUrl: "http://example.com/image.png",
		answerKeyUrl: null,
		createdById: mockUserId,
		createdAt: new Date(),
		updatedAt: new Date(),
		regions: [],
		createdBy: { id: mockUserId, name: "Test User", email: "test@example.com" },
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TemplatesService,
				{ provide: PrismaService, useValue: mockPrismaService },
			],
		}).compile();

		service = module.get<TemplatesService>(TemplatesService);
		prisma = module.get<PrismaService>(PrismaService);

		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("create", () => {
		it("should create a new template", async () => {
			const input = {
				name: "New Template",
				description: "A new template description",
				imageUrl: "http://example.com/new-image.png",
			};

			mockPrismaService.template.create.mockResolvedValue({
				...mockTemplate,
				...input,
			});

			const result = await service.create(input, mockUserId);

			expect(result.name).toBe(input.name);
			expect(mockPrismaService.template.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						name: input.name,
						createdById: mockUserId,
					}),
				}),
			);
		});

		it("should create a template with regions", async () => {
			const input = {
				name: "Template with Regions",
				description: "Has regions",
				imageUrl: "http://example.com/image.png",
				regions: [
					{
						label: "Question 1",
						questionType: "MCQ",
						points: 5,
						bboxX: 10,
						bboxY: 10,
						bboxWidth: 100,
						bboxHeight: 50,
					},
				],
			};

			mockPrismaService.template.create.mockResolvedValue({
				...mockTemplate,
				...input,
				regions: [
					{
						id: "region-1",
						label: "Question 1",
						questionType: "MCQ",
						points: 5,
						bboxX: 10,
						bboxY: 10,
						bboxWidth: 100,
						bboxHeight: 50,
						orderIndex: 0,
					},
				],
			});

			const result = await service.create(input, mockUserId);

			expect(result.regions).toHaveLength(1);
			expect(result.regions[0].label).toBe("Question 1");
		});
	});

	describe("findAll", () => {
		it("should return all templates for a user", async () => {
			mockPrismaService.template.findMany.mockResolvedValue([mockTemplate]);

			const result = await service.findAll(mockUserId);

			expect(result).toHaveLength(1);
			expect(mockPrismaService.template.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { createdById: mockUserId },
				}),
			);
		});

		it("should return empty array if user has no templates", async () => {
			mockPrismaService.template.findMany.mockResolvedValue([]);

			const result = await service.findAll(mockUserId);

			expect(result).toHaveLength(0);
		});
	});

	describe("findOne", () => {
		it("should return a template by id", async () => {
			mockPrismaService.template.findUnique.mockResolvedValue(mockTemplate);

			const result = await service.findOne(mockTemplateId, mockUserId);

			expect(result.id).toBe(mockTemplateId);
			expect(mockPrismaService.template.findUnique).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: mockTemplateId },
				}),
			);
		});

		it("should throw NotFoundException if template not found", async () => {
			mockPrismaService.template.findUnique.mockResolvedValue(null);

			await expect(service.findOne("non-existent", mockUserId)).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe("update", () => {
		it("should update a template", async () => {
			const updateInput = { name: "Updated Name" };

			mockPrismaService.template.findUnique.mockResolvedValue(mockTemplate);
			mockPrismaService.template.update.mockResolvedValue({
				...mockTemplate,
				...updateInput,
			});

			const result = await service.update(
				mockTemplateId,
				updateInput,
				mockUserId,
			);

			expect(result.name).toBe(updateInput.name);
		});

		it("should throw ForbiddenException if user does not own template", async () => {
			mockPrismaService.template.findUnique.mockResolvedValue({
				...mockTemplate,
				createdById: "other-user",
			});

			await expect(
				service.update(mockTemplateId, { name: "New Name" }, mockUserId),
			).rejects.toThrow(ForbiddenException);
		});
	});

	describe("delete", () => {
		it("should delete a template", async () => {
			mockPrismaService.template.findUnique.mockResolvedValue(mockTemplate);
			mockPrismaService.template.delete.mockResolvedValue(mockTemplate);

			const result = await service.delete(mockTemplateId, mockUserId);

			expect(result.id).toBe(mockTemplateId);
			expect(mockPrismaService.template.delete).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: mockTemplateId },
				}),
			);
		});

		it("should throw ForbiddenException if user does not own template", async () => {
			mockPrismaService.template.findUnique.mockResolvedValue({
				...mockTemplate,
				createdById: "other-user",
			});

			await expect(service.delete(mockTemplateId, mockUserId)).rejects.toThrow(
				ForbiddenException,
			);
		});
	});
});
