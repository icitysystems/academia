import {
	Injectable,
	Logger,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
	TensorFlowInferenceService,
	GradingPrediction,
} from "./tensorflow-inference.service";

export type Correctness = "CORRECT" | "PARTIAL" | "INCORRECT" | "SKIPPED";

export interface PredictionResult {
	regionId: string;
	predictedCorrectness: Correctness;
	confidence: number;
	assignedScore: number;
	explanation: string;
	needsReview: boolean;
}

export interface GradingJobResult {
	sheetId: string;
	totalScore: number;
	maxScore: number;
	predictions: PredictionResult[];
}

@Injectable()
export class MLService {
	private readonly logger = new Logger(MLService.name);
	private confidenceThreshold = 0.7; // Below this, flag for review
	private useTensorFlow = true; // Toggle for TensorFlow vs rule-based

	constructor(
		private prisma: PrismaService,
		private tfInference: TensorFlowInferenceService,
	) {}

	/**
	 * Grade a single sheet using the active model
	 */
	async gradeSheet(
		sheetId: string,
		modelId: string,
	): Promise<GradingJobResult> {
		const sheet = await this.prisma.answerSheet.findUnique({
			where: { id: sheetId },
			include: {
				template: {
					include: {
						regions: { orderBy: { orderIndex: "asc" } },
					},
				},
			},
		});

		if (!sheet) {
			throw new NotFoundException("Sheet not found");
		}

		const model = await this.prisma.mLModel.findUnique({
			where: { id: modelId },
		});

		if (!model) {
			throw new NotFoundException("Model not found");
		}

		const ocrData = JSON.parse((sheet.ocrData as string) || "{}");
		const predictions: PredictionResult[] = [];
		let totalScore = 0;
		let maxScore = 0;

		// Use TensorFlow inference when enabled
		if (this.useTensorFlow) {
			this.logger.log(
				`Grading sheet ${sheetId} using TensorFlow model ${modelId}`,
			);

			for (const region of sheet.template.regions) {
				const regionOcr = ocrData[region.id] || {};
				// Get expected answer from region metadata if available
				const regionMetadata = region.metadata
					? JSON.parse(region.metadata)
					: {};
				const expectedAnswer = regionMetadata.expectedAnswer || "";
				const tfPrediction = await this.tfInference.predict(
					modelId,
					region,
					regionOcr,
					expectedAnswer,
				);

				predictions.push({
					regionId: tfPrediction.regionId,
					predictedCorrectness: tfPrediction.predictedCorrectness,
					confidence: tfPrediction.confidence,
					assignedScore: tfPrediction.assignedScore,
					explanation: tfPrediction.explanation,
					needsReview: tfPrediction.needsReview,
				});
				totalScore += tfPrediction.assignedScore;
				maxScore += region.points;
			}
		} else {
			// Fallback to legacy rule-based prediction
			for (const region of sheet.template.regions) {
				const regionOcr = ocrData[region.id] || {};
				const prediction = await this.predictRegion(region, regionOcr, model);

				predictions.push(prediction);
				totalScore += prediction.assignedScore;
				maxScore += region.points;
			}
		}

		return {
			sheetId,
			totalScore,
			maxScore,
			predictions,
		};
	}

	/**
	 * Predict correctness for a single region
	 */
	private async predictRegion(
		region: any,
		ocrData: any,
		model: any,
	): Promise<PredictionResult> {
		// In production, load model and run inference
		// For now, simulate based on OCR confidence and heuristics

		const text = ocrData.text || "";
		const ocrConfidence = ocrData.confidence || 0.5;

		// Simulate prediction based on question type
		let predictedCorrectness: Correctness;
		let confidence: number;
		let explanation: string;

		switch (region.questionType) {
			case "MCQ":
			case "TRUE_FALSE":
				// For MCQ, check if answer matches expected pattern
				const validAnswers = ["A", "B", "C", "D", "TRUE", "FALSE", "T", "F"];
				const hasValidAnswer = validAnswers.some((a) =>
					text.toUpperCase().includes(a),
				);
				confidence = hasValidAnswer ? 0.85 + Math.random() * 0.1 : 0.5;
				predictedCorrectness = Math.random() > 0.3 ? "CORRECT" : "INCORRECT";
				explanation = `Detected answer: "${text}". MCQ pattern match: ${hasValidAnswer}`;
				break;

			case "NUMERIC":
				// Check for numeric content
				const hasNumber = /\d+\.?\d*/.test(text);
				confidence = hasNumber ? 0.8 + Math.random() * 0.15 : 0.4;
				predictedCorrectness =
					hasNumber && Math.random() > 0.4 ? "CORRECT" : "INCORRECT";
				explanation = `Numeric answer detected: ${text}`;
				break;

			case "SHORT_ANSWER":
			case "LONG_ANSWER":
				// For text answers, use length and confidence heuristics
				confidence = Math.min(ocrConfidence, 0.7 + Math.random() * 0.2);
				if (text.length < 3) {
					predictedCorrectness = "SKIPPED";
					explanation = "Answer appears to be blank or too short";
				} else if (text.length < 20) {
					predictedCorrectness = Math.random() > 0.5 ? "PARTIAL" : "CORRECT";
					explanation = `Short answer detected (${text.length} chars)`;
				} else {
					predictedCorrectness = Math.random() > 0.3 ? "CORRECT" : "PARTIAL";
					explanation = `Full answer detected (${text.length} chars)`;
				}
				break;

			default:
				confidence = 0.5;
				predictedCorrectness = "PARTIAL";
				explanation = "Unknown question type - requires manual review";
		}

		// Calculate score based on prediction
		let assignedScore: number;
		switch (predictedCorrectness) {
			case "CORRECT":
				assignedScore = region.points;
				break;
			case "PARTIAL":
				assignedScore = region.points * 0.5;
				break;
			case "INCORRECT":
			case "SKIPPED":
			default:
				assignedScore = 0;
		}

		return {
			regionId: region.id,
			predictedCorrectness,
			confidence,
			assignedScore,
			explanation,
			needsReview: confidence < this.confidenceThreshold,
		};
	}

	/**
	 * Get model information
	 */
	async getActiveModel(templateId: string) {
		return this.prisma.mLModel.findFirst({
			where: { templateId, isActive: true },
			include: {
				training: true,
			},
		});
	}

	/**
	 * List all models for a template
	 */
	async getModels(templateId: string) {
		return this.prisma.mLModel.findMany({
			where: { templateId },
			include: {
				training: true,
			},
			orderBy: { version: "desc" },
		});
	}

	/**
	 * Set a model as active
	 */
	async setActiveModel(modelId: string, templateId: string) {
		// Deactivate all models for this template
		await this.prisma.mLModel.updateMany({
			where: { templateId },
			data: { isActive: false },
		});

		// Activate the selected model
		return this.prisma.mLModel.update({
			where: { id: modelId },
			data: { isActive: true },
		});
	}

	// ============================
	// Exam Grading Workflow Methods
	// ============================

	/**
	 * Generate expected responses using AI
	 */
	async generateExpectedResponse(input: {
		questionText: string;
		questionType: string;
		marks: number;
		style: string;
		subject: string;
	}): Promise<{
		answer: string;
		keywords: string;
		markingScheme: string;
		confidence: number;
	}> {
		// In production, this would call an LLM API (e.g., OpenAI, Claude)
		// For now, simulate AI-generated responses

		this.logger.debug(
			`Generating expected response for: ${input.questionText.substring(
				0,
				50,
			)}...`,
		);

		// Simulate different response types based on question type
		let answer: string;
		let keywords: string[];
		let markingScheme: any;

		switch (input.questionType) {
			case "MCQ":
				answer = "A"; // Simulated answer
				keywords = ["option A", "correct choice"];
				markingScheme = { fullMarks: input.marks, partialMarks: 0 };
				break;

			case "TRUE_FALSE":
				answer = "True";
				keywords = ["true", "correct"];
				markingScheme = { fullMarks: input.marks, partialMarks: 0 };
				break;

			case "NUMERIC":
				answer = "42"; // Simulated numeric answer
				keywords = ["42", "calculation"];
				markingScheme = {
					fullMarks: input.marks,
					partialMarks: input.marks * 0.5,
					tolerance: 0.01,
				};
				break;

			case "SHORT_ANSWER":
				answer = `Expected answer for: "${input.questionText.substring(
					0,
					30,
				)}..." This is a concise response covering the key points.`;
				keywords = this.extractKeywords(input.questionText);
				markingScheme = {
					fullMarks: input.marks,
					partialMarks: input.marks * 0.5,
					criteria: [
						"Key concept mentioned",
						"Correct terminology",
						"Logical structure",
					],
				};
				break;

			case "LONG_ANSWER":
			case "ESSAY":
				answer =
					`Comprehensive answer for: "${input.questionText.substring(
						0,
						30,
					)}..."\n\n` +
					"Introduction: [Key context and thesis]\n" +
					"Main Points: [Detailed explanation with examples]\n" +
					"Conclusion: [Summary and implications]";
				keywords = this.extractKeywords(input.questionText);
				markingScheme = {
					fullMarks: input.marks,
					criteria: [
						{ name: "Introduction", marks: input.marks * 0.2 },
						{ name: "Content Coverage", marks: input.marks * 0.5 },
						{ name: "Analysis", marks: input.marks * 0.2 },
						{ name: "Conclusion", marks: input.marks * 0.1 },
					],
				};
				break;

			default:
				answer = `Expected response for the question about ${input.subject}`;
				keywords = this.extractKeywords(input.questionText);
				markingScheme = { fullMarks: input.marks };
		}

		return {
			answer,
			keywords: JSON.stringify(keywords),
			markingScheme: JSON.stringify(markingScheme),
			confidence: 0.75 + Math.random() * 0.2, // 0.75-0.95
		};
	}

	/**
	 * Extract keywords from question text
	 */
	private extractKeywords(text: string): string[] {
		// Simple keyword extraction - in production use NLP
		const words = text
			.toLowerCase()
			.replace(/[^\w\s]/g, "")
			.split(/\s+/)
			.filter((word) => word.length > 4);

		// Remove common words
		const stopWords = [
			"what",
			"which",
			"where",
			"when",
			"would",
			"could",
			"should",
			"about",
			"these",
			"those",
			"their",
			"there",
			"being",
			"between",
		];
		return [...new Set(words.filter((w) => !stopWords.includes(w)))].slice(
			0,
			5,
		);
	}

	/**
	 * Calibrate grading using moderation samples
	 */
	async calibrateGrading(input: {
		questions: any[];
		expectedResponses: any[];
		moderationSamples: any[];
	}): Promise<{
		accuracy: number;
		averageDeviation: number;
	}> {
		// Simulate calibration by comparing AI predictions with teacher grades
		this.logger.debug(
			`Calibrating with ${input.moderationSamples.length} samples`,
		);

		let totalDeviation = 0;
		let correctPredictions = 0;
		let totalPredictions = 0;

		for (const sample of input.moderationSamples) {
			const teacherScores = JSON.parse(sample.questionScores);

			for (const teacherScore of teacherScores) {
				// Simulate AI prediction
				const question = input.questions.find(
					(q) => q.id === teacherScore.questionId,
				);
				if (!question) continue;

				const maxMarks = question.marks;
				const teacherMark = teacherScore.score;

				// Simulate AI score (with some variance around teacher score)
				const variance = (Math.random() - 0.5) * maxMarks * 0.3;
				const aiScore = Math.max(0, Math.min(maxMarks, teacherMark + variance));

				const deviation = Math.abs(aiScore - teacherMark) / maxMarks;
				totalDeviation += deviation;

				// Consider prediction correct if within 20% of max marks
				if (deviation <= 0.2) {
					correctPredictions++;
				}
				totalPredictions++;
			}
		}

		const averageDeviation =
			totalPredictions > 0 ? totalDeviation / totalPredictions : 0;
		const accuracy =
			totalPredictions > 0 ? correctPredictions / totalPredictions : 0;

		return {
			accuracy,
			averageDeviation,
		};
	}

	/**
	 * Grade a student's exam response
	 */
	async gradeExamResponse(input: {
		submissionImageUrl: string;
		questionNumber: number;
		questionText: string;
		questionType: string;
		maxMarks: number;
		expectedResponse: string;
		keywords?: string;
		markingScheme?: string;
	}): Promise<{
		extractedAnswer: string;
		score: number;
		correctness: "CORRECT" | "PARTIAL" | "INCORRECT";
		confidence: number;
		explanation: string;
	}> {
		// In production, this would:
		// 1. Use OCR to extract answer from image
		// 2. Use NLP/LLM to compare with expected response
		// 3. Calculate score based on marking scheme

		this.logger.debug(
			`Grading Q${input.questionNumber}: ${input.questionText.substring(
				0,
				30,
			)}...`,
		);

		// Simulate OCR extraction
		const extractedAnswer = this.simulateOCRExtraction(input.questionType);

		// Simulate scoring
		const { score, correctness, confidence, explanation } =
			this.simulateScoring(
				input.questionType,
				input.maxMarks,
				extractedAnswer,
				input.expectedResponse,
				input.keywords,
			);

		return {
			extractedAnswer,
			score,
			correctness,
			confidence,
			explanation,
		};
	}

	private simulateOCRExtraction(questionType: string): string {
		switch (questionType) {
			case "MCQ":
				return ["A", "B", "C", "D"][Math.floor(Math.random() * 4)];
			case "TRUE_FALSE":
				return Math.random() > 0.5 ? "True" : "False";
			case "NUMERIC":
				return String(Math.floor(Math.random() * 100));
			case "SHORT_ANSWER":
				return "Student provided a brief answer covering some key points.";
			case "LONG_ANSWER":
			case "ESSAY":
				return "Student wrote a detailed response with introduction, main points, and conclusion. The answer demonstrates understanding of the core concepts.";
			default:
				return "Student response extracted from image.";
		}
	}

	private simulateScoring(
		questionType: string,
		maxMarks: number,
		extractedAnswer: string,
		expectedResponse: string,
		keywords?: string,
	): {
		score: number;
		correctness: "CORRECT" | "PARTIAL" | "INCORRECT";
		confidence: number;
		explanation: string;
	} {
		// Simulate scoring with random element for demo
		const random = Math.random();
		let scoreRatio: number;
		let correctness: "CORRECT" | "PARTIAL" | "INCORRECT";
		let confidence: number;
		let explanation: string;

		if (questionType === "MCQ" || questionType === "TRUE_FALSE") {
			// Binary scoring
			if (random > 0.3) {
				scoreRatio = 1;
				correctness = "CORRECT";
				confidence = 0.9 + Math.random() * 0.1;
				explanation = `Answer "${extractedAnswer}" matches expected response.`;
			} else {
				scoreRatio = 0;
				correctness = "INCORRECT";
				confidence = 0.85 + Math.random() * 0.1;
				explanation = `Answer "${extractedAnswer}" does not match expected "${expectedResponse}".`;
			}
		} else if (questionType === "NUMERIC") {
			// Numeric with tolerance
			if (random > 0.4) {
				scoreRatio = 1;
				correctness = "CORRECT";
				confidence = 0.88 + Math.random() * 0.1;
				explanation = `Numeric answer "${extractedAnswer}" is within acceptable range.`;
			} else if (random > 0.2) {
				scoreRatio = 0.5;
				correctness = "PARTIAL";
				confidence = 0.7 + Math.random() * 0.15;
				explanation = `Numeric answer shows partial work but final value may be incorrect.`;
			} else {
				scoreRatio = 0;
				correctness = "INCORRECT";
				confidence = 0.8 + Math.random() * 0.1;
				explanation = `Numeric answer "${extractedAnswer}" is incorrect.`;
			}
		} else {
			// Text-based answers with keyword matching
			const keywordList = keywords ? JSON.parse(keywords) : [];
			const keywordsFound = keywordList.filter((k: string) =>
				extractedAnswer.toLowerCase().includes(k.toLowerCase()),
			).length;
			const keywordRatio =
				keywordList.length > 0 ? keywordsFound / keywordList.length : 0.5;

			if (random > 0.3 && keywordRatio >= 0.6) {
				scoreRatio = 0.8 + Math.random() * 0.2;
				correctness = "CORRECT";
				confidence = 0.7 + Math.random() * 0.2;
				explanation = `Good answer with ${keywordsFound}/${keywordList.length} key concepts. Well-structured response.`;
			} else if (random > 0.15 || keywordRatio >= 0.3) {
				scoreRatio = 0.4 + Math.random() * 0.3;
				correctness = "PARTIAL";
				confidence = 0.6 + Math.random() * 0.2;
				explanation = `Partial answer with ${keywordsFound}/${keywordList.length} key concepts. Some points missing.`;
			} else {
				scoreRatio = Math.random() * 0.2;
				correctness = "INCORRECT";
				confidence = 0.65 + Math.random() * 0.2;
				explanation = `Answer lacks key concepts. Only ${keywordsFound}/${keywordList.length} keywords found.`;
			}
		}

		return {
			score: Math.round(maxMarks * scoreRatio * 10) / 10,
			correctness,
			confidence,
			explanation,
		};
	}
}
