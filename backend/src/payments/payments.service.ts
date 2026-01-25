import {
	Injectable,
	BadRequestException,
	NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PrismaService } from "../prisma.service";
import {
	CreateDonationInput,
	CreateSubscriptionInput,
	CancelSubscriptionInput,
	CreateSubscriptionPlanInput,
	UpdateSubscriptionPlanInput,
} from "./dto/payments.input";

@Injectable()
export class PaymentsService {
	private stripe: Stripe;

	constructor(
		private prisma: PrismaService,
		private configService: ConfigService,
	) {
		const stripeSecretKey = this.configService.get<string>("stripe.secretKey");
		if (stripeSecretKey) {
			this.stripe = new Stripe(stripeSecretKey, {
				apiVersion: "2023-10-16",
			});
		}
	}

	// ========================
	// DONATIONS
	// ========================

	async createDonationPaymentIntent(
		input: CreateDonationInput,
		userId?: string,
	) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		// Create payment intent
		const paymentIntent = await this.stripe.paymentIntents.create({
			amount: input.amount,
			currency: input.currency || "usd",
			metadata: {
				type: "donation",
				email: input.email,
				name: input.name || "",
				message: input.message || "",
				isAnonymous: String(input.isAnonymous),
				userId: userId || "",
			},
		});

		// Create pending donation record
		await this.prisma.donation.create({
			data: {
				email: input.email,
				name: input.name,
				amount: input.amount,
				currency: input.currency || "usd",
				stripePaymentId: paymentIntent.id,
				message: input.message,
				isAnonymous: input.isAnonymous,
				userId,
				status: "PENDING",
			},
		});

		return {
			clientSecret: paymentIntent.client_secret,
			paymentIntentId: paymentIntent.id,
			amount: input.amount,
			currency: input.currency || "usd",
		};
	}

	async confirmDonation(paymentIntentId: string) {
		const donation = await this.prisma.donation.findFirst({
			where: { stripePaymentId: paymentIntentId },
		});

		if (!donation) {
			throw new NotFoundException("Donation not found");
		}

		return this.prisma.donation.update({
			where: { id: donation.id },
			data: {
				status: "COMPLETED",
				completedAt: new Date(),
			},
		});
	}

	async getDonations(limit = 50) {
		return this.prisma.donation.findMany({
			where: { status: "COMPLETED" },
			orderBy: { createdAt: "desc" },
			take: limit,
		});
	}

	async getPublicDonations(limit = 10) {
		const donations = await this.prisma.donation.findMany({
			where: {
				status: "COMPLETED",
				isAnonymous: false,
			},
			orderBy: { createdAt: "desc" },
			take: limit,
		});

		return donations.map((d) => ({
			...d,
			email: this.maskEmail(d.email),
		}));
	}

	async getDonationStats() {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const [allDonations, monthlyDonations] = await Promise.all([
			this.prisma.donation.findMany({
				where: { status: "COMPLETED" },
				select: { amount: true },
			}),
			this.prisma.donation.findMany({
				where: {
					status: "COMPLETED",
					completedAt: { gte: startOfMonth },
				},
				select: { amount: true },
			}),
		]);

		return {
			totalDonations: allDonations.length,
			totalAmount: allDonations.reduce((sum, d) => sum + d.amount, 0) / 100,
			donationsThisMonth: monthlyDonations.length,
			amountThisMonth:
				monthlyDonations.reduce((sum, d) => sum + d.amount, 0) / 100,
		};
	}

	// ========================
	// SUBSCRIPTION PLANS
	// ========================

	async createSubscriptionPlan(input: CreateSubscriptionPlanInput) {
		// Create Stripe product if Stripe is configured
		let stripeProductId = input.stripeProductId;
		if (this.stripe && !stripeProductId && input.priceMonthly > 0) {
			const product = await this.stripe.products.create({
				name: input.name,
				description: input.description || undefined,
				metadata: {
					tier: String(input.tier),
				},
			});
			stripeProductId = product.id;
		}

		return this.prisma.subscriptionPlan.create({
			data: {
				name: input.name,
				description: input.description,
				tier: input.tier,
				priceMonthly: input.priceMonthly,
				priceYearly: input.priceYearly,
				stripeProductId,
				features: input.features ? JSON.stringify(input.features) : null,
				maxTemplates: input.maxTemplates,
				maxSheetsPerMonth: input.maxSheetsPerMonth,
				maxModelsPerTemplate: input.maxModelsPerTemplate,
				maxStorageMB: input.maxStorageMB,
				hasAdvancedAnalytics: input.hasAdvancedAnalytics,
				hasAPIAccess: input.hasAPIAccess,
				hasPrioritySupport: input.hasPrioritySupport,
				hasCustomBranding: input.hasCustomBranding,
				hasTeamFeatures: input.hasTeamFeatures,
				discountPercentYearly: input.discountPercentYearly,
				trialDays: input.trialDays,
				priority: input.priority,
				isPublic: input.isPublic,
			},
		});
	}

	async updateSubscriptionPlan(
		planId: string,
		input: UpdateSubscriptionPlanInput,
	) {
		const plan = await this.prisma.subscriptionPlan.findUnique({
			where: { id: planId },
		});

		if (!plan) {
			throw new NotFoundException("Subscription plan not found");
		}

		// Update Stripe product if name/description changed
		if (
			this.stripe &&
			plan.stripeProductId &&
			(input.name || input.description)
		) {
			await this.stripe.products.update(plan.stripeProductId, {
				name: input.name || plan.name,
				description: input.description || plan.description || undefined,
			});
		}

		return this.prisma.subscriptionPlan.update({
			where: { id: planId },
			data: {
				name: input.name,
				description: input.description,
				tier: input.tier,
				priceMonthly: input.priceMonthly,
				priceYearly: input.priceYearly,
				stripeProductId: input.stripeProductId,
				features: input.features ? JSON.stringify(input.features) : undefined,
				maxTemplates: input.maxTemplates,
				maxSheetsPerMonth: input.maxSheetsPerMonth,
				maxModelsPerTemplate: input.maxModelsPerTemplate,
				maxStorageMB: input.maxStorageMB,
				hasAdvancedAnalytics: input.hasAdvancedAnalytics,
				hasAPIAccess: input.hasAPIAccess,
				hasPrioritySupport: input.hasPrioritySupport,
				hasCustomBranding: input.hasCustomBranding,
				hasTeamFeatures: input.hasTeamFeatures,
				discountPercentYearly: input.discountPercentYearly,
				trialDays: input.trialDays,
				priority: input.priority,
				isActive: input.isActive,
				isPublic: input.isPublic,
			},
		});
	}

	async deleteSubscriptionPlan(planId: string) {
		const plan = await this.prisma.subscriptionPlan.findUnique({
			where: { id: planId },
			include: { subscriptions: { where: { status: "ACTIVE" } } },
		});

		if (!plan) {
			throw new NotFoundException("Subscription plan not found");
		}

		if (plan.subscriptions.length > 0) {
			throw new BadRequestException(
				"Cannot delete plan with active subscriptions. Deactivate it instead.",
			);
		}

		return this.prisma.subscriptionPlan.delete({
			where: { id: planId },
		});
	}

	async getSubscriptionPlans(includeInactive = false, publicOnly = true) {
		const plans = await this.prisma.subscriptionPlan.findMany({
			where: {
				...(includeInactive ? {} : { isActive: true }),
				...(publicOnly ? { isPublic: true } : {}),
			},
			orderBy: [{ tier: "asc" }, { priority: "asc" }],
		});

		return plans.map((plan) => ({
			...plan,
			features: plan.features ? JSON.parse(plan.features) : null,
		}));
	}

	async getAllSubscriptionPlans() {
		const plans = await this.prisma.subscriptionPlan.findMany({
			orderBy: [{ tier: "asc" }, { priority: "asc" }],
		});

		return plans.map((plan) => ({
			...plan,
			features: plan.features ? JSON.parse(plan.features) : null,
		}));
	}

	async getSubscriptionPlan(planId: string) {
		const plan = await this.prisma.subscriptionPlan.findUnique({
			where: { id: planId },
		});

		if (!plan) {
			throw new NotFoundException("Subscription plan not found");
		}

		return {
			...plan,
			features: plan.features ? JSON.parse(plan.features) : null,
		};
	}

	// ========================
	// USER SUBSCRIPTIONS
	// ========================

	async createSubscriptionCheckout(
		userId: string,
		input: CreateSubscriptionInput,
	) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		const plan = await this.prisma.subscriptionPlan.findUnique({
			where: { id: input.planId },
		});

		if (!plan) {
			throw new NotFoundException("Subscription plan not found");
		}

		// Get or create Stripe customer
		let stripeCustomerId = user.stripeCustomerId;
		if (!stripeCustomerId) {
			const customer = await this.stripe.customers.create({
				email: user.email,
				name: user.name || undefined,
				metadata: {
					userId: user.id,
				},
			});
			stripeCustomerId = customer.id;

			await this.prisma.user.update({
				where: { id: userId },
				data: { stripeCustomerId },
			});
		}

		// Use appropriate Stripe price ID or create ad-hoc price
		const priceId =
			input.billingCycle === "YEARLY"
				? plan.stripePriceIdYearly
				: plan.stripePriceIdMonthly;

		const successUrl =
			this.configService.get<string>("stripe.successUrl") ||
			"http://localhost:3000/subscription/success?session_id={CHECKOUT_SESSION_ID}";
		const cancelUrl =
			this.configService.get<string>("stripe.cancelUrl") ||
			"http://localhost:3000/pricing";

		if (priceId) {
			// Use existing Stripe price
			const session = await this.stripe.checkout.sessions.create({
				customer: stripeCustomerId,
				mode: "subscription",
				line_items: [{ price: priceId, quantity: 1 }],
				success_url: successUrl,
				cancel_url: cancelUrl,
				metadata: {
					userId,
					planId: plan.id,
					billingCycle: input.billingCycle,
				},
			});

			return {
				sessionId: session.id,
				url: session.url,
			};
		} else {
			// Create ad-hoc price
			const amount =
				input.billingCycle === "YEARLY"
					? plan.priceYearly || plan.priceMonthly * 12
					: plan.priceMonthly;

			const session = await this.stripe.checkout.sessions.create({
				customer: stripeCustomerId,
				mode: "subscription",
				line_items: [
					{
						price_data: {
							currency: "usd",
							product_data: {
								name: `${plan.name} Plan`,
								description: plan.description || undefined,
							},
							unit_amount: amount,
							recurring: {
								interval: input.billingCycle === "YEARLY" ? "year" : "month",
							},
						},
						quantity: 1,
					},
				],
				success_url: successUrl,
				cancel_url: cancelUrl,
				metadata: {
					userId,
					planId: plan.id,
					billingCycle: input.billingCycle,
				},
			});

			return {
				sessionId: session.id,
				url: session.url,
			};
		}
	}

	async handleSubscriptionCreated(stripeSubscription: Stripe.Subscription) {
		const metadata = stripeSubscription.metadata;
		const userId = metadata.userId;
		const planId = metadata.planId;
		const billingCycle = metadata.billingCycle || "MONTHLY";

		if (!userId || !planId) {
			console.error("Missing userId or planId in subscription metadata");
			return;
		}

		// Check for existing active subscription
		const existingSubscription = await this.prisma.subscription.findFirst({
			where: {
				userId,
				status: { in: ["ACTIVE", "TRIALING"] },
			},
		});

		if (existingSubscription) {
			// Update existing subscription
			return this.prisma.subscription.update({
				where: { id: existingSubscription.id },
				data: {
					planId,
					stripeSubscriptionId: stripeSubscription.id,
					stripeCustomerId: stripeSubscription.customer as string,
					status: this.mapStripeStatus(stripeSubscription.status),
					billingCycle,
					currentPeriodStart: new Date(
						stripeSubscription.current_period_start * 1000,
					),
					currentPeriodEnd: new Date(
						stripeSubscription.current_period_end * 1000,
					),
					cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
				},
			});
		}

		// Create new subscription
		return this.prisma.subscription.create({
			data: {
				userId,
				planId,
				stripeSubscriptionId: stripeSubscription.id,
				stripeCustomerId: stripeSubscription.customer as string,
				status: this.mapStripeStatus(stripeSubscription.status),
				billingCycle,
				currentPeriodStart: new Date(
					stripeSubscription.current_period_start * 1000,
				),
				currentPeriodEnd: new Date(
					stripeSubscription.current_period_end * 1000,
				),
				cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
			},
		});
	}

	async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
		const subscription = await this.prisma.subscription.findUnique({
			where: { stripeSubscriptionId: stripeSubscription.id },
		});

		if (!subscription) {
			// Try to create if not exists
			return this.handleSubscriptionCreated(stripeSubscription);
		}

		return this.prisma.subscription.update({
			where: { id: subscription.id },
			data: {
				status: this.mapStripeStatus(stripeSubscription.status),
				currentPeriodStart: new Date(
					stripeSubscription.current_period_start * 1000,
				),
				currentPeriodEnd: new Date(
					stripeSubscription.current_period_end * 1000,
				),
				cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
			},
		});
	}

	async cancelSubscription(userId: string, input: CancelSubscriptionInput) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		const subscription = await this.prisma.subscription.findFirst({
			where: {
				id: input.subscriptionId,
				userId,
			},
		});

		if (!subscription) {
			throw new NotFoundException("Subscription not found");
		}

		if (!subscription.stripeSubscriptionId) {
			throw new BadRequestException("No Stripe subscription to cancel");
		}

		if (input.cancelAtPeriodEnd) {
			// Cancel at end of billing period
			await this.stripe.subscriptions.update(
				subscription.stripeSubscriptionId,
				{
					cancel_at_period_end: true,
				},
			);

			return this.prisma.subscription.update({
				where: { id: subscription.id },
				data: { cancelAtPeriodEnd: true },
				include: { plan: true },
			});
		} else {
			// Cancel immediately
			await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

			return this.prisma.subscription.update({
				where: { id: subscription.id },
				data: { status: "CANCELED" },
				include: { plan: true },
			});
		}
	}

	async getUserSubscription(userId: string) {
		const subscription = await this.prisma.subscription.findFirst({
			where: {
				userId,
				status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
			},
			include: { plan: true },
			orderBy: { createdAt: "desc" },
		});

		if (!subscription) {
			return null;
		}

		return {
			...subscription,
			plan: {
				...subscription.plan,
				features: subscription.plan.features
					? JSON.parse(subscription.plan.features)
					: null,
			},
		};
	}

	async getUserSubscriptions(userId: string) {
		const subscriptions = await this.prisma.subscription.findMany({
			where: { userId },
			include: { plan: true },
			orderBy: { createdAt: "desc" },
		});

		return subscriptions.map((sub) => ({
			...sub,
			plan: {
				...sub.plan,
				features: sub.plan.features ? JSON.parse(sub.plan.features) : null,
			},
		}));
	}

	// ========================
	// STRIPE WEBHOOKS
	// ========================

	async handleWebhook(payload: Buffer, signature: string) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		const webhookSecret = this.configService.get<string>(
			"stripe.webhookSecret",
		);
		if (!webhookSecret) {
			throw new BadRequestException("Stripe webhook secret not configured");
		}

		let event: Stripe.Event;
		try {
			event = this.stripe.webhooks.constructEvent(
				payload,
				signature,
				webhookSecret,
			);
		} catch (err) {
			throw new BadRequestException(
				`Webhook signature verification failed: ${err.message}`,
			);
		}

		switch (event.type) {
			case "payment_intent.succeeded":
				const paymentIntent = event.data.object as Stripe.PaymentIntent;
				if (paymentIntent.metadata.type === "donation") {
					await this.confirmDonation(paymentIntent.id);
				}
				break;

			case "customer.subscription.created":
			case "customer.subscription.updated":
				const subscription = event.data.object as Stripe.Subscription;
				await this.handleSubscriptionUpdated(subscription);
				break;

			case "customer.subscription.deleted":
				const deletedSubscription = event.data.object as Stripe.Subscription;
				await this.prisma.subscription.updateMany({
					where: { stripeSubscriptionId: deletedSubscription.id },
					data: { status: "CANCELED" },
				});
				break;

			case "invoice.payment_failed":
				const invoice = event.data.object as Stripe.Invoice;
				if (invoice.subscription) {
					await this.prisma.subscription.updateMany({
						where: { stripeSubscriptionId: invoice.subscription as string },
						data: { status: "PAST_DUE" },
					});
				}
				break;

			default:
				console.log(`Unhandled webhook event type: ${event.type}`);
		}

		return { received: true };
	}

	// ========================
	// HELPERS
	// ========================

	private mapStripeStatus(status: Stripe.Subscription.Status): string {
		const statusMap: Record<string, string> = {
			active: "ACTIVE",
			past_due: "PAST_DUE",
			canceled: "CANCELED",
			trialing: "TRIALING",
			unpaid: "PAST_DUE",
			incomplete: "PENDING",
			incomplete_expired: "CANCELED",
			paused: "CANCELED",
		};
		return statusMap[status] || "ACTIVE";
	}

	private maskEmail(email: string): string {
		const [local, domain] = email.split("@");
		const maskedLocal =
			local.length > 2
				? local[0] + "*".repeat(local.length - 2) + local[local.length - 1]
				: local[0] + "*";
		return `${maskedLocal}@${domain}`;
	}

	// ========================
	// USER ENTITLEMENTS
	// ========================

	async getUserEntitlements(userId: string) {
		// Get user's active subscription
		const subscription = await this.prisma.subscription.findFirst({
			where: {
				userId,
				status: { in: ["ACTIVE", "TRIALING"] },
			},
			include: { plan: true },
			orderBy: { createdAt: "desc" },
		});

		// Default free tier entitlements
		const defaultEntitlements = {
			tier: 0,
			planName: "Free",
			maxTemplates: 3,
			maxSheetsPerMonth: 50,
			maxModelsPerTemplate: 1,
			maxStorageMB: 100,
			hasAdvancedAnalytics: false,
			hasAPIAccess: false,
			hasPrioritySupport: false,
			hasCustomBranding: false,
			hasTeamFeatures: false,
			currentPeriodEnd: null,
			isTrialing: false,
		};

		if (!subscription) {
			return defaultEntitlements;
		}

		const plan = subscription.plan;
		return {
			tier: plan.tier,
			planName: plan.name,
			maxTemplates: plan.maxTemplates ?? defaultEntitlements.maxTemplates,
			maxSheetsPerMonth:
				plan.maxSheetsPerMonth ?? defaultEntitlements.maxSheetsPerMonth,
			maxModelsPerTemplate:
				plan.maxModelsPerTemplate ?? defaultEntitlements.maxModelsPerTemplate,
			maxStorageMB: plan.maxStorageMB ?? defaultEntitlements.maxStorageMB,
			hasAdvancedAnalytics: plan.hasAdvancedAnalytics,
			hasAPIAccess: plan.hasAPIAccess,
			hasPrioritySupport: plan.hasPrioritySupport,
			hasCustomBranding: plan.hasCustomBranding,
			hasTeamFeatures: plan.hasTeamFeatures,
			currentPeriodEnd: subscription.currentPeriodEnd,
			isTrialing: subscription.status === "TRIALING",
		};
	}

	// ========================
	// ADMIN STATS
	// ========================

	async getSubscriptionStats() {
		const [
			totalSubscriptions,
			activeSubscriptions,
			trialingSubscriptions,
			canceledSubscriptions,
			subscriptionsByPlan,
			totalRevenue,
		] = await Promise.all([
			this.prisma.subscription.count(),
			this.prisma.subscription.count({ where: { status: "ACTIVE" } }),
			this.prisma.subscription.count({ where: { status: "TRIALING" } }),
			this.prisma.subscription.count({ where: { status: "CANCELED" } }),
			this.prisma.subscription.groupBy({
				by: ["planId"],
				_count: { id: true },
				where: { status: { in: ["ACTIVE", "TRIALING"] } },
			}),
			this.prisma.subscription.aggregate({
				_sum: { priceAtSubscription: true },
				where: { status: "ACTIVE" },
			}),
		]);

		// Get plan details for the breakdown
		const plans = await this.prisma.subscriptionPlan.findMany();
		const planMap = new Map(plans.map((p) => [p.id, p.name]));

		const revenueByPlan = subscriptionsByPlan.map((item) => ({
			planName: planMap.get(item.planId) || "Unknown",
			count: item._count.id,
		}));

		// Calculate monthly recurring revenue (MRR)
		const mrr = totalRevenue._sum.priceAtSubscription || 0;

		return {
			totalSubscriptions,
			activeSubscriptions,
			trialingSubscriptions,
			canceledSubscriptions,
			monthlyRecurringRevenue: mrr,
			revenueByPlan,
		};
	}

	// ========================
	// TUITION & FEE MANAGEMENT (Spec 3A.1, 2A.1)
	// ========================

	/**
	 * Get tuition balance for a student
	 * As per Spec 3A.1: "Tuition balance"
	 */
	async getTuitionBalance(studentId: string) {
		const student = await this.prisma.user.findUnique({
			where: { id: studentId },
		});

		if (!student) {
			throw new NotFoundException("Student not found");
		}

		// Get all enrollments with course prices
		const enrollments = await this.prisma.enrollment.findMany({
			where: { studentId, status: "ACTIVE" },
			include: {
				course: {
					select: { id: true, title: true, price: true, currency: true },
				},
			},
		});

		// Get all payments
		const payments = await this.prisma.payment.findMany({
			where: { userId: studentId },
		});

		const totalTuition = enrollments.reduce(
			(sum, e) => sum + (e.course.price || 0),
			0,
		);
		const totalPaid = payments
			.filter((p) => p.status === "COMPLETED" && p.type === "TUITION")
			.reduce((sum, p) => sum + p.amount, 0);
		const pendingPayments = payments
			.filter((p) => p.status === "PENDING")
			.reduce((sum, p) => sum + p.amount, 0);

		// Calculate overdue amount
		const now = new Date();
		const overduePayments = payments.filter(
			(p) => p.status === "PENDING" && p.dueDate && p.dueDate < now,
		);
		const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0);

		return {
			studentId,
			studentName: student.name,
			totalTuition,
			totalPaid,
			balanceDue: totalTuition - totalPaid,
			pendingPayments,
			overdueAmount,
			hasOverdue: overdueAmount > 0,
			nextDueDate: payments.find((p) => p.status === "PENDING" && p.dueDate)
				?.dueDate,
			enrollments: enrollments.map((e) => ({
				courseId: e.courseId,
				courseTitle: e.course.title,
				courseFee: e.course.price || 0,
				amountPaid: e.amountPaid || 0,
				balance: (e.course.price || 0) - (e.amountPaid || 0),
			})),
			currency: enrollments[0]?.course?.currency || "XAF",
		};
	}

	/**
	 * Get payment history
	 * As per Spec 3A.1: "Payment history and receipts"
	 */
	async getPaymentHistory(studentId: string, limit = 50) {
		const payments = await this.prisma.payment.findMany({
			where: { userId: studentId },
			orderBy: { createdAt: "desc" },
			take: limit,
		});

		const summary = payments.reduce(
			(acc, p) => {
				if (p.status === "COMPLETED") {
					acc.totalPaid += p.amount;
					acc.successfulPayments++;
				} else if (p.status === "PENDING") {
					acc.totalPending += p.amount;
				} else if (p.status === "FAILED") {
					acc.failedPayments++;
				}
				return acc;
			},
			{
				totalPaid: 0,
				totalPending: 0,
				successfulPayments: 0,
				failedPayments: 0,
			},
		);

		return {
			payments: payments.map((p) => ({
				id: p.id,
				amount: p.amount,
				currency: p.currency,
				type: p.type,
				status: p.status,
				description: p.description,
				dueDate: p.dueDate,
				paidAt: p.paidAt,
				receiptUrl: p.receiptUrl,
				createdAt: p.createdAt,
			})),
			summary,
		};
	}

	/**
	 * Pay tuition or fees
	 * As per Spec 2A.1: "Pay tuition or fees online"
	 */
	async payTuition(
		payerId: string,
		amount: number,
		studentId?: string,
		paymentMethod?: string,
	) {
		const targetStudentId = studentId || payerId;

		// Verify the student exists
		const student = await this.prisma.user.findUnique({
			where: { id: targetStudentId },
		});

		if (!student) {
			throw new NotFoundException("Student not found");
		}

		// If paying for someone else, verify parent relationship
		if (studentId && studentId !== payerId) {
			const link = await this.prisma.studentParent.findUnique({
				where: {
					studentId_parentId: { studentId, parentId: payerId },
				},
			});

			if (!link) {
				throw new BadRequestException("Not authorized to pay for this student");
			}
		}

		// Create payment intent with Stripe if configured
		let paymentIntent = null;
		let clientSecret = null;

		if (this.stripe) {
			paymentIntent = await this.stripe.paymentIntents.create({
				amount,
				currency: "xaf",
				metadata: {
					type: "tuition",
					studentId: targetStudentId,
					payerId,
				},
			});
			clientSecret = paymentIntent.client_secret;
		}

		// Create payment record
		const payment = await this.prisma.payment.create({
			data: {
				userId: targetStudentId,
				amount,
				currency: "XAF",
				type: "TUITION",
				status: "PENDING",
				description: `Tuition payment`,
				stripePaymentId: paymentIntent?.id,
			},
		});

		// Create audit log
		await this.prisma.auditLog.create({
			data: {
				userId: payerId,
				action: "INITIATE_PAYMENT",
				entityType: "Payment",
				entityId: payment.id,
				details: JSON.stringify({ amount, studentId: targetStudentId }),
			},
		});

		return {
			paymentId: payment.id,
			clientSecret,
			amount,
			currency: "XAF",
			status: "PENDING",
		};
	}

	/**
	 * Get invoice details
	 */
	async getInvoice(invoiceId: string, userId: string) {
		const payment = await this.prisma.payment.findUnique({
			where: { id: invoiceId },
			include: {
				user: { select: { id: true, name: true, email: true } },
			},
		});

		if (!payment) {
			throw new NotFoundException("Invoice not found");
		}

		// Verify access
		if (payment.userId !== userId) {
			const adminCheck = await this.prisma.user.findUnique({
				where: { id: userId },
			});
			if (adminCheck?.role !== "ADMIN") {
				throw new BadRequestException("Not authorized to view this invoice");
			}
		}

		return {
			id: payment.id,
			invoiceNumber: `INV-${payment.id.substring(0, 8).toUpperCase()}`,
			student: payment.user,
			amount: payment.amount,
			currency: payment.currency,
			type: payment.type,
			status: payment.status,
			description: payment.description,
			dueDate: payment.dueDate,
			paidAt: payment.paidAt,
			createdAt: payment.createdAt,
		};
	}

	/**
	 * Get all invoices for a student
	 */
	async getStudentInvoices(studentId: string) {
		const payments = await this.prisma.payment.findMany({
			where: { userId: studentId },
			orderBy: { createdAt: "desc" },
		});

		return payments.map((p) => ({
			id: p.id,
			invoiceNumber: `INV-${p.id.substring(0, 8).toUpperCase()}`,
			amount: p.amount,
			currency: p.currency,
			type: p.type,
			status: p.status,
			dueDate: p.dueDate,
			paidAt: p.paidAt,
		}));
	}

	// ========================
	// FINANCIAL AID (Spec 2A.3)
	// ========================

	/**
	 * Get available financial aid programs
	 */
	async getFinancialAidPrograms() {
		// Return available financial aid programs
		return {
			programs: [
				{
					id: "merit-scholarship",
					name: "Merit Scholarship",
					description: "For students with exceptional academic performance",
					coveragePercent: 50,
					eligibilityCriteria: ["GPA >= 3.5", "Active enrollment"],
					deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
				},
				{
					id: "need-based-grant",
					name: "Need-Based Grant",
					description: "Financial assistance based on demonstrated need",
					coveragePercent: 75,
					eligibilityCriteria: [
						"Demonstrated financial need",
						"Good academic standing",
					],
					deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
				},
				{
					id: "work-study",
					name: "Work-Study Program",
					description: "Part-time campus employment",
					coveragePercent: 30,
					eligibilityCriteria: [
						"Active enrollment",
						"Available for 10-15 hours/week",
					],
					deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				},
			],
		};
	}

	/**
	 * Apply for financial aid
	 */
	async applyForFinancialAid(
		studentId: string,
		programId: string,
		applicationData: any,
	) {
		// Create a support ticket as the application (simplified)
		const application = await this.prisma.supportTicket.create({
			data: {
				submitterId: studentId,
				title: `Financial Aid Application: ${programId}`,
				description: JSON.stringify(applicationData),
				category: "BILLING",
				priority: "MEDIUM",
				status: "OPEN",
			},
		});

		await this.prisma.auditLog.create({
			data: {
				userId: studentId,
				action: "APPLY_FINANCIAL_AID",
				entityType: "FinancialAidApplication",
				entityId: application.id,
				details: JSON.stringify({ programId }),
			},
		});

		return {
			applicationId: application.id,
			programId,
			status: "SUBMITTED",
			submittedAt: application.createdAt,
			message: "Your application has been submitted for review",
		};
	}

	/**
	 * Get financial aid application status
	 */
	async getFinancialAidStatus(studentId: string) {
		const applications = await this.prisma.supportTicket.findMany({
			where: {
				submitterId: studentId,
				title: { startsWith: "Financial Aid Application" },
			},
			orderBy: { createdAt: "desc" },
		});

		return {
			applications: applications.map((a) => ({
				id: a.id,
				programId: a.title.replace("Financial Aid Application: ", ""),
				status:
					a.status === "RESOLVED"
						? "APPROVED"
						: a.status === "CLOSED"
							? "DENIED"
							: "PENDING",
				submittedAt: a.createdAt,
				resolvedAt: a.resolvedAt,
				resolution: a.resolution,
			})),
		};
	}

	// ========================
	// ADMIN PAYMENT MANAGEMENT (Spec 3A.3)
	// ========================

	/**
	 * Get payment reconciliation report
	 * As per Spec 3A.3: "Payment reconciliation"
	 */
	async getPaymentReconciliation(startDate?: Date, endDate?: Date) {
		const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		const end = endDate || new Date();

		const payments = await this.prisma.payment.findMany({
			where: {
				createdAt: { gte: start, lte: end },
			},
			include: {
				user: { select: { id: true, name: true, email: true } },
			},
			orderBy: { createdAt: "desc" },
		});

		const summary = {
			totalTransactions: payments.length,
			totalAmount: 0,
			completedAmount: 0,
			pendingAmount: 0,
			failedAmount: 0,
			refundedAmount: 0,
			byType: {} as Record<string, number>,
			byStatus: {} as Record<string, number>,
		};

		for (const payment of payments) {
			summary.totalAmount += payment.amount;
			summary.byType[payment.type] =
				(summary.byType[payment.type] || 0) + payment.amount;
			summary.byStatus[payment.status] =
				(summary.byStatus[payment.status] || 0) + 1;

			if (payment.status === "COMPLETED")
				summary.completedAmount += payment.amount;
			else if (payment.status === "PENDING")
				summary.pendingAmount += payment.amount;
			else if (payment.status === "FAILED")
				summary.failedAmount += payment.amount;
			else if (payment.status === "REFUNDED")
				summary.refundedAmount += payment.amount;
		}

		return {
			period: { start, end },
			summary,
			transactions: payments.slice(0, 100),
		};
	}

	/**
	 * Get financial summary for admin
	 */
	async getFinancialSummary() {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const startOfYear = new Date(now.getFullYear(), 0, 1);

		const [
			totalRevenue,
			monthlyRevenue,
			yearlyRevenue,
			pendingPayments,
			outstandingBalance,
		] = await Promise.all([
			this.prisma.payment.aggregate({
				_sum: { amount: true },
				where: { status: "COMPLETED" },
			}),
			this.prisma.payment.aggregate({
				_sum: { amount: true },
				where: { status: "COMPLETED", paidAt: { gte: startOfMonth } },
			}),
			this.prisma.payment.aggregate({
				_sum: { amount: true },
				where: { status: "COMPLETED", paidAt: { gte: startOfYear } },
			}),
			this.prisma.payment.aggregate({
				_sum: { amount: true },
				where: { status: "PENDING" },
			}),
			this.prisma.payment.aggregate({
				_sum: { amount: true },
				where: { status: "PENDING", dueDate: { lt: now } },
			}),
		]);

		// Get subscription revenue
		const subscriptionRevenue = await this.prisma.subscription.aggregate({
			_sum: { priceAtSubscription: true },
			where: { status: "ACTIVE" },
		});

		// Get donation totals
		const donationTotal = await this.prisma.donation.aggregate({
			_sum: { amount: true },
			where: { status: "COMPLETED" },
		});

		return {
			totalRevenue: totalRevenue._sum.amount || 0,
			monthlyRevenue: monthlyRevenue._sum.amount || 0,
			yearlyRevenue: yearlyRevenue._sum.amount || 0,
			pendingPayments: pendingPayments._sum.amount || 0,
			outstandingBalance: outstandingBalance._sum.amount || 0,
			subscriptionMRR: subscriptionRevenue._sum.priceAtSubscription || 0,
			totalDonations: donationTotal._sum.amount || 0,
			lastUpdated: now,
		};
	}

	/**
	 * Process refund
	 */
	async processRefund(
		paymentId: string,
		amount: number,
		reason: string,
		adminId: string,
	) {
		const payment = await this.prisma.payment.findUnique({
			where: { id: paymentId },
		});

		if (!payment) {
			throw new NotFoundException("Payment not found");
		}

		if (payment.status !== "COMPLETED") {
			throw new BadRequestException("Can only refund completed payments");
		}

		if (amount > payment.amount) {
			throw new BadRequestException("Refund amount exceeds payment amount");
		}

		// Process Stripe refund if applicable
		if (this.stripe && payment.stripePaymentId) {
			await this.stripe.refunds.create({
				payment_intent: payment.stripePaymentId,
				amount,
				reason: "requested_by_customer",
			});
		}

		// Update payment status
		const updatedPayment = await this.prisma.payment.update({
			where: { id: paymentId },
			data: { status: "REFUNDED" },
		});

		// Create audit log
		await this.prisma.auditLog.create({
			data: {
				userId: adminId,
				action: "PROCESS_REFUND",
				entityType: "Payment",
				entityId: paymentId,
				details: JSON.stringify({ amount, reason }),
			},
		});

		return {
			paymentId,
			refundedAmount: amount,
			reason,
			status: "REFUNDED",
			processedAt: new Date(),
		};
	}
}
