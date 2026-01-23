import { Module } from "@nestjs/common";
import { SupportResolver } from "./support.resolver";
import { SupportService } from "./support.service";
import { PrismaService } from "../prisma.service";

/**
 * Support Module
 * Implements support ticket system as per Specification Section 2A.4
 *
 * Provides:
 * - Ticket creation and management
 * - Support staff dashboard
 * - System health monitoring
 * - Resolution workflow
 */
@Module({
	providers: [SupportResolver, SupportService, PrismaService],
	exports: [SupportService],
})
export class SupportModule {}
