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
import { StripeConnectService } from "./stripe-connect.service";
import { StripeConsentService } from "./stripe-consent.service";
import { PrismaService } from "../prisma.service";

/**
 * Stripe Connect Webhook Controller
 *
 * Handles all Stripe Connect events for:
 * - Connected account management
 * - Platform payments (donations & subscriptions)
 * - Visa and card payment processing
 * - Transfers and payouts
 *
 * Webhook endpoint: POST /webhooks/stripe-connect
 */
@Controller("webhooks")
export class StripeConnectWebhooksController {
	private readonly logger = new Logger(StripeConnectWebhooksController.name);
	private stripe: Stripe | null = null;

	constructor(
		private connectService: StripeConnectService,
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
	 * Stripe Connect Webhook Endpoint
	 *
	 * Handles events from connected accounts and platform payments.
	 * Uses a separate webhook secret for Connect events.
	 */
	@Post("stripe-connect")
	@HttpCode(HttpStatus.OK)
	async handleStripeConnectWebhook(
		@Req() req: Request,
		@Res() res: Response,
		@Headers("stripe-signature") signature: string,
	) {
		if (!this.stripe) {
			this.logger.error("Stripe not configured");
			return res.status(500).json({ error: "Stripe not configured" });
		}

		// Use Connect webhook secret (fallback to regular if not set)
		const webhookSecret =
			this.configService.get<string>("stripe.connectWebhookSecret") ||
			this.configService.get<string>("stripe.webhookSecret");

		if (!webhookSecret) {
			this.logger.error("Stripe Connect webhook secret not configured");
			return res.status(500).json({ error: "Webhook secret not configured" });
		}

		let event: Stripe.Event;

		try {
			event = this.stripe.webhooks.constructEvent(
				req.body,
				signature,
				webhookSecret,
			);
		} catch (err) {
			this.logger.error(
				`Connect webhook signature verification failed: ${err.message}`,
			);
			return res.status(400).json({ error: `Webhook Error: ${err.message}` });
		}

		// Idempotency check
		const isProcessed = await this.consentService.isEventProcessed(event.id);
		if (isProcessed) {
			this.logger.log(`Connect event ${event.id} already processed, skipping`);
			return res.status(200).json({ received: true, duplicate: true });
		}

		this.logger.log(`Processing Connect webhook: ${event.type} (${event.id})`);

		// Get connected account ID if available
		const connectedAccountId = event.account;
		if (connectedAccountId) {
			this.logger.log(`Event from connected account: ${connectedAccountId}`);
		}

		try {
			await this.processConnectEvent(event);

			// Log successful processing
			await this.consentService.logWebhookEvent({
				stripeEventId: event.id,
				eventType: event.type,
				status: "processed",
				payload: {
					objectId: (event.data.object as any).id,
					connectedAccountId,
				},
			});

			return res.status(200).json({ received: true });
		} catch (error) {
			this.logger.error(
				`Error processing Connect webhook ${event.type}: ${error.message}`,
			);

			await this.consentService.logWebhookEvent({
				stripeEventId: event.id,
				eventType: event.type,
				status: "failed",
				errorMessage: error.message,
			});

			return res.status(200).json({ received: true, error: error.message });
		}
	}

	/**
	 * Process Connect-specific events
	 */
	private async processConnectEvent(event: Stripe.Event) {
		const connectedAccountId = event.account;

		switch (event.type) {
			// ========================
			// ACCOUNT EVENTS
			// ========================
			case "account.updated":
				await this.connectService.handleAccountUpdated(
					event.data.object as Stripe.Account,
				);
				break;

			case "account.application.authorized":
				await this.handleAccountAuthorized(
					event.data.object as Stripe.Application,
				);
				break;

			case "account.application.deauthorized":
				await this.handleAccountDeauthorized(
					event.data.object as Stripe.Application,
				);
				break;

			case "account.external_account.created":
				await this.handleExternalAccountCreated(
					event.data.object as Stripe.BankAccount | Stripe.Card,
					connectedAccountId,
				);
				break;

			case "account.external_account.updated":
				await this.handleExternalAccountUpdated(
					event.data.object as Stripe.BankAccount | Stripe.Card,
					connectedAccountId,
				);
				break;

			case "account.external_account.deleted":
				await this.handleExternalAccountDeleted(
					event.data.object as Stripe.BankAccount | Stripe.Card,
					connectedAccountId,
				);
				break;

			// ========================
			// PAYMENT INTENT EVENTS (Connect)
			// ========================
			case "payment_intent.succeeded":
				await this.handleConnectPaymentSucceeded(
					event.data.object as Stripe.PaymentIntent,
					connectedAccountId,
				);
				break;

			case "payment_intent.payment_failed":
				await this.handleConnectPaymentFailed(
					event.data.object as Stripe.PaymentIntent,
					connectedAccountId,
				);
				break;

			// ========================
			// CHARGE EVENTS (Connect)
			// ========================
			case "charge.succeeded":
				await this.handleConnectChargeSucceeded(
					event.data.object as Stripe.Charge,
					connectedAccountId,
				);
				break;

			case "charge.failed":
				await this.handleConnectChargeFailed(
					event.data.object as Stripe.Charge,
					connectedAccountId,
				);
				break;

			case "charge.refunded":
				await this.handleConnectChargeRefunded(
					event.data.object as Stripe.Charge,
					connectedAccountId,
				);
				break;

			case "charge.dispute.created":
				await this.handleConnectDispute(
					event.data.object as Stripe.Dispute,
					connectedAccountId,
				);
				break;

			// ========================
			// TRANSFER EVENTS
			// ========================
			case "transfer.created":
				await this.connectService.handleTransferCreated(
					event.data.object as Stripe.Transfer,
				);
				break;

			case "transfer.reversed":
				await this.handleTransferReversed(event.data.object as Stripe.Transfer);
				break;

			// ========================
			// PAYOUT EVENTS
			// ========================
			case "payout.paid":
				if (connectedAccountId) {
					await this.connectService.handlePayoutPaid(
						event.data.object as Stripe.Payout,
						connectedAccountId,
					);
				}
				break;

			case "payout.failed":
				if (connectedAccountId) {
					await this.connectService.handlePayoutFailed(
						event.data.object as Stripe.Payout,
						connectedAccountId,
					);
				}
				break;

			case "payout.created":
				await this.handlePayoutCreated(
					event.data.object as Stripe.Payout,
					connectedAccountId,
				);
				break;

			// ========================
			// SUBSCRIPTION EVENTS (Connect)
			// ========================
			case "customer.subscription.created":
				await this.handleConnectSubscriptionCreated(
					event.data.object as Stripe.Subscription,
					connectedAccountId,
				);
				break;

			case "customer.subscription.updated":
				await this.handleConnectSubscriptionUpdated(
					event.data.object as Stripe.Subscription,
					connectedAccountId,
				);
				break;

			case "customer.subscription.deleted":
				await this.handleConnectSubscriptionDeleted(
					event.data.object as Stripe.Subscription,
					connectedAccountId,
				);
				break;

			// ========================
			// INVOICE EVENTS (Connect)
			// ========================
			case "invoice.paid":
				await this.handleConnectInvoicePaid(
					event.data.object as Stripe.Invoice,
					connectedAccountId,
				);
				break;

			case "invoice.payment_failed":
				await this.handleConnectInvoicePaymentFailed(
					event.data.object as Stripe.Invoice,
					connectedAccountId,
				);
				break;

			// ========================
			// CAPABILITY EVENTS
			// ========================
			case "capability.updated":
				await this.handleCapabilityUpdated(
					event.data.object as Stripe.Capability,
					connectedAccountId,
				);
				break;

			// ========================
			// PAYMENT METHOD EVENTS (Visa, Cards)
			// ========================
			case "payment_method.attached":
				await this.handlePaymentMethodAttached(
					event.data.object as Stripe.PaymentMethod,
					connectedAccountId,
				);
				break;

			default:
				this.logger.log(`Unhandled Connect event type: ${event.type}`);
		}
	}

	// ========================
	// ACCOUNT HANDLERS
	// ========================

	private async handleAccountAuthorized(application: Stripe.Application) {
		this.logger.log(`Account authorized for application: ${application.id}`);
	}

	private async handleAccountDeauthorized(application: Stripe.Application) {
		this.logger.log(`Account deauthorized for application: ${application.id}`);

		// Mark all connected accounts with this application as deauthorized
		// This would need application tracking if implemented
	}

	private async handleExternalAccountCreated(
		externalAccount: Stripe.BankAccount | Stripe.Card,
		connectedAccountId?: string,
	) {
		this.logger.log(
			`External account created: ${externalAccount.id} for ${connectedAccountId || "platform"}`,
		);

		// Log for audit
		if (connectedAccountId) {
			const accountType = "bank_account" in externalAccount ? "bank" : "card";
			this.logger.log(
				`${accountType} account added to connected account ${connectedAccountId}`,
			);
		}
	}

	private async handleExternalAccountUpdated(
		externalAccount: Stripe.BankAccount | Stripe.Card,
		connectedAccountId?: string,
	) {
		this.logger.log(
			`External account updated: ${externalAccount.id} for ${connectedAccountId || "platform"}`,
		);
	}

	private async handleExternalAccountDeleted(
		externalAccount: Stripe.BankAccount | Stripe.Card,
		connectedAccountId?: string,
	) {
		this.logger.log(
			`External account deleted: ${externalAccount.id} for ${connectedAccountId || "platform"}`,
		);
	}

	// ========================
	// PAYMENT HANDLERS
	// ========================

	private async handleConnectPaymentSucceeded(
		paymentIntent: Stripe.PaymentIntent,
		connectedAccountId?: string,
	) {
		this.logger.log(
			`Connect payment succeeded: ${paymentIntent.id} (account: ${connectedAccountId || "platform"})`,
		);

		await this.connectService.handleConnectPaymentSucceeded(paymentIntent);

		// Log payment method details (Visa, Mastercard, etc.)
		if (paymentIntent.payment_method && this.stripe) {
			try {
				const pm = await this.stripe.paymentMethods.retrieve(
					paymentIntent.payment_method as string,
				);
				if (pm.card) {
					this.logger.log(
						`Payment via ${pm.card.brand.toUpperCase()} ending in ${pm.card.last4}`,
					);
				}
			} catch {
				// Ignore retrieval errors
			}
		}

		// Handle donation if applicable
		if (paymentIntent.metadata?.type === "donation") {
			await this.prisma.donation.updateMany({
				where: { stripePaymentId: paymentIntent.id },
				data: {
					status: "COMPLETED",
					completedAt: new Date(),
				},
			});
		}
	}

	private async handleConnectPaymentFailed(
		paymentIntent: Stripe.PaymentIntent,
		connectedAccountId?: string,
	) {
		this.logger.warn(
			`Connect payment failed: ${paymentIntent.id} (account: ${connectedAccountId || "platform"})`,
		);

		await this.connectService.handleConnectPaymentFailed(paymentIntent);

		if (paymentIntent.metadata?.type === "donation") {
			await this.prisma.donation.updateMany({
				where: { stripePaymentId: paymentIntent.id },
				data: { status: "FAILED" },
			});
		}
	}

	// ========================
	// CHARGE HANDLERS
	// ========================

	private async handleConnectChargeSucceeded(
		charge: Stripe.Charge,
		connectedAccountId?: string,
	) {
		this.logger.log(
			`Connect charge succeeded: ${charge.id} (account: ${connectedAccountId || "platform"})`,
		);

		// Log card brand (Visa, Mastercard, etc.)
		if (charge.payment_method_details?.card) {
			const card = charge.payment_method_details.card;
			this.logger.log(
				`Charge via ${card.brand?.toUpperCase()} ${card.funding} card ending in ${card.last4}`,
			);
		}
	}

	private async handleConnectChargeFailed(
		charge: Stripe.Charge,
		connectedAccountId?: string,
	) {
		this.logger.warn(
			`Connect charge failed: ${charge.id} - ${charge.failure_message || "Unknown reason"}`,
		);
	}

	private async handleConnectChargeRefunded(
		charge: Stripe.Charge,
		connectedAccountId?: string,
	) {
		this.logger.log(
			`Connect charge refunded: ${charge.id} (account: ${connectedAccountId || "platform"})`,
		);

		// Update donation status if applicable
		if (charge.payment_intent) {
			await this.prisma.donation.updateMany({
				where: { stripePaymentId: charge.payment_intent as string },
				data: { status: "REFUNDED" },
			});
		}
	}

	private async handleConnectDispute(
		dispute: Stripe.Dispute,
		connectedAccountId?: string,
	) {
		this.logger.warn(
			`Connect dispute created: ${dispute.id} - Reason: ${dispute.reason} (account: ${connectedAccountId || "platform"})`,
		);

		// Could send admin notification about dispute
	}

	// ========================
	// TRANSFER HANDLERS
	// ========================

	private async handleTransferReversed(transfer: Stripe.Transfer) {
		this.logger.warn(
			`Transfer reversed: ${transfer.id} to ${transfer.destination}`,
		);

		await this.prisma.connectTransferLog.updateMany({
			where: { stripeTransferId: transfer.id },
			data: { status: "REVERSED" },
		});
	}

	// ========================
	// PAYOUT HANDLERS
	// ========================

	private async handlePayoutCreated(
		payout: Stripe.Payout,
		connectedAccountId?: string,
	) {
		this.logger.log(
			`Payout created: ${payout.id} for ${payout.amount} ${payout.currency.toUpperCase()} (account: ${connectedAccountId || "platform"})`,
		);
	}

	// ========================
	// SUBSCRIPTION HANDLERS
	// ========================

	private async handleConnectSubscriptionCreated(
		subscription: Stripe.Subscription,
		connectedAccountId?: string,
	) {
		this.logger.log(
			`Connect subscription created: ${subscription.id} (account: ${connectedAccountId || "platform"})`,
		);

		// Store subscription with connected account reference
		const metadata = subscription.metadata;
		if (metadata?.planId && connectedAccountId) {
			// Create subscription record linking to connected account
			const customer = subscription.customer as string;

			// Find user by stripe customer ID
			const user = await this.prisma.user.findFirst({
				where: { stripeCustomerId: customer },
			});

			if (user) {
				await this.prisma.subscription.create({
					data: {
						userId: user.id,
						planId: metadata.planId,
						stripeSubscriptionId: subscription.id,
						stripeCustomerId: customer,
						status: this.mapSubscriptionStatus(subscription.status),
						billingCycle: metadata.billingCycle || "MONTHLY",
						priceAtSubscription:
							subscription.items.data[0]?.price?.unit_amount || 0,
						currentPeriodStart: new Date(
							subscription.current_period_start * 1000,
						),
						currentPeriodEnd: new Date(subscription.current_period_end * 1000),
						cancelAtPeriodEnd: subscription.cancel_at_period_end,
						// Could store connectedAccountId in metadata if model supports it
					},
				});
			}
		}
	}

	private async handleConnectSubscriptionUpdated(
		subscription: Stripe.Subscription,
		connectedAccountId?: string,
	) {
		this.logger.log(
			`Connect subscription updated: ${subscription.id} (account: ${connectedAccountId || "platform"})`,
		);

		await this.prisma.subscription.updateMany({
			where: { stripeSubscriptionId: subscription.id },
			data: {
				status: this.mapSubscriptionStatus(subscription.status),
				currentPeriodStart: new Date(subscription.current_period_start * 1000),
				currentPeriodEnd: new Date(subscription.current_period_end * 1000),
				cancelAtPeriodEnd: subscription.cancel_at_period_end,
			},
		});
	}

	private async handleConnectSubscriptionDeleted(
		subscription: Stripe.Subscription,
		connectedAccountId?: string,
	) {
		this.logger.log(
			`Connect subscription deleted: ${subscription.id} (account: ${connectedAccountId || "platform"})`,
		);

		await this.prisma.subscription.updateMany({
			where: { stripeSubscriptionId: subscription.id },
			data: {
				status: "CANCELED",
				cancelAtPeriodEnd: false,
			},
		});
	}

	// ========================
	// INVOICE HANDLERS
	// ========================

	private async handleConnectInvoicePaid(
		invoice: Stripe.Invoice,
		connectedAccountId?: string,
	) {
		this.logger.log(
			`Connect invoice paid: ${invoice.id} (account: ${connectedAccountId || "platform"})`,
		);

		if (invoice.subscription) {
			await this.prisma.subscription.updateMany({
				where: { stripeSubscriptionId: invoice.subscription as string },
				data: { status: "ACTIVE" },
			});
		}
	}

	private async handleConnectInvoicePaymentFailed(
		invoice: Stripe.Invoice,
		connectedAccountId?: string,
	) {
		this.logger.warn(
			`Connect invoice payment failed: ${invoice.id} (account: ${connectedAccountId || "platform"})`,
		);

		if (invoice.subscription) {
			await this.prisma.subscription.updateMany({
				where: { stripeSubscriptionId: invoice.subscription as string },
				data: { status: "PAST_DUE" },
			});
		}
	}

	// ========================
	// CAPABILITY HANDLERS
	// ========================

	private async handleCapabilityUpdated(
		capability: Stripe.Capability,
		connectedAccountId?: string,
	) {
		this.logger.log(
			`Capability ${capability.id} updated to ${capability.status} for account ${connectedAccountId || "unknown"}`,
		);

		// Update account status based on capability changes
		if (connectedAccountId) {
			const account = await this.prisma.stripeConnectAccount.findFirst({
				where: { stripeAccountId: connectedAccountId },
			});

			if (account && this.stripe) {
				// Refresh account status
				const stripeAccount =
					await this.stripe.accounts.retrieve(connectedAccountId);
				await this.prisma.stripeConnectAccount.update({
					where: { id: account.id },
					data: {
						chargesEnabled: stripeAccount.charges_enabled,
						payoutsEnabled: stripeAccount.payouts_enabled,
					},
				});
			}
		}
	}

	// ========================
	// PAYMENT METHOD HANDLERS
	// ========================

	private async handlePaymentMethodAttached(
		paymentMethod: Stripe.PaymentMethod,
		connectedAccountId?: string,
	) {
		this.logger.log(
			`Payment method attached: ${paymentMethod.id} (${paymentMethod.type}) to account ${connectedAccountId || "platform"}`,
		);

		// Log card details if available (Visa, Mastercard, etc.)
		if (paymentMethod.card) {
			this.logger.log(
				`Card: ${paymentMethod.card.brand.toUpperCase()} ending in ${paymentMethod.card.last4}, expires ${paymentMethod.card.exp_month}/${paymentMethod.card.exp_year}`,
			);
		}
	}

	// ========================
	// HELPERS
	// ========================

	private mapSubscriptionStatus(status: Stripe.Subscription.Status): string {
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
