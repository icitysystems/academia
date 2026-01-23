import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType()
export class ScoreDistribution {
	@Field()
	range: string;

	@Field(() => Int)
	count: number;
}
