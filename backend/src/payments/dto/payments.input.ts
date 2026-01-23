import { InputType, Field, Int } from "@nestjs/graphql";
import {
	IsEmail,
	IsOptional,
	IsString,
	IsNumber,
	IsBoolean,
	Min,
	MaxLength,
} from "class-validator";

@InputType()
export class CreateDonationInput {
	@Field()
	@IsEmail()
	email: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	name?: string;

	@Field(() => Int)
	@IsNumber()
	@Min(100) // Minimum $1.00 (100 cents)
	amount: number;

	@Field({ defaultValue: "usd" })
	@IsString()
	currency: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	message?: string;

	@Field({ defaultValue: false })
	@IsBoolean()
	isAnonymous: boolean;
}

@InputType()
export class CreateSubscriptionInput {
	@Field()
	@IsString()
	planId: string;

	@Field({ defaultValue: "MONTHLY" })
	@IsString()
	billingCycle: string; // MONTHLY or YEARLY
}

@InputType()
export class CancelSubscriptionInput {
	@Field()
	@IsString()
	subscriptionId: string;

	@Field({ defaultValue: true })
	@IsBoolean()
	cancelAtPeriodEnd: boolean;
}

@InputType()
export class CreateSubscriptionPlanInput {
	@Field()
	@IsString()
	@MaxLength(50)
	name: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	description?: string;

	@Field(() => Int, { defaultValue: 0 })
	@IsNumber()
	@Min(0)
	tier: number; // 0=Free, 1=Basic, 2=Pro, 3=Enterprise

	@Field(() => Int)
	@IsNumber()
	@Min(0)
	priceMonthly: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	priceYearly?: number;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	stripeProductId?: string;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	features?: string[];

	// Usage Limits
	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	maxTemplates?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	maxSheetsPerMonth?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	maxModelsPerTemplate?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	maxStorageMB?: number;

	// Feature Flags
	@Field({ defaultValue: false })
	@IsBoolean()
	hasAdvancedAnalytics: boolean;

	@Field({ defaultValue: false })
	@IsBoolean()
	hasAPIAccess: boolean;

	@Field({ defaultValue: false })
	@IsBoolean()
	hasPrioritySupport: boolean;

	@Field({ defaultValue: false })
	@IsBoolean()
	hasCustomBranding: boolean;

	@Field({ defaultValue: false })
	@IsBoolean()
	hasTeamFeatures: boolean;

	// Offers
	@Field(() => Int, { defaultValue: 0 })
	@IsNumber()
	@Min(0)
	discountPercentYearly: number;

	@Field(() => Int, { defaultValue: 0 })
	@IsNumber()
	@Min(0)
	trialDays: number;

	@Field(() => Int, { defaultValue: 0 })
	@IsNumber()
	priority: number;

	@Field({ defaultValue: true })
	@IsBoolean()
	isPublic: boolean;
}

@InputType()
export class UpdateSubscriptionPlanInput {
	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(50)
	name?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	description?: string;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	tier?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	priceMonthly?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	priceYearly?: number;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	stripeProductId?: string;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	features?: string[];

	// Usage Limits
	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	maxTemplates?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	maxSheetsPerMonth?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	maxModelsPerTemplate?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	maxStorageMB?: number;

	// Feature Flags
	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	hasAdvancedAnalytics?: boolean;

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	hasAPIAccess?: boolean;

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	hasPrioritySupport?: boolean;

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	hasCustomBranding?: boolean;

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	hasTeamFeatures?: boolean;

	// Offers
	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	discountPercentYearly?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	trialDays?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	priority?: number;

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	isPublic?: boolean;
}
