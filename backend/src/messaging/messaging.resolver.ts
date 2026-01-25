import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GraphQLJSON } from "graphql-type-json";
import { MessagingService } from "./messaging.service";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/types";

/**
 * Messaging Resolver
 * Implements messaging endpoints per Specification 2A.1, 2A.2
 */
@Resolver()
@UseGuards(GqlAuthGuard)
export class MessagingResolver {
	constructor(private messagingService: MessagingService) {}

	// ============================
	// Direct Messages
	// ============================

	@Mutation(() => GraphQLJSON, {
		description: "Send a direct message to another user",
	})
	async sendMessage(
		@CurrentUser() user: any,
		@Args("recipientId", { type: () => ID }) recipientId: string,
		@Args("subject") subject: string,
		@Args("content") content: string,
	) {
		return this.messagingService.sendMessage(user.id, {
			recipientId,
			subject,
			content,
		});
	}

	@Query(() => GraphQLJSON, {
		description: "Get inbox messages",
	})
	async inbox(
		@CurrentUser() user: any,
		@Args("skip", { type: () => Int, nullable: true }) skip?: number,
		@Args("take", { type: () => Int, nullable: true }) take?: number,
	) {
		return this.messagingService.getInbox(user.id, { skip, take });
	}

	@Query(() => GraphQLJSON, {
		description: "Get sent messages",
	})
	async sentMessages(
		@CurrentUser() user: any,
		@Args("skip", { type: () => Int, nullable: true }) skip?: number,
		@Args("take", { type: () => Int, nullable: true }) take?: number,
	) {
		return this.messagingService.getSentMessages(user.id, { skip, take });
	}

	@Query(() => GraphQLJSON, {
		description: "Get a conversation thread",
	})
	async conversation(
		@CurrentUser() user: any,
		@Args("messageId", { type: () => ID }) messageId: string,
	) {
		return this.messagingService.getConversation(user.id, messageId);
	}

	@Mutation(() => GraphQLJSON, {
		description: "Reply to a message",
	})
	async replyToMessage(
		@CurrentUser() user: any,
		@Args("messageId", { type: () => ID }) messageId: string,
		@Args("content") content: string,
	) {
		return this.messagingService.replyToMessage(user.id, messageId, content);
	}

	// ============================
	// Announcements
	// ============================

	@Mutation(() => GraphQLJSON, {
		description: "Create a course announcement",
	})
	@UseGuards(RolesGuard)
	@Roles(UserRole.FACULTY, UserRole.ADMIN)
	async createAnnouncement(
		@CurrentUser() user: any,
		@Args("courseId", { type: () => ID }) courseId: string,
		@Args("title") title: string,
		@Args("content") content: string,
		@Args("isPinned", { nullable: true }) isPinned?: boolean,
		@Args("sendEmail", { nullable: true }) sendEmail?: boolean,
	) {
		return this.messagingService.createAnnouncement(user.id, courseId, {
			title,
			content,
			isPinned,
			sendEmail,
		});
	}

	@Query(() => GraphQLJSON, {
		description: "Get course announcements",
	})
	async courseAnnouncements(
		@Args("courseId", { type: () => ID }) courseId: string,
		@Args("limit", { type: () => Int, nullable: true }) limit?: number,
	) {
		return this.messagingService.getCourseAnnouncements(courseId, limit);
	}

	// ============================
	// Notifications
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Get user notifications",
	})
	async notifications(
		@CurrentUser() user: any,
		@Args("limit", { type: () => Int, nullable: true }) limit?: number,
	) {
		return this.messagingService.getNotifications(user.id, { limit });
	}

	@Mutation(() => GraphQLJSON, {
		description: "Mark a notification as read",
	})
	async markNotificationRead(
		@CurrentUser() user: any,
		@Args("notificationId") notificationId: string,
	) {
		return this.messagingService.markNotificationRead(user.id, notificationId);
	}

	@Query(() => GraphQLJSON, {
		description: "Get notification preferences",
	})
	async notificationPreferences(@CurrentUser() user: any) {
		return this.messagingService.getNotificationPreferences(user.id);
	}

	@Mutation(() => GraphQLJSON, {
		description: "Update notification preferences",
	})
	async updateNotificationPreferences(
		@CurrentUser() user: any,
		@Args("preferences", { type: () => GraphQLJSON })
		preferences: Record<string, boolean>,
	) {
		return this.messagingService.updateNotificationPreferences(
			user.id,
			preferences,
		);
	}
}
