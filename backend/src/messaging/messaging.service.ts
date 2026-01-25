import {
	Injectable,
	Logger,
	NotFoundException,
	ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UserRole } from "../common/types";

/**
 * Messaging Service
 * Implements messaging functionality per Specification 2A.1, 2A.2
 */
@Injectable()
export class MessagingService {
	private readonly logger = new Logger(MessagingService.name);

	constructor(private prisma: PrismaService) {}

	// ============================
	// Direct Messages
	// ============================

	/**
	 * Send a direct message
	 */
	async sendMessage(senderId: string, input: SendMessageInput) {
		const sender = await this.prisma.user.findUnique({
			where: { id: senderId },
		});

		const recipient = await this.prisma.user.findUnique({
			where: { id: input.recipientId },
		});

		if (!sender || !recipient) {
			throw new NotFoundException("User not found");
		}

		// Create message as support ticket with special category
		const message = await this.prisma.supportTicket.create({
			data: {
				submitterId: senderId,
				assigneeId: input.recipientId,
				title: input.subject,
				subject: input.subject,
				description: input.content,
				category: "DIRECT_MESSAGE",
				priority: "MEDIUM",
				status: "OPEN",
			},
		});

		// Create audit log
		await this.prisma.auditLog.create({
			data: {
				userId: senderId,
				action: "SEND_MESSAGE",
				entityType: "Message",
				entityId: message.id,
				details: JSON.stringify({
					recipientId: input.recipientId,
					subject: input.subject,
				}),
			},
		});

		return {
			id: message.id,
			senderId,
			recipientId: input.recipientId,
			subject: input.subject,
			content: input.content,
			sentAt: message.createdAt,
			status: "SENT",
		};
	}

	/**
	 * Get inbox messages
	 */
	async getInbox(userId: string, options?: MessageQueryOptions) {
		const messages = await this.prisma.supportTicket.findMany({
			where: {
				assigneeId: userId,
				category: "DIRECT_MESSAGE",
			},
			include: {
				submitter: {
					select: { id: true, name: true, email: true, role: true },
				},
				comments: {
					orderBy: { createdAt: "desc" },
					take: 1,
				},
			},
			orderBy: { createdAt: "desc" },
			skip: options?.skip || 0,
			take: options?.take || 50,
		});

		return {
			messages: messages.map((m) => ({
				id: m.id,
				sender: m.submitter,
				subject: m.subject || m.title,
				preview: m.description?.substring(0, 100) + "...",
				sentAt: m.createdAt,
				isRead: m.status !== "OPEN",
				hasReplies: m.comments.length > 0,
			})),
			total: messages.length,
		};
	}

	/**
	 * Get sent messages
	 */
	async getSentMessages(userId: string, options?: MessageQueryOptions) {
		const messages = await this.prisma.supportTicket.findMany({
			where: {
				submitterId: userId,
				category: "DIRECT_MESSAGE",
			},
			include: {
				assignee: {
					select: { id: true, name: true, email: true, role: true },
				},
			},
			orderBy: { createdAt: "desc" },
			skip: options?.skip || 0,
			take: options?.take || 50,
		});

		return {
			messages: messages.map((m) => ({
				id: m.id,
				recipient: m.assignee,
				subject: m.subject || m.title,
				preview: m.description?.substring(0, 100) + "...",
				sentAt: m.createdAt,
				status: m.status,
			})),
			total: messages.length,
		};
	}

	/**
	 * Get conversation/thread
	 */
	async getConversation(userId: string, messageId: string) {
		const message = await this.prisma.supportTicket.findUnique({
			where: { id: messageId },
			include: {
				submitter: {
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
						avatarUrl: true,
					},
				},
				assignee: {
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
						avatarUrl: true,
					},
				},
				comments: {
					orderBy: { createdAt: "asc" },
				},
			},
		});

		if (!message) {
			throw new NotFoundException("Message not found");
		}

		// Check if user is participant
		if (message.submitterId !== userId && message.assigneeId !== userId) {
			throw new ForbiddenException("Not authorized to view this message");
		}

		// Mark as read if recipient
		if (message.assigneeId === userId && message.status === "OPEN") {
			await this.prisma.supportTicket.update({
				where: { id: messageId },
				data: { status: "IN_PROGRESS" },
			});
		}

		return {
			id: message.id,
			subject: message.subject || message.title,
			participants: [message.submitter, message.assignee].filter(Boolean),
			messages: [
				{
					id: message.id,
					senderId: message.submitterId,
					sender: message.submitter,
					content: message.description,
					sentAt: message.createdAt,
				},
				...message.comments.map((c) => ({
					id: c.id,
					senderId: c.authorId,
					content: c.content,
					sentAt: c.createdAt,
				})),
			],
			createdAt: message.createdAt,
		};
	}

	/**
	 * Reply to a message
	 */
	async replyToMessage(userId: string, messageId: string, content: string) {
		const message = await this.prisma.supportTicket.findUnique({
			where: { id: messageId },
		});

		if (!message) {
			throw new NotFoundException("Message not found");
		}

		if (message.submitterId !== userId && message.assigneeId !== userId) {
			throw new ForbiddenException("Not authorized to reply to this message");
		}

		const reply = await this.prisma.ticketComment.create({
			data: {
				ticketId: messageId,
				authorId: userId,
				content,
				isInternal: false,
			},
		});

		return {
			id: reply.id,
			messageId,
			senderId: userId,
			content,
			sentAt: reply.createdAt,
		};
	}

	// ============================
	// Announcements
	// ============================

	/**
	 * Create course announcement
	 */
	async createAnnouncement(
		instructorId: string,
		courseId: string,
		input: CreateAnnouncementInput,
	) {
		// Verify instructor owns the course
		const course = await this.prisma.course.findFirst({
			where: { id: courseId, instructorId },
		});

		if (!course) {
			throw new ForbiddenException(
				"Not authorized to create announcements for this course",
			);
		}

		const announcement = await this.prisma.courseAnnouncement.create({
			data: {
				courseId,
				authorId: instructorId,
				title: input.title,
				content: input.content,
				isPinned: input.isPinned || false,
				sendEmail: input.sendEmail || false,
			},
		});

		// Create audit log
		await this.prisma.auditLog.create({
			data: {
				userId: instructorId,
				action: "CREATE_ANNOUNCEMENT",
				entityType: "CourseAnnouncement",
				entityId: announcement.id,
			},
		});

		return announcement;
	}

	/**
	 * Get course announcements
	 */
	async getCourseAnnouncements(courseId: string, limit = 20) {
		return this.prisma.courseAnnouncement.findMany({
			where: { courseId },
			include: {
				author: {
					select: { id: true, name: true, avatarUrl: true },
				},
			},
			orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
			take: limit,
		});
	}

	// ============================
	// Notifications
	// ============================

	/**
	 * Get user notifications
	 */
	async getNotifications(userId: string, options?: NotificationOptions) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		const notifications: Notification[] = [];

		// Get unread messages
		const unreadMessages = await this.prisma.supportTicket.count({
			where: {
				assigneeId: userId,
				category: "DIRECT_MESSAGE",
				status: "OPEN",
			},
		});

		if (unreadMessages > 0) {
			notifications.push({
				id: "unread-messages",
				type: "UNREAD_MESSAGES",
				title: "Unread Messages",
				message: `You have ${unreadMessages} unread message(s)`,
				timestamp: new Date(),
				isRead: false,
			});
		}

		// Get recent announcements for enrolled courses (students)
		if (user.role === UserRole.STUDENT) {
			const enrollments = await this.prisma.enrollment.findMany({
				where: { studentId: userId, status: "ACTIVE" },
				select: { courseId: true },
			});
			const courseIds = enrollments.map((e) => e.courseId);

			const recentAnnouncements = await this.prisma.courseAnnouncement.findMany(
				{
					where: {
						courseId: { in: courseIds },
						createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
					},
					include: {
						course: { select: { title: true } },
					},
					orderBy: { createdAt: "desc" },
					take: 10,
				},
			);

			for (const ann of recentAnnouncements) {
				notifications.push({
					id: `announcement-${ann.id}`,
					type: "ANNOUNCEMENT",
					title: ann.title,
					message: `New announcement in ${ann.course.title}`,
					timestamp: ann.createdAt,
					isRead: false,
					link: `/courses/${ann.courseId}`,
				});
			}
		}

		// Get upcoming deadlines
		if (user.role === UserRole.STUDENT) {
			const enrollments = await this.prisma.enrollment.findMany({
				where: { studentId: userId, status: "ACTIVE" },
				select: { courseId: true },
			});
			const courseIds = enrollments.map((e) => e.courseId);

			const upcomingAssignments = await this.prisma.assignment.findMany({
				where: {
					lesson: { module: { courseId: { in: courseIds } } },
					dueDate: {
						gte: new Date(),
						lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
					},
					status: "PUBLISHED",
				},
				take: 5,
			});

			for (const assignment of upcomingAssignments) {
				notifications.push({
					id: `deadline-${assignment.id}`,
					type: "DEADLINE",
					title: "Upcoming Deadline",
					message: `${assignment.title} is due soon`,
					timestamp: assignment.dueDate!,
					isRead: false,
				});
			}
		}

		// Sort by timestamp
		notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

		return {
			notifications: notifications.slice(0, options?.limit || 20),
			unreadCount: notifications.filter((n) => !n.isRead).length,
		};
	}

	/**
	 * Mark notification as read
	 */
	async markNotificationRead(userId: string, notificationId: string) {
		// For message notifications, mark the message as read
		if (notificationId.startsWith("message-")) {
			const messageId = notificationId.replace("message-", "");
			await this.prisma.supportTicket.update({
				where: { id: messageId },
				data: { status: "IN_PROGRESS" },
			});
		}

		return { success: true };
	}

	/**
	 * Get notification preferences
	 */
	async getNotificationPreferences(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		const prefs = user.notificationPreferences
			? JSON.parse(user.notificationPreferences)
			: {};

		return {
			email: prefs.email ?? true,
			push: prefs.push ?? true,
			sms: prefs.sms ?? false,
			announcements: prefs.announcements ?? true,
			deadlines: prefs.deadlines ?? true,
			grades: prefs.grades ?? true,
			messages: prefs.messages ?? true,
		};
	}

	/**
	 * Update notification preferences
	 */
	async updateNotificationPreferences(
		userId: string,
		preferences: Record<string, boolean>,
	) {
		await this.prisma.user.update({
			where: { id: userId },
			data: {
				notificationPreferences: JSON.stringify(preferences),
			},
		});

		return { success: true, preferences };
	}
}

// Types
interface SendMessageInput {
	recipientId: string;
	subject: string;
	content: string;
}

interface MessageQueryOptions {
	skip?: number;
	take?: number;
	filter?: string;
}

interface CreateAnnouncementInput {
	title: string;
	content: string;
	isPinned?: boolean;
	sendEmail?: boolean;
}

export interface NotificationOptions {
	limit?: number;
	types?: string[];
}

export interface Notification {
	id: string;
	type: string;
	title: string;
	message: string;
	timestamp: Date;
	isRead: boolean;
	link?: string;
}
