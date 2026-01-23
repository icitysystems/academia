import {
	Injectable,
	ConflictException,
	NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
	SubscribeNewsletterInput,
	UnsubscribeNewsletterInput,
} from "./dto/newsletter.input";

@Injectable()
export class NewsletterService {
	constructor(private prisma: PrismaService) {}

	async subscribe(input: SubscribeNewsletterInput) {
		const existing = await this.prisma.newsletterSubscription.findUnique({
			where: { email: input.email.toLowerCase() },
		});

		if (existing) {
			if (existing.isActive) {
				throw new ConflictException("Email is already subscribed");
			}
			// Reactivate if previously unsubscribed
			return this.prisma.newsletterSubscription.update({
				where: { id: existing.id },
				data: {
					isActive: true,
					unsubscribedAt: null,
					name: input.name || existing.name,
					source: input.source || existing.source,
				},
			});
		}

		return this.prisma.newsletterSubscription.create({
			data: {
				email: input.email.toLowerCase(),
				name: input.name,
				source: input.source,
				confirmedAt: new Date(), // Auto-confirm for now; add email verification if needed
			},
		});
	}

	async unsubscribe(input: UnsubscribeNewsletterInput) {
		const subscription = await this.prisma.newsletterSubscription.findUnique({
			where: { email: input.email.toLowerCase() },
		});

		if (!subscription) {
			throw new NotFoundException("Subscription not found");
		}

		return this.prisma.newsletterSubscription.update({
			where: { id: subscription.id },
			data: {
				isActive: false,
				unsubscribedAt: new Date(),
			},
		});
	}

	async getSubscription(email: string) {
		return this.prisma.newsletterSubscription.findUnique({
			where: { email: email.toLowerCase() },
		});
	}

	async getAllSubscriptions(activeOnly = true) {
		return this.prisma.newsletterSubscription.findMany({
			where: activeOnly ? { isActive: true } : undefined,
			orderBy: { createdAt: "desc" },
		});
	}

	async getStats() {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const [total, active, unsubscribed, thisMonth] = await Promise.all([
			this.prisma.newsletterSubscription.count(),
			this.prisma.newsletterSubscription.count({ where: { isActive: true } }),
			this.prisma.newsletterSubscription.count({
				where: { isActive: false },
			}),
			this.prisma.newsletterSubscription.count({
				where: {
					createdAt: { gte: startOfMonth },
					isActive: true,
				},
			}),
		]);

		return {
			totalSubscribers: total,
			activeSubscribers: active,
			unsubscribedCount: unsubscribed,
			subscribersThisMonth: thisMonth,
		};
	}
}
