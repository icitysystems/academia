import { InputType, Field, Int } from "@nestjs/graphql";
import {
	IsEmail,
	IsOptional,
	IsString,
	IsNumber,
	Min,
	IsIn,
} from "class-validator";

@InputType()
export class CreateConnectedAccountInput {
	@Field()
	@IsEmail()
	email: string;

	@Field({ nullable: true, defaultValue: "express" })
	@IsOptional()
	@IsIn(["express", "standard", "custom"])
	type?: "express" | "standard" | "custom";

	@Field({ nullable: true, defaultValue: "US" })
	@IsOptional()
	@IsString()
	country?: string;

	@Field({ nullable: true, defaultValue: "individual" })
	@IsOptional()
	@IsIn(["individual", "company", "non_profit"])
	businessType?: "individual" | "company" | "non_profit";

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	userId?: string;
}

@InputType()
export class CreateConnectPaymentInput {
	@Field()
	@IsEmail()
	email: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	name?: string;

	@Field(() => Int)
	@IsNumber()
	@Min(50) // Minimum 50 cents
	amount: number;

	@Field({ nullable: true, defaultValue: "usd" })
	@IsOptional()
	@IsString()
	currency?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	description?: string;

	@Field()
	@IsString()
	connectedAccountId: string;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	applicationFeeAmount?: number;

	@Field({ defaultValue: "payment" })
	@IsIn(["donation", "payment", "subscription"])
	paymentType: "donation" | "payment" | "subscription";

	@Field({ nullable: true, defaultValue: false })
	@IsOptional()
	savePaymentMethod?: boolean;
}

@InputType()
export class CreateConnectSubscriptionInput {
	@Field()
	@IsEmail()
	email: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	name?: string;

	@Field()
	@IsString()
	planId: string;

	@Field()
	@IsString()
	connectedAccountId: string;

	@Field({ defaultValue: "MONTHLY" })
	@IsIn(["MONTHLY", "YEARLY"])
	billingCycle: "MONTHLY" | "YEARLY";

	@Field(() => Int, { nullable: true, defaultValue: 10 })
	@IsOptional()
	@IsNumber()
	@Min(0)
	applicationFeePercent?: number;
}

@InputType()
export class ConnectAccountOnboardingInput {
	@Field()
	@IsString()
	accountId: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	refreshUrl?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	returnUrl?: string;
}

@InputType()
export class CreateTransferInput {
	@Field(() => Int)
	@IsNumber()
	@Min(1)
	amount: number;

	@Field({ nullable: true, defaultValue: "usd" })
	@IsOptional()
	@IsString()
	currency?: string;

	@Field()
	@IsString()
	connectedAccountId: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	description?: string;
}
