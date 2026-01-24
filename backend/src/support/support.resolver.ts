import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql"
import { GraphQLJSON } from 'graphql-type-json';
import { UseGuards } from "@nestjs/common";
import { SupportService } from "./support.service";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/types";

/**
 * Support Resolver
 * Implements support ticket endpoints as per Specification Section 2A.4
 */
@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class SupportResolver {
	constructor(private supportService: SupportService) {}

	// ============================
	// Ticket Creation (All Users)
	// ============================

	@Mutation(() => GraphQLJSON, { name: "createSupportTicket" })
	async createTicket(
		@Args("title") title: string,
		@Args("description") description: string,
		@Args("category", { nullable: true }) category: string,
		@Args("priority", { nullable: true }) priority: string,
		@CurrentUser() user: any,
	) {
		return this.supportService.createTicket(
			{ title, description, category, priority },
			user.sub,
		);
	}

	// ============================
	// Ticket Viewing
	// ============================

	@Query(() => GraphQLJSON, { name: "supportTicket" })
	async getTicket(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.supportService.getTicket(id, user.sub);
	}

	@Query(() => [GraphQLJSON], { name: "myTickets" })
	async getMyTickets(
		@CurrentUser() user: any,
		@Args("status", { nullable: true }) status?: string,
	) {
		return this.supportService.getUserTickets(user.sub, status);
	}

	@Query(() => GraphQLJSON, { name: "allTickets" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async getAllTickets(
		@CurrentUser() user: any,
		@Args("status", { nullable: true }) status?: string,
		@Args("category", { nullable: true }) category?: string,
		@Args("priority", { nullable: true }) priority?: string,
		@Args("assigneeId", { type: () => ID, nullable: true }) assigneeId?: string,
		@Args("skip", { type: () => Int, nullable: true }) skip?: number,
		@Args("take", { type: () => Int, nullable: true }) take?: number,
	) {
		return this.supportService.getAllTickets(user.sub, {
			status,
			category,
			priority,
			assigneeId,
			skip,
			take,
		});
	}

	// ============================
	// Ticket Management (Support Staff)
	// ============================

	@Mutation(() => GraphQLJSON, { name: "assignTicket" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async assignTicket(
		@Args("ticketId", { type: () => ID }) ticketId: string,
		@Args("assigneeId", { type: () => ID }) assigneeId: string,
		@CurrentUser() user: any,
	) {
		return this.supportService.assignTicket(ticketId, assigneeId, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "updateTicketStatus" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async updateTicketStatus(
		@Args("ticketId", { type: () => ID }) ticketId: string,
		@Args("status") status: string,
		@CurrentUser() user: any,
	) {
		return this.supportService.updateTicketStatus(ticketId, status, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "resolveTicket" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async resolveTicket(
		@Args("ticketId", { type: () => ID }) ticketId: string,
		@Args("resolution") resolution: string,
		@CurrentUser() user: any,
	) {
		return this.supportService.resolveTicket(ticketId, resolution, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "closeTicket" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async closeTicket(
		@Args("ticketId", { type: () => ID }) ticketId: string,
		@CurrentUser() user: any,
	) {
		return this.supportService.closeTicket(ticketId, user.sub);
	}

	// ============================
	// Comments
	// ============================

	@Mutation(() => GraphQLJSON, { name: "addTicketComment" })
	async addComment(
		@Args("ticketId", { type: () => ID }) ticketId: string,
		@Args("content") content: string,
		@Args("isInternal", { nullable: true, defaultValue: false })
		isInternal: boolean,
		@CurrentUser() user: any,
	) {
		return this.supportService.addComment(
			ticketId,
			content,
			isInternal,
			user.sub,
		);
	}

	// ============================
	// Dashboard & Monitoring
	// ============================

	@Query(() => GraphQLJSON, { name: "supportDashboardStats" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async getDashboardStats(@CurrentUser() user: any) {
		return this.supportService.getDashboardStats(user.sub);
	}

	@Query(() => GraphQLJSON, { name: "systemHealth" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async getSystemHealth(@CurrentUser() user: any) {
		return this.supportService.getSystemHealth(user.sub);
	}

	// ============================
	// System Monitoring (Spec 2A.4)
	// ============================

	/**
	 * Get server status and metrics
	 * As per Spec 2A.4: "Maintain servers, databases, and security protocols"
	 */
	@Query(() => GraphQLJSON, { name: "serverStatus" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async getServerStatus(@CurrentUser() user: any) {
		return this.supportService.getServerStatus(user.sub);
	}

	/**
	 * Get error logs
	 * As per Spec 2A.4: "Troubleshoot login, access, or system errors"
	 */
	@Query(() => GraphQLJSON, { name: "errorLogs" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async getErrorLogs(
		@CurrentUser() user: any,
		@Args("action", { nullable: true }) action?: string,
		@Args("startDate", { nullable: true }) startDate?: string,
		@Args("endDate", { nullable: true }) endDate?: string,
		@Args("limit", { type: () => Int, nullable: true }) limit?: number,
	) {
		return this.supportService.getErrorLogs(user.sub, {
			action,
			startDate: startDate ? new Date(startDate) : undefined,
			endDate: endDate ? new Date(endDate) : undefined,
			limit,
		});
	}

	/**
	 * Get security alerts
	 * As per Spec 2A.4: "Monitor system performance and uptime"
	 */
	@Query(() => GraphQLJSON, { name: "securityAlerts" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async getSecurityAlerts(@CurrentUser() user: any) {
		return this.supportService.getSecurityAlerts(user.sub);
	}

	/**
	 * Database health check
	 */
	@Query(() => GraphQLJSON, { name: "databaseHealth" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async getDatabaseHealth(@CurrentUser() user: any) {
		return this.supportService.getDatabaseHealth(user.sub);
	}

	/**
	 * Trigger system maintenance task
	 * As per Spec 2A.4: "Manage updates and system upgrades"
	 */
	@Mutation(() => GraphQLJSON, { name: "triggerMaintenance" })
	@Roles(UserRole.ADMIN)
	async triggerMaintenance(
		@CurrentUser() user: any,
		@Args("taskType") taskType: string,
		@Args("options", { nullable: true }) options?: string,
	) {
		return this.supportService.triggerMaintenance(user.sub, taskType, options);
	}
}


