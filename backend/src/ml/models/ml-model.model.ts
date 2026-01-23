import {
	ObjectType,
	Field,
	ID,
	Int,
	Float,
	registerEnumType,
} from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";

// Define JobStatus enum for GraphQL
export enum JobStatusEnum {
	PENDING = "PENDING",
	RUNNING = "RUNNING",
	COMPLETED = "COMPLETED",
	FAILED = "FAILED",
	CANCELLED = "CANCELLED",
}

registerEnumType(JobStatusEnum, {
	name: "JobStatus",
	description: "Status of a job (training, grading, etc.)",
});

@ObjectType()
export class MLModel {
	@Field(() => ID)
	id: string;

	@Field()
	templateId: string;

	@Field({ nullable: true })
	trainingId?: string;

	@Field(() => Int)
	version: number;

	@Field()
	artifactUrl: string;

	@Field(() => Float, { nullable: true })
	accuracy?: number;

	@Field(() => GraphQLJSON, { nullable: true })
	metadata?: any;

	@Field()
	isActive: boolean;

	@Field()
	createdAt: Date;
}
