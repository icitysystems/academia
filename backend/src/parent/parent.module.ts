import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ParentService } from "./parent.service";
import { ParentResolver } from "./parent.resolver";

/**
 * Parent Portal Module
 * Provides parent/guardian monitoring and communication features
 * As per Specification Section 2A.5
 */
@Module({
	providers: [ParentService, ParentResolver, PrismaService],
	exports: [ParentService],
})
export class ParentModule {}
