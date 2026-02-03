import {
	Injectable,
	Logger,
	NotFoundException,
	ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { PubSub } from "graphql-subscriptions";
import * as crypto from "crypto";

/**
 * Real-time Collaboration Service
 * Implements collaborative editing features using WebSocket/GraphQL subscriptions
 */

// Operation types for Operational Transformation (OT)
export type OperationType = "insert" | "delete" | "retain" | "replace";

export interface Operation {
	type: OperationType;
	position: number;
	content?: string;
	length?: number;
	userId: string;
	timestamp: number;
	version: number;
}

export interface CollaborationSession {
	id: string;
	documentId: string;
	documentType: "lesson_plan" | "assignment" | "document" | "note";
	participants: Map<string, ParticipantInfo>;
	operations: Operation[];
	currentVersion: number;
	content: string;
	createdAt: Date;
	lastActivity: Date;
}

export interface ParticipantInfo {
	id: string;
	name: string;
	color: string;
	cursor?: CursorPosition;
	selection?: SelectionRange;
	isActive: boolean;
	lastSeen: Date;
}

export interface CursorPosition {
	line: number;
	column: number;
	offset: number;
}

export interface SelectionRange {
	start: CursorPosition;
	end: CursorPosition;
}

export interface CollaborationEvent {
	type: "operation" | "cursor" | "selection" | "join" | "leave" | "sync";
	sessionId: string;
	userId: string;
	data: any;
	timestamp: number;
}

export interface Presence {
	userId: string;
	userName: string;
	color: string;
	cursor?: CursorPosition;
	selection?: SelectionRange;
	isTyping: boolean;
}

@Injectable()
export class RealTimeCollaborationService {
	private readonly logger = new Logger(RealTimeCollaborationService.name);
	private readonly sessions = new Map<string, CollaborationSession>();
	private readonly userSessions = new Map<string, Set<string>>(); // userId -> sessionIds
	private readonly pubSub: PubSub;
	private readonly PARTICIPANT_COLORS = [
		"#FF6B6B",
		"#4ECDC4",
		"#45B7D1",
		"#96CEB4",
		"#FFEAA7",
		"#DDA0DD",
		"#98D8C8",
		"#F7DC6F",
		"#BB8FCE",
		"#85C1E9",
		"#F8B500",
		"#82E0AA",
	];

	constructor(private prisma: PrismaService) {
		this.pubSub = new PubSub();
		// Clean up stale sessions every 5 minutes
		setInterval(() => this.cleanupStaleSessions(), 5 * 60 * 1000);
	}

	/**
	 * Create or join a collaboration session
	 */
	async joinSession(
		documentId: string,
		documentType: "lesson_plan" | "assignment" | "document" | "note",
		userId: string,
	): Promise<{
		session: CollaborationSession;
		participant: ParticipantInfo;
	}> {
		// Verify user access to document
		await this.verifyAccess(documentId, documentType, userId);

		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (!user) {
			throw new NotFoundException("User not found");
		}

		const sessionId = `${documentType}:${documentId}`;
		let session = this.sessions.get(sessionId);

		if (!session) {
			// Create new session
			const content = await this.loadDocumentContent(documentId, documentType);
			session = {
				id: sessionId,
				documentId,
				documentType,
				participants: new Map(),
				operations: [],
				currentVersion: 0,
				content,
				createdAt: new Date(),
				lastActivity: new Date(),
			};
			this.sessions.set(sessionId, session);
		}

		// Add participant if not already in session
		if (!session.participants.has(userId)) {
			const participantInfo: ParticipantInfo = {
				id: userId,
				name: user.name || user.email,
				color: this.assignColor(session.participants.size),
				isActive: true,
				lastSeen: new Date(),
			};
			session.participants.set(userId, participantInfo);

			// Track user's sessions
			if (!this.userSessions.has(userId)) {
				this.userSessions.set(userId, new Set());
			}
			this.userSessions.get(userId)!.add(sessionId);

			// Notify others
			await this.broadcastEvent(sessionId, {
				type: "join",
				sessionId,
				userId,
				data: participantInfo,
				timestamp: Date.now(),
			});
		}

		session.lastActivity = new Date();
		const participant = session.participants.get(userId)!;
		participant.isActive = true;
		participant.lastSeen = new Date();

		return { session, participant };
	}

	/**
	 * Leave a collaboration session
	 */
	async leaveSession(sessionId: string, userId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		const participant = session.participants.get(userId);
		if (participant) {
			participant.isActive = false;

			// Notify others
			await this.broadcastEvent(sessionId, {
				type: "leave",
				sessionId,
				userId,
				data: { userId },
				timestamp: Date.now(),
			});
		}

		// Remove from user's tracked sessions
		this.userSessions.get(userId)?.delete(sessionId);

		// Check if session should be closed
		const activeParticipants = Array.from(session.participants.values()).filter(
			(p) => p.isActive,
		);

		if (activeParticipants.length === 0) {
			// Save document and close session after a delay
			setTimeout(async () => {
				const currentSession = this.sessions.get(sessionId);
				if (currentSession) {
					const stillActive = Array.from(
						currentSession.participants.values(),
					).filter((p) => p.isActive);
					if (stillActive.length === 0) {
						await this.saveAndCloseSession(sessionId);
					}
				}
			}, 30000); // 30 second grace period
		}
	}

	/**
	 * Apply an operation to the document
	 */
	async applyOperation(
		sessionId: string,
		userId: string,
		operation: Omit<Operation, "userId" | "timestamp" | "version">,
	): Promise<{
		applied: Operation;
		content: string;
		version: number;
	}> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new NotFoundException("Session not found");
		}

		const participant = session.participants.get(userId);
		if (!participant) {
			throw new ForbiddenException("Not a participant in this session");
		}

		// Create the full operation
		const fullOperation: Operation = {
			...operation,
			userId,
			timestamp: Date.now(),
			version: session.currentVersion + 1,
		};

		// Transform operation if needed (Operational Transformation)
		const transformedOp = this.transformOperation(fullOperation, session);

		// Apply to content
		session.content = this.applyToContent(session.content, transformedOp);
		session.currentVersion = transformedOp.version;
		session.operations.push(transformedOp);
		session.lastActivity = new Date();
		participant.lastSeen = new Date();

		// Broadcast to other participants
		await this.broadcastEvent(sessionId, {
			type: "operation",
			sessionId,
			userId,
			data: transformedOp,
			timestamp: Date.now(),
		});

		// Auto-save periodically
		if (session.operations.length % 10 === 0) {
			await this.saveDocument(session);
		}

		return {
			applied: transformedOp,
			content: session.content,
			version: session.currentVersion,
		};
	}

	/**
	 * Update cursor position
	 */
	async updateCursor(
		sessionId: string,
		userId: string,
		cursor: CursorPosition,
	): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		const participant = session.participants.get(userId);
		if (participant) {
			participant.cursor = cursor;
			participant.lastSeen = new Date();

			await this.broadcastEvent(
				sessionId,
				{
					type: "cursor",
					sessionId,
					userId,
					data: { userId, cursor },
					timestamp: Date.now(),
				},
				userId, // exclude sender
			);
		}
	}

	/**
	 * Update text selection
	 */
	async updateSelection(
		sessionId: string,
		userId: string,
		selection: SelectionRange | null,
	): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		const participant = session.participants.get(userId);
		if (participant) {
			participant.selection = selection || undefined;
			participant.lastSeen = new Date();

			await this.broadcastEvent(
				sessionId,
				{
					type: "selection",
					sessionId,
					userId,
					data: { userId, selection },
					timestamp: Date.now(),
				},
				userId,
			);
		}
	}

	/**
	 * Get current presence (all participants' positions)
	 */
	getPresence(sessionId: string): Presence[] {
		const session = this.sessions.get(sessionId);
		if (!session) return [];

		return Array.from(session.participants.values())
			.filter((p) => p.isActive)
			.map((p) => ({
				userId: p.id,
				userName: p.name,
				color: p.color,
				cursor: p.cursor,
				selection: p.selection,
				isTyping: Date.now() - p.lastSeen.getTime() < 2000,
			}));
	}

	/**
	 * Get session state for syncing
	 */
	getSessionState(sessionId: string): {
		content: string;
		version: number;
		participants: ParticipantInfo[];
	} | null {
		const session = this.sessions.get(sessionId);
		if (!session) return null;

		return {
			content: session.content,
			version: session.currentVersion,
			participants: Array.from(session.participants.values()),
		};
	}

	/**
	 * Request sync from server (when client is behind)
	 */
	async requestSync(
		sessionId: string,
		userId: string,
		clientVersion: number,
	): Promise<{
		operations: Operation[];
		content: string;
		version: number;
	}> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new NotFoundException("Session not found");
		}

		// Get operations since client version
		const missedOperations = session.operations.filter(
			(op) => op.version > clientVersion,
		);

		return {
			operations: missedOperations,
			content: session.content,
			version: session.currentVersion,
		};
	}

	/**
	 * Subscribe to collaboration events
	 */
	subscribeToSession(sessionId: string): AsyncIterator<unknown> {
		return (this.pubSub as any).asyncIterator(`collaboration:${sessionId}`);
	}

	/**
	 * Get active sessions for a user
	 */
	getUserSessions(userId: string): string[] {
		return Array.from(this.userSessions.get(userId) || []);
	}

	// ========== Private Helper Methods ==========

	private async verifyAccess(
		documentId: string,
		documentType: string,
		userId: string,
	): Promise<void> {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (!user) {
			throw new NotFoundException("User not found");
		}

		// Check access based on document type
		switch (documentType) {
			case "lesson_plan":
				// Use Lesson model since we don't have a separate LessonPlan model
				const lesson = await this.prisma.lesson.findUnique({
					where: { id: documentId },
				});
				if (!lesson) {
					throw new NotFoundException("Lesson not found");
				}
				// Allow access if user is teacher, admin, or has shared access
				if (lesson.teacherId !== userId && user.role !== "ADMIN") {
					const sharedAccess = await this.prisma.sharedLessonPlan.findFirst({
						where: {
							lessonId: documentId,
							OR: [{ sharedWithId: userId }, { sharedWithRole: user.role }],
						},
					});
					if (!sharedAccess) {
						throw new ForbiddenException("Access denied");
					}
				}
				break;

			case "assignment":
				const assignment = await this.prisma.assignment.findUnique({
					where: { id: documentId },
					include: {
						lesson: {
							include: {
								module: {
									include: { course: true },
								},
							},
						},
					},
				});
				if (!assignment) {
					throw new NotFoundException("Assignment not found");
				}
				const course = assignment.lesson?.module?.course;
				if (course?.instructorId !== userId && user.role !== "ADMIN") {
					throw new ForbiddenException("Access denied");
				}
				break;

			default:
				// For generic documents, check ownership or admin
				if (user.role !== "ADMIN" && user.role !== "FACULTY") {
					throw new ForbiddenException("Access denied");
				}
		}
	}

	private async loadDocumentContent(
		documentId: string,
		documentType: string,
	): Promise<string> {
		switch (documentType) {
			case "lesson_plan":
				// Use Lesson's notes field for content
				const lessonDoc = await this.prisma.lesson.findUnique({
					where: { id: documentId },
				});
				return lessonDoc?.notes || "";

			case "assignment":
				const assignment = await this.prisma.assignment.findUnique({
					where: { id: documentId },
				});
				return assignment?.description || "";

			default:
				return "";
		}
	}

	private async saveDocument(session: CollaborationSession): Promise<void> {
		try {
			switch (session.documentType) {
				case "lesson_plan":
					await this.prisma.lesson.update({
						where: { id: session.documentId },
						data: { notes: session.content, updatedAt: new Date() },
					});
					break;

				case "assignment":
					await this.prisma.assignment.update({
						where: { id: session.documentId },
						data: { description: session.content, updatedAt: new Date() },
					});
					break;
			}
			this.logger.log(`Saved document ${session.documentId}`);
		} catch (error) {
			this.logger.error(`Failed to save document: ${error.message}`);
		}
	}

	private async saveAndCloseSession(sessionId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		await this.saveDocument(session);
		this.sessions.delete(sessionId);
		this.logger.log(`Closed session ${sessionId}`);
	}

	private transformOperation(
		operation: Operation,
		session: CollaborationSession,
	): Operation {
		// Simplified OT - in production, use a full OT library like ot.js
		// Transform against concurrent operations at the same version
		const concurrentOps = session.operations.filter(
			(op) =>
				op.version === operation.version - 1 && op.userId !== operation.userId,
		);

		const transformedOp = { ...operation };

		for (const concurrent of concurrentOps) {
			if (
				concurrent.type === "insert" &&
				transformedOp.position >= concurrent.position
			) {
				transformedOp.position += concurrent.content?.length || 0;
			} else if (
				concurrent.type === "delete" &&
				transformedOp.position > concurrent.position
			) {
				transformedOp.position -= Math.min(
					concurrent.length || 0,
					transformedOp.position - concurrent.position,
				);
			}
		}

		return transformedOp;
	}

	private applyToContent(content: string, operation: Operation): string {
		switch (operation.type) {
			case "insert":
				return (
					content.slice(0, operation.position) +
					(operation.content || "") +
					content.slice(operation.position)
				);

			case "delete":
				return (
					content.slice(0, operation.position) +
					content.slice(operation.position + (operation.length || 0))
				);

			case "replace":
				return (
					content.slice(0, operation.position) +
					(operation.content || "") +
					content.slice(operation.position + (operation.length || 0))
				);

			case "retain":
			default:
				return content;
		}
	}

	private async broadcastEvent(
		sessionId: string,
		event: CollaborationEvent,
		excludeUserId?: string,
	): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		// Publish to GraphQL subscriptions
		await this.pubSub.publish(`collaboration:${sessionId}`, {
			collaborationEvent: event,
		});
	}

	private assignColor(index: number): string {
		return this.PARTICIPANT_COLORS[index % this.PARTICIPANT_COLORS.length];
	}

	private cleanupStaleSessions(): void {
		const staleThreshold = Date.now() - 30 * 60 * 1000; // 30 minutes

		for (const [sessionId, session] of this.sessions.entries()) {
			if (session.lastActivity.getTime() < staleThreshold) {
				// Mark all participants as inactive
				for (const participant of session.participants.values()) {
					participant.isActive = false;
				}

				// Save and close
				this.saveAndCloseSession(sessionId);
			}
		}
	}
}
