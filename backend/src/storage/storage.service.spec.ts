import { Test, TestingModule } from "@nestjs/testing";
import { StorageService } from "./storage.service";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

describe("StorageService", () => {
	let service: StorageService;
	let configService: ConfigService;

	const mockConfigService = {
		get: jest.fn((key: string, defaultValue?: any) => {
			const config: Record<string, any> = {
				"storage.provider": "local",
				"storage.localPath": "./test-uploads",
				"aws.accessKeyId": "",
				"aws.secretAccessKey": "",
				"aws.region": "us-east-1",
				"aws.s3Bucket": "test-bucket",
				"aws.s3Endpoint": undefined,
				"aws.s3ForcePathStyle": false,
			};
			return config[key] ?? defaultValue;
		}),
	};

	beforeAll(() => {
		// Create test upload directory
		const testDir = path.join(process.cwd(), "test-uploads");
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir, { recursive: true });
		}
	});

	afterAll(() => {
		// Cleanup test directory
		const testDir = path.join(process.cwd(), "test-uploads");
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				StorageService,
				{
					provide: ConfigService,
					useValue: mockConfigService,
				},
			],
		}).compile();

		service = module.get<StorageService>(StorageService);
		configService = module.get<ConfigService>(ConfigService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("uploadFile", () => {
		it("should upload a file to local storage", async () => {
			const testBuffer = Buffer.from("test content");
			const filename = "test-file.txt";
			const folder = "test";
			const mimeType = "text/plain";

			const result = await service.uploadFile(
				testBuffer,
				filename,
				folder,
				mimeType,
			);

			expect(result).toBeDefined();
			expect(result.key).toBeDefined();
			expect(result.url).toBeDefined();
			expect(result.size).toBe(testBuffer.length);
		});

		it("should generate unique keys for files", async () => {
			const testBuffer = Buffer.from("test content");
			const filename = "duplicate.txt";

			const result1 = await service.uploadFile(
				testBuffer,
				filename,
				"test",
				"text/plain",
			);
			const result2 = await service.uploadFile(
				testBuffer,
				filename,
				"test",
				"text/plain",
			);

			expect(result1.key).not.toBe(result2.key);
		});
	});

	describe("getFile", () => {
		it("should retrieve a previously uploaded file", async () => {
			const originalContent = "test download content";
			const testBuffer = Buffer.from(originalContent);
			const filename = "download-test.txt";

			const uploaded = await service.uploadFile(
				testBuffer,
				filename,
				"test",
				"text/plain",
			);
			const downloaded = await service.getFile(uploaded.key);

			expect(downloaded.toString()).toBe(originalContent);
		});

		it("should throw error for non-existent file", async () => {
			await expect(service.getFile("non-existent-key")).rejects.toThrow();
		});
	});

	describe("deleteFile", () => {
		it("should delete an uploaded file", async () => {
			const testBuffer = Buffer.from("delete me");
			const uploaded = await service.uploadFile(
				testBuffer,
				"to-delete.txt",
				"test",
				"text/plain",
			);

			await service.deleteFile(uploaded.key);

			await expect(service.getFile(uploaded.key)).rejects.toThrow();
		});
	});

	describe("uploadBase64", () => {
		it("should upload base64 encoded data", async () => {
			const originalContent = "test base64 content";
			const base64Data = Buffer.from(originalContent).toString("base64");

			const result = await service.uploadBase64(
				`data:text/plain;base64,${base64Data}`,
				"base64-test.txt",
				"test",
				"text/plain",
			);

			expect(result).toBeDefined();
			expect(result.key).toBeDefined();
			expect(result.url).toBeDefined();
		});
	});
});
