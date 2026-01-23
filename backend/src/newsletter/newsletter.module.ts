import { Module } from "@nestjs/common";
import { NewsletterService } from "./newsletter.service";
import { NewsletterResolver } from "./newsletter.resolver";
import { PrismaService } from "../prisma.service";

@Module({
	providers: [NewsletterService, NewsletterResolver, PrismaService],
	exports: [NewsletterService],
})
export class NewsletterModule {}
