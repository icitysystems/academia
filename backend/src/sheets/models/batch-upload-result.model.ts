import { ObjectType, Field, Int } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";

@ObjectType()
export class BatchUploadResult {
	@Field(() => Int)
	total: number;

	@Field(() => Int)
	successful: number;

	@Field(() => Int)
	failed: number;

	@Field(() => GraphQLJSON)
	results: any;
}
