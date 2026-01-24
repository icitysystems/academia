import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ComplianceService } from "./compliance.service";
import { ComplianceResolver } from "./compliance.resolver";

/**
 * Admin Compliance Module
 * Provides administrative compliance, moderation, and system configuration
 * As per Specification Section 2A.3
 */
@Module({
	providers: [ComplianceService, ComplianceResolver, PrismaService],
	exports: [ComplianceService],
})
export class ComplianceModule {}
