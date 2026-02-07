import {
	Injectable,
	BadRequestException,
	NotFoundException,
	Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PrismaService } from "../prisma.service";
import {
	CreatePaymentConsentInput,
	VisitorPaymentIntentInput,
	SetupVisitorSubscriptionInput,
	UpdatePaymentConsentInput,
} from "./dto/consent.input";

@Injectable()
export class StripeConsentService {
	private stripe: Stripe | null = null;
	private readonly logger = new Logger(StripeConsentService.name);

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
	// CONSENT MANAGEMENT
	// ========================

	/**
	 * Create payment consent for a visitor
	 * Required before processing any payments
	 */
	async createPaymentConsent(
		input: CreatePaymentConsentInput,
		userId?: string,
	) {
		if (!input.acceptedTerms || !input.acceptedPrivacyPolicy) {
			throw new BadRequestException(
				"Terms and privacy policy must be accepted to proceed with payments",
			);
		}

		// Check for existing active consent
		const existingConsent = await this.prisma.paymentConsent.findFirst({
			where: {
				email: input.email.toLowerCase(),
				isActive: true,
			},
		});

		if (existingConsent) {
			// Update existing consent
			return this.prisma.paymentConsent.update({
				where: { id: existingConsent.id },
				data: {
					name: input.name || existingConsent.name,
					acceptedTerms: input.acceptedTerms,
					acceptedPrivacyPolicy: input.acceptedPrivacyPolicy,
					marketingOptIn:
						input.marketingOptIn ?? existingConsent.marketingOptIn,
					ipAddress: input.ipAddress || existingConsent.ipAddress,
					userAgent: input.userAgent || existingConsent.userAgent,
					consentScopes: input.consentScopes
						? JSON.stringify(input.consentScopes)
						: existingConsent.consentScopes,
					consentedAt: new Date(),
					userId: userId || existingConsent.userId,
				},
			});
		}

		// Create Stripe customer for the visitor if Stripe is configured
		let stripeCustomerId: string | undefined;
		if (this.stripe) {
			try {
				const customer = await this.stripe.customers.create({
					email: input.email.toLowerCase(),
					name: input.name || undefined,
					metadata: {
						source: "web_visitor_consent",
						marketingOptIn: String(input.marketingOptIn || false),
						consentScopes: input.consentScopes?.join(",") || "donations",
					},
				});
				stripeCustomerId = customer.id;
			} catch (error) {
				this.logger.error(`Failed to create Stripe customer: ${error.message}`);
			}
		}

		// Create new consent record
		return this.prisma.paymentConsent.create({
			data: {
				email: input.email.toLowerCase(),
				name: input.name,
				stripeCustomerId,
				acceptedTerms: input.acceptedTerms,
				acceptedPrivacyPolicy: input.acceptedPrivacyPolicy,
				marketingOptIn: input.marketingOptIn || false,
				ipAddress: input.ipAddress,
				userAgent: input.userAgent,
				consentScopes: input.consentScopes
					? JSON.stringify(input.consentScopes)
					: JSON.stringify(["donations"]),
				isActive: true,
				consentedAt: new Date(),
				userId,
			},
		});
	}

	/**
	 * Verify consent before processing payment
	 */
	async verifyConsent(email: string, paymentType: string) {
		const consent = await this.prisma.paymentConsent.findFirst({
			where: {
				email: email.toLowerCase(),
				isActive: true,
			},
		});

		if (!consent) {
			return {
				isValid: false,
				message: "No active payment consent found. Please accept terms first.",
			};
		}

		// Check if consent covers this payment type
		const scopes = consent.consentScopes
			? JSON.parse(consent.consentScopes)
			: ["donations"];

		const typeMapping: Record<string, string[]> = {
			donation: ["donations", "all"],
			payment: ["payments", "one-time-payments", "all"],
			subscription: ["subscriptions", "recurring", "all"],
		};

		const allowedScopes = typeMapping[paymentType] || [paymentType];
		const hasScope = scopes.some((scope: string) =>
			allowedScopes.includes(scope),
		);

		if (!hasScope) {
			return {
				isValid: false,
				consent,
				message: `Consent does not cover ${paymentType} payments. Please update consent.`,
			};
		}

		return {
			isValid: true,
			consent,
		};
	}

	/**
	 * Revoke payment consent
	 */
	async revokeConsent(email: string) {
		const consent = await this.prisma.paymentConsent.findFirst({
			where: {
				email: email.toLowerCase(),
				isActive: true,
			},
		});

		if (!consent) {
			throw new NotFoundException("No active consent found for this email");
		}

		return this.prisma.paymentConsent.update({
			where: { id: consent.id },
			data: {
				isActive: false,
				revokedAt: new Date(),
			},
		});
	}

	/**
	 * Get consent status for an email
	 */
	async getConsentStatus(email: string) {
		return this.prisma.paymentConsent.findFirst({
			where: {
				email: email.toLowerCase(),
				isActive: true,
			},
		});
	}

	// ========================
	// VISITOR PAYMENTS (VISA/CARDS)
	// ========================

	/**
	 * Create a payment intent for visitors (donations or one-time payments)
	 * Supports Visa and all major card brands
	 */
	async createVisitorPaymentIntent(input: VisitorPaymentIntentInput) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		// Verify consent first
		const consentVerification = await this.verifyConsent(
			input.email,
			input.paymentType,
		);

		if (!consentVerification.isValid) {
			throw new BadRequestException(consentVerification.message);
		}

		const consent = consentVerification.consent!;

		// Get or use existing Stripe customer
		let stripeCustomerId = consent.stripeCustomerId;

		if (!stripeCustomerId) {
			const customer = await this.stripe.customers.create({
				email: input.email.toLowerCase(),
				name: input.name || consent.name || undefined,
				metadata: {
					source: "web_visitor_payment",
					paymentType: input.paymentType,
					consentId: consent.id,
				},
			});
			stripeCustomerId = customer.id;

			// Update consent with Stripe customer ID
			await this.prisma.paymentConsent.update({
				where: { id: consent.id },
				data: { stripeCustomerId },
			});
		}

		// Create payment intent with support for card payments (Visa, etc.)
		const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
			amount: input.amount,
			currency: input.currency || "usd",
			customer: stripeCustomerId,
			automatic_payment_methods: {
				enabled: true,
				allow_redirects: "always",
			},
			metadata: {
				type: input.paymentType,
				email: input.email,
				name: input.name || "",
				description: input.description || "",
				consentId: consent.id,
				source: "web_visitor",
			},
			description:
				input.description || `${input.paymentType} from ${input.email}`,
		};

		// If saving payment method for future use
		if (input.savePaymentMethod) {
			paymentIntentParams.setup_future_usage = "off_session";
		}

		const paymentIntent =
			await this.stripe.paymentIntents.create(paymentIntentParams);

		// Create pending record based on payment type
		if (input.paymentType === "donation") {
			await this.prisma.donation.create({
				data: {
					email: input.email,
					name: input.name,
					amount: input.amount,
					currency: input.currency || "usd",
					stripePaymentId: paymentIntent.id,
					stripeCustomerId,
					message: input.description,
					isAnonymous: false,
					status: "PENDING",
				},
			});
		}

		// Log the webhook event expectation
		await this.logWebhookEvent({
			stripeEventId: `pending_${paymentIntent.id}`,
			eventType: "payment_intent.created",
			status: "pending",
			payload: {
				paymentIntentId: paymentIntent.id,
				amount: input.amount,
				currency: input.currency,
				paymentType: input.paymentType,
			},
		});

		return {
			sessionId: paymentIntent.id,
			clientSecret: paymentIntent.client_secret!,
			amount: input.amount,
			currency: input.currency || "usd",
			paymentType: input.paymentType,
			consentId: consent.id,
		};
	}

	// ========================
	// VISITOR SUBSCRIPTIONS
	// ========================

	/**
	 * Create a subscription checkout session for visitors
	 */
	async createVisitorSubscriptionSession(input: SetupVisitorSubscriptionInput) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		// Verify consent for subscriptions
		const consentVerification = await this.verifyConsent(
			input.email,
			"subscription",
		);

		if (!consentVerification.isValid) {
			throw new BadRequestException(consentVerification.message);
		}

		const consent = consentVerification.consent!;

		// Get subscription plan
		const plan = await this.prisma.subscriptionPlan.findUnique({
			where: { id: input.planId },
		});

		if (!plan) {
			throw new NotFoundException("Subscription plan not found");
		}

		if (!plan.isActive || !plan.isPublic) {
			throw new BadRequestException("This plan is not available");
		}

		// Get or create Stripe customer
		let stripeCustomerId = consent.stripeCustomerId;

		if (!stripeCustomerId) {
			const customer = await this.stripe.customers.create({
				email: input.email.toLowerCase(),
				name: input.name || consent.name || undefined,
				metadata: {
					source: "web_visitor_subscription",
					planId: input.planId,
					consentId: consent.id,
				},
			});
			stripeCustomerId = customer.id;

			await this.prisma.paymentConsent.update({
				where: { id: consent.id },
				data: { stripeCustomerId },
			});
		}

		// Determine price
		const priceId =
			input.billingCycle === "YEARLY"
				? plan.stripePriceIdYearly
				: plan.stripePriceIdMonthly;

		const amount =
			input.billingCycle === "YEARLY"
				? plan.priceYearly || plan.priceMonthly * 12
				: plan.priceMonthly;

		const successUrl =
			this.configService.get<string>("stripe.successUrl") ||
			`${this.configService.get<string>("app.frontendUrl") || "http://localhost:3000"}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
		const cancelUrl =
			this.configService.get<string>("stripe.cancelUrl") ||
			`${this.configService.get<string>("app.frontendUrl") || "http://localhost:3000"}/pricing`;

		let session: Stripe.Checkout.Session;

		// Apply coupon if provided
		const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
		if (input.couponCode) {
			try {
				// Verify coupon exists
				await this.stripe.coupons.retrieve(input.couponCode);
				discounts.push({ coupon: input.couponCode });
			} catch {
				throw new BadRequestException("Invalid coupon code");
			}
		}

		if (priceId) {
			// Use existing Stripe price
			session = await this.stripe.checkout.sessions.create({
				customer: stripeCustomerId,
				mode: "subscription",
				line_items: [{ price: priceId, quantity: 1 }],
				success_url: successUrl,
				cancel_url: cancelUrl,
				discounts: discounts.length > 0 ? discounts : undefined,
				metadata: {
					planId: plan.id,
					billingCycle: input.billingCycle,
					consentId: consent.id,
					visitorEmail: input.email,
				},
				subscription_data: {
					metadata: {
						planId: plan.id,
						billingCycle: input.billingCycle,
						consentId: consent.id,
						visitorEmail: input.email,
					},
				},
				// Allow all payment methods including Visa
				payment_method_types: ["card"],
				allow_promotion_codes: !input.couponCode,
			});
		} else {
			// Create ad-hoc price
			session = await this.stripe.checkout.sessions.create({
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
				discounts: discounts.length > 0 ? discounts : undefined,
				metadata: {
					planId: plan.id,
					billingCycle: input.billingCycle,
					consentId: consent.id,
					visitorEmail: input.email,
				},
				subscription_data: {
					metadata: {
						planId: plan.id,
						billingCycle: input.billingCycle,
						consentId: consent.id,
						visitorEmail: input.email,
					},
				},
				payment_method_types: ["card"],
				allow_promotion_codes: !input.couponCode,
			});
		}

		return {
			sessionId: session.id,
			url: session.url,
			planName: plan.name,
			amount,
			billingCycle: input.billingCycle,
			consentId: consent.id,
		};
	}

	// ========================
	// WEBHOOK EVENT LOGGING
	// ========================

	/**
	 * Log webhook events for audit trail
	 */
	async logWebhookEvent(data: {
		stripeEventId: string;
		eventType: string;
		status: string;
		payload?: any;
		errorMessage?: string;
	}) {
		return this.prisma.webhookEventLog.create({
			data: {
				stripeEventId: data.stripeEventId,
				eventType: data.eventType,
				status: data.status,
				payload: data.payload ? JSON.stringify(data.payload) : null,
				errorMessage: data.errorMessage,
				processedAt: new Date(),
			},
		});
	}

	/**
	 * Check if webhook event was already processed (idempotency)
	 */
	async isEventProcessed(stripeEventId: string): Promise<boolean> {
		const existing = await this.prisma.webhookEventLog.findFirst({
			where: {
				stripeEventId,
				status: "processed",
			},
		});
		return !!existing;
	}

	// ========================
	// PAYMENT METHOD MANAGEMENT
	// ========================

	/**
	 * Get saved payment methods for a customer
	 */
	async getCustomerPaymentMethods(email: string) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		const consent = await this.prisma.paymentConsent.findFirst({
			where: {
				email: email.toLowerCase(),
				isActive: true,
			},
		});

		if (!consent?.stripeCustomerId) {
			return [];
		}

		const paymentMethods = await this.stripe.paymentMethods.list({
			customer: consent.stripeCustomerId,
			type: "card",
		});

		// Get default payment method
		const customer = await this.stripe.customers.retrieve(
			consent.stripeCustomerId,
		);
		let defaultPmId: string | null = null;
		if (!("deleted" in customer) || !customer.deleted) {
			const fullCustomer = customer as Stripe.Customer;
			defaultPmId =
				(fullCustomer.invoice_settings?.default_payment_method as string) ||
				null;
		}

		return paymentMethods.data.map((pm) => ({
			id: pm.id,
			type: pm.type,
			brand: pm.card?.brand,
			last4: pm.card?.last4,
			expiryMonth: pm.card?.exp_month,
			expiryYear: pm.card?.exp_year,
			isDefault: pm.id === defaultPmId,
			createdAt: new Date(pm.created * 1000),
		}));
	}

	/**
	 * Detach a payment method from customer
	 */
	async removePaymentMethod(paymentMethodId: string, email: string) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		// Verify the payment method belongs to this customer
		const consent = await this.prisma.paymentConsent.findFirst({
			where: {
				email: email.toLowerCase(),
				isActive: true,
			},
		});

		if (!consent?.stripeCustomerId) {
			throw new BadRequestException("No payment profile found");
		}

		const paymentMethod =
			await this.stripe.paymentMethods.retrieve(paymentMethodId);

		if (paymentMethod.customer !== consent.stripeCustomerId) {
			throw new BadRequestException(
				"Payment method does not belong to this customer",
			);
		}

		await this.stripe.paymentMethods.detach(paymentMethodId);

		return { success: true, message: "Payment method removed" };
	}

	/**
	 * Set default payment method for customer
	 */
	async setDefaultPaymentMethod(paymentMethodId: string, email: string) {
		if (!this.stripe) {
			throw new BadRequestException("Stripe is not configured");
		}

		const consent = await this.prisma.paymentConsent.findFirst({
			where: {
				email: email.toLowerCase(),
				isActive: true,
			},
		});

		if (!consent?.stripeCustomerId) {
			throw new BadRequestException("No payment profile found");
		}

		await this.stripe.customers.update(consent.stripeCustomerId, {
			invoice_settings: {
				default_payment_method: paymentMethodId,
			},
		});

		return { success: true, message: "Default payment method updated" };
	}
}
