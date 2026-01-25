import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { LMSService } from "./lms.service";
import { LMSResolver } from "./lms.resolver";

/**
 * LMS Integration Module
 * Provides integration with external Learning Management Systems
 * As per Specification: External system connectivity
 */
@Module({
	providers: [LMSService, LMSResolver, PrismaService],
	exports: [LMSService],
})
export class LMSModule {}
