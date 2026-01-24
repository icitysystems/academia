import { Module } from "@nestjs/common";
import { DiscussionsService } from "./discussions.service";
import { DiscussionsResolver } from "./discussions.resolver";
import { PrismaService } from "../prisma.service";

/**
 * Discussions Module
 * Provides discussion forum functionality for courses and class subjects
 * As per Specification Section 2A.1: "Participate in discussion forums, chats, or group workspaces"
 */
@Module({
	providers: [DiscussionsService, DiscussionsResolver, PrismaService],
	exports: [DiscussionsService],
})
export class DiscussionsModule {}
