import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import {
	Donation,
	SubscriptionPlan,
	Subscription,
	PaymentIntent,
	CheckoutSession,
	DonationStats,
	UserEntitlements,
	SubscriptionStats,
} from "./models/payments.model";
import {
	CreateDonationInput,
	CreateSubscriptionInput,
	CancelSubscriptionInput,
	CreateSubscriptionPlanInput,
	UpdateSubscriptionPlanInput,
} from "./dto/payments.input";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";

@Resolver()
export class PaymentsResolver {
	constructor(private paymentsService: PaymentsService) {}

	// ========================
	// DONATIONS
	// ========================

	@Mutation(() => PaymentIntent)
	async createDonation(
		@Args("input") input: CreateDonationInput,
	): Promise<PaymentIntent> {
		return this.paymentsService.createDonationPaymentIntent(input);
	}

	@Mutation(() => PaymentIntent)
	@UseGuards(GqlAuthGuard)
	async createDonationAuthenticated(
		@Args("input") input: CreateDonationInput,
		@CurrentUser() user: any,
	): Promise<PaymentIntent> {
		return this.paymentsService.createDonationPaymentIntent(input, user.id);
	}

	@Mutation(() => Donation)
	async confirmDonation(
		@Args("paymentIntentId") paymentIntentId: string,
	): Promise<Donation> {
		return this.paymentsService.confirmDonation(paymentIntentId);
	}

	@Query(() => [Donation])
	async publicDonations(
		@Args("limit", { defaultValue: 10 }) limit: number,
	): Promise<Donation[]> {
		return this.paymentsService.getPublicDonations(limit);
	}

	@Query(() => [Donation])
	@UseGuards(GqlAuthGuard)
	async donations(
		@Args("limit", { defaultValue: 50 }) limit: number,
	): Promise<Donation[]> {
		return this.paymentsService.getDonations(limit);
	}

	@Query(() => DonationStats)
	@UseGuards(GqlAuthGuard)
	async donationStats(): Promise<DonationStats> {
		return this.paymentsService.getDonationStats();
	}

	// ========================
	// SUBSCRIPTION PLANS
	// ========================

	@Query(() => [SubscriptionPlan])
	async subscriptionPlans(
		@Args("includeInactive", { defaultValue: false }) includeInactive: boolean,
	): Promise<SubscriptionPlan[]> {
		return this.paymentsService.getSubscriptionPlans(includeInactive, true);
	}

	@Query(() => [SubscriptionPlan])
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles("ADMIN")
	async allSubscriptionPlans(): Promise<SubscriptionPlan[]> {
		return this.paymentsService.getAllSubscriptionPlans();
	}

	@Query(() => SubscriptionPlan)
	async subscriptionPlan(@Args("id") id: string): Promise<SubscriptionPlan> {
		return this.paymentsService.getSubscriptionPlan(id);
	}

	@Mutation(() => SubscriptionPlan)
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles("ADMIN")
	async createSubscriptionPlan(
		@Args("input") input: CreateSubscriptionPlanInput,
	): Promise<SubscriptionPlan> {
		return this.paymentsService.createSubscriptionPlan(input);
	}

	@Mutation(() => SubscriptionPlan)
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles("ADMIN")
	async updateSubscriptionPlan(
		@Args("id") id: string,
		@Args("input") input: UpdateSubscriptionPlanInput,
	): Promise<SubscriptionPlan> {
		return this.paymentsService.updateSubscriptionPlan(id, input);
	}

	@Mutation(() => SubscriptionPlan)
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles("ADMIN")
	async deleteSubscriptionPlan(
		@Args("id") id: string,
	): Promise<SubscriptionPlan> {
		return this.paymentsService.deleteSubscriptionPlan(id);
	}

	// ========================
	// SUBSCRIPTION STATS (ADMIN)
	// ========================

	@Query(() => SubscriptionStats)
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles("ADMIN")
	async subscriptionStats(): Promise<SubscriptionStats> {
		return this.paymentsService.getSubscriptionStats();
	}

	// ========================
	// USER SUBSCRIPTIONS
	// ========================

	@Mutation(() => CheckoutSession)
	@UseGuards(GqlAuthGuard)
	async createSubscription(
		@Args("input") input: CreateSubscriptionInput,
		@CurrentUser() user: any,
	): Promise<CheckoutSession> {
		return this.paymentsService.createSubscriptionCheckout(user.id, input);
	}

	@Mutation(() => Subscription)
	@UseGuards(GqlAuthGuard)
	async cancelSubscription(
		@Args("input") input: CancelSubscriptionInput,
		@CurrentUser() user: any,
	): Promise<Subscription> {
		return this.paymentsService.cancelSubscription(user.id, input);
	}

	@Query(() => Subscription, { nullable: true })
	@UseGuards(GqlAuthGuard)
	async mySubscription(@CurrentUser() user: any): Promise<Subscription | null> {
		return this.paymentsService.getUserSubscription(user.id);
	}

	@Query(() => [Subscription])
	@UseGuards(GqlAuthGuard)
	async mySubscriptions(@CurrentUser() user: any): Promise<Subscription[]> {
		return this.paymentsService.getUserSubscriptions(user.id);
	}

	@Query(() => UserEntitlements)
	@UseGuards(GqlAuthGuard)
	async myEntitlements(@CurrentUser() user: any): Promise<UserEntitlements> {
		return this.paymentsService.getUserEntitlements(user.id);
	}
}
