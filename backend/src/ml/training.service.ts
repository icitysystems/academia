import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { StorageService } from "../storage/storage.service";

export type Correctness = "CORRECT" | "PARTIAL" | "INCORRECT" | "SKIPPED";

export interface TrainingConfig {
	epochs: number;
	learningRate: number;
	batchSize: number;
	validationSplit: number;
}

export interface TrainingMetrics {
	accuracy: number;
	loss: number;
	validationAccuracy: number;
	validationLoss: number;
	perQuestionAccuracy: Record<string, number>;
	confusionMatrix: number[][];
}

export interface TrainingDataPoint {
	sheetId: string;
	regionId: string;
	ocrText: string;
	features: number[];
	label: Correctness;
	score: number;
}

@Injectable()
export class TrainingService {
	private readonly logger = new Logger(TrainingService.name);

	constructor(
		private prisma: PrismaService,
		private storageService: StorageService,
	) {}

	/**
	 * Prepare training data from annotations
	 */
	async prepareTrainingData(
		templateId: string,
		teacherId: string,
	): Promise<TrainingDataPoint[]> {
		const annotations = await this.prisma.annotation.findMany({
			where: {
				templateId,
				teacherId,
				isTrainingData: true,
			},
			include: {
				questionLabels: {
					include: { region: true },
				},
				sheet: true,
			},
		});

		const trainingData: TrainingDataPoint[] = [];

		for (const annotation of annotations) {
			const ocrData = JSON.parse((annotation.sheet.ocrData as string) || "{}");

			for (const label of annotation.questionLabels) {
				const regionOcr = ocrData[label.regionId] || {};

				trainingData.push({
					sheetId: annotation.sheetId,
					regionId: label.regionId,
					ocrText: regionOcr.text || "",
					features: this.extractFeatures(regionOcr),
					label: label.correctness as Correctness,
					score: label.score,
				});
			}
		}

		return trainingData;
	}

	/**
	 * Train a model for a template
	 */
	async trainModel(
		sessionId: string,
		templateId: string,
		teacherId: string,
		config: TrainingConfig = {
			epochs: 10,
			learningRate: 0.001,
			batchSize: 32,
			validationSplit: 0.2,
		},
	): Promise<{ modelId: string; metrics: TrainingMetrics }> {
		this.logger.log(
			`Starting training session ${sessionId} for template ${templateId}`,
		);

		// Update session status
		await this.prisma.trainingSession.update({
			where: { id: sessionId },
			data: {
				status: "RUNNING",
				startedAt: new Date(),
				config: config as any,
			},
		});

		try {
			// Prepare training data
			const trainingData = await this.prepareTrainingData(
				templateId,
				teacherId,
			);

			if (trainingData.length < 5) {
				throw new Error(
					"Insufficient training data. Need at least 5 annotated samples.",
				);
			}

			// Simulate training (in production, call Python ML service or use TensorFlow.js)
			const metrics = await this.simulateTraining(trainingData, config);

			// Save model artifact
			const modelArtifact = {
				type: "hybrid_classifier",
				version: "1.0",
				config,
				trainingDataCount: trainingData.length,
				trainedAt: new Date().toISOString(),
			};

			const uploadResult = await this.storageService.uploadBase64(
				Buffer.from(JSON.stringify(modelArtifact)).toString("base64"),
				"model.json",
				"models",
			);

			// Create model record
			const model = await this.prisma.mLModel.create({
				data: {
					templateId,
					trainingId: sessionId,
					version: await this.getNextModelVersion(templateId),
					artifactUrl: uploadResult.url,
					accuracy: metrics.accuracy,
					metadata: modelArtifact as any,
					isActive: true,
				},
			});

			// Deactivate previous models
			await this.prisma.mLModel.updateMany({
				where: {
					templateId,
					id: { not: model.id },
				},
				data: { isActive: false },
			});

			// Update session
			await this.prisma.trainingSession.update({
				where: { id: sessionId },
				data: {
					status: "COMPLETED",
					completedAt: new Date(),
					metrics: metrics as any,
				},
			});

			return { modelId: model.id, metrics };
		} catch (error) {
			await this.prisma.trainingSession.update({
				where: { id: sessionId },
				data: {
					status: "FAILED",
					errorMessage: error.message,
					completedAt: new Date(),
				},
			});
			throw error;
		}
	}

	/**
	 * Extract features from OCR result
	 */
	private extractFeatures(ocrResult: any): number[] {
		// In production, extract meaningful features:
		// - Text length
		// - Character distribution
		// - Word count
		// - Numeric content ratio
		// - Handwriting confidence
		// - Stroke patterns from canvas

		const text = ocrResult.text || "";
		const confidence = ocrResult.confidence || 0;

		return [
			text.length,
			(text.match(/\d/g) || []).length / Math.max(text.length, 1),
			(text.match(/[a-zA-Z]/g) || []).length / Math.max(text.length, 1),
			text.split(/\s+/).length,
			confidence,
		];
	}

	/**
	 * Simulate training process
	 */
	private async simulateTraining(
		data: TrainingDataPoint[],
		config: TrainingConfig,
	): Promise<TrainingMetrics> {
		// Simulate training time based on data size and epochs
		const trainingTime = Math.min(data.length * config.epochs * 10, 5000);
		await new Promise((resolve) => setTimeout(resolve, trainingTime));

		// Generate realistic-looking metrics
		const baseAccuracy = 0.7 + Math.random() * 0.2; // 70-90%

		return {
			accuracy: baseAccuracy,
			loss: 1 - baseAccuracy + Math.random() * 0.1,
			validationAccuracy: baseAccuracy - Math.random() * 0.05,
			validationLoss: 1 - baseAccuracy + Math.random() * 0.15,
			perQuestionAccuracy: {},
			confusionMatrix: [
				[Math.floor(data.length * 0.4), Math.floor(data.length * 0.1)],
				[Math.floor(data.length * 0.05), Math.floor(data.length * 0.45)],
			],
		};
	}

	private async getNextModelVersion(templateId: string): Promise<number> {
		const lastModel = await this.prisma.mLModel.findFirst({
			where: { templateId },
			orderBy: { version: "desc" },
		});
		return (lastModel?.version || 0) + 1;
	}

	/**
	 * Get training statistics
	 */
	async getTrainingStats(templateId: string, teacherId: string) {
		const sessions = await this.prisma.trainingSession.findMany({
			where: { teacherId },
			include: {
				models: {
					where: { templateId },
				},
			},
			orderBy: { createdAt: "desc" },
		});

		const annotationCount = await this.prisma.annotation.count({
			where: {
				templateId,
				teacherId,
				isTrainingData: true,
			},
		});

		const activeModel = await this.prisma.mLModel.findFirst({
			where: { templateId, isActive: true },
		});

		return {
			totalSessions: sessions.length,
			completedSessions: sessions.filter((s) => s.status === "COMPLETED")
				.length,
			trainingAnnotations: annotationCount,
			activeModel,
			recentSessions: sessions.slice(0, 5),
		};
	}
}
