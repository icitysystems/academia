import { Injectable, Logger } from "@nestjs/common";

export interface SheetProcessingJob {
	sheetId: string;
	templateId: string;
	regions: Array<{
		id: string;
		bboxX: number;
		bboxY: number;
		bboxWidth: number;
		bboxHeight: number;
		questionType?: string;
	}>;
}

export interface TrainingJob {
	sessionId: string;
	templateId: string;
	teacherId: string;
	config: {
		epochs: number;
		learningRate: number;
		batchSize: number;
		validationSplit: number;
	};
}

export interface GradingJobData {
	jobId: string;
	sheetIds: string[];
	modelId: string;
	templateId: string;
}

export interface PDFGenerationJob {
	sheetId: string;
	options?: {
		includeOverlay?: boolean;
		includeScoreBreakdown?: boolean;
		includeConfidence?: boolean;
	};
}

export interface QueuedJob<T> {
	id: string;
	data: T;
	status: "pending" | "processing" | "completed" | "failed";
	createdAt: Date;
}

/**
 * Simple queue service for development that works without Redis.
 * Jobs are processed asynchronously via callbacks.
 */
@Injectable()
export class QueueService {
	private readonly logger = new Logger(QueueService.name);
	private useRedis: boolean;

	// In-memory job tracking
	private jobs: Map<string, QueuedJob<any>> = new Map();
	private jobCounter = 0;

	// Callbacks for job processing
	private sheetProcessingCallback?: (job: SheetProcessingJob) => Promise<void>;
	private trainingCallback?: (job: TrainingJob) => Promise<void>;
	private gradingCallback?: (job: GradingJobData) => Promise<void>;
	private pdfCallback?: (job: PDFGenerationJob) => Promise<void>;

	constructor(useRedis: boolean = false) {
		this.useRedis = useRedis;
		this.logger.log(
			`Queue service initialized (Redis: ${
				useRedis ? "enabled" : "disabled - using async processing"
			})`,
		);
	}

	/**
	 * Register callback for sheet processing
	 */
	onSheetProcessing(callback: (job: SheetProcessingJob) => Promise<void>) {
		this.sheetProcessingCallback = callback;
	}

	/**
	 * Register callback for training
	 */
	onTraining(callback: (job: TrainingJob) => Promise<void>) {
		this.trainingCallback = callback;
	}

	/**
	 * Register callback for grading
	 */
	onGrading(callback: (job: GradingJobData) => Promise<void>) {
		this.gradingCallback = callback;
	}

	/**
	 * Register callback for PDF generation
	 */
	onPDFGeneration(callback: (job: PDFGenerationJob) => Promise<void>) {
		this.pdfCallback = callback;
	}

	/**
	 * Add sheet processing job
	 */
	async addSheetProcessingJob(data: SheetProcessingJob): Promise<string> {
		const jobId = this.createJobId("sheet");
		this.logger.log(
			`Queuing sheet processing job ${jobId} for sheet ${data.sheetId}`,
		);

		this.jobs.set(jobId, {
			id: jobId,
			data,
			status: "pending",
			createdAt: new Date(),
		});

		// Process asynchronously
		if (this.sheetProcessingCallback) {
			this.processJobAsync(jobId, data, this.sheetProcessingCallback);
		}

		return jobId;
	}

	/**
	 * Add training job
	 */
	async addTrainingJob(data: TrainingJob): Promise<string> {
		const jobId = this.createJobId("training");
		this.logger.log(
			`Queuing training job ${jobId} for session ${data.sessionId}`,
		);

		this.jobs.set(jobId, {
			id: jobId,
			data,
			status: "pending",
			createdAt: new Date(),
		});

		if (this.trainingCallback) {
			this.processJobAsync(jobId, data, this.trainingCallback);
		}

		return jobId;
	}

	/**
	 * Add grading job
	 */
	async addGradingJob(data: GradingJobData): Promise<string> {
		const jobId = this.createJobId("grading");
		this.logger.log(
			`Queuing grading job ${jobId} for ${data.sheetIds.length} sheets`,
		);

		this.jobs.set(jobId, {
			id: jobId,
			data,
			status: "pending",
			createdAt: new Date(),
		});

		if (this.gradingCallback) {
			this.processJobAsync(jobId, data, this.gradingCallback);
		}

		return jobId;
	}

	/**
	 * Add PDF generation job
	 */
	async addPDFGenerationJob(data: PDFGenerationJob): Promise<string> {
		const jobId = this.createJobId("pdf");
		this.logger.log(
			`Queuing PDF generation job ${jobId} for sheet ${data.sheetId}`,
		);

		this.jobs.set(jobId, {
			id: jobId,
			data,
			status: "pending",
			createdAt: new Date(),
		});

		if (this.pdfCallback) {
			this.processJobAsync(jobId, data, this.pdfCallback);
		}

		return jobId;
	}

	/**
	 * Add batch PDF generation jobs
	 */
	async addBatchPDFJobs(
		sheetIds: string[],
		options?: PDFGenerationJob["options"],
	): Promise<string[]> {
		const jobIds: string[] = [];
		for (const sheetId of sheetIds) {
			const jobId = await this.addPDFGenerationJob({ sheetId, options });
			jobIds.push(jobId);
		}
		this.logger.log(`Queued ${sheetIds.length} PDF generation jobs`);
		return jobIds;
	}

	/**
	 * Get job status
	 */
	getJobStatus(jobId: string): QueuedJob<any> | undefined {
		return this.jobs.get(jobId);
	}

	/**
	 * Get queue statistics
	 */
	async getAllQueuesStatus(): Promise<Record<string, any>> {
		const jobs = Array.from(this.jobs.values());
		return {
			total: jobs.length,
			pending: jobs.filter((j) => j.status === "pending").length,
			processing: jobs.filter((j) => j.status === "processing").length,
			completed: jobs.filter((j) => j.status === "completed").length,
			failed: jobs.filter((j) => j.status === "failed").length,
		};
	}

	private createJobId(prefix: string): string {
		return `${prefix}-${++this.jobCounter}-${Date.now()}`;
	}

	private async processJobAsync<T>(
		jobId: string,
		data: T,
		callback: (data: T) => Promise<void>,
	): Promise<void> {
		const job = this.jobs.get(jobId);
		if (job) {
			job.status = "processing";
		}

		// Use setImmediate to process asynchronously
		setImmediate(async () => {
			try {
				await callback(data);
				if (job) {
					job.status = "completed";
				}
				this.logger.log(`Job ${jobId} completed successfully`);
			} catch (error) {
				if (job) {
					job.status = "failed";
				}
				this.logger.error(`Job ${jobId} failed:`, error);
			}
		});
	}
}
