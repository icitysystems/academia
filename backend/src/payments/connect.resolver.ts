import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { StripeConnectService } from "./stripe-connect.service";
import {
	ConnectAccount,
	ConnectAccountOnboardingLink,
	ConnectPaymentIntent,
	ConnectSubscriptionSession,
	ConnectBalance,
	ConnectPayout,
	ConnectTransfer,
} from "./models/connect.model";
import {
	CreateConnectedAccountInput,
	CreateConnectPaymentInput,
	CreateConnectSubscriptionInput,
} from "./dto/connect.input";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Resolver()
export class ConnectResolver {
	constructor(private connectService: StripeConnectService) {}

	// ========================
	// CONNECTED ACCOUNT MANAGEMENT
	// ========================

	/**
	 * Create a Stripe Connect account (for instructors/organizations)
	 */
	@Mutation(() => ConnectAccount)
	@UseGuards(GqlAuthGuard)
	async createConnectedAccount(
		@Args("input") input: CreateConnectedAccountInput,
		@CurrentUser() user: any,
	): Promise<ConnectAccount> {
		// Use authenticated user's email if not provided
		if (!input.email && user.email) {
			input.email = user.email;
		}

		const account = await this.connectService.createConnectedAccount({
			...input,
			userId: user.id,
		});

		return this.mapConnectAccount(account);
	}

	/**
	 * Get onboarding link for Express account setup
	 */
	@Mutation(() => ConnectAccountOnboardingLink)
	@UseGuards(GqlAuthGuard)
	async getConnectOnboardingLink(
		@Args("accountId") accountId: string,
		@Args("refreshUrl", { nullable: true }) refreshUrl?: string,
		@Args("returnUrl", { nullable: true }) returnUrl?: string,
	): Promise<ConnectAccountOnboardingLink> {
		return this.connectService.createAccountOnboardingLink({
			accountId,
			refreshUrl,
			returnUrl,
		});
	}

	/**
	 * Get Express dashboard login link
	 */
	@Mutation(() => ConnectAccountOnboardingLink)
	@UseGuards(GqlAuthGuard)
	async getConnectDashboardLink(
		@Args("accountId") accountId: string,
	): Promise<ConnectAccountOnboardingLink> {
		const result =
			await this.connectService.createDashboardLoginLink(accountId);
		return {
			url: result.url,
			expiresAt: null,
		};
	}

	/**
	 * Get Connect account details
	 */
	@Query(() => ConnectAccount, { nullable: true })
	@UseGuards(GqlAuthGuard)
	async getConnectAccount(
		@Args("accountId", { nullable: true }) accountId?: string,
		@Args("email", { nullable: true }) email?: string,
		@CurrentUser() user?: any,
	): Promise<ConnectAccount | null> {
		if (accountId) {
			const account = await this.connectService.getConnectAccount(accountId);
			return account ? this.mapStripeAccount(account) : null;
		}

		if (email) {
			const account = await this.connectService.getConnectAccountByEmail(email);
			return account ? this.mapConnectAccount(account) : null;
		}

		if (user?.email) {
			const account = await this.connectService.getConnectAccountByEmail(
				user.email,
			);
			return account ? this.mapConnectAccount(account) : null;
		}

		return null;
	}

	// ========================
	// CONNECT PAYMENTS
	// ========================

	/**
	 * Create a payment to a connected account
	 * Supports Visa and all major card brands
	 */
	@Mutation(() => ConnectPaymentIntent)
	async createConnectPayment(
		@Args("input") input: CreateConnectPaymentInput,
	): Promise<ConnectPaymentIntent> {
		return this.connectService.createConnectPaymentIntent(input);
	}

	/**
	 * Create a donation to a connected account (convenience method)
	 */
	@Mutation(() => ConnectPaymentIntent)
	async createConnectDonation(
		@Args("email") email: string,
		@Args("amount") amount: number,
		@Args("connectedAccountId") connectedAccountId: string,
		@Args("name", { nullable: true }) name?: string,
		@Args("message", { nullable: true }) message?: string,
		@Args("currency", { defaultValue: "usd" }) currency?: string,
		@Args("applicationFeePercent", { defaultValue: 10 })
		applicationFeePercent?: number,
	): Promise<ConnectPaymentIntent> {
		const applicationFeeAmount = Math.round(
			amount * (applicationFeePercent / 100),
		);
		return this.connectService.createConnectPaymentIntent({
			email,
			amount,
			name,
			description: message,
			connectedAccountId,
			currency,
			applicationFeeAmount,
			paymentType: "donation",
		});
	}

	/**
	 * Create a direct charge to connected account
	 */
	@Mutation(() => ConnectPaymentIntent)
	async createDirectCharge(
		@Args("input") input: CreateConnectPaymentInput,
	): Promise<ConnectPaymentIntent> {
		return this.connectService.createDirectCharge(input);
	}

	// ========================
	// CONNECT SUBSCRIPTIONS
	// ========================

	/**
	 * Create a subscription with revenue share to connected account
	 */
	@Mutation(() => ConnectSubscriptionSession)
	async createConnectSubscription(
		@Args("input") input: CreateConnectSubscriptionInput,
	): Promise<ConnectSubscriptionSession> {
		return this.connectService.createConnectSubscription(input);
	}

	// ========================
	// TRANSFERS & PAYOUTS
	// ========================

	/**
	 * Create a manual transfer to connected account
	 */
	@Mutation(() => ConnectTransfer)
	@UseGuards(GqlAuthGuard)
	async createTransfer(
		@Args("amount") amount: number,
		@Args("connectedAccountId") connectedAccountId: string,
		@Args("currency", { defaultValue: "usd" }) currency?: string,
		@Args("description", { nullable: true }) description?: string,
	): Promise<ConnectTransfer> {
		return this.connectService.createTransfer({
			amount,
			connectedAccountId,
			currency,
			description,
		});
	}

	/**
	 * Get balance for connected account
	 */
	@Query(() => ConnectBalance)
	@UseGuards(GqlAuthGuard)
	async getConnectAccountBalance(
		@Args("accountId") accountId: string,
	): Promise<ConnectBalance> {
		return this.connectService.getConnectAccountBalance(accountId);
	}

	/**
	 * List payouts for connected account
	 */
	@Query(() => [ConnectPayout])
	@UseGuards(GqlAuthGuard)
	async listConnectPayouts(
		@Args("accountId") accountId: string,
		@Args("limit", { defaultValue: 10 }) limit?: number,
	): Promise<ConnectPayout[]> {
		return this.connectService.listPayouts(accountId, limit);
	}

	// ========================
	// HELPERS
	// ========================

	private mapConnectAccount(account: any): ConnectAccount {
		return {
			id: account.id,
			stripeAccountId: account.stripeAccountId,
			email: account.email,
			accountType: account.accountType,
			country: account.country,
			businessType: account.businessType,
			chargesEnabled: account.chargesEnabled,
			payoutsEnabled: account.payoutsEnabled,
			detailsSubmitted: account.detailsSubmitted,
			status: account.status,
			userId: account.userId,
			createdAt: account.createdAt,
			updatedAt: account.updatedAt,
		};
	}

	private mapStripeAccount(account: any): ConnectAccount {
		return {
			id: account.id,
			stripeAccountId: account.id,
			email: account.email,
			accountType: account.type || "express",
			country: account.country,
			businessType: account.business_type || "individual",
			chargesEnabled: account.chargesEnabled,
			payoutsEnabled: account.payoutsEnabled,
			detailsSubmitted: account.detailsSubmitted,
			status: account.chargesEnabled ? "ACTIVE" : "PENDING",
			userId: null,
			createdAt: null,
			updatedAt: null,
		};
	}
}
