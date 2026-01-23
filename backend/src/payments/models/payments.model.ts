import { ObjectType, Field, ID, Int, Float } from "@nestjs/graphql";
import GraphQLJSON from "graphql-type-json";

@ObjectType()
export class Donation {
	@Field(() => ID)
	id: string;

	@Field()
	email: string;

	@Field({ nullable: true })
	name?: string;

	@Field(() => Int)
	amount: number; // In cents

	@Field()
	currency: string;

	@Field({ nullable: true })
	stripePaymentId?: string;

	@Field()
	status: string;

	@Field({ nullable: true })
	message?: string;

	@Field()
	isAnonymous: boolean;

	@Field({ nullable: true })
	userId?: string;

	@Field()
	createdAt: Date;

	@Field({ nullable: true })
	completedAt?: Date;
}

@ObjectType()
export class SubscriptionPlan {
	@Field(() => ID)
	id: string;

	@Field()
	name: string;

	@Field({ nullable: true })
	description?: string;

	@Field(() => Int)
	tier: number; // 0=Free, 1=Basic, 2=Pro, 3=Enterprise

	@Field(() => Int)
	priceMonthly: number; // In cents

	@Field(() => Int, { nullable: true })
	priceYearly?: number; // In cents

	@Field({ nullable: true })
	stripeProductId?: string;

	@Field(() => GraphQLJSON, { nullable: true })
	features?: any; // JSON array of feature strings

	// Usage Limits
	@Field(() => Int, { nullable: true })
	maxTemplates?: number;

	@Field(() => Int, { nullable: true })
	maxSheetsPerMonth?: number;

	@Field(() => Int, { nullable: true })
	maxModelsPerTemplate?: number;

	@Field(() => Int, { nullable: true })
	maxStorageMB?: number;

	// Feature Flags
	@Field()
	hasAdvancedAnalytics: boolean;

	@Field()
	hasAPIAccess: boolean;

	@Field()
	hasPrioritySupport: boolean;

	@Field()
	hasCustomBranding: boolean;

	@Field()
	hasTeamFeatures: boolean;

	// Offers
	@Field(() => Int)
	discountPercentYearly: number;

	@Field(() => Int)
	trialDays: number;

	@Field(() => Int)
	priority: number;

	@Field()
	isActive: boolean;

	@Field()
	isPublic: boolean;
}

@ObjectType()
export class Subscription {
	@Field(() => ID)
	id: string;

	@Field()
	userId: string;

	@Field()
	planId: string;

	@Field(() => SubscriptionPlan)
	plan: SubscriptionPlan;

	@Field({ nullable: true })
	stripeSubscriptionId?: string;

	@Field()
	status: string;

	@Field()
	billingCycle: string;

	@Field({ nullable: true })
	currentPeriodStart?: Date;

	@Field({ nullable: true })
	currentPeriodEnd?: Date;

	@Field()
	cancelAtPeriodEnd: boolean;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@ObjectType()
export class UserEntitlements {
	@Field()
	planName: string;

	@Field(() => Int)
	tier: number;

	@Field(() => Int, { nullable: true })
	maxTemplates?: number;

	@Field(() => Int, { nullable: true })
	maxSheetsPerMonth?: number;

	@Field(() => Int, { nullable: true })
	maxModelsPerTemplate?: number;

	@Field(() => Int, { nullable: true })
	maxStorageMB?: number;

	@Field()
	hasAdvancedAnalytics: boolean;

	@Field()
	hasAPIAccess: boolean;

	@Field()
	hasPrioritySupport: boolean;

	@Field()
	hasCustomBranding: boolean;

	@Field()
	hasTeamFeatures: boolean;

	@Field({ nullable: true })
	currentPeriodEnd?: Date;

	@Field()
	isTrialing: boolean;
}

@ObjectType()
export class PaymentIntent {
	@Field()
	clientSecret: string;

	@Field()
	paymentIntentId: string;

	@Field(() => Int)
	amount: number;

	@Field()
	currency: string;
}

@ObjectType()
export class CheckoutSession {
	@Field()
	sessionId: string;

	@Field()
	url: string;
}

@ObjectType()
export class DonationStats {
	@Field(() => Int)
	totalDonations: number;

	@Field(() => Float)
	totalAmount: number;

	@Field(() => Int)
	donationsThisMonth: number;

	@Field(() => Float)
	amountThisMonth: number;
}

@ObjectType()
export class PlanRevenueBreakdown {
	@Field()
	planName: string;

	@Field(() => Int)
	count: number;
}

@ObjectType()
export class SubscriptionStats {
	@Field(() => Int)
	totalSubscriptions: number;

	@Field(() => Int)
	activeSubscriptions: number;

	@Field(() => Int)
	trialingSubscriptions: number;

	@Field(() => Int)
	canceledSubscriptions: number;

	@Field(() => Float)
	monthlyRecurringRevenue: number;

	@Field(() => [PlanRevenueBreakdown])
	revenueByPlan: PlanRevenueBreakdown[];
}
