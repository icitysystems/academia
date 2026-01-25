import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CalendarResolver } from "./calendar.resolver";
import { CalendarService } from "./calendar.service";

/**
 * Calendar Module
 * Implements calendar and scheduling functionality per Specification 3A.1, 3A.2
 *
 * Features:
 * - Academic calendar management
 * - Office hours scheduling
 * - Event management
 * - Deadline tracking
 */
@Module({
	providers: [CalendarResolver, CalendarService, PrismaService],
	exports: [CalendarService],
})
export class CalendarModule {}
