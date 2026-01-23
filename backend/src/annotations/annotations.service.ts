import {
	Injectable,
	NotFoundException,
	ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateAnnotationInput } from "./dto/create-annotation.input";
import { UpdateAnnotationInput } from "./dto/update-annotation.input";

@Injectable()
export class AnnotationsService {
	constructor(private prisma: PrismaService) {}

	async create(input: CreateAnnotationInput, teacherId: string) {
		// Verify sheet exists and user has access
		const sheet = await this.prisma.answerSheet.findUnique({
			where: { id: input.sheetId },
			include: { template: true },
		});

		if (!sheet) {
			throw new NotFoundException("Answer sheet not found");
		}

		if (sheet.template.createdById !== teacherId) {
			throw new ForbiddenException("Access denied");
		}

		// Create annotation with question labels
		const annotation = await this.prisma.annotation.create({
			data: {
				sheetId: input.sheetId,
				templateId: sheet.templateId,
				teacherId,
				strokes: input.strokes,
				comments: input.comments,
				isTrainingData: input.isTrainingData ?? true,
				questionLabels: input.questionLabels
					? {
							create: input.questionLabels.map((label) => ({
								regionId: label.regionId,
								correctness: label.correctness,
								score: label.score,
								confidence: label.confidence,
								comment: label.comment,
							})),
					  }
					: undefined,
			},
			include: {
				questionLabels: {
					include: { region: true },
				},
				sheet: true,
				teacher: true,
			},
		});

		// Update sheet status
		await this.prisma.answerSheet.update({
			where: { id: input.sheetId },
			data: { status: "ANNOTATED" },
		});

		return annotation;
	}

	async findAll(teacherId: string, templateId?: string) {
		return this.prisma.annotation.findMany({
			where: {
				teacherId,
				...(templateId && { templateId }),
			},
			include: {
				questionLabels: {
					include: { region: true },
				},
				sheet: true,
				template: true,
			},
			orderBy: { createdAt: "desc" },
		});
	}

	async findOne(id: string, teacherId: string) {
		const annotation = await this.prisma.annotation.findUnique({
			where: { id },
			include: {
				questionLabels: {
					include: { region: true },
				},
				sheet: true,
				template: true,
				teacher: true,
			},
		});

		if (!annotation) {
			throw new NotFoundException("Annotation not found");
		}

		if (annotation.teacherId !== teacherId) {
			throw new ForbiddenException("Access denied");
		}

		return annotation;
	}

	async findBySheet(sheetId: string, teacherId: string) {
		return this.prisma.annotation.findMany({
			where: {
				sheetId,
				teacherId,
			},
			include: {
				questionLabels: {
					include: { region: true },
				},
			},
			orderBy: { createdAt: "desc" },
		});
	}

	async update(id: string, input: UpdateAnnotationInput, teacherId: string) {
		const annotation = await this.findOne(id, teacherId);

		// Update annotation
		const updated = await this.prisma.annotation.update({
			where: { id },
			data: {
				strokes: input.strokes ?? annotation.strokes,
				comments: input.comments ?? annotation.comments,
				isTrainingData: input.isTrainingData ?? annotation.isTrainingData,
			},
			include: {
				questionLabels: {
					include: { region: true },
				},
				sheet: true,
				teacher: true,
			},
		});

		// Update question labels if provided
		if (input.questionLabels) {
			// Delete existing labels and recreate
			await this.prisma.questionLabel.deleteMany({
				where: { annotationId: id },
			});

			await this.prisma.questionLabel.createMany({
				data: input.questionLabels.map((label) => ({
					annotationId: id,
					regionId: label.regionId,
					correctness: label.correctness,
					score: label.score,
					confidence: label.confidence,
					comment: label.comment,
				})),
			});
		}

		return this.findOne(id, teacherId);
	}

	async delete(id: string, teacherId: string) {
		await this.findOne(id, teacherId);

		return this.prisma.annotation.delete({
			where: { id },
		});
	}

	async getTrainingData(templateId: string, teacherId: string) {
		return this.prisma.annotation.findMany({
			where: {
				templateId,
				teacherId,
				isTrainingData: true,
			},
			include: {
				questionLabels: {
					include: { region: true },
				},
				sheet: {
					select: {
						id: true,
						processedUrl: true,
						ocrData: true,
					},
				},
			},
		});
	}

	async getAnnotationStats(templateId: string, teacherId: string) {
		const total = await this.prisma.annotation.count({
			where: { templateId, teacherId },
		});

		const trainingCount = await this.prisma.annotation.count({
			where: { templateId, teacherId, isTrainingData: true },
		});

		const labelStats = await this.prisma.questionLabel.groupBy({
			by: ["correctness"],
			where: {
				annotation: { templateId, teacherId },
			},
			_count: true,
		});

		return {
			totalAnnotations: total,
			trainingAnnotations: trainingCount,
			labelDistribution: labelStats,
		};
	}
}
