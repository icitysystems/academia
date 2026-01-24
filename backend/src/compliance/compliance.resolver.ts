import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/types";
import { ComplianceService } from "./compliance.service";
import { GraphQLJSON } from "graphql-type-json";

/**
 * Admin Compliance Resolver
 * Implements administrator compliance endpoints as per Specification Section 2A.3
 */
@Resolver()
export class ComplianceResolver {
	constructor(private complianceService: ComplianceService) {}

	// ============================
	// Compliance Reports (2A.3)
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Generate compliance report",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async complianceReport(
		@CurrentUser() user: any,
		@Args("reportType") reportType: string,
	) {
		return this.complianceService.generateComplianceReport(user.id, reportType);
	}

	// ============================
	// Content Moderation (2A.3)
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Get content flagged for moderation",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async contentForModeration(
		@CurrentUser() user: any,
		@Args("contentType", { nullable: true }) contentType?: string,
		@Args("status", { nullable: true }) status?: string,
		@Args("skip", { nullable: true }) skip?: number,
		@Args("take", { nullable: true }) take?: number,
	) {
		return this.complianceService.getContentForModeration(user.id, {
			contentType,
			status,
			skip,
			take,
		});
	}

	@Mutation(() => GraphQLJSON, {
		description: "Moderate flagged content",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async moderateContent(
		@CurrentUser() user: any,
		@Args("contentType") contentType: string,
		@Args("contentId") contentId: string,
		@Args("action") action: string,
		@Args("reason", { nullable: true }) reason?: string,
	) {
		return this.complianceService.moderateContent(user.id, {
			contentType,
			contentId,
			action,
			reason,
		});
	}

	// ============================
	// System Settings (2A.3)
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Get system settings",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async systemSettings(@CurrentUser() user: any) {
		return this.complianceService.getSystemSettings(user.id);
	}

	@Mutation(() => GraphQLJSON, {
		description: "Update system settings",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async updateSystemSettings(
		@CurrentUser() user: any,
		@Args("settings", { type: () => GraphQLJSON })
		settings: Record<string, any>,
	) {
		return this.complianceService.updateSystemSettings(user.id, settings);
	}

	// ============================
	// Dispute Resolution (2A.3)
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Get pending disputes",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async pendingDisputes(@CurrentUser() user: any) {
		return this.complianceService.getPendingDisputes(user.id);
	}

	@Mutation(() => GraphQLJSON, {
		description: "Resolve a dispute",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async resolveDispute(
		@CurrentUser() user: any,
		@Args("disputeId") disputeId: string,
		@Args("resolution") resolution: string,
		@Args("outcome") outcome: string,
	) {
		return this.complianceService.resolveDispute(
			user.id,
			disputeId,
			resolution,
			outcome,
		);
	}

	// ============================
	// Data Management (GDPR/Privacy)
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Export user data for GDPR compliance",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async exportUserData(
		@CurrentUser() user: any,
		@Args("userId") userId: string,
	) {
		return this.complianceService.exportUserData(user.id, userId);
	}

	@Mutation(() => GraphQLJSON, {
		description: "Delete user data (right to be forgotten)",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async deleteUserData(
		@CurrentUser() user: any,
		@Args("userId") userId: string,
		@Args("confirmation") confirmation: string,
	) {
		return this.complianceService.deleteUserData(user.id, userId, confirmation);
	}
}
