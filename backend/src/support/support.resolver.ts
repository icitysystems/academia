import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql";
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

	@Mutation(() => Object, { name: "createSupportTicket" })
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

	@Query(() => Object, { name: "supportTicket" })
	async getTicket(
		@Args("id", { type: () => ID }) id: string,
		@CurrentUser() user: any,
	) {
		return this.supportService.getTicket(id, user.sub);
	}

	@Query(() => [Object], { name: "myTickets" })
	async getMyTickets(
		@CurrentUser() user: any,
		@Args("status", { nullable: true }) status?: string,
	) {
		return this.supportService.getUserTickets(user.sub, status);
	}

	@Query(() => Object, { name: "allTickets" })
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

	@Mutation(() => Object, { name: "assignTicket" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async assignTicket(
		@Args("ticketId", { type: () => ID }) ticketId: string,
		@Args("assigneeId", { type: () => ID }) assigneeId: string,
		@CurrentUser() user: any,
	) {
		return this.supportService.assignTicket(ticketId, assigneeId, user.sub);
	}

	@Mutation(() => Object, { name: "updateTicketStatus" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async updateTicketStatus(
		@Args("ticketId", { type: () => ID }) ticketId: string,
		@Args("status") status: string,
		@CurrentUser() user: any,
	) {
		return this.supportService.updateTicketStatus(ticketId, status, user.sub);
	}

	@Mutation(() => Object, { name: "resolveTicket" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async resolveTicket(
		@Args("ticketId", { type: () => ID }) ticketId: string,
		@Args("resolution") resolution: string,
		@CurrentUser() user: any,
	) {
		return this.supportService.resolveTicket(ticketId, resolution, user.sub);
	}

	@Mutation(() => Object, { name: "closeTicket" })
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

	@Mutation(() => Object, { name: "addTicketComment" })
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

	@Query(() => Object, { name: "supportDashboardStats" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async getDashboardStats(@CurrentUser() user: any) {
		return this.supportService.getDashboardStats(user.sub);
	}

	@Query(() => Object, { name: "systemHealth" })
	@Roles(UserRole.SUPPORT_STAFF, UserRole.ADMIN)
	async getSystemHealth(@CurrentUser() user: any) {
		return this.supportService.getSystemHealth(user.sub);
	}
}
