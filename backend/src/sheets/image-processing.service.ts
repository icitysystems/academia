import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StorageService } from "../storage/storage.service";
import * as sharp from "sharp";

// Dynamic import for Tesseract.js - makes it optional for Lambda deployment
// Tesseract.js is removed from the Lambda bundle to reduce package size
interface TesseractWorker {
	recognize: (
		image: Buffer,
		options?: Record<string, any>,
	) => Promise<{ data: { text: string; confidence: number; words?: any[] } }>;
	terminate: () => Promise<any>;
}
let tesseractModule: typeof import("tesseract.js") | null = null;
let tesseractLoadError: string | null = null;

async function loadTesseract(): Promise<boolean> {
	if (tesseractModule !== null) return true;
	if (tesseractLoadError !== null) return false;
	try {
		tesseractModule = await import("tesseract.js");
		return true;
	} catch (error) {
		tesseractLoadError = error instanceof Error ? error.message : String(error);
		return false;
	}
}

export interface ProcessingResult {
	processedUrl: string;
	thumbnailUrl: string;
	ocrData: Record<string, any>;
	metadata: {
		width: number;
		height: number;
		rotation: number;
		skewAngle: number;
	};
}

export interface RegionOCRResult {
	regionId: string;
	text: string;
	confidence: number;
	boundingBox: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
}

export interface PreprocessingOptions {
	deskew?: boolean;
	denoise?: boolean;
	normalizeContrast?: boolean;
	targetDPI?: number;
}

/**
 * Image Processing Service
 *
 * NOTE: Tesseract.js is loaded dynamically to support Lambda deployments
 * where the package may be removed to reduce bundle size. When Tesseract
 * is not available, OCR returns placeholder text with low confidence.
 */
@Injectable()
export class ImageProcessingService {
	private readonly logger = new Logger(ImageProcessingService.name);
	private ocrWorker: TesseractWorker | null = null;
	private readonly ocrLanguage: string;
	private tesseractAvailable = false;
	private tesseractInitialized = false;

	constructor(
		private storageService: StorageService,
		private configService: ConfigService,
	) {
		this.ocrLanguage = this.configService.get<string>("ocr.language", "eng");
	}

	/**
	 * Check if Tesseract OCR is available
	 */
	isTesseractAvailable(): boolean {
		return this.tesseractAvailable;
	}

	/**
	 * Initialize OCR worker (lazy loading)
	 * Returns null if Tesseract is not available
	 */
	private async getOCRWorker(): Promise<TesseractWorker | null> {
		if (this.ocrWorker) return this.ocrWorker;

		// Only try once to load tesseract
		if (this.tesseractInitialized) {
			return null;
		}
		this.tesseractInitialized = true;

		const loaded = await loadTesseract();
		if (!loaded || !tesseractModule) {
			this.logger.warn(
				`Tesseract.js not available: ${tesseractLoadError || "Unknown error"}`,
			);
			this.logger.warn("OCR will return placeholder results");
			return null;
		}

		try {
			this.logger.log("Initializing Tesseract OCR worker...");
			this.ocrWorker = (await tesseractModule.createWorker(
				this.ocrLanguage,
			)) as unknown as TesseractWorker;
			this.tesseractAvailable = true;
			this.logger.log("OCR worker initialized");
			return this.ocrWorker;
		} catch (error) {
			this.logger.error("Failed to create Tesseract worker:", error);
			return null;
		}
	}

	/**
	 * Process a scanned answer sheet image
	 */
	async processSheet(
		imageUrl: string,
		templateId: string,
		regions: Array<{
			id: string;
			bboxX: number;
			bboxY: number;
			bboxWidth: number;
			bboxHeight: number;
			questionType?: string;
		}>,
		options: PreprocessingOptions = {},
	): Promise<ProcessingResult> {
		this.logger.log(
			`Processing sheet from ${imageUrl} for template ${templateId}`,
		);

		// Download image from storage
		const key = this.storageService.extractKeyFromUrl(imageUrl);
		if (!key) {
			throw new Error("Invalid image URL");
		}

		const imageBuffer = await this.storageService.getFile(key);

		// Get image metadata
		const metadata = await sharp(imageBuffer).metadata();
		const width = metadata.width || 2480;
		const height = metadata.height || 3508;

		// Preprocess image
		const processedBuffer = await this.preprocessImage(imageBuffer, {
			deskew: options.deskew ?? true,
			denoise: options.denoise ?? true,
			normalizeContrast: options.normalizeContrast ?? true,
		});

		// Upload processed image
		const processedResult = await this.storageService.uploadFile(
			processedBuffer,
			"processed.jpg",
			"sheets",
			"image/jpeg",
		);

		// Generate thumbnail
		const thumbnailBuffer = await this.generateThumbnail(processedBuffer, 300);
		const thumbnailResult = await this.storageService.uploadFile(
			thumbnailBuffer,
			"thumbnail.jpg",
			"thumbnails",
			"image/jpeg",
		);

		// Run OCR on each region
		const ocrData: Record<string, RegionOCRResult> = {};

		for (const region of regions) {
			try {
				const regionResult = await this.processRegion(
					processedBuffer,
					region,
					width,
					height,
				);
				ocrData[region.id] = regionResult;
			} catch (error) {
				this.logger.error(`Failed to process region ${region.id}:`, error);
				ocrData[region.id] = {
					regionId: region.id,
					text: "",
					confidence: 0,
					boundingBox: {
						x: region.bboxX,
						y: region.bboxY,
						width: region.bboxWidth,
						height: region.bboxHeight,
					},
				};
			}
		}

		return {
			processedUrl: processedResult.url,
			thumbnailUrl: thumbnailResult.url,
			ocrData,
			metadata: {
				width,
				height,
				rotation: 0,
				skewAngle: 0,
			},
		};
	}

	/**
	 * Preprocess image: deskew, denoise, normalize contrast
	 */
	async preprocessImage(
		buffer: Buffer,
		options: PreprocessingOptions = {},
	): Promise<Buffer> {
		this.logger.log("Preprocessing image...");

		let pipeline = sharp(buffer);

		// Convert to grayscale for better OCR
		pipeline = pipeline.grayscale();

		// Normalize/enhance contrast
		if (options.normalizeContrast !== false) {
			pipeline = pipeline.normalize();
		}

		// Sharpen for better text recognition
		pipeline = pipeline.sharpen({ sigma: 1.5 });

		// Apply median filter for noise reduction
		if (options.denoise !== false) {
			pipeline = pipeline.median(3);
		}

		// Convert to high-quality JPEG
		const result = await pipeline.jpeg({ quality: 95 }).toBuffer();

		this.logger.log("Image preprocessing complete");
		return result;
	}

	/**
	 * Process a single region and extract text
	 */
	private async processRegion(
		imageBuffer: Buffer,
		region: {
			id: string;
			bboxX: number;
			bboxY: number;
			bboxWidth: number;
			bboxHeight: number;
			questionType?: string;
		},
		imageWidth: number,
		imageHeight: number,
	): Promise<RegionOCRResult> {
		// Convert percentage-based coordinates to pixels
		const left = Math.floor((region.bboxX / 100) * imageWidth);
		const top = Math.floor((region.bboxY / 100) * imageHeight);
		const width = Math.floor((region.bboxWidth / 100) * imageWidth);
		const height = Math.floor((region.bboxHeight / 100) * imageHeight);

		// Extract region from image
		const regionBuffer = await sharp(imageBuffer)
			.extract({ left, top, width, height })
			.toBuffer();

		// Run OCR
		const ocrResult = await this.runOCR(regionBuffer);

		return {
			regionId: region.id,
			text: ocrResult.text.trim(),
			confidence: ocrResult.confidence,
			boundingBox: { x: left, y: top, width, height },
		};
	}

	/**
	 * Run OCR on an image buffer
	 * Returns placeholder result if Tesseract is not available
	 */
	async runOCR(buffer: Buffer): Promise<{ text: string; confidence: number }> {
		const worker = await this.getOCRWorker();

		if (!worker) {
			// Tesseract not available - return placeholder
			this.logger.warn("OCR not available - returning placeholder result");
			return {
				text: "[OCR_UNAVAILABLE]",
				confidence: 0.0,
			};
		}

		const { data } = await worker.recognize(buffer);

		return {
			text: data.text,
			confidence: data.confidence / 100, // Convert to 0-1 scale
		};
	}

	/**
	 * Generate a thumbnail
	 */
	async generateThumbnail(
		buffer: Buffer,
		width: number = 200,
	): Promise<Buffer> {
		return sharp(buffer)
			.resize(width, null, { fit: "inside" })
			.jpeg({ quality: 80 })
			.toBuffer();
	}

	/**
	 * Detect if image contains handwriting vs printed text
	 */
	async detectHandwriting(
		buffer: Buffer,
	): Promise<{ isHandwritten: boolean; confidence: number }> {
		// Analyze image characteristics to detect handwriting
		const metadata = await sharp(buffer).stats();

		// Handwritten text typically has more variation in intensity
		const stdDev = metadata.channels[0]?.stdev || 0;

		// Higher standard deviation suggests more variation (likely handwriting)
		const isHandwritten = stdDev > 40;

		return {
			isHandwritten,
			confidence: isHandwritten
				? Math.min(stdDev / 100, 1)
				: 1 - Math.min(stdDev / 100, 1),
		};
	}

	/**
	 * Extract answer regions as separate images for ML processing
	 */
	async extractRegionImages(
		imageBuffer: Buffer,
		regions: Array<{
			id: string;
			bboxX: number;
			bboxY: number;
			bboxWidth: number;
			bboxHeight: number;
		}>,
	): Promise<Map<string, Buffer>> {
		const metadata = await sharp(imageBuffer).metadata();
		const width = metadata.width || 2480;
		const height = metadata.height || 3508;

		const regionImages = new Map<string, Buffer>();

		for (const region of regions) {
			const left = Math.floor((region.bboxX / 100) * width);
			const top = Math.floor((region.bboxY / 100) * height);
			const regionWidth = Math.floor((region.bboxWidth / 100) * width);
			const regionHeight = Math.floor((region.bboxHeight / 100) * height);

			const regionBuffer = await sharp(imageBuffer)
				.extract({
					left: Math.max(0, left),
					top: Math.max(0, top),
					width: Math.min(regionWidth, width - left),
					height: Math.min(regionHeight, height - top),
				})
				.normalize()
				.toBuffer();

			regionImages.set(region.id, regionBuffer);
		}

		return regionImages;
	}

	/**
	 * Cleanup OCR worker on shutdown
	 */
	async onModuleDestroy() {
		if (this.ocrWorker) {
			await this.ocrWorker.terminate();
			this.ocrWorker = null;
		}
	}
}
