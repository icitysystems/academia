import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { v4 as uuidv4 } from "uuid";

export interface CreateSessionInput {
	courseId?: string;
	title: string;
	description?: string;
	sessionType?: string;
	scheduledStart: Date;
	scheduledEnd?: Date;
	maxParticipants?: number;
	isRecorded?: boolean;
	password?: string;
}

export interface UpdateSessionInput {
	title?: string;
	description?: string;
	scheduledStart?: Date;
	scheduledEnd?: Date;
	maxParticipants?: number;
	isRecorded?: boolean;
	password?: string;
	status?: string;
}

@Injectable()
export class LiveSessionsService {
	constructor(
		private prisma: PrismaService,
		private notifications: NotificationsService,
	) {}

	async createSession(hostId: string, input: CreateSessionInput) {
		const roomId = `room_${uuidv4().replace(/-/g, "").substring(0, 12)}`;

		const session = await this.prisma.liveSession.create({
			data: {
				hostId,
				courseId: input.courseId,
				title: input.title,
				description: input.description,
				sessionType: input.sessionType || "LECTURE",
				roomId,
				password: input.password,
				scheduledStart: input.scheduledStart,
				scheduledEnd: input.scheduledEnd,
				maxParticipants: input.maxParticipants,
				isRecorded: input.isRecorded || false,
				status: "SCHEDULED",
			},
			include: {
				host: { select: { id: true, name: true, email: true } },
				course: { select: { id: true, title: true } },
			},
		});

		// Notify enrolled students if course-based session
		if (input.courseId) {
			const enrollments = await this.prisma.enrollment.findMany({
				where: { courseId: input.courseId, status: "ACTIVE" },
				select: { studentId: true },
			});

			const notifications = enrollments.map((e) => ({
				userId: e.studentId,
				type: "LIVE_SESSION",
				title: "New Live Session Scheduled",
				message: `"${input.title}" is scheduled for ${input.scheduledStart.toLocaleString()}`,
				link: `/live-sessions/${session.id}`,
				metadata: { sessionId: session.id },
			}));

			await this.notifications.createBulkNotifications(notifications);
		}

		return session;
	}

	async getSession(sessionId: string) {
		return this.prisma.liveSession.findUnique({
			where: { id: sessionId },
			include: {
				host: {
					select: { id: true, name: true, email: true, avatarUrl: true },
				},
				course: { select: { id: true, title: true, code: true } },
				participants: {
					include: {
						user: { select: { id: true, name: true, avatarUrl: true } },
					},
				},
			},
		});
	}

	async getUpcomingSessions(userId: string) {
		// Get sessions user is hosting or enrolled in courses that have sessions
		const enrolledCourseIds = await this.prisma.enrollment.findMany({
			where: { studentId: userId, status: "ACTIVE" },
			select: { courseId: true },
		});

		const courseIds = enrolledCourseIds.map((e) => e.courseId);

		return this.prisma.liveSession.findMany({
			where: {
				OR: [{ hostId: userId }, { courseId: { in: courseIds } }],
				status: { in: ["SCHEDULED", "LIVE"] },
				scheduledStart: { gte: new Date() },
			},
			include: {
				host: { select: { id: true, name: true } },
				course: { select: { id: true, title: true } },
				_count: { select: { participants: true } },
			},
			orderBy: { scheduledStart: "asc" },
			take: 10,
		});
	}

	async getHostedSessions(
		userId: string,
		options: { skip?: number; take?: number; status?: string } = {},
	) {
		const { skip = 0, take = 20, status } = options;

		const where: any = { hostId: userId };
		if (status) {
			where.status = status;
		}

		const [sessions, total] = await Promise.all([
			this.prisma.liveSession.findMany({
				where,
				include: {
					course: { select: { id: true, title: true } },
					_count: { select: { participants: true } },
				},
				orderBy: { scheduledStart: "desc" },
				skip,
				take,
			}),
			this.prisma.liveSession.count({ where }),
		]);

		return { sessions, total };
	}

	async updateSession(
		sessionId: string,
		userId: string,
		input: UpdateSessionInput,
	) {
		const session = await this.prisma.liveSession.findUnique({
			where: { id: sessionId },
		});

		if (!session) {
			throw new Error("Session not found");
		}

		if (session.hostId !== userId) {
			throw new Error("Only the host can update the session");
		}

		return this.prisma.liveSession.update({
			where: { id: sessionId },
			data: input,
			include: {
				host: { select: { id: true, name: true } },
				course: { select: { id: true, title: true } },
			},
		});
	}

	async startSession(sessionId: string, userId: string) {
		const session = await this.prisma.liveSession.findUnique({
			where: { id: sessionId },
		});

		if (!session) {
			throw new Error("Session not found");
		}

		if (session.hostId !== userId) {
			throw new Error("Only the host can start the session");
		}

		return this.prisma.liveSession.update({
			where: { id: sessionId },
			data: {
				status: "LIVE",
				actualStart: new Date(),
			},
			include: {
				host: { select: { id: true, name: true } },
				course: { select: { id: true, title: true } },
			},
		});
	}

	async endSession(sessionId: string, userId: string, recordingUrl?: string) {
		const session = await this.prisma.liveSession.findUnique({
			where: { id: sessionId },
		});

		if (!session) {
			throw new Error("Session not found");
		}

		if (session.hostId !== userId) {
			throw new Error("Only the host can end the session");
		}

		return this.prisma.liveSession.update({
			where: { id: sessionId },
			data: {
				status: "ENDED",
				actualEnd: new Date(),
				recordingUrl,
			},
			include: {
				host: { select: { id: true, name: true } },
				course: { select: { id: true, title: true } },
			},
		});
	}

	async cancelSession(sessionId: string, userId: string) {
		const session = await this.prisma.liveSession.findUnique({
			where: { id: sessionId },
			include: { participants: true },
		});

		if (!session) {
			throw new Error("Session not found");
		}

		if (session.hostId !== userId) {
			throw new Error("Only the host can cancel the session");
		}

		// Notify participants
		const notifications = session.participants.map((p) => ({
			userId: p.userId,
			type: "LIVE_SESSION_CANCELLED",
			title: "Session Cancelled",
			message: `The session "${session.title}" has been cancelled`,
			link: `/live-sessions`,
			metadata: { sessionId },
		}));

		await this.notifications.createBulkNotifications(notifications);

		return this.prisma.liveSession.update({
			where: { id: sessionId },
			data: { status: "CANCELLED" },
		});
	}

	async joinSession(sessionId: string, userId: string) {
		const session = await this.prisma.liveSession.findUnique({
			where: { id: sessionId },
			include: { _count: { select: { participants: true } } },
		});

		if (!session) {
			throw new Error("Session not found");
		}

		if (
			session.status !== "LIVE" &&
			session.status !== "SCHEDULED" &&
			session.hostId !== userId
		) {
			throw new Error("Session is not active");
		}

		if (
			session.maxParticipants &&
			session._count.participants >= session.maxParticipants
		) {
			throw new Error("Session is full");
		}

		// Create or update participant record
		const participant = await this.prisma.sessionParticipant.upsert({
			where: {
				sessionId_userId: { sessionId, userId },
			},
			create: {
				sessionId,
				userId,
				role: session.hostId === userId ? "HOST" : "ATTENDEE",
				joinedAt: new Date(),
			},
			update: {
				joinedAt: new Date(),
				leftAt: null,
			},
			include: {
				session: {
					include: {
						host: { select: { id: true, name: true } },
					},
				},
			},
		});

		return participant;
	}

	async leaveSession(sessionId: string, userId: string) {
		const participant = await this.prisma.sessionParticipant.findUnique({
			where: {
				sessionId_userId: { sessionId, userId },
			},
		});

		if (!participant) {
			throw new Error("Not a participant of this session");
		}

		const joinedAt = participant.joinedAt || new Date();
		const duration = Math.floor(
			(new Date().getTime() - joinedAt.getTime()) / 1000,
		);

		return this.prisma.sessionParticipant.update({
			where: { id: participant.id },
			data: {
				leftAt: new Date(),
				isActive: false,
			},
		});
	}

	async getSessionParticipants(sessionId: string) {
		return this.prisma.sessionParticipant.findMany({
			where: { sessionId },
			include: {
				user: { select: { id: true, name: true, avatarUrl: true } },
			},
			orderBy: { joinedAt: "asc" },
		});
	}

	async getRoomCredentials(sessionId: string, userId: string) {
		const session = await this.prisma.liveSession.findUnique({
			where: { id: sessionId },
		});

		if (!session) {
			throw new Error("Session not found");
		}

		// Check if user is host or participant
		const isHost = session.hostId === userId;
		const participant = await this.prisma.sessionParticipant.findUnique({
			where: { sessionId_userId: { sessionId, userId } },
		});

		if (!isHost && !participant) {
			throw new Error("Not authorized to join this session");
		}

		// Return WebRTC room credentials
		// In production, this would integrate with a service like Twilio, Daily.co, etc.
		return {
			roomId: session.roomId,
			token: `token_${session.roomId}_${userId}_${Date.now()}`, // Generate proper JWT in production
			isHost,
			turnServers: [
				{
					urls: "stun:stun.l.google.com:19302",
				},
			],
		};
	}
}
