import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentsService } from "./payments.service";
import { PaymentsResolver } from "./payments.resolver";
import { WebhooksController } from "./webhooks.controller";
import { PrismaService } from "../prisma.service";

@Module({
	imports: [ConfigModule],
	controllers: [WebhooksController],
	providers: [PaymentsService, PaymentsResolver, PrismaService],
	exports: [PaymentsService],
})
export class PaymentsModule {}
