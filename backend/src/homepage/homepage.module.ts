import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { HomepageService } from "./homepage.service";
import { HomepageResolver } from "./homepage.resolver";

/**
 * Homepage Module
 * Provides featured content, testimonials, and platform statistics for the public homepage
 */
@Module({
	providers: [HomepageService, HomepageResolver, PrismaService],
	exports: [HomepageService],
})
export class HomepageModule {}
