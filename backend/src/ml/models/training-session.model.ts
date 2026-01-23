import { ObjectType, Field, ID } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import { MLModel } from "./ml-model.model";

@ObjectType()
export class TrainingSession {
	@Field(() => ID)
	id: string;

	@Field()
	teacherId: string;

	@Field(() => String)
	status: string;

	@Field(() => GraphQLJSON, { nullable: true })
	config?: any;

	@Field(() => GraphQLJSON, { nullable: true })
	metrics?: any;

	@Field({ nullable: true })
	errorMessage?: string;

	@Field({ nullable: true })
	startedAt?: Date;

	@Field({ nullable: true })
	completedAt?: Date;

	@Field()
	createdAt: Date;

	@Field(() => [MLModel], { nullable: true })
	models?: MLModel[];
}
