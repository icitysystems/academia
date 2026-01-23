import { ObjectType, Field, Int, Float } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";

@ObjectType()
export class GradingStats {
	@Field(() => Int)
	totalJobs: number;

	@Field(() => Int)
	totalResults: number;

	@Field(() => Int)
	needsReview: number;

	@Field(() => Int)
	reviewed: number;

	@Field(() => Float)
	averageConfidence: number;

	@Field(() => GraphQLJSON)
	scoreDistribution: any;
}
