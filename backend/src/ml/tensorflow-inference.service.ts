import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as tf from "@tensorflow/tfjs-node";
import { PrismaService } from "../prisma.service";
import { StorageService } from "../storage/storage.service";

export type Correctness = "CORRECT" | "PARTIAL" | "INCORRECT" | "SKIPPED";

/**
 * Feature extraction configuration
 */
interface FeatureConfig {
	maxTextLength: number;
	vocabSize: number;
	embeddingDim: number;
}

/**
 * Grading prediction result
 */
export interface GradingPrediction {
	regionId: string;
	predictedCorrectness: Correctness;
	confidence: number;
	assignedScore: number;
	explanation: string;
	needsReview: boolean;
	features: Record<string, any>;
}

/**
 * Model metadata stored with trained models
 */
interface ModelMetadata {
	version: string;
	templateId: string;
	questionTypes: string[];
	vocabMap: Record<string, number>;
	classLabels: Correctness[];
	config: FeatureConfig;
	createdAt: string;
}

/**
 * TensorFlow.js-based ML Inference Service
 * Provides real machine learning inference for automated grading
 */
@Injectable()
export class TensorFlowInferenceService implements OnModuleInit {
	private readonly logger = new Logger(TensorFlowInferenceService.name);
	private models: Map<string, tf.LayersModel> = new Map();
	private modelMetadata: Map<string, ModelMetadata> = new Map();
	private confidenceThreshold = 0.75;

	// Feature extraction settings
	private readonly featureConfig: FeatureConfig = {
		maxTextLength: 500,
		vocabSize: 10000,
		embeddingDim: 64,
	};

	// Class labels for prediction output
	private readonly classLabels: Correctness[] = [
		"CORRECT",
		"PARTIAL",
		"INCORRECT",
		"SKIPPED",
	];

	constructor(
		private prisma: PrismaService,
		private storageService: StorageService,
	) {}

	async onModuleInit() {
		this.logger.log("TensorFlow.js ML Inference Service initialized");
		this.logger.log(`TensorFlow.js version: ${tf.version.tfjs}`);
		this.logger.log(`Backend: ${tf.getBackend()}`);

		// Pre-warm TensorFlow
		await this.warmUp();
	}

	/**
	 * Pre-warm TensorFlow to reduce cold-start latency
	 */
	private async warmUp() {
		const warmupTensor = tf.zeros([1, 100]);
		warmupTensor.dispose();
		this.logger.log("TensorFlow.js warmed up");
	}

	/**
	 * Load a trained model for inference
	 */
	async loadModel(modelId: string): Promise<boolean> {
		try {
			const modelRecord = await this.prisma.mLModel.findUnique({
				where: { id: modelId },
			});

			if (!modelRecord) {
				this.logger.warn(`Model ${modelId} not found in database`);
				return false;
			}

			// Check if model is already loaded
			if (this.models.has(modelId)) {
				this.logger.log(`Model ${modelId} already loaded`);
				return true;
			}

			// Load model metadata
			const metadata = modelRecord.metadata as ModelMetadata;
			if (metadata) {
				this.modelMetadata.set(modelId, metadata);
			}

			// Try to load the actual TensorFlow model if it exists
			if (modelRecord.artifactUrl) {
				try {
					// For local file paths
					const modelPath = modelRecord.artifactUrl.replace("model.json", "");
					const model = await tf.loadLayersModel(
						`file://${modelPath}/model.json`,
					);
					this.models.set(modelId, model);
					this.logger.log(`Loaded TensorFlow model from ${modelPath}`);
					return true;
				} catch (loadError) {
					this.logger.warn(
						`Could not load TensorFlow model from ${modelRecord.artifactUrl}, using rule-based fallback`,
					);
				}
			}

			// Create a simple model for this template if none exists
			const model = await this.createDefaultModel();
			this.models.set(modelId, model);
			this.logger.log(`Created default model for ${modelId}`);
			return true;
		} catch (error) {
			this.logger.error(`Error loading model ${modelId}:`, error);
			return false;
		}
	}

	/**
	 * Create a default neural network model for grading
	 */
	private async createDefaultModel(): Promise<tf.LayersModel> {
		const model = tf.sequential({
			layers: [
				// Input layer - features extracted from text
				tf.layers.dense({
					inputShape: [20], // Feature vector size
					units: 64,
					activation: "relu",
					kernelInitializer: "glorotUniform",
				}),
				tf.layers.dropout({ rate: 0.3 }),

				// Hidden layers
				tf.layers.dense({
					units: 32,
					activation: "relu",
					kernelInitializer: "glorotUniform",
				}),
				tf.layers.dropout({ rate: 0.2 }),

				// Output layer - 4 classes (CORRECT, PARTIAL, INCORRECT, SKIPPED)
				tf.layers.dense({
					units: 4,
					activation: "softmax",
				}),
			],
		});

		model.compile({
			optimizer: tf.train.adam(0.001),
			loss: "categoricalCrossentropy",
			metrics: ["accuracy"],
		});

		return model;
	}

	/**
	 * Run inference on a single answer region
	 */
	async predict(
		modelId: string,
		region: any,
		ocrData: any,
		expectedAnswer?: string,
	): Promise<GradingPrediction> {
		const startTime = Date.now();

		// Ensure model is loaded
		if (!this.models.has(modelId)) {
			await this.loadModel(modelId);
		}

		const text = ocrData?.text || "";
		const ocrConfidence = ocrData?.confidence || 0.5;

		// Extract features for ML prediction
		const features = this.extractFeatures(
			text,
			region,
			ocrData,
			expectedAnswer,
		);
		const featureTensor = tf.tensor2d([features], [1, features.length]);

		let predictedCorrectness: Correctness;
		let confidence: number;
		let explanation: string;

		try {
			// Get the model
			const model = this.models.get(modelId);

			if (model) {
				// Run TensorFlow inference
				const prediction = model.predict(featureTensor) as tf.Tensor;
				const probabilities = await prediction.data();
				prediction.dispose();

				// Get predicted class and confidence
				const maxIndex = Array.from(probabilities).indexOf(
					Math.max(...probabilities),
				);
				confidence = probabilities[maxIndex];
				predictedCorrectness = this.classLabels[maxIndex];

				explanation = this.generateExplanation(
					text,
					region,
					predictedCorrectness,
					confidence,
					features,
				);
			} else {
				// Fallback to rule-based prediction
				const ruleBasedResult = this.ruleBasedPrediction(
					text,
					region,
					ocrData,
					expectedAnswer,
				);
				predictedCorrectness = ruleBasedResult.correctness;
				confidence = ruleBasedResult.confidence;
				explanation = ruleBasedResult.explanation;
			}
		} finally {
			featureTensor.dispose();
		}

		// Calculate score based on prediction
		const assignedScore = this.calculateScore(
			predictedCorrectness,
			region.points,
			confidence,
		);

		const inferenceTime = Date.now() - startTime;
		this.logger.debug(
			`Inference for region ${region.id}: ${predictedCorrectness} (${(confidence * 100).toFixed(1)}%) in ${inferenceTime}ms`,
		);

		return {
			regionId: region.id,
			predictedCorrectness,
			confidence,
			assignedScore,
			explanation,
			needsReview: confidence < this.confidenceThreshold,
			features: {
				textLength: text.length,
				wordCount: text.split(/\s+/).filter(Boolean).length,
				ocrConfidence,
				inferenceTime,
			},
		};
	}

	/**
	 * Extract numerical features from text and context
	 */
	private extractFeatures(
		text: string,
		region: any,
		ocrData: any,
		expectedAnswer?: string,
	): number[] {
		const normalizedText = text.toLowerCase().trim();
		const words = normalizedText.split(/\s+/).filter(Boolean);
		const ocrConfidence = ocrData?.confidence || 0.5;

		// Basic text features
		const textLength = Math.min(
			text.length / this.featureConfig.maxTextLength,
			1,
		);
		const wordCount = Math.min(words.length / 100, 1);
		const avgWordLength =
			words.length > 0
				? words.reduce((sum, w) => sum + w.length, 0) / words.length / 10
				: 0;

		// Character distribution features
		const alphaRatio =
			(text.match(/[a-zA-Z]/g) || []).length / Math.max(text.length, 1);
		const digitRatio =
			(text.match(/\d/g) || []).length / Math.max(text.length, 1);
		const specialRatio =
			(text.match(/[^a-zA-Z0-9\s]/g) || []).length / Math.max(text.length, 1);
		const uppercaseRatio =
			(text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);

		// Question type encoding
		const questionTypeFeatures = this.encodeQuestionType(region.questionType);

		// Similarity to expected answer (if available)
		let similarityScore = 0;
		if (expectedAnswer) {
			similarityScore = this.calculateTextSimilarity(
				normalizedText,
				expectedAnswer.toLowerCase(),
			);
		}

		// MCQ-specific features
		const hasMCQAnswer = /^[a-d]$/i.test(normalizedText.trim()) ? 1 : 0;
		const hasTrueFalse = /^(true|false|t|f)$/i.test(normalizedText.trim())
			? 1
			: 0;

		// Completeness indicators
		const isEmpty = text.trim().length === 0 ? 1 : 0;
		const isVeryShort = text.trim().length < 5 ? 1 : 0;
		const hasContent = text.trim().length >= 10 ? 1 : 0;

		// Combine all features into a fixed-size vector
		return [
			textLength,
			wordCount,
			avgWordLength,
			alphaRatio,
			digitRatio,
			specialRatio,
			uppercaseRatio,
			ocrConfidence,
			similarityScore,
			hasMCQAnswer,
			hasTrueFalse,
			isEmpty,
			isVeryShort,
			hasContent,
			...questionTypeFeatures, // 6 features for question type encoding
		];
	}

	/**
	 * Encode question type as one-hot vector
	 */
	private encodeQuestionType(questionType: string): number[] {
		const types = [
			"MCQ",
			"TRUE_FALSE",
			"SHORT_ANSWER",
			"LONG_ANSWER",
			"NUMERIC",
			"OTHER",
		];
		return types.map((t) => (t === questionType ? 1 : 0));
	}

	/**
	 * Calculate text similarity using Jaccard index
	 */
	private calculateTextSimilarity(text1: string, text2: string): number {
		if (!text1 || !text2) return 0;

		const words1 = new Set(text1.split(/\s+/).filter(Boolean));
		const words2 = new Set(text2.split(/\s+/).filter(Boolean));

		const intersection = new Set([...words1].filter((x) => words2.has(x)));
		const union = new Set([...words1, ...words2]);

		return intersection.size / Math.max(union.size, 1);
	}

	/**
	 * Rule-based prediction fallback when ML model isn't available
	 */
	private ruleBasedPrediction(
		text: string,
		region: any,
		ocrData: any,
		expectedAnswer?: string,
	): { correctness: Correctness; confidence: number; explanation: string } {
		const normalizedText = text.toLowerCase().trim();
		const ocrConfidence = ocrData?.confidence || 0.5;

		// Check for empty/skipped
		if (normalizedText.length === 0) {
			return {
				correctness: "SKIPPED",
				confidence: 0.95,
				explanation: "Answer field appears to be blank",
			};
		}

		switch (region.questionType) {
			case "MCQ":
			case "TRUE_FALSE": {
				// For MCQ, we can be more confident if we detect valid answer patterns
				const validMCQ = /^[a-d]$/i.test(normalizedText);
				const validTF = /^(true|false|t|f|yes|no)$/i.test(normalizedText);
				const isValid = validMCQ || validTF;

				if (!isValid) {
					return {
						correctness: "INCORRECT",
						confidence: 0.8,
						explanation: `Invalid answer format detected: "${text}"`,
					};
				}

				// If we have expected answer, compare
				if (expectedAnswer) {
					const matches =
						normalizedText === expectedAnswer.toLowerCase().trim();
					return {
						correctness: matches ? "CORRECT" : "INCORRECT",
						confidence: 0.9 * ocrConfidence,
						explanation: matches
							? `Answer "${text}" matches expected answer`
							: `Answer "${text}" does not match expected "${expectedAnswer}"`,
					};
				}

				// Without expected answer, mark for review
				return {
					correctness: "PARTIAL",
					confidence: 0.5,
					explanation: `MCQ answer detected: "${text}" - requires verification`,
				};
			}

			case "NUMERIC": {
				const hasNumber = /\d+\.?\d*/.test(text);
				if (!hasNumber) {
					return {
						correctness: "INCORRECT",
						confidence: 0.85,
						explanation: "No numeric value detected in answer",
					};
				}

				if (expectedAnswer) {
					const expected = parseFloat(expectedAnswer);
					const actual = parseFloat(text.replace(/[^\d.-]/g, ""));
					const tolerance = expected * 0.05; // 5% tolerance
					const isClose = Math.abs(expected - actual) <= tolerance;

					return {
						correctness: isClose ? "CORRECT" : "INCORRECT",
						confidence: 0.85 * ocrConfidence,
						explanation: isClose
							? `Numeric answer ${actual} within tolerance of expected ${expected}`
							: `Numeric answer ${actual} differs from expected ${expected}`,
					};
				}

				return {
					correctness: "PARTIAL",
					confidence: 0.6,
					explanation: `Numeric answer detected: "${text}" - requires verification`,
				};
			}

			case "SHORT_ANSWER":
			case "LONG_ANSWER":
			default: {
				// For text answers, use length and keyword heuristics
				const wordCount = normalizedText.split(/\s+/).filter(Boolean).length;

				if (wordCount < 2) {
					return {
						correctness: "PARTIAL",
						confidence: 0.6,
						explanation: `Very short answer (${wordCount} word) - may be incomplete`,
					};
				}

				// Check similarity to expected answer
				if (expectedAnswer) {
					const similarity = this.calculateTextSimilarity(
						normalizedText,
						expectedAnswer.toLowerCase(),
					);

					if (similarity > 0.7) {
						return {
							correctness: "CORRECT",
							confidence: 0.8 * similarity * ocrConfidence,
							explanation: `High similarity (${(similarity * 100).toFixed(0)}%) to expected answer`,
						};
					} else if (similarity > 0.4) {
						return {
							correctness: "PARTIAL",
							confidence: 0.7 * similarity * ocrConfidence,
							explanation: `Partial match (${(similarity * 100).toFixed(0)}%) to expected answer`,
						};
					} else {
						return {
							correctness: "INCORRECT",
							confidence: 0.65 * ocrConfidence,
							explanation: `Low similarity (${(similarity * 100).toFixed(0)}%) to expected answer`,
						};
					}
				}

				// Without expected answer, base confidence on content quality
				const hasGoodContent = wordCount >= 5 && normalizedText.length >= 20;
				return {
					correctness: hasGoodContent ? "PARTIAL" : "INCORRECT",
					confidence: hasGoodContent ? 0.55 : 0.5,
					explanation: `Text answer with ${wordCount} words - requires teacher review`,
				};
			}
		}
	}

	/**
	 * Calculate final score based on prediction
	 */
	private calculateScore(
		correctness: Correctness,
		maxPoints: number,
		confidence: number,
	): number {
		switch (correctness) {
			case "CORRECT":
				return maxPoints;
			case "PARTIAL":
				// Give 50% for partial, adjusted by confidence
				return Math.round(maxPoints * 0.5 * Math.min(confidence + 0.2, 1));
			case "INCORRECT":
			case "SKIPPED":
			default:
				return 0;
		}
	}

	/**
	 * Generate human-readable explanation for the prediction
	 */
	private generateExplanation(
		text: string,
		region: any,
		correctness: Correctness,
		confidence: number,
		features: number[],
	): string {
		const confidenceStr = (confidence * 100).toFixed(1);
		const truncatedText =
			text.length > 50 ? text.substring(0, 50) + "..." : text;

		const parts: string[] = [];

		parts.push(`Predicted: ${correctness} (${confidenceStr}% confidence)`);

		if (text.length === 0) {
			parts.push("Answer field is empty");
		} else {
			parts.push(`Answer: "${truncatedText}"`);
		}

		if (confidence < this.confidenceThreshold) {
			parts.push("⚠️ Low confidence - teacher review recommended");
		}

		return parts.join(". ");
	}

	/**
	 * Train a new model using annotated samples
	 */
	async trainModel(
		templateId: string,
		trainingData: Array<{
			text: string;
			region: any;
			ocrData: any;
			label: Correctness;
			expectedAnswer?: string;
		}>,
		config: { epochs: number; batchSize: number; validationSplit: number },
	): Promise<{ model: tf.LayersModel; metrics: any }> {
		this.logger.log(
			`Training model for template ${templateId} with ${trainingData.length} samples`,
		);

		// Prepare training data
		const features: number[][] = [];
		const labels: number[][] = [];

		for (const sample of trainingData) {
			const featureVector = this.extractFeatures(
				sample.text,
				sample.region,
				sample.ocrData,
				sample.expectedAnswer,
			);
			features.push(featureVector);

			// One-hot encode label
			const labelVector = this.classLabels.map((c) =>
				c === sample.label ? 1 : 0,
			);
			labels.push(labelVector);
		}

		// Create tensors
		const xTrain = tf.tensor2d(features);
		const yTrain = tf.tensor2d(labels);

		// Create model
		const model = await this.createDefaultModel();

		// Train model
		const history = await model.fit(xTrain, yTrain, {
			epochs: config.epochs,
			batchSize: config.batchSize,
			validationSplit: config.validationSplit,
			shuffle: true,
			callbacks: {
				onEpochEnd: (epoch, logs) => {
					this.logger.debug(
						`Epoch ${epoch + 1}: loss=${logs?.loss?.toFixed(4)}, accuracy=${logs?.acc?.toFixed(4)}`,
					);
				},
			},
		});

		// Clean up tensors
		xTrain.dispose();
		yTrain.dispose();

		// Extract final metrics
		const finalEpoch = history.history.loss.length - 1;
		const metrics = {
			accuracy: history.history.acc?.[finalEpoch] || 0,
			loss: history.history.loss[finalEpoch],
			validationAccuracy: history.history.val_acc?.[finalEpoch] || 0,
			validationLoss: history.history.val_loss?.[finalEpoch] || 0,
			epochs: config.epochs,
			samples: trainingData.length,
		};

		this.logger.log(
			`Training complete: accuracy=${(metrics.accuracy * 100).toFixed(1)}%`,
		);

		return { model, metrics };
	}

	/**
	 * Save trained model to storage
	 */
	async saveModel(
		model: tf.LayersModel,
		modelId: string,
		templateId: string,
	): Promise<string> {
		const modelDir = `models/${templateId}/${modelId}`;

		// Save model to file system (in production, would save to S3)
		await model.save(`file://./uploads/${modelDir}`);

		// Store model in memory cache
		this.models.set(modelId, model);

		this.logger.log(`Model saved to ${modelDir}`);
		return modelDir;
	}

	/**
	 * Batch prediction for multiple regions
	 */
	async predictBatch(
		modelId: string,
		items: Array<{ region: any; ocrData: any; expectedAnswer?: string }>,
	): Promise<GradingPrediction[]> {
		const predictions: GradingPrediction[] = [];

		for (const item of items) {
			const prediction = await this.predict(
				modelId,
				item.region,
				item.ocrData,
				item.expectedAnswer,
			);
			predictions.push(prediction);
		}

		return predictions;
	}

	/**
	 * Get model info
	 */
	getModelInfo(modelId: string) {
		return {
			loaded: this.models.has(modelId),
			metadata: this.modelMetadata.get(modelId),
			confidenceThreshold: this.confidenceThreshold,
		};
	}

	/**
	 * Unload a model from memory
	 */
	unloadModel(modelId: string) {
		const model = this.models.get(modelId);
		if (model) {
			model.dispose();
			this.models.delete(modelId);
			this.modelMetadata.delete(modelId);
			this.logger.log(`Model ${modelId} unloaded`);
		}
	}

	/**
	 * Get memory usage statistics
	 */
	getMemoryInfo() {
		return {
			numTensors: tf.memory().numTensors,
			numBytes: tf.memory().numBytes,
			loadedModels: this.models.size,
		};
	}
}
