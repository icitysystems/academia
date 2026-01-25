import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom, timeout, catchError } from "rxjs";
import { AxiosError } from "axios";

export type Correctness = "CORRECT" | "PARTIAL" | "INCORRECT" | "SKIPPED";

export interface PythonPredictionRequest {
	model_id: string;
	region_id: string;
	text: string;
	ocr_data: Record<string, any>;
	question_type: string;
	expected_answer?: string;
	max_points: number;
}

export interface PythonPredictionResponse {
	region_id: string;
	predicted_correctness: Correctness;
	confidence: number;
	assigned_score: number;
	explanation: string;
	needs_review: boolean;
	inference_time_ms: number;
}

export interface PythonTrainingRequest {
	model_id: string;
	template_id: string;
	training_data: {
		text: string;
		question_type: string;
		expected_answer?: string;
		label: Correctness;
		score: number;
	}[];
	config?: {
		model_type?: "random_forest" | "gradient_boosting" | "neural_network";
		n_estimators?: number;
		learning_rate?: number;
		max_depth?: number;
		epochs?: number;
		validation_split?: number;
	};
}

export interface PythonTrainingResponse {
	model_id: string;
	accuracy: number;
	validation_accuracy: number;
	confusion_matrix: number[][];
	training_time_seconds: number;
}

export interface ModelInfo {
	model_id: string;
	template_id: string;
	accuracy: number;
	created_at: string;
	model_type: string;
}

/**
 * Python ML Service Client
 * Connects to the external Python ML microservice for advanced ML inference
 */
@Injectable()
export class PythonMLClientService implements OnModuleInit {
	private readonly logger = new Logger(PythonMLClientService.name);
	private baseUrl: string;
	private isAvailable = false;
	private readonly requestTimeout = 30000; // 30 seconds

	constructor(
		private httpService: HttpService,
		private configService: ConfigService,
	) {
		this.baseUrl =
			this.configService.get<string>("ml.pythonServiceUrl") ||
			"http://localhost:8001";
	}

	async onModuleInit() {
		await this.checkServiceHealth();
	}

	/**
	 * Check if the Python ML service is available
	 */
	async checkServiceHealth(): Promise<boolean> {
		try {
			const response = await firstValueFrom(
				this.httpService.get(`${this.baseUrl}/health`).pipe(
					timeout(5000),
					catchError((error: AxiosError) => {
						throw error;
					}),
				),
			);
			this.isAvailable = response.data?.status === "healthy";
			this.logger.log(
				`Python ML Service health check: ${this.isAvailable ? "available" : "unavailable"}`,
			);
			return this.isAvailable;
		} catch (error) {
			this.isAvailable = false;
			this.logger.warn(
				`Python ML Service unavailable at ${this.baseUrl}: ${error.message}`,
			);
			return false;
		}
	}

	/**
	 * Check if the Python ML service is available
	 */
	isServiceAvailable(): boolean {
		return this.isAvailable;
	}

	/**
	 * Make a single prediction using the Python ML service
	 */
	async predict(
		request: PythonPredictionRequest,
	): Promise<PythonPredictionResponse> {
		if (!this.isAvailable) {
			throw new Error("Python ML Service is not available");
		}

		try {
			const response = await firstValueFrom(
				this.httpService
					.post<PythonPredictionResponse>(`${this.baseUrl}/predict`, request)
					.pipe(
						timeout(this.requestTimeout),
						catchError((error: AxiosError) => {
							this.logger.error(
								`Prediction failed: ${error.message}`,
								error.response?.data,
							);
							throw error;
						}),
					),
			);
			return response.data;
		} catch (error) {
			this.logger.error(`Prediction error: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Make batch predictions using the Python ML service
	 */
	async predictBatch(
		modelId: string,
		predictions: PythonPredictionRequest[],
	): Promise<PythonPredictionResponse[]> {
		if (!this.isAvailable) {
			throw new Error("Python ML Service is not available");
		}

		try {
			const response = await firstValueFrom(
				this.httpService
					.post<PythonPredictionResponse[]>(`${this.baseUrl}/predict/batch`, {
						model_id: modelId,
						predictions,
					})
					.pipe(
						timeout(this.requestTimeout * 2), // Longer timeout for batch
						catchError((error: AxiosError) => {
							this.logger.error(
								`Batch prediction failed: ${error.message}`,
								error.response?.data,
							);
							throw error;
						}),
					),
			);
			return response.data;
		} catch (error) {
			this.logger.error(`Batch prediction error: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Train a new model using the Python ML service
	 */
	async trainModel(
		request: PythonTrainingRequest,
	): Promise<PythonTrainingResponse> {
		if (!this.isAvailable) {
			throw new Error("Python ML Service is not available");
		}

		try {
			const response = await firstValueFrom(
				this.httpService
					.post<PythonTrainingResponse>(`${this.baseUrl}/train`, request)
					.pipe(
						timeout(this.requestTimeout * 10), // Much longer timeout for training
						catchError((error: AxiosError) => {
							this.logger.error(
								`Training failed: ${error.message}`,
								error.response?.data,
							);
							throw error;
						}),
					),
			);
			return response.data;
		} catch (error) {
			this.logger.error(`Training error: ${error.message}`);
			throw error;
		}
	}

	/**
	 * List all available models in the Python ML service
	 */
	async listModels(): Promise<ModelInfo[]> {
		if (!this.isAvailable) {
			return [];
		}

		try {
			const response = await firstValueFrom(
				this.httpService.get<ModelInfo[]>(`${this.baseUrl}/models`).pipe(
					timeout(this.requestTimeout),
					catchError((error: AxiosError) => {
						this.logger.error(`List models failed: ${error.message}`);
						throw error;
					}),
				),
			);
			return response.data;
		} catch (error) {
			this.logger.error(`List models error: ${error.message}`);
			return [];
		}
	}

	/**
	 * Delete a model from the Python ML service
	 */
	async deleteModel(modelId: string): Promise<boolean> {
		if (!this.isAvailable) {
			return false;
		}

		try {
			await firstValueFrom(
				this.httpService.delete(`${this.baseUrl}/models/${modelId}`).pipe(
					timeout(this.requestTimeout),
					catchError((error: AxiosError) => {
						this.logger.error(`Delete model failed: ${error.message}`);
						throw error;
					}),
				),
			);
			return true;
		} catch (error) {
			this.logger.error(`Delete model error: ${error.message}`);
			return false;
		}
	}

	/**
	 * Save a model to disk in the Python ML service
	 */
	async saveModel(modelId: string, path?: string): Promise<boolean> {
		if (!this.isAvailable) {
			return false;
		}

		try {
			await firstValueFrom(
				this.httpService
					.post(`${this.baseUrl}/models/${modelId}/save`, null, {
						params: path ? { path } : {},
					})
					.pipe(
						timeout(this.requestTimeout),
						catchError((error: AxiosError) => {
							this.logger.error(`Save model failed: ${error.message}`);
							throw error;
						}),
					),
			);
			return true;
		} catch (error) {
			this.logger.error(`Save model error: ${error.message}`);
			return false;
		}
	}

	/**
	 * Load a model from disk in the Python ML service
	 */
	async loadModel(modelId: string, path?: string): Promise<boolean> {
		if (!this.isAvailable) {
			return false;
		}

		try {
			await firstValueFrom(
				this.httpService
					.post(`${this.baseUrl}/models/${modelId}/load`, null, {
						params: path ? { path } : {},
					})
					.pipe(
						timeout(this.requestTimeout),
						catchError((error: AxiosError) => {
							this.logger.error(`Load model failed: ${error.message}`);
							throw error;
						}),
					),
			);
			return true;
		} catch (error) {
			this.logger.error(`Load model error: ${error.message}`);
			return false;
		}
	}
}
