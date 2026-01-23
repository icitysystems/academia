import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

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

	constructor(private configService: ConfigService) {
		// For development, always use local storage
		this.provider = "local";
		this.uploadDir = path.join(process.cwd(), "uploads");
		this.baseUrl = `http://localhost:${this.configService.get(
			"port",
			3333,
		)}/uploads`;
		this.ensureDirectories();
		this.logger.log(
			`Storage initialized with local provider (dir: ${this.uploadDir})`,
		);
	}

	private ensureDirectories() {
		const dirs = ["templates", "sheets", "pdfs", "models", "thumbnails"];
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
		return this.uploadToLocal(buffer, key);
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
		return this.getFromLocal(key);
	}

	private async getFromLocal(key: string): Promise<Buffer> {
		const filePath = path.join(this.uploadDir, key);
		return fs.promises.readFile(filePath);
	}

	async deleteFile(key: string): Promise<void> {
		const filePath = path.join(this.uploadDir, key);
		if (fs.existsSync(filePath)) {
			await fs.promises.unlink(filePath);
		}
	}

	async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
		return this.getPublicUrl(key);
	}

	async getSignedUploadUrl(
		key: string,
		mimeType: string,
		expiresIn: number = 3600,
	): Promise<string> {
		throw new Error("Signed upload URLs not supported for local storage");
	}

	async fileExists(key: string): Promise<boolean> {
		const filePath = path.join(this.uploadDir, key);
		return fs.existsSync(filePath);
	}

	getPublicUrl(key: string): string {
		return `${this.baseUrl}/${key}`;
	}

	extractKeyFromUrl(url: string): string | null {
		const match = url.match(/\/uploads\/(.+)$/);
		return match ? match[1] : null;
	}
}
