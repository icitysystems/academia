import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

export interface CreateNotificationInput {
	userId: string;
	type: string;
	title: string;
	message: string;
	link?: string;
	metadata?: any;
}

@Injectable()
export class NotificationsService {
	constructor(private prisma: PrismaService) {}

	async getUserNotifications(
		userId: string,
		options: { skip?: number; take?: number; unreadOnly?: boolean } = {},
	) {
		const { skip = 0, take = 20, unreadOnly = false } = options;

		const where: any = { userId };
		if (unreadOnly) {
			where.isRead = false;
		}

		const [notifications, total, unreadCount] = await Promise.all([
			this.prisma.notification.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip,
				take,
			}),
			this.prisma.notification.count({ where }),
			this.prisma.notification.count({ where: { userId, isRead: false } }),
		]);

		return {
			notifications,
			total,
			unreadCount,
		};
	}

	async createNotification(input: CreateNotificationInput) {
		return this.prisma.notification.create({
			data: {
				userId: input.userId,
				type: input.type,
				title: input.title,
				message: input.message,
				link: input.link,
				metadata: input.metadata,
			},
		});
	}

	async createBulkNotifications(inputs: CreateNotificationInput[]) {
		return this.prisma.notification.createMany({
			data: inputs.map((input) => ({
				userId: input.userId,
				type: input.type,
				title: input.title,
				message: input.message,
				link: input.link,
				metadata: input.metadata,
			})),
		});
	}

	async markAsRead(notificationId: string, userId: string) {
		const notification = await this.prisma.notification.findFirst({
			where: { id: notificationId, userId },
		});

		if (!notification) {
			throw new Error("Notification not found");
		}

		return this.prisma.notification.update({
			where: { id: notificationId },
			data: { isRead: true, readAt: new Date() },
		});
	}

	async markAllAsRead(userId: string) {
		await this.prisma.notification.updateMany({
			where: { userId, isRead: false },
			data: { isRead: true, readAt: new Date() },
		});

		return { success: true };
	}

	async deleteNotification(notificationId: string, userId: string) {
		const notification = await this.prisma.notification.findFirst({
			where: { id: notificationId, userId },
		});

		if (!notification) {
			throw new Error("Notification not found");
		}

		await this.prisma.notification.delete({
			where: { id: notificationId },
		});

		return true;
	}

	async deleteAllNotifications(userId: string) {
		await this.prisma.notification.deleteMany({
			where: { userId },
		});

		return true;
	}

	// Helper methods for creating specific notification types
	async notifyAssignmentDue(
		userId: string,
		assignmentTitle: string,
		dueDate: Date,
		assignmentId: string,
	) {
		return this.createNotification({
			userId,
			type: "ASSIGNMENT_DUE",
			title: "Assignment Due Soon",
			message: `"${assignmentTitle}" is due on ${dueDate.toLocaleDateString()}`,
			link: `/assignments/${assignmentId}`,
			metadata: { assignmentId, dueDate },
		});
	}

	async notifyGradePosted(
		userId: string,
		assignmentTitle: string,
		score: number,
		maxScore: number,
		assignmentId: string,
	) {
		return this.createNotification({
			userId,
			type: "GRADE_POSTED",
			title: "Grade Posted",
			message: `You received ${score}/${maxScore} on "${assignmentTitle}"`,
			link: `/assignments/${assignmentId}`,
			metadata: { assignmentId, score, maxScore },
		});
	}

	async notifyQuizAvailable(
		userId: string,
		quizTitle: string,
		quizId: string,
		courseTitle?: string,
	) {
		return this.createNotification({
			userId,
			type: "QUIZ_AVAILABLE",
			title: "New Quiz Available",
			message: `"${quizTitle}" is now available${courseTitle ? ` in ${courseTitle}` : ""}`,
			link: `/quizzes/${quizId}/take`,
			metadata: { quizId },
		});
	}

	async notifyAnnouncement(
		userId: string,
		title: string,
		courseTitle: string,
		courseId: string,
	) {
		return this.createNotification({
			userId,
			type: "ANNOUNCEMENT",
			title: "New Announcement",
			message: `New announcement in ${courseTitle}: "${title}"`,
			link: `/courses/${courseId}`,
			metadata: { courseId },
		});
	}

	async notifyDiscussionReply(
		userId: string,
		threadTitle: string,
		replierName: string,
		threadId: string,
	) {
		return this.createNotification({
			userId,
			type: "DISCUSSION_REPLY",
			title: "New Reply",
			message: `${replierName} replied to your discussion: "${threadTitle}"`,
			link: `/discussions/${threadId}`,
			metadata: { threadId },
		});
	}

	async notifyCourseUpdate(
		userId: string,
		courseTitle: string,
		updateType: string,
		courseId: string,
	) {
		return this.createNotification({
			userId,
			type: "COURSE_UPDATE",
			title: "Course Updated",
			message: `${updateType} in "${courseTitle}"`,
			link: `/courses/${courseId}`,
			metadata: { courseId, updateType },
		});
	}

	async notifySystem(userId: string, title: string, message: string) {
		return this.createNotification({
			userId,
			type: "SYSTEM",
			title,
			message,
		});
	}
}
