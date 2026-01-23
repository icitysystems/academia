import { ObjectType, Field, Int } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";

@ObjectType()
export class BatchPDFResult {
	@Field(() => Int)
	total: number;

	@Field(() => Int)
	successful: number;

	@Field(() => Int)
	failed: number;

	@Field(() => GraphQLJSON)
	results: any;
}
