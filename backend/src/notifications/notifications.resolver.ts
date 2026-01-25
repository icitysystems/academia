import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import { UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Resolver()
@UseGuards(GqlAuthGuard)
export class NotificationsResolver {
	constructor(private notificationsService: NotificationsService) {}

	@Query(() => GraphQLJSON, { name: "notifications" })
	async getNotifications(
		@CurrentUser() user: any,
		@Args("skip", { type: () => Int, nullable: true }) skip?: number,
		@Args("take", { type: () => Int, nullable: true }) take?: number,
		@Args("unreadOnly", { nullable: true }) unreadOnly?: boolean,
	) {
		return this.notificationsService.getUserNotifications(user.sub, {
			skip,
			take,
			unreadOnly,
		});
	}

	@Mutation(() => GraphQLJSON, { name: "markNotificationAsRead" })
	async markAsRead(
		@Args("notificationId", { type: () => ID }) notificationId: string,
		@CurrentUser() user: any,
	) {
		return this.notificationsService.markAsRead(notificationId, user.sub);
	}

	@Mutation(() => GraphQLJSON, { name: "markAllNotificationsAsRead" })
	async markAllAsRead(@CurrentUser() user: any) {
		return this.notificationsService.markAllAsRead(user.sub);
	}

	@Mutation(() => Boolean, { name: "deleteNotification" })
	async deleteNotification(
		@Args("notificationId", { type: () => ID }) notificationId: string,
		@CurrentUser() user: any,
	) {
		return this.notificationsService.deleteNotification(
			notificationId,
			user.sub,
		);
	}

	@Mutation(() => Boolean, { name: "deleteAllNotifications" })
	async deleteAllNotifications(@CurrentUser() user: any) {
		return this.notificationsService.deleteAllNotifications(user.sub);
	}
}
