import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import { UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles, AdminOnly } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/types";

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class AnalyticsResolver {
	constructor(private analyticsService: AnalyticsService) {}

	// ========== Learning Resources Stats ==========

	@Query(() => GraphQLJSON, { name: "learningResourceStats" })
	async getLearningResourceStats(@CurrentUser() user: any) {
		return this.analyticsService.getLearningResourceStats(user.sub);
	}

	// ========== Student Analytics ==========

	@Query(() => GraphQLJSON, { name: "studentAnalytics" })
	async getStudentAnalytics(
		@CurrentUser() user: any,
		@Args("studentId", { type: () => ID, nullable: true }) studentId?: string,
		@Args("courseId", { type: () => ID, nullable: true }) courseId?: string,
	) {
		// Students can only view their own analytics, instructors/admins can view any
		const targetId = studentId || user.sub;
		return this.analyticsService.getStudentAnalytics(targetId, courseId);
	}

	// ========== Course Analytics ==========

	@Query(() => GraphQLJSON, { name: "courseAnalytics" })
	@Roles(UserRole.FACULTY, UserRole.ADMIN)
	async getCourseAnalytics(
		@Args("courseId", { type: () => ID }) courseId: string,
		@CurrentUser() user: any,
	) {
		return this.analyticsService.getCourseAnalytics(courseId, user.sub);
	}

	// ========== Platform Analytics (Admin Only) ==========

	@Query(() => GraphQLJSON, { name: "platformAnalytics" })
	@Roles(UserRole.ADMIN)
	async getPlatformAnalytics() {
		return this.analyticsService.getPlatformAnalytics();
	}

	// ========== Activity ==========

	@Query(() => [GraphQLJSON], { name: "recentActivity" })
	async getRecentActivity(
		@CurrentUser() user: any,
		@Args("limit", { type: () => Int, nullable: true }) limit?: number,
	) {
		return this.analyticsService.getRecentActivity(user.sub, limit || 10);
	}

	@Mutation(() => GraphQLJSON, { name: "logActivity" })
	async logActivity(
		@CurrentUser() user: any,
		@Args("type") type: string,
		@Args("entityType") entityType: string,
		@Args("entityId") entityId: string,
		@Args("title") title: string,
		@Args("description", { nullable: true }) description?: string,
	) {
		return this.analyticsService.logActivity(
			user.sub,
			type,
			entityType,
			entityId,
			title,
			description,
		);
	}
}
