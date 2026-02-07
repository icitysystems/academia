import { Resolver, Query, Mutation, Args, Context } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { StripeConsentService } from "./stripe-consent.service";
import {
	PaymentConsent,
	VisitorPaymentSession,
	VisitorSubscriptionSession,
	PaymentMethodInfo,
	ConsentVerificationResult,
} from "./models/consent.model";
import {
	CreatePaymentConsentInput,
	VisitorPaymentIntentInput,
	SetupVisitorSubscriptionInput,
} from "./dto/consent.input";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Resolver()
export class ConsentResolver {
	constructor(private consentService: StripeConsentService) {}

	// ========================
	// PUBLIC CONSENT ENDPOINTS (Visitors)
	// ========================

	/**
	 * Create payment consent - required before any payment
	 * Captures terms acceptance and creates Stripe customer
	 */
	@Mutation(() => PaymentConsent)
	async createPaymentConsent(
		@Args("input") input: CreatePaymentConsentInput,
		@Context() context: any,
	): Promise<PaymentConsent> {
		// Extract IP and user agent from request context
		const req = context.req;
		if (req) {
			input.ipAddress =
				input.ipAddress || req.ip || req.connection?.remoteAddress;
			input.userAgent = input.userAgent || req.headers?.["user-agent"];
		}

		const consent = await this.consentService.createPaymentConsent(input);
		return this.mapConsentToGraphQL(consent);
	}

	/**
	 * Create payment consent for authenticated users
	 */
	@Mutation(() => PaymentConsent)
	@UseGuards(GqlAuthGuard)
	async createPaymentConsentAuthenticated(
		@Args("input") input: CreatePaymentConsentInput,
		@CurrentUser() user: any,
		@Context() context: any,
	): Promise<PaymentConsent> {
		const req = context.req;
		if (req) {
			input.ipAddress =
				input.ipAddress || req.ip || req.connection?.remoteAddress;
			input.userAgent = input.userAgent || req.headers?.["user-agent"];
		}

		// Use user's email if not provided
		if (!input.email && user.email) {
			input.email = user.email;
		}
		if (!input.name && user.name) {
			input.name = user.name;
		}

		const consent = await this.consentService.createPaymentConsent(
			input,
			user.id,
		);
		return this.mapConsentToGraphQL(consent);
	}

	/**
	 * Check if visitor has valid consent
	 */
	@Query(() => ConsentVerificationResult)
	async verifyPaymentConsent(
		@Args("email") email: string,
		@Args("paymentType", { defaultValue: "donation" }) paymentType: string,
	): Promise<ConsentVerificationResult> {
		const result = await this.consentService.verifyConsent(email, paymentType);
		return {
			isValid: result.isValid,
			consent: result.consent
				? this.mapConsentToGraphQL(result.consent)
				: undefined,
			message: result.message,
		};
	}

	/**
	 * Get consent status by email
	 */
	@Query(() => PaymentConsent, { nullable: true })
	async getPaymentConsent(
		@Args("email") email: string,
	): Promise<PaymentConsent | null> {
		const consent = await this.consentService.getConsentStatus(email);
		return consent ? this.mapConsentToGraphQL(consent) : null;
	}

	/**
	 * Revoke payment consent (GDPR compliance)
	 */
	@Mutation(() => PaymentConsent)
	async revokePaymentConsent(
		@Args("email") email: string,
	): Promise<PaymentConsent> {
		const consent = await this.consentService.revokeConsent(email);
		return this.mapConsentToGraphQL(consent);
	}

	// ========================
	// VISITOR PAYMENT ENDPOINTS
	// ========================

	/**
	 * Create payment intent for visitor donations/payments
	 * Supports Visa and all major card brands
	 */
	@Mutation(() => VisitorPaymentSession)
	async createVisitorPayment(
		@Args("input") input: VisitorPaymentIntentInput,
	): Promise<VisitorPaymentSession> {
		return this.consentService.createVisitorPaymentIntent(input);
	}

	/**
	 * Create visitor donation payment intent (convenience method)
	 */
	@Mutation(() => VisitorPaymentSession)
	async createVisitorDonation(
		@Args("email") email: string,
		@Args("amount") amount: number,
		@Args("name", { nullable: true }) name?: string,
		@Args("message", { nullable: true }) message?: string,
		@Args("currency", { defaultValue: "usd" }) currency?: string,
	): Promise<VisitorPaymentSession> {
		return this.consentService.createVisitorPaymentIntent({
			email,
			amount,
			name,
			description: message,
			currency: currency || "usd",
			paymentType: "donation",
		});
	}

	// ========================
	// VISITOR SUBSCRIPTION ENDPOINTS
	// ========================

	/**
	 * Create subscription checkout session for visitors
	 */
	@Mutation(() => VisitorSubscriptionSession)
	async createVisitorSubscription(
		@Args("input") input: SetupVisitorSubscriptionInput,
	): Promise<VisitorSubscriptionSession> {
		return this.consentService.createVisitorSubscriptionSession(input);
	}

	// ========================
	// PAYMENT METHOD MANAGEMENT
	// ========================

	/**
	 * Get saved payment methods for a customer
	 */
	@Query(() => [PaymentMethodInfo])
	async getPaymentMethods(
		@Args("email") email: string,
	): Promise<PaymentMethodInfo[]> {
		return this.consentService.getCustomerPaymentMethods(email);
	}

	/**
	 * Get payment methods for authenticated user
	 */
	@Query(() => [PaymentMethodInfo])
	@UseGuards(GqlAuthGuard)
	async myPaymentMethods(
		@CurrentUser() user: any,
	): Promise<PaymentMethodInfo[]> {
		return this.consentService.getCustomerPaymentMethods(user.email);
	}

	/**
	 * Remove a saved payment method
	 */
	@Mutation(() => Boolean)
	async removePaymentMethod(
		@Args("paymentMethodId") paymentMethodId: string,
		@Args("email") email: string,
	): Promise<boolean> {
		const result = await this.consentService.removePaymentMethod(
			paymentMethodId,
			email,
		);
		return result.success;
	}

	/**
	 * Set default payment method
	 */
	@Mutation(() => Boolean)
	async setDefaultPaymentMethod(
		@Args("paymentMethodId") paymentMethodId: string,
		@Args("email") email: string,
	): Promise<boolean> {
		const result = await this.consentService.setDefaultPaymentMethod(
			paymentMethodId,
			email,
		);
		return result.success;
	}

	// ========================
	// HELPERS
	// ========================

	private mapConsentToGraphQL(consent: any): PaymentConsent {
		return {
			id: consent.id,
			email: consent.email,
			name: consent.name,
			stripeCustomerId: consent.stripeCustomerId,
			acceptedTerms: consent.acceptedTerms,
			acceptedPrivacyPolicy: consent.acceptedPrivacyPolicy,
			marketingOptIn: consent.marketingOptIn,
			ipAddress: consent.ipAddress,
			userAgent: consent.userAgent,
			consentScopes: consent.consentScopes
				? JSON.parse(consent.consentScopes)
				: [],
			isActive: consent.isActive,
			userId: consent.userId,
			consentedAt: consent.consentedAt,
			revokedAt: consent.revokedAt,
			createdAt: consent.createdAt,
			updatedAt: consent.updatedAt,
		};
	}
}
