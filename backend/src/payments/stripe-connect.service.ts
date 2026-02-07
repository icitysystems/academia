import {
	Injectable,
	BadRequestException,
	NotFoundException,
	Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PrismaService } from "../prisma.service";

export interface CreateConnectedAccountInput {
	email: string;
	type?: "express" | "standard" | "custom";
	country?: string;
	businessType?: "individual" | "company" | "non_profit";
	userId?: string;
}

export interface CreateConnectPaymentInput {
	email: string;
	name?: string;
	amount: number;
	currency?: string;
	description?: string;
	connectedAccountId: string;
	applicationFeeAmount?: number;
	paymentType: "donation" | "payment" | "subscription";
	savePaymentMethod?: boolean;
}

export interface ConnectAccountOnboardingInput {
	accountId: string;
	refreshUrl?: string;
	returnUrl?: string;
}

@Injectable()
export class StripeConnectService {
	private stripe: Stripe | null = null;
	private readonly logger = new Logger(StripeConnectService.name);

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
	// CONNECTED ACCOUNT MANAGEMENT
	// ========================

	/**
	 * Create a Stripe Connect account for instructors/organizations
	 * Allows them to receive payments directly
	 */
	async createConnectedAccount(input: CreateConnectedAccountInput) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		// Check if account already exists
		const existingAccount = await this.prisma.stripeConnectAccount.findFirst({
			where: { email: input.email.toLowerCase() },
		});

		if (existingAccount) {
			return existingAccount;
		}

		// Create Stripe Connect account
		const account = await this.stripe.accounts.create({
			type: input.type || "express",
			country: input.country || "US",
			email: input.email.toLowerCase(),
			business_type: input.businessType || "individual",
			capabilities: {
				card_payments: { requested: true },
				transfers: { requested: true },
			},
			metadata: {
				source: "academia_platform",
				userId: input.userId || "",
			},
		});

		// Store in database
		const connectAccount = await this.prisma.stripeConnectAccount.create({
			data: {
				stripeAccountId: account.id,
				email: input.email.toLowerCase(),
				accountType: input.type || "express",
				country: input.country || "US",
				businessType: input.businessType || "individual",
				chargesEnabled: account.charges_enabled,
				payoutsEnabled: account.payouts_enabled,
				detailsSubmitted: account.details_submitted,
				userId: input.userId,
				status: "PENDING_VERIFICATION",
			},
		});

		this.logger.log(
			`Created Stripe Connect account: ${account.id} for ${input.email}`,
		);

		return connectAccount;
	}

	/**
	 * Generate onboarding link for Express accounts
	 */
	async createAccountOnboardingLink(input: ConnectAccountOnboardingInput) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		const frontendUrl =
			this.configService.get<string>("app.frontendUrl") ||
			"http://localhost:3000";

		const accountLink = await this.stripe.accountLinks.create({
			account: input.accountId,
			refresh_url:
				input.refreshUrl || `${frontendUrl}/connect/onboarding/refresh`,
			return_url: input.returnUrl || `${frontendUrl}/connect/onboarding/return`,
			type: "account_onboarding",
		});

		return {
			url: accountLink.url,
			expiresAt: new Date(accountLink.expires_at * 1000),
		};
	}

	/**
	 * Create login link for Express dashboard
	 */
	async createDashboardLoginLink(accountId: string) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		const loginLink = await this.stripe.accounts.createLoginLink(accountId);
		return { url: loginLink.url };
	}

	/**
	 * Get Connect account details
	 */
	async getConnectAccount(accountId: string) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		const account = await this.stripe.accounts.retrieve(accountId);

		// Update local record
		await this.prisma.stripeConnectAccount.updateMany({
			where: { stripeAccountId: accountId },
			data: {
				chargesEnabled: account.charges_enabled,
				payoutsEnabled: account.payouts_enabled,
				detailsSubmitted: account.details_submitted,
				status: this.getAccountStatus(account),
			},
		});

		return {
			id: account.id,
			email: account.email,
			chargesEnabled: account.charges_enabled,
			payoutsEnabled: account.payouts_enabled,
			detailsSubmitted: account.details_submitted,
			country: account.country,
			defaultCurrency: account.default_currency,
			businessProfile: account.business_profile,
			requirements: account.requirements,
		};
	}

	/**
	 * Get account by email
	 */
	async getConnectAccountByEmail(email: string) {
		const account = await this.prisma.stripeConnectAccount.findFirst({
			where: { email: email.toLowerCase() },
		});

		if (!account) {
			return null;
		}

		// Refresh status from Stripe
		if (this.stripe) {
			try {
				const stripeAccount = await this.stripe.accounts.retrieve(
					account.stripeAccountId,
				);
				await this.prisma.stripeConnectAccount.update({
					where: { id: account.id },
					data: {
						chargesEnabled: stripeAccount.charges_enabled,
						payoutsEnabled: stripeAccount.payouts_enabled,
						detailsSubmitted: stripeAccount.details_submitted,
						status: this.getAccountStatus(stripeAccount),
					},
				});
			} catch (error) {
				this.logger.warn(`Could not refresh account status: ${error.message}`);
			}
		}

		return this.prisma.stripeConnectAccount.findUnique({
			where: { id: account.id },
		});
	}

	// ========================
	// CONNECT PAYMENTS (Visa & Cards)
	// ========================

	/**
	 * Create a payment intent for Connect (platform gets fee)
	 * Supports Visa and all major card brands
	 */
	async createConnectPaymentIntent(input: CreateConnectPaymentInput) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		// Verify connected account exists and is enabled
		const connectAccount = await this.prisma.stripeConnectAccount.findFirst({
			where: { stripeAccountId: input.connectedAccountId },
		});

		if (!connectAccount) {
			throw new NotFoundException("Connected account not found");
		}

		if (!connectAccount.chargesEnabled) {
			throw new BadRequestException(
				"Connected account is not enabled for charges",
			);
		}

		// Get or create customer
		let customerId: string;
		const existingConsent = await this.prisma.paymentConsent.findFirst({
			where: {
				email: input.email.toLowerCase(),
				isActive: true,
			},
		});

		if (existingConsent?.stripeCustomerId) {
			customerId = existingConsent.stripeCustomerId;
		} else {
			const customer = await this.stripe.customers.create({
				email: input.email.toLowerCase(),
				name: input.name || undefined,
				metadata: {
					source: "connect_payment",
				},
			});
			customerId = customer.id;
		}

		// Calculate application fee (platform's cut)
		const applicationFee =
			input.applicationFeeAmount || Math.round(input.amount * 0.1); // Default 10% platform fee

		// Create payment intent with Connect
		const paymentIntent = await this.stripe.paymentIntents.create({
			amount: input.amount,
			currency: input.currency || "usd",
			customer: customerId,
			automatic_payment_methods: {
				enabled: true,
				allow_redirects: "always",
			},
			application_fee_amount: applicationFee,
			transfer_data: {
				destination: input.connectedAccountId,
			},
			metadata: {
				type: input.paymentType,
				email: input.email,
				name: input.name || "",
				description: input.description || "",
				connectedAccountId: input.connectedAccountId,
				source: "stripe_connect",
			},
			description:
				input.description || `${input.paymentType} to ${connectAccount.email}`,
		});

		// Log the transaction
		await this.prisma.connectPaymentLog.create({
			data: {
				stripePaymentIntentId: paymentIntent.id,
				connectedAccountId: input.connectedAccountId,
				customerEmail: input.email,
				amount: input.amount,
				currency: input.currency || "usd",
				applicationFee,
				paymentType: input.paymentType,
				status: "PENDING",
			},
		});

		this.logger.log(
			`Created Connect payment intent: ${paymentIntent.id} for ${input.connectedAccountId}`,
		);

		return {
			paymentIntentId: paymentIntent.id,
			clientSecret: paymentIntent.client_secret!,
			amount: input.amount,
			currency: input.currency || "usd",
			applicationFee,
			connectedAccountId: input.connectedAccountId,
		};
	}

	/**
	 * Create a direct charge to connected account
	 * Payment goes directly to the connected account
	 */
	async createDirectCharge(input: CreateConnectPaymentInput) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		// Create payment intent on behalf of connected account
		const paymentIntent = await this.stripe.paymentIntents.create(
			{
				amount: input.amount,
				currency: input.currency || "usd",
				automatic_payment_methods: {
					enabled: true,
				},
				metadata: {
					type: input.paymentType,
					email: input.email,
					description: input.description || "",
				},
			},
			{
				stripeAccount: input.connectedAccountId,
			},
		);

		return {
			paymentIntentId: paymentIntent.id,
			clientSecret: paymentIntent.client_secret!,
			amount: input.amount,
			currency: input.currency || "usd",
			connectedAccountId: input.connectedAccountId,
		};
	}

	// ========================
	// CONNECT SUBSCRIPTIONS
	// ========================

	/**
	 * Create subscription with revenue share to connected account
	 */
	async createConnectSubscription(input: {
		email: string;
		name?: string;
		planId: string;
		connectedAccountId: string;
		billingCycle: "MONTHLY" | "YEARLY";
		applicationFeePercent?: number;
	}) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		// Verify connected account
		const connectAccount = await this.prisma.stripeConnectAccount.findFirst({
			where: { stripeAccountId: input.connectedAccountId },
		});

		if (!connectAccount || !connectAccount.chargesEnabled) {
			throw new BadRequestException("Connected account not enabled");
		}

		// Get subscription plan
		const plan = await this.prisma.subscriptionPlan.findUnique({
			where: { id: input.planId },
		});

		if (!plan || !plan.isActive) {
			throw new NotFoundException("Plan not found or not active");
		}

		// Get or create customer
		const existingConsent = await this.prisma.paymentConsent.findFirst({
			where: { email: input.email.toLowerCase(), isActive: true },
		});

		let customerId: string;
		if (existingConsent?.stripeCustomerId) {
			customerId = existingConsent.stripeCustomerId;
		} else {
			const customer = await this.stripe.customers.create({
				email: input.email.toLowerCase(),
				name: input.name || undefined,
			});
			customerId = customer.id;
		}

		const priceId =
			input.billingCycle === "YEARLY"
				? plan.stripePriceIdYearly
				: plan.stripePriceIdMonthly;

		const frontendUrl =
			this.configService.get<string>("app.frontendUrl") ||
			"http://localhost:3000";

		// Create checkout session with Connect
		const session = await this.stripe.checkout.sessions.create({
			customer: customerId,
			mode: "subscription",
			line_items: priceId
				? [{ price: priceId, quantity: 1 }]
				: [
						{
							price_data: {
								currency: "usd",
								product_data: {
									name: plan.name,
									description: plan.description || undefined,
								},
								unit_amount:
									input.billingCycle === "YEARLY"
										? plan.priceYearly || plan.priceMonthly * 12
										: plan.priceMonthly,
								recurring: {
									interval: input.billingCycle === "YEARLY" ? "year" : "month",
								},
							},
							quantity: 1,
						},
					],
			success_url: `${frontendUrl}/connect/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${frontendUrl}/connect/subscription/cancel`,
			payment_method_types: ["card"],
			subscription_data: {
				application_fee_percent: input.applicationFeePercent || 10,
				transfer_data: {
					destination: input.connectedAccountId,
				},
				metadata: {
					planId: plan.id,
					connectedAccountId: input.connectedAccountId,
					billingCycle: input.billingCycle,
				},
			},
		});

		return {
			sessionId: session.id,
			url: session.url,
			planName: plan.name,
			connectedAccountId: input.connectedAccountId,
		};
	}

	// ========================
	// TRANSFERS & PAYOUTS
	// ========================

	/**
	 * Create a transfer to connected account
	 */
	async createTransfer(input: {
		amount: number;
		currency?: string;
		connectedAccountId: string;
		description?: string;
	}) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		const transfer = await this.stripe.transfers.create({
			amount: input.amount,
			currency: input.currency || "usd",
			destination: input.connectedAccountId,
			description: input.description,
		});

		this.logger.log(
			`Created transfer: ${transfer.id} to ${input.connectedAccountId}`,
		);

		return {
			transferId: transfer.id,
			amount: transfer.amount,
			currency: transfer.currency,
			connectedAccountId: input.connectedAccountId,
		};
	}

	/**
	 * Get balance for connected account
	 */
	async getConnectAccountBalance(accountId: string) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		const balance = await this.stripe.balance.retrieve({
			stripeAccount: accountId,
		});

		return {
			available: balance.available.map((b) => ({
				amount: b.amount,
				currency: b.currency,
			})),
			pending: balance.pending.map((b) => ({
				amount: b.amount,
				currency: b.currency,
			})),
		};
	}

	/**
	 * List payouts for connected account
	 */
	async listPayouts(accountId: string, limit = 10) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		const payouts = await this.stripe.payouts.list(
			{ limit },
			{ stripeAccount: accountId },
		);

		return payouts.data.map((p) => ({
			id: p.id,
			amount: p.amount,
			currency: p.currency,
			status: p.status,
			arrivalDate: new Date(p.arrival_date * 1000),
			createdAt: new Date(p.created * 1000),
		}));
	}

	// ========================
	// WEBHOOK HANDLERS
	// ========================

	/**
	 * Handle Connect account updates from webhook
	 */
	async handleAccountUpdated(account: Stripe.Account) {
		this.logger.log(`Connect account updated: ${account.id}`);

		await this.prisma.stripeConnectAccount.updateMany({
			where: { stripeAccountId: account.id },
			data: {
				chargesEnabled: account.charges_enabled,
				payoutsEnabled: account.payouts_enabled,
				detailsSubmitted: account.details_submitted,
				status: this.getAccountStatus(account),
			},
		});
	}

	/**
	 * Handle payment intent succeeded for Connect
	 */
	async handleConnectPaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
		this.logger.log(`Connect payment succeeded: ${paymentIntent.id}`);

		await this.prisma.connectPaymentLog.updateMany({
			where: { stripePaymentIntentId: paymentIntent.id },
			data: {
				status: "COMPLETED",
				completedAt: new Date(),
			},
		});
	}

	/**
	 * Handle payment intent failed for Connect
	 */
	async handleConnectPaymentFailed(paymentIntent: Stripe.PaymentIntent) {
		this.logger.warn(`Connect payment failed: ${paymentIntent.id}`);

		await this.prisma.connectPaymentLog.updateMany({
			where: { stripePaymentIntentId: paymentIntent.id },
			data: {
				status: "FAILED",
			},
		});
	}

	/**
	 * Handle transfer events
	 */
	async handleTransferCreated(transfer: Stripe.Transfer) {
		this.logger.log(
			`Transfer created: ${transfer.id} to ${transfer.destination}`,
		);

		await this.prisma.connectTransferLog.create({
			data: {
				stripeTransferId: transfer.id,
				connectedAccountId: transfer.destination as string,
				amount: transfer.amount,
				currency: transfer.currency,
				status: "COMPLETED",
			},
		});
	}

	/**
	 * Handle payout events
	 */
	async handlePayoutPaid(payout: Stripe.Payout, accountId: string) {
		this.logger.log(`Payout paid: ${payout.id} for account ${accountId}`);

		await this.prisma.connectPayoutLog.create({
			data: {
				stripePayoutId: payout.id,
				connectedAccountId: accountId,
				amount: payout.amount,
				currency: payout.currency,
				status: "PAID",
				arrivalDate: new Date(payout.arrival_date * 1000),
			},
		});
	}

	/**
	 * Handle payout failed
	 */
	async handlePayoutFailed(payout: Stripe.Payout, accountId: string) {
		this.logger.warn(`Payout failed: ${payout.id} for account ${accountId}`);

		await this.prisma.connectPayoutLog.create({
			data: {
				stripePayoutId: payout.id,
				connectedAccountId: accountId,
				amount: payout.amount,
				currency: payout.currency,
				status: "FAILED",
				failureMessage: payout.failure_message || undefined,
			},
		});
	}

	// ========================
	// HELPERS
	// ========================

	private getAccountStatus(account: Stripe.Account): string {
		if (account.charges_enabled && account.payouts_enabled) {
			return "ACTIVE";
		}
		if (account.details_submitted) {
			return "PENDING_VERIFICATION";
		}
		if (account.requirements?.currently_due?.length) {
			return "NEEDS_INFORMATION";
		}
		return "PENDING";
	}
}
