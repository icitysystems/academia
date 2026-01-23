import { Controller, Post, Req, Res, Headers } from "@nestjs/common";
import { Request, Response } from "express";
import { PaymentsService } from "./payments.service";

@Controller("webhooks")
export class WebhooksController {
	constructor(private paymentsService: PaymentsService) {}

	@Post("stripe")
	async handleStripeWebhook(
		@Req() req: Request,
		@Res() res: Response,
		@Headers("stripe-signature") signature: string,
	) {
		try {
			// req.body should be raw buffer when using raw body parser
			const payload = req.body;
			const result = await this.paymentsService.handleWebhook(
				payload,
				signature,
			);
			return res.status(200).json(result);
		} catch (error) {
			console.error("Webhook error:", error.message);
			return res.status(400).json({ error: error.message });
		}
	}
}
