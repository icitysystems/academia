import {
	Injectable,
	Logger,
	OnModuleInit,
	OnModuleDestroy,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { PushNotificationsService } from "./push-notifications.service";

/**
 * In-App Notifications Service
 * Implements real-time in-app notifications with delivery tracking
 */

export interface InAppNotification {
	id: string;
	userId: string;
	type: string;
	title: string;
	message: string;
	link?: string;
	metadata?: any;
	isRead: boolean;
	readAt?: Date;
	deliveredAt?: Date;
	createdAt: Date;
}

export interface NotificationDeliveryResult {
	inApp: { success: boolean; notificationId?: string };
	push?: { sent: number; failed: number };
	email?: { sent: boolean; messageId?: string };
}

export type NotificationChannel = "IN_APP" | "PUSH" | "EMAIL" | "SMS";

export interface NotificationPreferences {
	channels: {
		inApp: boolean;
		push: boolean;
		email: boolean;
		sms: boolean;
	};
	types: {
		[key: string]: NotificationChannel[];
	};
	quietHours?: {
		enabled: boolean;
		start: string; // HH:mm
		end: string; // HH:mm
		timezone: string;
	};
	digest?: {
		enabled: boolean;
		frequency: "DAILY" | "WEEKLY";
		preferredTime: string; // HH:mm
	};
}

// In-memory store for real-time notification handlers
type NotificationHandler = (notification: InAppNotification) => void;
const subscriptionHandlers = new Map<string, Set<NotificationHandler>>();

@Injectable()
export class NotificationDeliveryService
	implements OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger(NotificationDeliveryService.name);
	private cleanupInterval: NodeJS.Timeout | null = null;

	constructor(
		private prisma: PrismaService,
		private pushService: PushNotificationsService,
	) {}

	onModuleInit() {
		// Set up periodic cleanup of old notifications
		this.cleanupInterval = setInterval(
			() => this.cleanupOldNotifications(),
			24 * 60 * 60 * 1000, // Daily cleanup
		);
	}

	onModuleDestroy() {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}

	/**
	 * Subscribe to real-time notifications for a user
	 * (Used for WebSocket/SSE connections)
	 */
	subscribeToNotifications(
		userId: string,
		handler: NotificationHandler,
	): () => void {
		if (!subscriptionHandlers.has(userId)) {
			subscriptionHandlers.set(userId, new Set());
		}
		subscriptionHandlers.get(userId)!.add(handler);

		// Return unsubscribe function
		return () => {
			subscriptionHandlers.get(userId)?.delete(handler);
		};
	}

	/**
	 * Deliver a notification through configured channels
	 */
	async deliverNotification(
		userId: string,
		notification: {
			type: string;
			title: string;
			message: string;
			link?: string;
			metadata?: any;
			priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
		},
		channels?: NotificationChannel[],
	): Promise<NotificationDeliveryResult> {
		const result: NotificationDeliveryResult = {
			inApp: { success: false },
		};

		// Get user's notification preferences
		const preferences = await this.getUserPreferences(userId);
		const activeChannels =
			channels || this.getChannelsForType(notification.type, preferences);

		// Always create in-app notification
		if (activeChannels.includes("IN_APP") || !channels) {
			try {
				const inAppNotification = await this.createInAppNotification(
					userId,
					notification,
				);
				result.inApp = { success: true, notificationId: inAppNotification.id };

				// Trigger real-time delivery
				this.triggerRealTimeDelivery(userId, inAppNotification);
			} catch (error: any) {
				this.logger.error(`In-app notification failed: ${error.message}`);
			}
		}

		// Check quiet hours before push notifications
		const inQuietHours = this.isInQuietHours(preferences);

		// Send push notification
		if (
			activeChannels.includes("PUSH") &&
			preferences.channels.push &&
			!inQuietHours
		) {
			try {
				const pushResult = await this.pushService.sendToUser(userId, {
					title: notification.title,
					body: notification.message,
					icon: "/icons/notification-icon.png",
					badge: "/icons/badge-icon.png",
					data: {
						url: notification.link,
						notificationId: result.inApp.notificationId,
						type: notification.type,
						...notification.metadata,
					},
					tag: notification.type,
					requireInteraction:
						notification.priority === "HIGH" ||
						notification.priority === "URGENT",
				});
				result.push = pushResult;
			} catch (error: any) {
				this.logger.error(`Push notification failed: ${error.message}`);
				result.push = { sent: 0, failed: 1 };
			}
		}

		// Email notification would be sent here
		if (
			activeChannels.includes("EMAIL") &&
			preferences.channels.email &&
			!inQuietHours
		) {
			// TODO: Integrate with email service
			result.email = { sent: false };
		}

		return result;
	}

	/**
	 * Create in-app notification
	 */
	private async createInAppNotification(
		userId: string,
		notification: {
			type: string;
			title: string;
			message: string;
			link?: string;
			metadata?: any;
		},
	): Promise<InAppNotification> {
		const created = await this.prisma.notification.create({
			data: {
				userId,
				type: notification.type,
				title: notification.title,
				message: notification.message,
				link: notification.link,
				metadata: notification.metadata
					? JSON.stringify(notification.metadata)
					: null,
			},
		});

		return {
			...created,
			metadata: created.metadata ? JSON.parse(created.metadata) : null,
			deliveredAt: new Date(),
		};
	}

	/**
	 * Trigger real-time delivery to connected clients
	 */
	private triggerRealTimeDelivery(
		userId: string,
		notification: InAppNotification,
	) {
		const handlers = subscriptionHandlers.get(userId);
		if (handlers) {
			handlers.forEach((handler) => {
				try {
					handler(notification);
				} catch (error) {
					this.logger.error("Real-time notification handler error", error);
				}
			});
		}
	}

	/**
	 * Get user's notification preferences
	 */
	async getUserPreferences(userId: string): Promise<NotificationPreferences> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			select: { notificationPreferences: true },
		});

		const defaults: NotificationPreferences = {
			channels: {
				inApp: true,
				push: true,
				email: true,
				sms: false,
			},
			types: {
				ASSIGNMENT_DUE: ["IN_APP", "PUSH", "EMAIL"],
				GRADE_POSTED: ["IN_APP", "PUSH", "EMAIL"],
				QUIZ_AVAILABLE: ["IN_APP", "PUSH"],
				ANNOUNCEMENT: ["IN_APP", "PUSH"],
				DISCUSSION_REPLY: ["IN_APP"],
				COURSE_UPDATE: ["IN_APP"],
				SYSTEM: ["IN_APP", "PUSH"],
			},
		};

		if (!user?.notificationPreferences) {
			return defaults;
		}

		try {
			const parsed = JSON.parse(user.notificationPreferences);
			return { ...defaults, ...parsed };
		} catch {
			return defaults;
		}
	}

	/**
	 * Update user's notification preferences
	 */
	async updateUserPreferences(
		userId: string,
		preferences: Partial<NotificationPreferences>,
	) {
		const current = await this.getUserPreferences(userId);
		const updated = { ...current, ...preferences };

		await this.prisma.user.update({
			where: { id: userId },
			data: {
				notificationPreferences: JSON.stringify(updated),
			},
		});

		return updated;
	}

	/**
	 * Get active channels for a notification type
	 */
	private getChannelsForType(
		type: string,
		preferences: NotificationPreferences,
	): NotificationChannel[] {
		return preferences.types[type] || ["IN_APP"];
	}

	/**
	 * Check if current time is in quiet hours
	 */
	private isInQuietHours(preferences: NotificationPreferences): boolean {
		if (!preferences.quietHours?.enabled) {
			return false;
		}

		const now = new Date();
		const currentTime =
			now.getHours().toString().padStart(2, "0") +
			":" +
			now.getMinutes().toString().padStart(2, "0");

		const { start, end } = preferences.quietHours;

		// Handle overnight quiet hours
		if (start > end) {
			return currentTime >= start || currentTime <= end;
		}

		return currentTime >= start && currentTime <= end;
	}

	/**
	 * Batch deliver notifications to multiple users
	 */
	async deliverBulkNotifications(
		userIds: string[],
		notification: {
			type: string;
			title: string;
			message: string;
			link?: string;
			metadata?: any;
		},
	) {
		const results = await Promise.all(
			userIds.map((userId) => this.deliverNotification(userId, notification)),
		);

		return {
			total: userIds.length,
			successful: results.filter((r) => r.inApp.success).length,
			failed: results.filter((r) => !r.inApp.success).length,
		};
	}

	/**
	 * Get unread notification count for a user
	 */
	async getUnreadCount(userId: string): Promise<number> {
		return this.prisma.notification.count({
			where: { userId, isRead: false },
		});
	}

	/**
	 * Clean up old notifications
	 */
	private async cleanupOldNotifications() {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		// Delete read notifications older than 30 days
		const deleted = await this.prisma.notification.deleteMany({
			where: {
				isRead: true,
				createdAt: { lt: thirtyDaysAgo },
			},
		});

		this.logger.log(`Cleaned up ${deleted.count} old notifications`);
	}
}
