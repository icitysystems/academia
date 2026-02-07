import { ObjectType, Field, Int, Float } from "@nestjs/graphql";

@ObjectType()
export class ConnectAccount {
	@Field()
	id: string;

	@Field()
	stripeAccountId: string;

	@Field()
	email: string;

	@Field()
	accountType: string;

	@Field({ nullable: true })
	country?: string;

	@Field({ nullable: true })
	businessType?: string;

	@Field()
	chargesEnabled: boolean;

	@Field()
	payoutsEnabled: boolean;

	@Field()
	detailsSubmitted: boolean;

	@Field()
	status: string;

	@Field({ nullable: true })
	userId?: string;

	@Field({ nullable: true })
	createdAt?: Date;

	@Field({ nullable: true })
	updatedAt?: Date;
}

@ObjectType()
export class ConnectAccountOnboardingLink {
	@Field()
	url: string;

	@Field({ nullable: true })
	expiresAt?: Date;
}

@ObjectType()
export class ConnectPaymentIntent {
	@Field()
	paymentIntentId: string;

	@Field()
	clientSecret: string;

	@Field(() => Int)
	amount: number;

	@Field()
	currency: string;

	@Field(() => Int, { nullable: true })
	applicationFee?: number;

	@Field()
	connectedAccountId: string;
}

@ObjectType()
export class ConnectSubscriptionSession {
	@Field()
	sessionId: string;

	@Field({ nullable: true })
	url?: string;

	@Field()
	planName: string;

	@Field()
	connectedAccountId: string;
}

@ObjectType()
export class ConnectBalanceAmount {
	@Field(() => Int)
	amount: number;

	@Field()
	currency: string;
}

@ObjectType()
export class ConnectBalance {
	@Field(() => [ConnectBalanceAmount])
	available: ConnectBalanceAmount[];

	@Field(() => [ConnectBalanceAmount])
	pending: ConnectBalanceAmount[];
}

@ObjectType()
export class ConnectPayout {
	@Field()
	id: string;

	@Field(() => Int)
	amount: number;

	@Field()
	currency: string;

	@Field()
	status: string;

	@Field()
	arrivalDate: Date;

	@Field()
	createdAt: Date;
}

@ObjectType()
export class ConnectTransfer {
	@Field()
	transferId: string;

	@Field(() => Int)
	amount: number;

	@Field()
	currency: string;

	@Field()
	connectedAccountId: string;
}

@ObjectType()
export class ConnectDashboardLink {
	@Field()
	url: string;
}
