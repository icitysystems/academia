import {
	Injectable,
	Logger,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { MLService } from "../ml/ml.service";

@Injectable()
export class GradingService {
	private readonly logger = new Logger(GradingService.name);

	constructor(private prisma: PrismaService, private mlService: MLService) {}

	/**
	 * Start a batch grading job
	 */
	async startBatchGrading(
		templateId: string,
		sheetIds: string[],
		teacherId: string,
	) {
		// Get active model
		const model = await this.mlService.getActiveModel(templateId);
		if (!model) {
			throw new BadRequestException(
				"No active model found. Please train a model first.",
			);
		}

		// Create grading job
		const job = await this.prisma.gradingJob.create({
			data: {
				templateId,
				modelId: model.id,
				teacherId,
				status: "PENDING",
				totalSheets: sheetIds.length,
				processedSheets: 0,
			},
		});

		// Start processing asynchronously
		this.processGradingJob(job.id, sheetIds).catch((err) => {
			this.logger.error(`Grading job ${job.id} failed:`, err);
		});

		return job;
	}

	/**
	 * Process grading job
	 */
	private async processGradingJob(jobId: string, sheetIds: string[]) {
		await this.prisma.gradingJob.update({
			where: { id: jobId },
			data: {
				status: "RUNNING",
				startedAt: new Date(),
			},
		});

		const job = await this.prisma.gradingJob.findUnique({
			where: { id: jobId },
		});

		try {
			for (let i = 0; i < sheetIds.length; i++) {
				const sheetId = sheetIds[i];

				try {
					// Grade the sheet
					const result = await this.mlService.gradeSheet(sheetId, job.modelId);

					// Save results
					for (const prediction of result.predictions) {
						await this.prisma.gradingResult.create({
							data: {
								jobId,
								sheetId,
								regionId: prediction.regionId,
								predictedCorrectness: prediction.predictedCorrectness,
								confidence: prediction.confidence,
								assignedScore: prediction.assignedScore,
								explanation: prediction.explanation,
								needsReview: prediction.needsReview,
							},
						});
					}

					// Update sheet status
					await this.prisma.answerSheet.update({
						where: { id: sheetId },
						data: { status: "GRADED" },
					});
				} catch (err) {
					this.logger.error(`Failed to grade sheet ${sheetId}:`, err);
				}

				// Update progress
				await this.prisma.gradingJob.update({
					where: { id: jobId },
					data: { processedSheets: i + 1 },
				});
			}

			await this.prisma.gradingJob.update({
				where: { id: jobId },
				data: {
					status: "COMPLETED",
					completedAt: new Date(),
				},
			});
		} catch (error) {
			await this.prisma.gradingJob.update({
				where: { id: jobId },
				data: {
					status: "FAILED",
					errorMessage: error.message,
					completedAt: new Date(),
				},
			});
		}
	}

	/**
	 * Get grading job by ID
	 */
	async getJob(jobId: string, teacherId: string) {
		const job = await this.prisma.gradingJob.findUnique({
			where: { id: jobId },
			include: {
				model: true,
				template: true,
				results: {
					include: {
						sheet: true,
						region: true,
					},
				},
			},
		});

		if (!job) {
			throw new NotFoundException("Grading job not found");
		}

		if (job.teacherId !== teacherId) {
			throw new NotFoundException("Grading job not found");
		}

		return job;
	}

	/**
	 * Get all grading jobs for a user
	 */
	async getJobs(teacherId: string, templateId?: string) {
		return this.prisma.gradingJob.findMany({
			where: {
				teacherId,
				...(templateId && { templateId }),
			},
			include: {
				model: true,
				template: true,
				_count: {
					select: { results: true },
				},
			},
			orderBy: { createdAt: "desc" },
		});
	}

	/**
	 * Get results for a sheet
	 */
	async getSheetResults(sheetId: string, teacherId: string) {
		const sheet = await this.prisma.answerSheet.findUnique({
			where: { id: sheetId },
			include: {
				template: true,
				gradingResults: {
					include: {
						region: true,
						job: true,
					},
					orderBy: {
						region: { orderIndex: "asc" },
					},
				},
			},
		});

		if (!sheet) {
			throw new NotFoundException("Sheet not found");
		}

		if (sheet.template.createdById !== teacherId) {
			throw new NotFoundException("Sheet not found");
		}

		return sheet.gradingResults;
	}

	/**
	 * Update a grading result (teacher review)
	 */
	async reviewResult(
		resultId: string,
		teacherId: string,
		updates: {
			assignedScore?: number;
			predictedCorrectness?: string;
		},
	) {
		const result = await this.prisma.gradingResult.findUnique({
			where: { id: resultId },
			include: {
				job: true,
			},
		});

		if (!result) {
			throw new NotFoundException("Result not found");
		}

		if (result.job.teacherId !== teacherId) {
			throw new NotFoundException("Result not found");
		}

		return this.prisma.gradingResult.update({
			where: { id: resultId },
			data: {
				...updates,
				needsReview: false,
				reviewedAt: new Date(),
			},
		});
	}

	/**
	 * Get results needing review
	 */
	async getResultsNeedingReview(templateId: string, teacherId: string) {
		return this.prisma.gradingResult.findMany({
			where: {
				needsReview: true,
				job: {
					templateId,
					teacherId,
				},
			},
			include: {
				sheet: true,
				region: true,
			},
			orderBy: { confidence: "asc" },
		});
	}

	/**
	 * Get grading statistics
	 */
	async getGradingStats(templateId: string, teacherId: string) {
		const jobs = await this.prisma.gradingJob.findMany({
			where: { templateId, teacherId, status: "COMPLETED" },
		});

		const results = await this.prisma.gradingResult.findMany({
			where: {
				job: { templateId, teacherId },
			},
		});

		const needsReview = results.filter((r) => r.needsReview).length;
		const reviewed = results.filter((r) => r.reviewedAt).length;

		const scoreDistribution = await this.prisma.gradingResult.groupBy({
			by: ["predictedCorrectness"],
			where: {
				job: { templateId, teacherId },
			},
			_count: true,
			_avg: { confidence: true },
		});

		return {
			totalJobs: jobs.length,
			totalResults: results.length,
			needsReview,
			reviewed,
			averageConfidence:
				results.reduce((sum, r) => sum + r.confidence, 0) / results.length || 0,
			scoreDistribution,
		};
	}
}
