import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class NewsletterSubscription {
	@Field(() => ID)
	id: string;

	@Field()
	email: string;

	@Field({ nullable: true })
	name?: string;

	@Field()
	isActive: boolean;

	@Field({ nullable: true })
	confirmedAt?: Date;

	@Field({ nullable: true })
	unsubscribedAt?: Date;

	@Field({ nullable: true })
	source?: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@ObjectType()
export class NewsletterStats {
	@Field()
	totalSubscribers: number;

	@Field()
	activeSubscribers: number;

	@Field()
	unsubscribedCount: number;

	@Field()
	subscribersThisMonth: number;
}
