import { Module } from "@nestjs/common";
import { LiveSessionsResolver } from "./live-sessions.resolver";
import { LiveSessionsService } from "./live-sessions.service";
import { PrismaService } from "../prisma.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
	imports: [NotificationsModule],
	providers: [LiveSessionsResolver, LiveSessionsService, PrismaService],
	exports: [LiveSessionsService],
})
export class LiveSessionsModule {}
