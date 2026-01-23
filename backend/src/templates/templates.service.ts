import {
	Injectable,
	NotFoundException,
	ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateTemplateInput } from "./dto/create-template.input";
import { UpdateTemplateInput } from "./dto/update-template.input";
import { CreateRegionInput } from "./dto/create-region.input";
import { UpdateRegionInput } from "./dto/update-region.input";

@Injectable()
export class TemplatesService {
	constructor(private prisma: PrismaService) {}

	async create(input: CreateTemplateInput, userId: string) {
		return this.prisma.template.create({
			data: {
				name: input.name,
				description: input.description,
				imageUrl: input.imageUrl,
				answerKeyUrl: input.answerKeyUrl,
				createdById: userId,
				regions: input.regions
					? {
							create: input.regions.map((region, index) => ({
								label: region.label,
								questionType: region.questionType,
								points: region.points || 1,
								bboxX: region.bboxX,
								bboxY: region.bboxY,
								bboxWidth: region.bboxWidth,
								bboxHeight: region.bboxHeight,
								orderIndex: index,
								metadata: region.metadata,
							})),
					  }
					: undefined,
			},
			include: {
				regions: true,
				createdBy: true,
			},
		});
	}

	async findAll(userId: string) {
		return this.prisma.template.findMany({
			where: { createdById: userId },
			include: {
				regions: { orderBy: { orderIndex: "asc" } },
				createdBy: true,
				_count: {
					select: { sheets: true, annotations: true },
				},
			},
			orderBy: { createdAt: "desc" },
		});
	}

	async findOne(id: string, userId: string) {
		const template = await this.prisma.template.findUnique({
			where: { id },
			include: {
				regions: { orderBy: { orderIndex: "asc" } },
				createdBy: true,
				sheets: {
					take: 10,
					orderBy: { createdAt: "desc" },
				},
				_count: {
					select: { sheets: true, annotations: true, models: true },
				},
			},
		});

		if (!template) {
			throw new NotFoundException("Template not found");
		}

		if (template.createdById !== userId) {
			throw new ForbiddenException("Access denied");
		}

		return template;
	}

	async update(id: string, input: UpdateTemplateInput, userId: string) {
		const template = await this.findOne(id, userId);

		return this.prisma.template.update({
			where: { id },
			data: {
				name: input.name ?? template.name,
				description: input.description ?? template.description,
				imageUrl: input.imageUrl ?? template.imageUrl,
				answerKeyUrl: input.answerKeyUrl ?? template.answerKeyUrl,
				version: { increment: 1 },
			},
			include: {
				regions: { orderBy: { orderIndex: "asc" } },
				createdBy: true,
			},
		});
	}

	async delete(id: string, userId: string) {
		await this.findOne(id, userId);

		return this.prisma.template.delete({
			where: { id },
		});
	}

	// Region management
	async addRegion(
		templateId: string,
		input: CreateRegionInput,
		userId: string,
	) {
		await this.findOne(templateId, userId);

		const maxOrder = await this.prisma.templateRegion.aggregate({
			where: { templateId },
			_max: { orderIndex: true },
		});

		return this.prisma.templateRegion.create({
			data: {
				templateId,
				label: input.label,
				questionType: input.questionType,
				points: input.points || 1,
				bboxX: input.bboxX,
				bboxY: input.bboxY,
				bboxWidth: input.bboxWidth,
				bboxHeight: input.bboxHeight,
				orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
				metadata: input.metadata,
			},
		});
	}

	async updateRegion(
		regionId: string,
		input: UpdateRegionInput,
		userId: string,
	) {
		const region = await this.prisma.templateRegion.findUnique({
			where: { id: regionId },
			include: { template: true },
		});

		if (!region) {
			throw new NotFoundException("Region not found");
		}

		if (region.template.createdById !== userId) {
			throw new ForbiddenException("Access denied");
		}

		return this.prisma.templateRegion.update({
			where: { id: regionId },
			data: {
				label: input.label ?? region.label,
				questionType: input.questionType ?? region.questionType,
				points: input.points ?? region.points,
				bboxX: input.bboxX ?? region.bboxX,
				bboxY: input.bboxY ?? region.bboxY,
				bboxWidth: input.bboxWidth ?? region.bboxWidth,
				bboxHeight: input.bboxHeight ?? region.bboxHeight,
				metadata: input.metadata ?? region.metadata,
			},
		});
	}

	async deleteRegion(regionId: string, userId: string) {
		const region = await this.prisma.templateRegion.findUnique({
			where: { id: regionId },
			include: { template: true },
		});

		if (!region) {
			throw new NotFoundException("Region not found");
		}

		if (region.template.createdById !== userId) {
			throw new ForbiddenException("Access denied");
		}

		return this.prisma.templateRegion.delete({
			where: { id: regionId },
		});
	}

	async reorderRegions(
		templateId: string,
		regionIds: string[],
		userId: string,
	) {
		await this.findOne(templateId, userId);

		const updates = regionIds.map((id, index) =>
			this.prisma.templateRegion.update({
				where: { id },
				data: { orderIndex: index },
			}),
		);

		await this.prisma.$transaction(updates);

		return this.prisma.templateRegion.findMany({
			where: { templateId },
			orderBy: { orderIndex: "asc" },
		});
	}
}
