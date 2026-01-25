import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GraphQLJSON } from "graphql-type-json";
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
import { UserRole } from "../common/types";

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

	// ========================
	// TUITION & FEE MANAGEMENT (Spec 3A.1, 2A.1)
	// ========================

	@Query(() => GraphQLJSON, {
		description: "Get student tuition balance",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.STUDENT)
	async tuitionBalance(@CurrentUser() user: any) {
		return this.paymentsService.getTuitionBalance(user.id);
	}

	@Query(() => GraphQLJSON, {
		description: "Get payment history",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.STUDENT)
	async paymentHistory(
		@CurrentUser() user: any,
		@Args("limit", { type: () => Int, nullable: true }) limit?: number,
	) {
		return this.paymentsService.getPaymentHistory(user.id, limit);
	}

	@Mutation(() => GraphQLJSON, {
		description: "Pay tuition or fees",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.STUDENT, UserRole.PARENT)
	async payTuition(
		@CurrentUser() user: any,
		@Args("amount", { type: () => Int }) amount: number,
		@Args("studentId", { type: () => ID, nullable: true }) studentId?: string,
		@Args("paymentMethod", { nullable: true }) paymentMethod?: string,
	) {
		return this.paymentsService.payTuition(
			user.id,
			amount,
			studentId,
			paymentMethod,
		);
	}

	@Query(() => GraphQLJSON, {
		description: "Get invoice details",
	})
	@UseGuards(GqlAuthGuard)
	async invoice(
		@Args("invoiceId", { type: () => ID }) invoiceId: string,
		@CurrentUser() user: any,
	) {
		return this.paymentsService.getInvoice(invoiceId, user.id);
	}

	@Query(() => GraphQLJSON, {
		description: "Get all invoices for student",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.STUDENT)
	async myInvoices(@CurrentUser() user: any) {
		return this.paymentsService.getStudentInvoices(user.id);
	}

	// ========================
	// FINANCIAL AID (Spec 2A.3)
	// ========================

	@Query(() => GraphQLJSON, {
		description: "Get available financial aid programs",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.STUDENT)
	async financialAidPrograms() {
		return this.paymentsService.getFinancialAidPrograms();
	}

	@Mutation(() => GraphQLJSON, {
		description: "Apply for financial aid",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.STUDENT)
	async applyForFinancialAid(
		@CurrentUser() user: any,
		@Args("programId", { type: () => ID }) programId: string,
		@Args("applicationData", { type: () => GraphQLJSON }) applicationData: any,
	) {
		return this.paymentsService.applyForFinancialAid(
			user.id,
			programId,
			applicationData,
		);
	}

	@Query(() => GraphQLJSON, {
		description: "Get financial aid application status",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.STUDENT)
	async financialAidStatus(@CurrentUser() user: any) {
		return this.paymentsService.getFinancialAidStatus(user.id);
	}

	// ========================
	// ADMIN PAYMENT MANAGEMENT (Spec 3A.3)
	// ========================

	@Query(() => GraphQLJSON, {
		description: "Get payment reconciliation report",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async paymentReconciliation(
		@Args("startDate", { nullable: true }) startDate?: string,
		@Args("endDate", { nullable: true }) endDate?: string,
	) {
		return this.paymentsService.getPaymentReconciliation(
			startDate ? new Date(startDate) : undefined,
			endDate ? new Date(endDate) : undefined,
		);
	}

	@Query(() => GraphQLJSON, {
		description: "Get financial summary for admin",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async financialSummary() {
		return this.paymentsService.getFinancialSummary();
	}

	@Mutation(() => GraphQLJSON, {
		description: "Process refund",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async processRefund(
		@Args("paymentId", { type: () => ID }) paymentId: string,
		@Args("amount", { type: () => Int }) amount: number,
		@Args("reason") reason: string,
		@CurrentUser() user: any,
	) {
		return this.paymentsService.processRefund(
			paymentId,
			amount,
			reason,
			user.id,
		);
	}
}
