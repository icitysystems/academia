import { Module } from "@nestjs/common";
import { AnalyticsResolver } from "./analytics.resolver";
import { AnalyticsService } from "./analytics.service";
import { PrismaService } from "../prisma.service";

@Module({
	providers: [AnalyticsResolver, AnalyticsService, PrismaService],
	exports: [AnalyticsService],
})
export class AnalyticsModule {}
