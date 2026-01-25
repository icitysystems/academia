import { Module } from "@nestjs/common";
import { NotificationsResolver } from "./notifications.resolver";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../prisma.service";

@Module({
	providers: [NotificationsResolver, NotificationsService, PrismaService],
	exports: [NotificationsService],
})
export class NotificationsModule {}
