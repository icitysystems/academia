import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma.service";
import * as webPush from "web-push";

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
	url?: string;
	tag?: string;
	data?: Record<string, any>;
}

@Injectable()
export class PushNotificationService {
	private readonly logger = new Logger(PushNotificationService.name);
	private readonly isEnabled: boolean;

	constructor(
		private prisma: PrismaService,
		private configService: ConfigService,
	) {
		const publicKey = this.configService.get<string>("VAPID_PUBLIC_KEY");
		const privateKey = this.configService.get<string>("VAPID_PRIVATE_KEY");
		const subject = this.configService.get<string>("VAPID_SUBJECT");

		if (publicKey && privateKey && subject) {
			webPush.setVapidDetails(subject, publicKey, privateKey);
			this.isEnabled = true;
			this.logger.log("Push notifications initialized with VAPID");
		} else {
			this.isEnabled = false;
			this.logger.warn("Push notifications disabled (VAPID not configured)");
		}
	}

	/**
	 * Subscribe a user to push notifications
	 */
	async subscribeUser(
		userId: string,
		subscription: PushSubscription,
		userAgent?: string,
	): Promise<boolean> {
		try {
			await this.prisma.pushSubscription.upsert({
				where: {
					endpoint: subscription.endpoint,
				},
				create: {
					userId,
					endpoint: subscription.endpoint,
					p256dhKey: subscription.keys.p256dh,
					authKey: subscription.keys.auth,
					userAgent,
				},
				update: {
					userId,
					p256dhKey: subscription.keys.p256dh,
					authKey: subscription.keys.auth,
					userAgent,
					updatedAt: new Date(),
				},
			});

			this.logger.log(`Push subscription added for user ${userId}`);
			return true;
		} catch (error) {
			this.logger.error(`Failed to subscribe user: ${error}`);
			return false;
		}
	}

	/**
	 * Unsubscribe a user from push notifications
	 */
	async unsubscribeUser(endpoint: string): Promise<boolean> {
		try {
			await this.prisma.pushSubscription.delete({
				where: { endpoint },
			});
			return true;
		} catch (error) {
			this.logger.error(`Failed to unsubscribe: ${error}`);
			return false;
		}
	}

	/**
	 * Send push notification to a specific user
	 */
	async sendToUser(
		userId: string,
		payload: PushNotificationPayload,
	): Promise<number> {
		if (!this.isEnabled) {
			this.logger.warn("Push notifications not enabled");
			return 0;
		}

		const subscriptions = await this.prisma.pushSubscription.findMany({
			where: { userId },
		});

		let successCount = 0;
		const expiredEndpoints: string[] = [];

		for (const sub of subscriptions) {
			try {
				await webPush.sendNotification(
					{
						endpoint: sub.endpoint,
						keys: {
							p256dh: sub.p256dhKey,
							auth: sub.authKey,
						},
					},
					JSON.stringify({
						...payload,
						icon: payload.icon || "/icon-192x192.png",
						badge: payload.badge || "/badge-72x72.png",
					}),
				);
				successCount++;
			} catch (error: any) {
				if (error.statusCode === 410 || error.statusCode === 404) {
					// Subscription expired or invalid
					expiredEndpoints.push(sub.endpoint);
				} else {
					this.logger.error(`Push send failed: ${error.message}`);
				}
			}
		}

		// Clean up expired subscriptions
		if (expiredEndpoints.length > 0) {
			await this.prisma.pushSubscription.deleteMany({
				where: { endpoint: { in: expiredEndpoints } },
			});
			this.logger.log(
				`Removed ${expiredEndpoints.length} expired subscriptions`,
			);
		}

		return successCount;
	}

	/**
	 * Send push notification to multiple users
	 */
	async sendToUsers(
		userIds: string[],
		payload: PushNotificationPayload,
	): Promise<number> {
		let totalSuccess = 0;
		for (const userId of userIds) {
			totalSuccess += await this.sendToUser(userId, payload);
		}
		return totalSuccess;
	}

	/**
	 * Send push notification to all users with a specific role
	 */
	async sendToRole(
		role: string,
		payload: PushNotificationPayload,
	): Promise<number> {
		const users = await this.prisma.user.findMany({
			where: { role, isActive: true },
			select: { id: true },
		});

		return this.sendToUsers(
			users.map((u) => u.id),
			payload,
		);
	}

	/**
	 * Get VAPID public key for client
	 */
	getPublicKey(): string | null {
		return this.configService.get<string>("VAPID_PUBLIC_KEY") || null;
	}

	/**
	 * Check if push notifications are enabled
	 */
	isConfigured(): boolean {
		return this.isEnabled;
	}
}
