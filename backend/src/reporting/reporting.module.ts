import { Module } from "@nestjs/common";
import { ReportingService } from "./reporting.service";
import { ReportingResolver } from "./reporting.resolver";
import { PrismaService } from "../prisma.service";

@Module({
	providers: [ReportingService, ReportingResolver, PrismaService],
	exports: [ReportingService],
})
export class ReportingModule {}
