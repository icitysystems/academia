import {
	Controller,
	Post,
	Req,
	Res,
	Headers,
	Logger,
	HttpCode,
	HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PaymentsService } from "./payments.service";
import { StripeConsentService } from "./stripe-consent.service";
import { PrismaService } from "../prisma.service";

@Controller("webhooks")
export class WebhooksController {
	private readonly logger = new Logger(WebhooksController.name);
	private stripe: Stripe | null = null;

	constructor(
		private paymentsService: PaymentsService,
		private consentService: StripeConsentService,
		private configService: ConfigService,
		private prisma: PrismaService,
	) {
		const stripeSecretKey = this.configService.get<string>("stripe.secretKey");
		if (stripeSecretKey) {
			this.stripe = new Stripe(stripeSecretKey, {
				apiVersion: "2023-10-16",
			});
		}
	}

	/**
	 * Main Stripe webhook endpoint
	 * Handles all Stripe events including:
	 * - Payment intents (donations, one-time payments)
	 * - Subscriptions (created, updated, canceled)
	 * - Invoice events
	 * - Payment method events (for Visa and other cards)
	 * - Customer events
	 */
	@Post("stripe")
	@HttpCode(HttpStatus.OK)
	async handleStripeWebhook(
		@Req() req: Request,
		@Res() res: Response,
		@Headers("stripe-signature") signature: string,
	) {
		if (!this.stripe) {
			this.logger.error("Stripe not configured");
			return res.status(500).json({ error: "Stripe not configured" });
		}

		const webhookSecret = this.configService.get<string>(
			"stripe.webhookSecret",
		);
		if (!webhookSecret) {
			this.logger.error("Stripe webhook secret not configured");
			return res.status(500).json({ error: "Webhook secret not configured" });
		}

		let event: Stripe.Event;

		try {
			// Verify webhook signature (req.body should be raw buffer)
			event = this.stripe.webhooks.constructEvent(
				req.body,
				signature,
				webhookSecret,
			);
		} catch (err) {
			this.logger.error(
				`Webhook signature verification failed: ${err.message}`,
			);
			return res.status(400).json({ error: `Webhook Error: ${err.message}` });
		}

		// Check for idempotency - prevent duplicate processing
		const isProcessed = await this.consentService.isEventProcessed(event.id);
		if (isProcessed) {
			this.logger.log(`Event ${event.id} already processed, skipping`);
			return res.status(200).json({ received: true, duplicate: true });
		}

		this.logger.log(`Processing webhook event: ${event.type} (${event.id})`);

		try {
			await this.processWebhookEvent(event);

			// Log successful processing
			await this.consentService.logWebhookEvent({
				stripeEventId: event.id,
				eventType: event.type,
				status: "processed",
				payload: { objectId: (event.data.object as any).id },
			});

			return res.status(200).json({ received: true });
		} catch (error) {
			this.logger.error(
				`Error processing webhook ${event.type}: ${error.message}`,
			);

			// Log failed processing
			await this.consentService.logWebhookEvent({
				stripeEventId: event.id,
				eventType: event.type,
				status: "failed",
				errorMessage: error.message,
			});

			// Return 200 to prevent Stripe retries for non-retryable errors
			return res.status(200).json({ received: true, error: error.message });
		}
	}

	/**
	 * Process individual webhook events
	 */
	private async processWebhookEvent(event: Stripe.Event) {
		switch (event.type) {
			// ========================
			// PAYMENT INTENT EVENTS
			// ========================
			case "payment_intent.succeeded":
				await this.handlePaymentIntentSucceeded(
					event.data.object as Stripe.PaymentIntent,
				);
				break;

			case "payment_intent.payment_failed":
				await this.handlePaymentIntentFailed(
					event.data.object as Stripe.PaymentIntent,
				);
				break;

			case "payment_intent.canceled":
				await this.handlePaymentIntentCanceled(
					event.data.object as Stripe.PaymentIntent,
				);
				break;

			// ========================
			// SUBSCRIPTION EVENTS
			// ========================
			case "customer.subscription.created":
				await this.handleSubscriptionCreated(
					event.data.object as Stripe.Subscription,
				);
				break;

			case "customer.subscription.updated":
				await this.handleSubscriptionUpdated(
					event.data.object as Stripe.Subscription,
				);
				break;

			case "customer.subscription.deleted":
				await this.handleSubscriptionDeleted(
					event.data.object as Stripe.Subscription,
				);
				break;

			case "customer.subscription.trial_will_end":
				await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
				break;

			// ========================
			// INVOICE EVENTS
			// ========================
			case "invoice.paid":
				await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
				break;

			case "invoice.payment_failed":
				await this.handleInvoicePaymentFailed(
					event.data.object as Stripe.Invoice,
				);
				break;

			case "invoice.upcoming":
				await this.handleInvoiceUpcoming(event.data.object as Stripe.Invoice);
				break;

			// ========================
			// CHECKOUT SESSION EVENTS
			// ========================
			case "checkout.session.completed":
				await this.handleCheckoutSessionCompleted(
					event.data.object as Stripe.Checkout.Session,
				);
				break;

			case "checkout.session.expired":
				await this.handleCheckoutSessionExpired(
					event.data.object as Stripe.Checkout.Session,
				);
				break;

			// ========================
			// PAYMENT METHOD EVENTS (Visa, etc.)
			// ========================
			case "payment_method.attached":
				await this.handlePaymentMethodAttached(
					event.data.object as Stripe.PaymentMethod,
				);
				break;

			case "payment_method.detached":
				await this.handlePaymentMethodDetached(
					event.data.object as Stripe.PaymentMethod,
				);
				break;

			case "payment_method.updated":
				await this.handlePaymentMethodUpdated(
					event.data.object as Stripe.PaymentMethod,
				);
				break;

			// ========================
			// CUSTOMER EVENTS
			// ========================
			case "customer.created":
				await this.handleCustomerCreated(event.data.object as Stripe.Customer);
				break;

			case "customer.updated":
				await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
				break;

			// ========================
			// CHARGE EVENTS
			// ========================
			case "charge.succeeded":
				await this.handleChargeSucceeded(event.data.object as Stripe.Charge);
				break;

			case "charge.refunded":
				await this.handleChargeRefunded(event.data.object as Stripe.Charge);
				break;

			case "charge.dispute.created":
				await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
				break;

			default:
				this.logger.log(`Unhandled webhook event type: ${event.type}`);
		}
	}

	// ========================
	// PAYMENT INTENT HANDLERS
	// ========================

	private async handlePaymentIntentSucceeded(
		paymentIntent: Stripe.PaymentIntent,
	) {
		this.logger.log(`PaymentIntent succeeded: ${paymentIntent.id}`);

		const paymentType = paymentIntent.metadata?.type;

		if (paymentType === "donation") {
			// Confirm donation
			await this.prisma.donation.updateMany({
				where: { stripePaymentId: paymentIntent.id },
				data: {
					status: "COMPLETED",
					completedAt: new Date(),
				},
			});

			this.logger.log(`Donation confirmed: ${paymentIntent.id}`);
		}

		// Log payment method details for analytics (supports Visa and other cards)
		const paymentMethodId = paymentIntent.payment_method;
		if (paymentMethodId && this.stripe) {
			try {
				const paymentMethod = await this.stripe.paymentMethods.retrieve(
					paymentMethodId as string,
				);
				this.logger.log(
					`Payment processed via ${paymentMethod.type}: ${paymentMethod.card?.brand || "unknown"} ending in ${paymentMethod.card?.last4 || "****"}`,
				);
			} catch (error) {
				this.logger.warn(
					`Could not retrieve payment method details: ${error.message}`,
				);
			}
		}
	}

	private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
		this.logger.warn(`PaymentIntent failed: ${paymentIntent.id}`);

		const paymentType = paymentIntent.metadata?.type;

		if (paymentType === "donation") {
			await this.prisma.donation.updateMany({
				where: { stripePaymentId: paymentIntent.id },
				data: { status: "FAILED" },
			});
		}

		// Could send notification to user about failed payment
	}

	private async handlePaymentIntentCanceled(
		paymentIntent: Stripe.PaymentIntent,
	) {
		this.logger.log(`PaymentIntent canceled: ${paymentIntent.id}`);

		const paymentType = paymentIntent.metadata?.type;

		if (paymentType === "donation") {
			await this.prisma.donation.updateMany({
				where: { stripePaymentId: paymentIntent.id },
				data: { status: "CANCELED" },
			});
		}
	}

	// ========================
	// SUBSCRIPTION HANDLERS
	// ========================

	private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
		this.logger.log(`Subscription created: ${subscription.id}`);

		const metadata = subscription.metadata;
		const planId = metadata?.planId;
		const billingCycle = metadata?.billingCycle || "MONTHLY";
		const consentId = metadata?.consentId;
		const visitorEmail = metadata?.visitorEmail;

		// For visitor subscriptions, we may need to create a user account
		if (visitorEmail && consentId && planId) {
			// Get consent details
			const consent = await this.prisma.paymentConsent.findUnique({
				where: { id: consentId },
			});

			if (consent) {
				// Check if user exists with this email
				let user = await this.prisma.user.findUnique({
					where: { email: visitorEmail.toLowerCase() },
				});

				// If no user, create one (visitor becoming member)
				if (!user) {
					user = await this.prisma.user.create({
						data: {
							email: visitorEmail.toLowerCase(),
							name: consent.name || undefined,
							role: "STUDENT",
							stripeCustomerId: subscription.customer as string,
							isActive: true,
							emailVerified: false,
						},
					});

					// Update consent with user ID
					await this.prisma.paymentConsent.update({
						where: { id: consentId },
						data: { userId: user.id },
					});

					this.logger.log(
						`Created new user account for subscriber: ${user.email}`,
					);
				}

				// Create subscription record
				await this.prisma.subscription.create({
					data: {
						userId: user.id,
						planId,
						stripeSubscriptionId: subscription.id,
						stripeCustomerId: subscription.customer as string,
						status: this.mapStripeSubscriptionStatus(subscription.status),
						billingCycle,
						priceAtSubscription:
							subscription.items.data[0]?.price?.unit_amount || 0,
						currentPeriodStart: new Date(
							subscription.current_period_start * 1000,
						),
						currentPeriodEnd: new Date(subscription.current_period_end * 1000),
						cancelAtPeriodEnd: subscription.cancel_at_period_end,
					},
				});

				this.logger.log(`Subscription record created for user: ${user.id}`);
			}
		} else {
			// Handle regular user subscription (delegate to existing service)
			await this.paymentsService.handleSubscriptionCreated(subscription);
		}
	}

	private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
		this.logger.log(`Subscription updated: ${subscription.id}`);
		await this.paymentsService.handleSubscriptionUpdated(subscription);
	}

	private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
		this.logger.log(`Subscription deleted: ${subscription.id}`);

		await this.prisma.subscription.updateMany({
			where: { stripeSubscriptionId: subscription.id },
			data: {
				status: "CANCELED",
				cancelAtPeriodEnd: false,
			},
		});
	}

	private async handleTrialWillEnd(subscription: Stripe.Subscription) {
		this.logger.log(`Trial will end for subscription: ${subscription.id}`);

		// Find the subscription and notify user
		const localSubscription = await this.prisma.subscription.findUnique({
			where: { stripeSubscriptionId: subscription.id },
			include: { user: true },
		});

		if (localSubscription?.user) {
			// Could create notification or send email about trial ending
			this.logger.log(
				`Trial ending soon for user: ${localSubscription.user.email}`,
			);
		}
	}

	// ========================
	// INVOICE HANDLERS
	// ========================

	private async handleInvoicePaid(invoice: Stripe.Invoice) {
		this.logger.log(`Invoice paid: ${invoice.id}`);

		if (invoice.subscription) {
			await this.prisma.subscription.updateMany({
				where: { stripeSubscriptionId: invoice.subscription as string },
				data: { status: "ACTIVE" },
			});
		}
	}

	private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
		this.logger.warn(`Invoice payment failed: ${invoice.id}`);

		if (invoice.subscription) {
			await this.prisma.subscription.updateMany({
				where: { stripeSubscriptionId: invoice.subscription as string },
				data: { status: "PAST_DUE" },
			});
		}
	}

	private async handleInvoiceUpcoming(invoice: Stripe.Invoice) {
		this.logger.log(`Upcoming invoice: ${invoice.id}`);
		// Could send notification about upcoming charge
	}

	// ========================
	// CHECKOUT SESSION HANDLERS
	// ========================

	private async handleCheckoutSessionCompleted(
		session: Stripe.Checkout.Session,
	) {
		this.logger.log(`Checkout session completed: ${session.id}`);

		// Handle subscription created via checkout
		if (session.mode === "subscription" && session.subscription) {
			this.logger.log(
				`Subscription created via checkout: ${session.subscription}`,
			);
		}

		// Handle one-time payment via checkout
		if (session.mode === "payment" && session.payment_intent) {
			this.logger.log(
				`Payment completed via checkout: ${session.payment_intent}`,
			);
		}
	}

	private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
		this.logger.log(`Checkout session expired: ${session.id}`);
		// Could clean up any pending records
	}

	// ========================
	// PAYMENT METHOD HANDLERS
	// ========================

	private async handlePaymentMethodAttached(
		paymentMethod: Stripe.PaymentMethod,
	) {
		this.logger.log(
			`Payment method attached: ${paymentMethod.id} (${paymentMethod.card?.brand || paymentMethod.type})`,
		);

		// Log Visa and other card brands
		if (paymentMethod.card) {
			this.logger.log(
				`Card attached: ${paymentMethod.card.brand} ending in ${paymentMethod.card.last4}`,
			);
		}
	}

	private async handlePaymentMethodDetached(
		paymentMethod: Stripe.PaymentMethod,
	) {
		this.logger.log(`Payment method detached: ${paymentMethod.id}`);
	}

	private async handlePaymentMethodUpdated(
		paymentMethod: Stripe.PaymentMethod,
	) {
		this.logger.log(`Payment method updated: ${paymentMethod.id}`);
	}

	// ========================
	// CUSTOMER HANDLERS
	// ========================

	private async handleCustomerCreated(customer: Stripe.Customer) {
		this.logger.log(`Customer created: ${customer.id} (${customer.email})`);
	}

	private async handleCustomerUpdated(customer: Stripe.Customer) {
		this.logger.log(`Customer updated: ${customer.id}`);

		// Sync customer email changes if needed
		if (customer.email) {
			await this.prisma.user.updateMany({
				where: { stripeCustomerId: customer.id },
				data: { email: customer.email },
			});
		}
	}

	// ========================
	// CHARGE HANDLERS
	// ========================

	private async handleChargeSucceeded(charge: Stripe.Charge) {
		this.logger.log(`Charge succeeded: ${charge.id}`);

		// Log payment method details
		if (charge.payment_method_details?.card) {
			const card = charge.payment_method_details.card;
			this.logger.log(
				`Charge via ${card.brand} (${card.last4}) - ${card.funding} card`,
			);
		}
	}

	private async handleChargeRefunded(charge: Stripe.Charge) {
		this.logger.log(`Charge refunded: ${charge.id}`);

		// Update donation status if refunded
		if (charge.payment_intent) {
			await this.prisma.donation.updateMany({
				where: { stripePaymentId: charge.payment_intent as string },
				data: { status: "REFUNDED" },
			});
		}
	}

	private async handleDisputeCreated(dispute: Stripe.Dispute) {
		this.logger.warn(
			`Dispute created: ${dispute.id} - Reason: ${dispute.reason}`,
		);
		// Could create admin notification for dispute handling
	}

	// ========================
	// HELPERS
	// ========================

	private mapStripeSubscriptionStatus(
		status: Stripe.Subscription.Status,
	): string {
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
}
