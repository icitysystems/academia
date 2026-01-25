import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
	HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface UploadResult {
	url: string;
	key: string;
	size: number;
}

export type StorageProvider = "s3" | "local";

@Injectable()
export class StorageService {
	private readonly logger = new Logger(StorageService.name);
	private readonly provider: StorageProvider;
	private readonly uploadDir: string;
	private readonly baseUrl: string;
	private s3Client?: S3Client;
	private readonly bucketName?: string;
	private readonly cdnUrl?: string;

	constructor(private configService: ConfigService) {
		// Determine storage provider from environment
		const s3Bucket = this.configService.get<string>("AWS_S3_BUCKET");
		const awsRegion = this.configService.get<string>("AWS_REGION");

		if (s3Bucket && awsRegion) {
			this.provider = "s3";
			this.bucketName = s3Bucket;
			this.cdnUrl = this.configService.get<string>("AWS_CLOUDFRONT_URL");

			this.s3Client = new S3Client({
				region: awsRegion,
				credentials: {
					accessKeyId:
						this.configService.get<string>("AWS_ACCESS_KEY_ID") || "",
					secretAccessKey:
						this.configService.get<string>("AWS_SECRET_ACCESS_KEY") || "",
				},
			});

			this.logger.log(
				`Storage initialized with S3 provider (bucket: ${s3Bucket})`,
			);
		} else {
			this.provider = "local";
			this.uploadDir = path.join(process.cwd(), "uploads");
			this.baseUrl = `http://localhost:${this.configService.get("port", 3333)}/uploads`;
			this.ensureDirectories();
			this.logger.log(
				`Storage initialized with local provider (dir: ${this.uploadDir})`,
			);
		}
	}

	private ensureDirectories() {
		const dirs = [
			"templates",
			"sheets",
			"pdfs",
			"models",
			"thumbnails",
			"assignments",
			"courses",
			"profiles",
			"certificates",
		];
		for (const dir of dirs) {
			const fullPath = path.join(this.uploadDir, dir);
			if (!fs.existsSync(fullPath)) {
				fs.mkdirSync(fullPath, { recursive: true });
			}
		}
	}

	async uploadFile(
		buffer: Buffer,
		originalName: string,
		folder: string,
		mimeType: string,
	): Promise<UploadResult> {
		const ext = path.extname(originalName);
		const key = `${folder}/${uuidv4()}${ext}`;

		if (this.provider === "s3") {
			return this.uploadToS3(buffer, key, mimeType);
		}
		return this.uploadToLocal(buffer, key);
	}

	private async uploadToS3(
		buffer: Buffer,
		key: string,
		mimeType: string,
	): Promise<UploadResult> {
		if (!this.s3Client || !this.bucketName) {
			throw new Error("S3 client not initialized");
		}

		const command = new PutObjectCommand({
			Bucket: this.bucketName,
			Key: key,
			Body: buffer,
			ContentType: mimeType,
		});

		await this.s3Client.send(command);

		const url = this.cdnUrl
			? `${this.cdnUrl}/${key}`
			: `https://${this.bucketName}.s3.amazonaws.com/${key}`;

		return {
			url,
			key,
			size: buffer.length,
		};
	}

	private async uploadToLocal(
		buffer: Buffer,
		key: string,
	): Promise<UploadResult> {
		const filePath = path.join(this.uploadDir, key);
		const dir = path.dirname(filePath);

		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		await fs.promises.writeFile(filePath, buffer);

		return {
			url: `${this.baseUrl}/${key}`,
			key,
			size: buffer.length,
		};
	}

	async uploadBase64(
		base64Data: string,
		fileName: string,
		folder: string,
		mimeType: string = "application/octet-stream",
	): Promise<UploadResult> {
		const base64Content = base64Data.replace(/^data:[^;]+;base64,/, "");
		const buffer = Buffer.from(base64Content, "base64");
		return this.uploadFile(buffer, fileName, folder, mimeType);
	}

	async getFile(key: string): Promise<Buffer> {
		if (this.provider === "s3") {
			return this.getFromS3(key);
		}
		return this.getFromLocal(key);
	}

	private async getFromS3(key: string): Promise<Buffer> {
		if (!this.s3Client || !this.bucketName) {
			throw new Error("S3 client not initialized");
		}

		const command = new GetObjectCommand({
			Bucket: this.bucketName,
			Key: key,
		});

		const response = await this.s3Client.send(command);
		const stream = response.Body as NodeJS.ReadableStream;

		const chunks: Buffer[] = [];
		for await (const chunk of stream) {
			chunks.push(Buffer.from(chunk));
		}

		return Buffer.concat(chunks);
	}

	private async getFromLocal(key: string): Promise<Buffer> {
		const filePath = path.join(this.uploadDir, key);
		return fs.promises.readFile(filePath);
	}

	async deleteFile(key: string): Promise<void> {
		if (this.provider === "s3") {
			return this.deleteFromS3(key);
		}
		return this.deleteFromLocal(key);
	}

	private async deleteFromS3(key: string): Promise<void> {
		if (!this.s3Client || !this.bucketName) {
			throw new Error("S3 client not initialized");
		}

		const command = new DeleteObjectCommand({
			Bucket: this.bucketName,
			Key: key,
		});

		await this.s3Client.send(command);
	}

	private async deleteFromLocal(key: string): Promise<void> {
		const filePath = path.join(this.uploadDir, key);
		if (fs.existsSync(filePath)) {
			await fs.promises.unlink(filePath);
		}
	}

	async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
		if (this.provider === "s3") {
			return this.getSignedS3Url(key, expiresIn);
		}
		return this.getPublicUrl(key);
	}

	private async getSignedS3Url(
		key: string,
		expiresIn: number,
	): Promise<string> {
		if (!this.s3Client || !this.bucketName) {
			throw new Error("S3 client not initialized");
		}

		const command = new GetObjectCommand({
			Bucket: this.bucketName,
			Key: key,
		});

		return getSignedUrl(this.s3Client, command, { expiresIn });
	}

	async getSignedUploadUrl(
		key: string,
		mimeType: string,
		expiresIn: number = 3600,
	): Promise<string> {
		if (this.provider !== "s3") {
			throw new Error("Signed upload URLs only supported for S3 storage");
		}

		if (!this.s3Client || !this.bucketName) {
			throw new Error("S3 client not initialized");
		}

		const command = new PutObjectCommand({
			Bucket: this.bucketName,
			Key: key,
			ContentType: mimeType,
		});

		return getSignedUrl(this.s3Client, command, { expiresIn });
	}

	async fileExists(key: string): Promise<boolean> {
		if (this.provider === "s3") {
			return this.fileExistsS3(key);
		}
		return this.fileExistsLocal(key);
	}

	private async fileExistsS3(key: string): Promise<boolean> {
		if (!this.s3Client || !this.bucketName) {
			return false;
		}

		try {
			const command = new HeadObjectCommand({
				Bucket: this.bucketName,
				Key: key,
			});
			await this.s3Client.send(command);
			return true;
		} catch {
			return false;
		}
	}

	private async fileExistsLocal(key: string): Promise<boolean> {
		const filePath = path.join(this.uploadDir, key);
		return fs.existsSync(filePath);
	}

	getPublicUrl(key: string): string {
		if (this.provider === "s3") {
			return this.cdnUrl
				? `${this.cdnUrl}/${key}`
				: `https://${this.bucketName}.s3.amazonaws.com/${key}`;
		}
		return `${this.baseUrl}/${key}`;
	}

	extractKeyFromUrl(url: string): string | null {
		if (this.provider === "s3") {
			// Handle both S3 and CloudFront URLs
			const s3Match = url.match(/s3\.amazonaws\.com\/(.+)$/);
			if (s3Match) return s3Match[1];

			if (this.cdnUrl) {
				const cdnMatch = url.replace(this.cdnUrl + "/", "");
				if (cdnMatch !== url) return cdnMatch;
			}
			return null;
		}

		const match = url.match(/\/uploads\/(.+)$/);
		return match ? match[1] : null;
	}

	getProvider(): StorageProvider {
		return this.provider;
	}
}
