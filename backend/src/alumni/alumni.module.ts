import { Module } from "@nestjs/common";
import { AlumniService } from "./alumni.service";
import { AlumniResolver } from "./alumni.resolver";
import { PrismaService } from "../prisma.service";

/**
 * Alumni Module
 * Provides alumni portal functionality including career services and networking
 * As per Specification Section 2A.6
 */
@Module({
	providers: [AlumniService, AlumniResolver, PrismaService],
	exports: [AlumniService],
})
export class AlumniModule {}
