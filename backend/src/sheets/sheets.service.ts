import {
	Injectable,
	NotFoundException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { StorageService } from "../storage/storage.service";
import { ImageProcessingService } from "./image-processing.service";
import { UploadSheetInput } from "./dto/upload-sheet.input";
import { BatchUploadInput } from "./dto/batch-upload.input";

@Injectable()
export class SheetsService {
	constructor(
		private prisma: PrismaService,
		private storageService: StorageService,
		private imageProcessingService: ImageProcessingService,
	) {}

	async uploadSheet(input: UploadSheetInput, userId: string) {
		// Verify template exists and user owns it
		const template = await this.prisma.template.findUnique({
			where: { id: input.templateId },
			include: { regions: true },
		});

		if (!template) {
			throw new NotFoundException("Template not found");
		}

		if (template.createdById !== userId) {
			throw new ForbiddenException("Access denied");
		}

		// Upload the image
		const uploadResult = await this.storageService.uploadBase64(
			input.imageData,
			input.fileName || "sheet.jpg",
			"sheets",
		);

		// Create sheet record
		const sheet = await this.prisma.answerSheet.create({
			data: {
				templateId: input.templateId,
				studentId: input.studentId,
				studentName: input.studentName,
				originalUrl: uploadResult.url,
				status: "UPLOADED",
			},
			include: {
				template: {
					include: { regions: true },
				},
			},
		});

		// Trigger async processing (in production, use a queue)
		this.processSheetAsync(sheet.id, template.regions);

		return sheet;
	}

	async batchUpload(input: BatchUploadInput, userId: string) {
		const results = [];

		for (const sheetInput of input.sheets) {
			try {
				const sheet = await this.uploadSheet(
					{
						templateId: input.templateId,
						imageData: sheetInput.imageData,
						fileName: sheetInput.fileName,
						studentId: sheetInput.studentId,
						studentName: sheetInput.studentName,
					},
					userId,
				);
				results.push({ success: true, sheet });
			} catch (error) {
				results.push({
					success: false,
					error: error.message,
					fileName: sheetInput.fileName,
				});
			}
		}

		return {
			total: input.sheets.length,
			successful: results.filter((r) => r.success).length,
			failed: results.filter((r) => !r.success).length,
			results,
		};
	}

	private async processSheetAsync(sheetId: string, regions: any[]) {
		try {
			await this.prisma.answerSheet.update({
				where: { id: sheetId },
				data: { status: "PROCESSING" },
			});

			const sheet = await this.prisma.answerSheet.findUnique({
				where: { id: sheetId },
			});

			const result = await this.imageProcessingService.processSheet(
				sheet.originalUrl,
				sheet.templateId,
				regions,
			);

			await this.prisma.answerSheet.update({
				where: { id: sheetId },
				data: {
					processedUrl: result.processedUrl,
					thumbnailUrl: result.thumbnailUrl,
					ocrData: result.ocrData,
					status: "PROCESSED",
				},
			});
		} catch (error) {
			await this.prisma.answerSheet.update({
				where: { id: sheetId },
				data: {
					status: "ERROR",
				},
			});
		}
	}

	async findAll(userId: string, templateId?: string, status?: string) {
		// Get templates owned by user
		const templates = await this.prisma.template.findMany({
			where: { createdById: userId },
			select: { id: true },
		});

		const templateIds = templates.map((t) => t.id);

		return this.prisma.answerSheet.findMany({
			where: {
				templateId: templateId ? templateId : { in: templateIds },
				...(status && { status: status as any }),
			},
			include: {
				template: true,
				annotations: {
					take: 1,
					orderBy: { createdAt: "desc" },
				},
				pdfOutput: true,
			},
			orderBy: { createdAt: "desc" },
		});
	}

	async findOne(id: string, userId: string) {
		const sheet = await this.prisma.answerSheet.findUnique({
			where: { id },
			include: {
				template: {
					include: {
						regions: { orderBy: { orderIndex: "asc" } },
					},
				},
				annotations: {
					include: {
						questionLabels: {
							include: { region: true },
						},
					},
				},
				gradingResults: {
					include: { region: true },
				},
				pdfOutput: true,
			},
		});

		if (!sheet) {
			throw new NotFoundException("Sheet not found");
		}

		if (sheet.template.createdById !== userId) {
			throw new ForbiddenException("Access denied");
		}

		return sheet;
	}

	async delete(id: string, userId: string) {
		const sheet = await this.findOne(id, userId);

		// Delete file from storage if exists
		if (sheet.originalUrl) {
			// Extract key from URL and delete
		}

		return this.prisma.answerSheet.delete({
			where: { id },
		});
	}

	async reprocess(id: string, userId: string) {
		const sheet = await this.findOne(id, userId);

		await this.processSheetAsync(sheet.id, sheet.template.regions);

		return this.findOne(id, userId);
	}

	async getSheetsByStatus(userId: string, templateId: string) {
		const template = await this.prisma.template.findUnique({
			where: { id: templateId },
		});

		if (!template || template.createdById !== userId) {
			throw new ForbiddenException("Access denied");
		}

		const stats = await this.prisma.answerSheet.groupBy({
			by: ["status"],
			where: { templateId },
			_count: true,
		});

		return stats.map((s) => ({
			status: s.status,
			count: s._count,
		}));
	}
}
