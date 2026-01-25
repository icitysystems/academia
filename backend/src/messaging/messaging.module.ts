import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "../prisma.service";
import { MessagingResolver } from "./messaging.resolver";
import { MessagingService } from "./messaging.service";
import { EmailService } from "./email.service";

/**
 * Messaging Module
 * Implements direct messaging functionality per Specification 2A.1, 2A.2
 *
 * Features:
 * - Direct messaging between students and instructors
 * - Announcement system
 * - Notification center with filtering
 * - Message threading
 * - Email notifications via AWS SES
 */
@Module({
	imports: [ConfigModule],
	providers: [MessagingResolver, MessagingService, EmailService, PrismaService],
	exports: [MessagingService, EmailService],
})
export class MessagingModule {}
