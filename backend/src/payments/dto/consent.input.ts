import { InputType, Field, Int } from "@nestjs/graphql";
import {
	IsEmail,
	IsString,
	IsOptional,
	IsBoolean,
	IsNumber,
	Min,
	MaxLength,
	IsIn,
	IsArray,
} from "class-validator";

@InputType()
export class CreatePaymentConsentInput {
	@Field()
	@IsEmail()
	email: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	name?: string;

	@Field()
	@IsBoolean()
	acceptedTerms: boolean;

	@Field()
	@IsBoolean()
	acceptedPrivacyPolicy: boolean;

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	marketingOptIn?: boolean;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	ipAddress?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	userAgent?: string;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	consentScopes?: string[]; // e.g., ['donations', 'subscriptions', 'one-time-payments']
}

@InputType()
export class VisitorPaymentIntentInput {
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
	@Min(50) // Minimum 50 cents
	amount: number;

	@Field({ defaultValue: "usd" })
	@IsString()
	currency: string;

	@Field()
	@IsString()
	@IsIn(["donation", "payment", "subscription"])
	paymentType: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	description?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	consentId?: string; // Reference to stored consent

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	savePaymentMethod?: boolean; // For recurring payments
}

@InputType()
export class SetupVisitorSubscriptionInput {
	@Field()
	@IsEmail()
	email: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	name?: string;

	@Field()
	@IsString()
	planId: string;

	@Field({ defaultValue: "MONTHLY" })
	@IsString()
	@IsIn(["MONTHLY", "YEARLY"])
	billingCycle: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	consentId?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	couponCode?: string;
}

@InputType()
export class UpdatePaymentConsentInput {
	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	marketingOptIn?: boolean;

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
