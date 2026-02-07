import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import GraphQLJSON from "graphql-type-json";

@ObjectType()
export class PaymentConsent {
	@Field(() => ID)
	id: string;

	@Field()
	email: string;

	@Field({ nullable: true })
	name?: string;

	@Field({ nullable: true })
	stripeCustomerId?: string;

	@Field()
	acceptedTerms: boolean;

	@Field()
	acceptedPrivacyPolicy: boolean;

	@Field()
	marketingOptIn: boolean;

	@Field({ nullable: true })
	ipAddress?: string;

	@Field({ nullable: true })
	userAgent?: string;

	@Field(() => [String], { nullable: true })
	consentScopes?: string[];

	@Field()
	isActive: boolean;

	@Field({ nullable: true })
	userId?: string;

	@Field()
	consentedAt: Date;

	@Field({ nullable: true })
	revokedAt?: Date;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@ObjectType()
export class VisitorPaymentSession {
	@Field(() => ID)
	sessionId: string;

	@Field()
	clientSecret: string;

	@Field(() => Int)
	amount: number;

	@Field()
	currency: string;

	@Field()
	paymentType: string;

	@Field({ nullable: true })
	url?: string; // For redirect-based checkout

	@Field({ nullable: true })
	consentId?: string;
}

@ObjectType()
export class VisitorSubscriptionSession {
	@Field(() => ID)
	sessionId: string;

	@Field({ nullable: true })
	url?: string;

	@Field()
	planName: string;

	@Field(() => Int)
	amount: number;

	@Field()
	billingCycle: string;

	@Field({ nullable: true })
	consentId?: string;
}

@ObjectType()
export class PaymentMethodInfo {
	@Field(() => ID)
	id: string;

	@Field()
	type: string; // 'card', 'bank_account', etc.

	@Field({ nullable: true })
	brand?: string; // 'visa', 'mastercard', etc.

	@Field({ nullable: true })
	last4?: string;

	@Field({ nullable: true })
	expiryMonth?: number;

	@Field({ nullable: true })
	expiryYear?: number;

	@Field()
	isDefault: boolean;

	@Field()
	createdAt: Date;
}

@ObjectType()
export class WebhookEventLog {
	@Field(() => ID)
	id: string;

	@Field()
	stripeEventId: string;

	@Field()
	eventType: string;

	@Field()
	status: string; // 'processed', 'failed', 'pending'

	@Field(() => GraphQLJSON, { nullable: true })
	payload?: any;

	@Field({ nullable: true })
	errorMessage?: string;

	@Field()
	processedAt: Date;
}

@ObjectType()
export class ConsentVerificationResult {
	@Field()
	isValid: boolean;

	@Field({ nullable: true })
	consent?: PaymentConsent;

	@Field({ nullable: true })
	message?: string;
}
