import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/types";
import {
	ParentService,
	Notification,
	NotificationPreferences,
} from "./parent.service";
import { GraphQLJSON } from "graphql-type-json";

/**
 * Parent Portal Resolver
 * Implements parent/guardian endpoints as per Specification Section 2A.5
 */
@Resolver()
export class ParentResolver {
	constructor(private parentService: ParentService) {}

	// ============================
	// Dashboard & Progress (2A.5)
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Get parent dashboard with linked student summaries",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.PARENT)
	async parentDashboard(@CurrentUser() user: any) {
		return this.parentService.getParentDashboard(user.id);
	}

	@Query(() => GraphQLJSON, {
		description: "Get detailed progress for a linked student",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.PARENT)
	async studentProgress(
		@CurrentUser() user: any,
		@Args("studentId") studentId: string,
	) {
		return this.parentService.getStudentProgress(user.id, studentId);
	}

	// ============================
	// Student Linking (2A.5)
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Get all linked students",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.PARENT)
	async linkedStudents(@CurrentUser() user: any) {
		return this.parentService.getLinkedStudents(user.id);
	}

	@Mutation(() => GraphQLJSON, {
		description: "Request to link a student to parent account",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.PARENT)
	async requestStudentLink(
		@CurrentUser() user: any,
		@Args("studentEmail") studentEmail: string,
	) {
		return this.parentService.requestStudentLink(user.id, studentEmail);
	}

	@Mutation(() => GraphQLJSON, {
		description: "Update access level for linked student",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.PARENT)
	async updateStudentAccessLevel(
		@CurrentUser() user: any,
		@Args("studentId") studentId: string,
		@Args("accessLevel") accessLevel: string,
	) {
		return this.parentService.updateLinkAccessLevel(
			user.id,
			studentId,
			accessLevel,
		);
	}

	// ============================
	// Notification Preferences (2A.5)
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Get parent notification preferences",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.PARENT)
	async parentNotificationPreferences(@CurrentUser() user: any) {
		return this.parentService.getNotificationPreferences(user.id);
	}

	@Mutation(() => GraphQLJSON, {
		description: "Update parent notification preferences",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.PARENT)
	async updateParentNotificationPreferences(
		@CurrentUser() user: any,
		@Args("preferences", { type: () => GraphQLJSON })
		preferences: Record<string, any>,
	) {
		return this.parentService.updateNotificationPreferences(
			user.id,
			preferences as any,
		);
	}

	// ============================
	// Notifications & Events
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Get parent notifications",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.PARENT)
	async parentNotifications(
		@CurrentUser() user: any,
		@Args("limit", { nullable: true }) limit?: number,
	) {
		return this.parentService.getParentNotifications(user.id, limit);
	}

	@Query(() => GraphQLJSON, {
		description: "Get upcoming events for linked students",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.PARENT)
	async linkedStudentEvents(@CurrentUser() user: any) {
		return this.parentService.getLinkedStudentEvents(user.id);
	}

	// ============================
	// Communication
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Get messages from instructors",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.PARENT)
	async instructorMessages(@CurrentUser() user: any) {
		return this.parentService.getInstructorMessages(user.id);
	}

	@Mutation(() => GraphQLJSON, {
		description: "Send message to instructor",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.PARENT)
	async sendInstructorMessage(
		@CurrentUser() user: any,
		@Args("subject") subject: string,
		@Args("message") message: string,
		@Args("studentId", { nullable: true }) studentId?: string,
	) {
		return this.parentService.sendInstructorMessage(user.id, {
			subject,
			message,
			studentId,
		});
	}
}
