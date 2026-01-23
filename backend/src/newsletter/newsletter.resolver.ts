import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { NewsletterService } from "./newsletter.service";
import {
	NewsletterSubscription,
	NewsletterStats,
} from "./models/newsletter.model";
import {
	SubscribeNewsletterInput,
	UnsubscribeNewsletterInput,
} from "./dto/newsletter.input";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";

@Resolver(() => NewsletterSubscription)
export class NewsletterResolver {
	constructor(private newsletterService: NewsletterService) {}

	// Public mutation - anyone can subscribe
	@Mutation(() => NewsletterSubscription)
	async subscribeNewsletter(
		@Args("input") input: SubscribeNewsletterInput,
	): Promise<NewsletterSubscription> {
		return this.newsletterService.subscribe(input);
	}

	// Public mutation - anyone can unsubscribe with their email
	@Mutation(() => NewsletterSubscription)
	async unsubscribeNewsletter(
		@Args("input") input: UnsubscribeNewsletterInput,
	): Promise<NewsletterSubscription> {
		return this.newsletterService.unsubscribe(input);
	}

	// Admin only - get all subscriptions
	@Query(() => [NewsletterSubscription])
	@UseGuards(GqlAuthGuard)
	async newsletterSubscriptions(
		@Args("activeOnly", { defaultValue: true }) activeOnly: boolean,
	): Promise<NewsletterSubscription[]> {
		return this.newsletterService.getAllSubscriptions(activeOnly);
	}

	// Admin only - get newsletter stats
	@Query(() => NewsletterStats)
	@UseGuards(GqlAuthGuard)
	async newsletterStats(): Promise<NewsletterStats> {
		return this.newsletterService.getStats();
	}

	// Check subscription status by email (public)
	@Query(() => NewsletterSubscription, { nullable: true })
	async checkNewsletterSubscription(
		@Args("email") email: string,
	): Promise<NewsletterSubscription | null> {
		return this.newsletterService.getSubscription(email);
	}
}
