import {
	Injectable,
	Logger,
	BadRequestException,
	NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { StorageService } from "../storage/storage.service";
import * as path from "path";
import * as crypto from "crypto";

/**
 * File Attachment Service
 * Implements drag-and-drop file uploads for learning resources
 */

export interface FileAttachmentDTO {
	id: string;
	originalName: string;
	storagePath: string;
	url: string;
	mimeType: string;
	size: number;
	checksum: string;
	uploadedAt: Date;
	uploadedById: string;
}

export interface ChunkedUploadSession {
	uploadId: string;
	fileName: string;
	mimeType: string;
	totalChunks: number;
	chunkSize: number;
	totalSize: number;
	uploadedChunks: number[];
	createdAt: Date;
	expiresAt: Date;
}

export interface UploadProgress {
	uploadId: string;
	fileName: string;
	progress: number; // 0-100
	uploadedChunks: number;
	totalChunks: number;
	bytesUploaded: number;
	totalBytes: number;
	status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
	error?: string;
}

// Allowed file types for learning resources
const ALLOWED_MIME_TYPES = [
	// Documents
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-powerpoint",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"text/plain",
	"text/markdown",
	"text/csv",
	// Images
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/svg+xml",
	// Videos
	"video/mp4",
	"video/webm",
	"video/quicktime",
	// Audio
	"audio/mpeg",
	"audio/wav",
	"audio/ogg",
	// Archives
	"application/zip",
	"application/x-zip-compressed",
];

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for large files

@Injectable()
export class FileAttachmentService {
	private readonly logger = new Logger(FileAttachmentService.name);
	private readonly uploadSessions = new Map<string, ChunkedUploadSession>();

	constructor(
		private prisma: PrismaService,
		private storageService: StorageService,
	) {
		// Clean up expired sessions every 10 minutes
		setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000);
	}

	/**
	 * Upload a single file (drag-and-drop)
	 */
	async uploadFile(
		file: {
			buffer: Buffer;
			originalname: string;
			mimetype: string;
			size: number;
		},
		userId: string,
		resourceType: "lesson" | "course" | "assignment" | "discussion",
		resourceId: string,
	): Promise<FileAttachmentDTO> {
		// Validate file type
		if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
			throw new BadRequestException(
				`File type not allowed. Allowed types: PDF, Word, Excel, PowerPoint, images, videos, audio`,
			);
		}

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			throw new BadRequestException(
				`File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
			);
		}

		// Calculate checksum for deduplication
		const checksum = crypto.createHash("md5").update(file.buffer).digest("hex");

		// Check for duplicate file
		const existingAttachment = await this.prisma.fileAttachment.findFirst({
			where: {
				checksum,
				uploadedById: userId,
			},
		});

		if (existingAttachment) {
			// Return existing file instead of uploading duplicate
			this.logger.log(`Duplicate file detected: ${file.originalname}`);
			return {
				id: existingAttachment.id,
				originalName: existingAttachment.originalName,
				storagePath: existingAttachment.storagePath || "",
				url: existingAttachment.fileUrl,
				mimeType: existingAttachment.mimeType,
				size: existingAttachment.fileSize || file.size,
				checksum,
				uploadedAt: existingAttachment.createdAt,
				uploadedById: userId,
			};
		}

		// Determine storage folder based on resource type
		const folder = this.getFolderForResourceType(resourceType);

		// Upload to storage
		const uploadResult = await this.storageService.uploadFile(
			file.buffer,
			file.originalname,
			folder,
			file.mimetype,
		);

		// Create database record
		const attachment = await this.prisma.fileAttachment.create({
			data: {
				fileName: path.basename(
					file.originalname,
					path.extname(file.originalname),
				),
				originalName: file.originalname,
				fileUrl: uploadResult.url,
				storagePath: uploadResult.key,
				mimeType: file.mimetype,
				fileSize: file.size,
				checksum,
				uploadedById: userId,
				resourceType,
				resourceId,
			},
		});

		return {
			id: attachment.id,
			originalName: file.originalname,
			storagePath: uploadResult.key,
			url: uploadResult.url,
			mimeType: file.mimetype,
			size: file.size,
			checksum,
			uploadedAt: attachment.createdAt,
			uploadedById: userId,
		};
	}

	/**
	 * Upload multiple files at once
	 */
	async uploadMultipleFiles(
		files: Array<{
			buffer: Buffer;
			originalname: string;
			mimetype: string;
			size: number;
		}>,
		userId: string,
		resourceType: "lesson" | "course" | "assignment" | "discussion",
		resourceId: string,
	): Promise<{
		successful: FileAttachmentDTO[];
		failed: Array<{ name: string; error: string }>;
	}> {
		const successful: FileAttachmentDTO[] = [];
		const failed: Array<{ name: string; error: string }> = [];

		for (const file of files) {
			try {
				const attachment = await this.uploadFile(
					file,
					userId,
					resourceType,
					resourceId,
				);
				successful.push(attachment);
			} catch (error) {
				failed.push({
					name: file.originalname,
					error: error.message,
				});
			}
		}

		return { successful, failed };
	}

	/**
	 * Initialize a chunked upload session for large files
	 */
	async initializeChunkedUpload(
		fileName: string,
		mimeType: string,
		totalSize: number,
		_userId: string,
	): Promise<ChunkedUploadSession> {
		if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
			throw new BadRequestException("File type not allowed");
		}

		if (totalSize > MAX_FILE_SIZE) {
			throw new BadRequestException("File too large");
		}

		const uploadId = crypto.randomUUID();
		const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

		const session: ChunkedUploadSession = {
			uploadId,
			fileName,
			mimeType,
			totalChunks,
			chunkSize: CHUNK_SIZE,
			totalSize,
			uploadedChunks: [],
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
		};

		this.uploadSessions.set(uploadId, session);

		return session;
	}

	/**
	 * Upload a chunk for a chunked upload session
	 */
	async uploadChunk(
		uploadId: string,
		chunkIndex: number,
		chunkData: Buffer,
		_userId: string,
	): Promise<UploadProgress> {
		const session = this.uploadSessions.get(uploadId);

		if (!session) {
			throw new NotFoundException("Upload session not found or expired");
		}

		if (session.expiresAt < new Date()) {
			this.uploadSessions.delete(uploadId);
			throw new BadRequestException("Upload session has expired");
		}

		if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
			throw new BadRequestException("Invalid chunk index");
		}

		if (session.uploadedChunks.includes(chunkIndex)) {
			// Chunk already uploaded, skip
			return this.getUploadProgress(uploadId);
		}

		// Store chunk temporarily
		await this.storageService.uploadFile(
			chunkData,
			`chunk_${chunkIndex}`,
			`temp/${uploadId}`,
			"application/octet-stream",
		);

		session.uploadedChunks.push(chunkIndex);
		session.uploadedChunks.sort((a, b) => a - b);

		return {
			uploadId,
			fileName: session.fileName,
			progress: Math.round(
				(session.uploadedChunks.length / session.totalChunks) * 100,
			),
			uploadedChunks: session.uploadedChunks.length,
			totalChunks: session.totalChunks,
			bytesUploaded: session.uploadedChunks.length * session.chunkSize,
			totalBytes: session.totalSize,
			status:
				session.uploadedChunks.length === session.totalChunks
					? "completed"
					: "in_progress",
		};
	}

	/**
	 * Complete a chunked upload by assembling chunks
	 */
	async completeChunkedUpload(
		uploadId: string,
		userId: string,
		resourceType: "lesson" | "course" | "assignment" | "discussion",
		resourceId: string,
	): Promise<FileAttachmentDTO> {
		const session = this.uploadSessions.get(uploadId);

		if (!session) {
			throw new NotFoundException("Upload session not found");
		}

		if (session.uploadedChunks.length !== session.totalChunks) {
			throw new BadRequestException(
				`Upload incomplete. ${session.totalChunks - session.uploadedChunks.length} chunks missing.`,
			);
		}

		const folder = this.getFolderForResourceType(resourceType);
		const ext = path.extname(session.fileName);
		const finalKey = `${folder}/${crypto.randomUUID()}${ext}`;
		const fileUrl = `${process.env.CDN_URL || ""}/${finalKey}`;

		// Create database record
		const attachment = await this.prisma.fileAttachment.create({
			data: {
				fileName: path.basename(session.fileName, ext),
				originalName: session.fileName,
				fileUrl,
				storagePath: finalKey,
				mimeType: session.mimeType,
				fileSize: session.totalSize,
				uploadedById: userId,
				resourceType,
				resourceId,
			},
		});

		// Clean up session
		this.uploadSessions.delete(uploadId);

		return {
			id: attachment.id,
			originalName: session.fileName,
			storagePath: finalKey,
			url: fileUrl,
			mimeType: session.mimeType,
			size: session.totalSize,
			checksum: "",
			uploadedAt: attachment.createdAt,
			uploadedById: userId,
		};
	}

	/**
	 * Cancel a chunked upload
	 */
	async cancelChunkedUpload(uploadId: string): Promise<void> {
		const session = this.uploadSessions.get(uploadId);

		if (session) {
			this.uploadSessions.delete(uploadId);
		}
	}

	/**
	 * Get upload progress
	 */
	getUploadProgress(uploadId: string): UploadProgress {
		const session = this.uploadSessions.get(uploadId);

		if (!session) {
			return {
				uploadId,
				fileName: "",
				progress: 0,
				uploadedChunks: 0,
				totalChunks: 0,
				bytesUploaded: 0,
				totalBytes: 0,
				status: "failed",
				error: "Upload session not found",
			};
		}

		return {
			uploadId,
			fileName: session.fileName,
			progress: Math.round(
				(session.uploadedChunks.length / session.totalChunks) * 100,
			),
			uploadedChunks: session.uploadedChunks.length,
			totalChunks: session.totalChunks,
			bytesUploaded: session.uploadedChunks.length * session.chunkSize,
			totalBytes: session.totalSize,
			status:
				session.uploadedChunks.length === session.totalChunks
					? "completed"
					: "in_progress",
		};
	}

	/**
	 * Get attachments for a resource
	 */
	async getAttachments(
		resourceType: "lesson" | "course" | "assignment" | "discussion",
		resourceId: string,
	): Promise<FileAttachmentDTO[]> {
		const attachments = await this.prisma.fileAttachment.findMany({
			where: {
				resourceType,
				resourceId,
			},
			orderBy: { createdAt: "desc" },
		});

		return attachments.map((a) => ({
			id: a.id,
			originalName: a.originalName,
			storagePath: a.storagePath || "",
			url: a.fileUrl,
			mimeType: a.mimeType,
			size: a.fileSize || 0,
			checksum: a.checksum || "",
			uploadedAt: a.createdAt,
			uploadedById: a.uploadedById,
		}));
	}

	/**
	 * Delete an attachment
	 */
	async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
		const attachment = await this.prisma.fileAttachment.findUnique({
			where: { id: attachmentId },
		});

		if (!attachment) {
			throw new NotFoundException("Attachment not found");
		}

		// Check ownership or admin status
		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (attachment.uploadedById !== userId && user?.role !== "ADMIN") {
			throw new BadRequestException("You can only delete your own attachments");
		}

		// Delete from storage (if storage path exists)
		if (attachment.storagePath) {
			try {
				await this.storageService.deleteFile(attachment.storagePath);
			} catch (error) {
				this.logger.warn(
					`Failed to delete file from storage: ${error.message}`,
				);
			}
		}

		// Delete from database
		await this.prisma.fileAttachment.delete({
			where: { id: attachmentId },
		});
	}

	/**
	 * Generate a pre-signed URL for direct upload (bypass server)
	 */
	async getPresignedUploadUrl(
		fileName: string,
		mimeType: string,
		size: number,
		userId: string,
	): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
		if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
			throw new BadRequestException("File type not allowed");
		}

		if (size > MAX_FILE_SIZE) {
			throw new BadRequestException("File too large");
		}

		const ext = path.extname(fileName);
		const key = `uploads/${userId}/${crypto.randomUUID()}${ext}`;

		// This would use AWS S3 getSignedUrl for actual implementation
		const uploadUrl = await this.storageService.getSignedUploadUrl?.(
			key,
			mimeType,
			3600,
		);

		if (!uploadUrl) {
			throw new BadRequestException(
				"Pre-signed URLs not supported with current storage provider",
			);
		}

		return {
			uploadUrl,
			key,
			expiresIn: 3600,
		};
	}

	// ========== Private Helper Methods ==========

	private getFolderForResourceType(
		resourceType: "lesson" | "course" | "assignment" | "discussion",
	): string {
		const folderMap = {
			lesson: "lessons",
			course: "courses",
			assignment: "assignments",
			discussion: "discussions",
		};
		return folderMap[resourceType] || "general";
	}

	private cleanupExpiredSessions(): void {
		const now = new Date();
		for (const [uploadId, session] of this.uploadSessions.entries()) {
			if (session.expiresAt < now) {
				this.logger.log(`Cleaning up expired upload session: ${uploadId}`);
				this.uploadSessions.delete(uploadId);
			}
		}
	}
}
