import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentsService } from "./payments.service";
import { PaymentsResolver } from "./payments.resolver";
import { StripeConsentService } from "./stripe-consent.service";
import { StripeConnectService } from "./stripe-connect.service";
import { ConsentResolver } from "./consent.resolver";
import { ConnectResolver } from "./connect.resolver";
import { WebhooksController } from "./webhooks.controller";
import { StripeConnectWebhooksController } from "./stripe-connect-webhooks.controller";
import { PrismaService } from "../prisma.service";

@Module({
	imports: [ConfigModule],
	controllers: [WebhooksController, StripeConnectWebhooksController],
	providers: [
		PaymentsService,
		PaymentsResolver,
		StripeConsentService,
		StripeConnectService,
		ConsentResolver,
		ConnectResolver,
		PrismaService,
	],
	exports: [PaymentsService, StripeConsentService, StripeConnectService],
})
export class PaymentsModule {}
