import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { LMSService, LMSProvider } from "./lms.service";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/types";
import GraphQLJSON from "graphql-type-json";

/**
 * LMS Integration Resolver
 * Provides GraphQL endpoints for LMS integration features
 */
@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class LMSResolver {
	constructor(private lmsService: LMSService) {}

	// ============================
	// CONNECTION MANAGEMENT
	// ============================

	/**
	 * Configure LMS connection
	 */
	@Mutation(() => GraphQLJSON, { name: "configureLMSConnection" })
	@Roles(UserRole.ADMIN)
	async configureLMSConnection(
		@Args("institutionId") institutionId: string,
		@Args("provider") provider: string,
		@Args("apiUrl") apiUrl: string,
		@Args("apiKey", { nullable: true }) apiKey?: string,
		@Args("clientId", { nullable: true }) clientId?: string,
		@Args("clientSecret", { nullable: true }) clientSecret?: string,
		@CurrentUser() user?: any,
	) {
		return this.lmsService.configureLMSConnection(
			institutionId,
			{
				provider: provider as LMSProvider,
				apiUrl,
				apiKey,
				clientId,
				clientSecret,
			},
			user.sub,
		);
	}

	/**
	 * Test LMS connection
	 */
	@Query(() => GraphQLJSON, { name: "testLMSConnection" })
	@Roles(UserRole.ADMIN)
	async testLMSConnection(
		@Args("institutionId") institutionId: string,
		@Args("provider") provider: string,
	) {
		return this.lmsService.testLMSConnection(
			institutionId,
			provider as LMSProvider,
		);
	}

	/**
	 * Get all LMS connections
	 */
	@Query(() => GraphQLJSON, { name: "lmsConnections" })
	@Roles(UserRole.ADMIN)
	async getLMSConnections(@CurrentUser() user: any) {
		return this.lmsService.getLMSConnections(user.sub);
	}

	// ============================
	// COURSE SYNC
	// ============================

	/**
	 * Sync courses from LMS
	 */
	@Mutation(() => GraphQLJSON, { name: "syncCoursesFromLMS" })
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	async syncCoursesFromLMS(
		@Args("institutionId") institutionId: string,
		@Args("provider") provider: string,
		@Args("courseIds", { type: () => [String], nullable: true })
		courseIds?: string[],
		@Args("syncEnrollments", { nullable: true, defaultValue: false })
		syncEnrollments?: boolean,
		@Args("syncContent", { nullable: true, defaultValue: false })
		syncContent?: boolean,
	) {
		return this.lmsService.syncCoursesFromLMS(
			institutionId,
			provider as LMSProvider,
			{
				courseIds,
				syncEnrollments,
				syncContent,
			},
		);
	}

	/**
	 * Get LMS sync status for a course
	 */
	@Query(() => GraphQLJSON, { name: "lmsSyncStatus" })
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	async getLMSSyncStatus(
		@Args("courseId", { type: () => ID }) courseId: string,
	) {
		return this.lmsService.getLMSSyncStatus(courseId);
	}

	// ============================
	// GRADE EXPORT
	// ============================

	/**
	 * Export grades to LMS
	 */
	@Mutation(() => GraphQLJSON, { name: "exportGradesToLMS" })
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	async exportGradesToLMS(
		@Args("courseId", { type: () => ID }) courseId: string,
		@Args("provider") provider: string,
		@Args("assignmentId", { nullable: true }) assignmentId?: string,
		@Args("studentIds", { type: () => [String], nullable: true })
		studentIds?: string[],
	) {
		return this.lmsService.exportGradesToLMS(
			courseId,
			provider as LMSProvider,
			{
				assignmentId,
				studentIds,
			},
		);
	}

	// ============================
	// CONTENT IMPORT
	// ============================

	/**
	 * Import assignments from LMS
	 */
	@Mutation(() => GraphQLJSON, { name: "importAssignmentsFromLMS" })
	@Roles(UserRole.ADMIN, UserRole.TEACHER)
	async importAssignmentsFromLMS(
		@Args("courseId", { type: () => ID }) courseId: string,
		@Args("provider") provider: string,
		@Args("lmsAssignmentIds", { type: () => [String], nullable: true })
		lmsAssignmentIds?: string[],
	) {
		return this.lmsService.importAssignmentsFromLMS(
			courseId,
			provider as LMSProvider,
			lmsAssignmentIds,
		);
	}
}
