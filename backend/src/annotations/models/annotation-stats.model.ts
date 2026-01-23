import { ObjectType, Field, Int } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";

@ObjectType()
export class AnnotationStats {
	@Field(() => Int)
	totalAnnotations: number;

	@Field(() => Int)
	trainingAnnotations: number;

	@Field(() => GraphQLJSON)
	labelDistribution: any;
}
