import { Test, TestingModule } from "@nestjs/testing";
import { ImageProcessingService } from "./image-processing.service";
import { ConfigService } from "@nestjs/config";
import { StorageService } from "../storage/storage.service";

describe("ImageProcessingService", () => {
	let service: ImageProcessingService;

	const mockStorageService = {
		extractKeyFromUrl: jest.fn((url: string) => {
			if (url.includes("/uploads/")) {
				return url.split("/uploads/")[1];
			}
			return null;
		}),
		getFile: jest.fn(),
		uploadFile: jest.fn(),
	};

	const mockConfigService = {
		get: jest.fn((key: string, defaultValue?: any) => {
			const config: Record<string, any> = {
				"ocr.language": "eng",
				"ocr.confidence": 60,
			};
			return config[key] ?? defaultValue;
		}),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ImageProcessingService,
				{ provide: StorageService, useValue: mockStorageService },
				{ provide: ConfigService, useValue: mockConfigService },
			],
		}).compile();

		service = module.get<ImageProcessingService>(ImageProcessingService);
		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("preprocessImage", () => {
		it("should process an image buffer", async () => {
			// Create a simple 100x100 white PNG
			const sharp = require("sharp");
			const testImage = await sharp({
				create: {
					width: 100,
					height: 100,
					channels: 3,
					background: { r: 255, g: 255, b: 255 },
				},
			})
				.png()
				.toBuffer();

			const result = await service.preprocessImage(testImage);

			expect(result).toBeDefined();
			expect(Buffer.isBuffer(result)).toBe(true);
		});

		it("should apply preprocessing options", async () => {
			const sharp = require("sharp");
			const testImage = await sharp({
				create: {
					width: 50,
					height: 50,
					channels: 3,
					background: { r: 255, g: 0, b: 0 }, // Red image
				},
			})
				.png()
				.toBuffer();

			const result = await service.preprocessImage(testImage, {
				denoise: true,
				normalizeContrast: true,
			});

			// Verify the result is a valid image buffer
			const metadata = await sharp(result).metadata();
			expect(metadata.width).toBeDefined();
			expect(metadata.height).toBeDefined();
		});
	});

	describe("generateThumbnail", () => {
		it("should generate a thumbnail with specified width", async () => {
			const sharp = require("sharp");
			const testImage = await sharp({
				create: {
					width: 1000,
					height: 1000,
					channels: 3,
					background: { r: 200, g: 200, b: 200 },
				},
			})
				.png()
				.toBuffer();

			const result = await service.generateThumbnail(testImage, 100);

			const metadata = await sharp(result).metadata();
			expect(metadata.width).toBeLessThanOrEqual(100);
		});
	});

	describe("detectHandwriting", () => {
		it("should analyze image for handwriting detection", async () => {
			const sharp = require("sharp");
			const testImage = await sharp({
				create: {
					width: 500,
					height: 700,
					channels: 3,
					background: { r: 255, g: 255, b: 255 },
				},
			})
				.png()
				.toBuffer();

			const result = await service.detectHandwriting(testImage);

			expect(result).toBeDefined();
			expect(typeof result.isHandwritten).toBe("boolean");
			expect(typeof result.confidence).toBe("number");
			expect(result.confidence).toBeGreaterThanOrEqual(0);
			expect(result.confidence).toBeLessThanOrEqual(1);
		});
	});
});
