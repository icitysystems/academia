import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import * as webpush from "web-push";

/**
 * Push Notification Service
 * Implements Web Push notifications for real-time delivery
 */

// VAPID keys should be generated once and stored in environment variables
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY =
	process.env.VAPID_PUBLIC_KEY ||
	"BLGhQj-NDH9dReYwjKSPH_lzjhX2M8NGZPvvPvqLYAzqPz0hLdTr4BdPKDUCrqzJMR2qzJMR2qzJMR2qzJMR2qz";
const VAPID_PRIVATE_KEY =
	process.env.VAPID_PRIVATE_KEY || "pSHWF_AKI5pMmP5TfZKAK8e2M5BcNh0X0a";

export interface PushSubscription {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
}

export interface PushNotificationPayload {
	title: string;
	body: string;
	icon?: string;
	badge?: string;
	image?: string;
	data?: {
		url?: string;
		notificationId?: string;
		type?: string;
		[key: string]: any;
	};
	actions?: Array<{
		action: string;
		title: string;
		icon?: string;
	}>;
	tag?: string;
	renotify?: boolean;
	requireInteraction?: boolean;
	silent?: boolean;
	vibrate?: number[];
}

@Injectable()
export class PushNotificationsService {
	private readonly logger = new Logger(PushNotificationsService.name);
	private initialized = false;

	constructor(private prisma: PrismaService) {
		this.initializeWebPush();
	}

	private initializeWebPush() {
		try {
			webpush.setVapidDetails(
				"mailto:notifications@academia.edu",
				VAPID_PUBLIC_KEY,
				VAPID_PRIVATE_KEY,
			);
			this.initialized = true;
			this.logger.log("Web Push initialized successfully");
		} catch (error) {
			this.logger.warn(
				"Web Push initialization failed - push notifications disabled",
			);
			this.initialized = false;
		}
	}

	/**
	 * Get VAPID public key for client subscription
	 */
	getVapidPublicKey(): string {
		return VAPID_PUBLIC_KEY;
	}

	/**
	 * Subscribe a user to push notifications
	 */
	async subscribe(
		userId: string,
		subscription: PushSubscription,
		deviceInfo?: { userAgent?: string; platform?: string },
	) {
		// Store subscription in database
		const existingSubscription = await this.prisma.pushSubscription.findFirst({
			where: {
				userId,
				endpoint: subscription.endpoint,
			},
		});

		if (existingSubscription) {
			// Update existing subscription
			return this.prisma.pushSubscription.update({
				where: { id: existingSubscription.id },
				data: {
					p256dhKey: subscription.keys.p256dh,
					authKey: subscription.keys.auth,
					userAgent: deviceInfo?.userAgent,
					platform: deviceInfo?.platform,
					updatedAt: new Date(),
				},
			});
		}

		// Create new subscription
		return this.prisma.pushSubscription.create({
			data: {
				userId,
				endpoint: subscription.endpoint,
				p256dhKey: subscription.keys.p256dh,
				authKey: subscription.keys.auth,
				userAgent: deviceInfo?.userAgent,
				platform: deviceInfo?.platform,
			},
		});
	}

	/**
	 * Unsubscribe a device from push notifications
	 */
	async unsubscribe(userId: string, endpoint: string) {
		await this.prisma.pushSubscription.deleteMany({
			where: {
				userId,
				endpoint,
			},
		});

		return { success: true };
	}

	/**
	 * Unsubscribe all devices for a user
	 */
	async unsubscribeAll(userId: string) {
		await this.prisma.pushSubscription.deleteMany({
			where: { userId },
		});

		return { success: true };
	}

	/**
	 * Send push notification to a specific user
	 */
	async sendToUser(userId: string, payload: PushNotificationPayload) {
		if (!this.initialized) {
			this.logger.warn("Push notifications not initialized");
			return { sent: 0, failed: 0 };
		}

		const subscriptions = await this.prisma.pushSubscription.findMany({
			where: { userId, isActive: true },
		});

		let sent = 0;
		let failed = 0;

		for (const sub of subscriptions) {
			try {
				await webpush.sendNotification(
					{
						endpoint: sub.endpoint,
						keys: {
							p256dh: sub.p256dhKey,
							auth: sub.authKey,
						},
					},
					JSON.stringify(payload),
				);
				sent++;
			} catch (error: any) {
				failed++;
				this.logger.error(
					`Push notification failed for ${sub.id}: ${error.message}`,
				);

				// If subscription is invalid, mark as inactive
				if (error.statusCode === 404 || error.statusCode === 410) {
					await this.prisma.pushSubscription.update({
						where: { id: sub.id },
						data: { isActive: false },
					});
				}
			}
		}

		return { sent, failed };
	}

	/**
	 * Send push notification to multiple users
	 */
	async sendToUsers(userIds: string[], payload: PushNotificationPayload) {
		const results = await Promise.all(
			userIds.map((userId) => this.sendToUser(userId, payload)),
		);

		return {
			sent: results.reduce((sum, r) => sum + r.sent, 0),
			failed: results.reduce((sum, r) => sum + r.failed, 0),
		};
	}

	/**
	 * Send push notification to all enrolled students in a course
	 */
	async sendToCourseStudents(
		courseId: string,
		payload: PushNotificationPayload,
	) {
		const enrollments = await this.prisma.enrollment.findMany({
			where: { courseId, status: "ENROLLED" },
			select: { studentId: true },
		});

		const userIds = enrollments.map((e) => e.studentId);
		return this.sendToUsers(userIds, payload);
	}

	/**
	 * Send push notification to all users with a specific role
	 */
	async sendToRole(role: string, payload: PushNotificationPayload) {
		const users = await this.prisma.user.findMany({
			where: { role, isActive: true },
			select: { id: true },
		});

		const userIds = users.map((u) => u.id);
		return this.sendToUsers(userIds, payload);
	}

	/**
	 * Get user's push subscription status
	 */
	async getSubscriptionStatus(userId: string) {
		const subscriptions = await this.prisma.pushSubscription.findMany({
			where: { userId },
			select: {
				id: true,
				endpoint: true,
				platform: true,
				userAgent: true,
				isActive: true,
				createdAt: true,
			},
		});

		return {
			isSubscribed: subscriptions.some((s) => s.isActive),
			activeSubscriptions: subscriptions.filter((s) => s.isActive).length,
			subscriptions,
		};
	}
}
