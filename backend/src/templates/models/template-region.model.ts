import { ObjectType, Field, ID, Float, Int } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";

@ObjectType()
export class TemplateRegion {
	@Field(() => ID)
	id: string;

	@Field()
	templateId: string;

	@Field()
	label: string;

	@Field(() => String)
	questionType: string;

	@Field(() => Float)
	points: number;

	@Field(() => Float)
	bboxX: number;

	@Field(() => Float)
	bboxY: number;

	@Field(() => Float)
	bboxWidth: number;

	@Field(() => Float)
	bboxHeight: number;

	@Field(() => Int)
	orderIndex: number;

	@Field(() => GraphQLJSON, { nullable: true })
	metadata?: any;

	@Field()
	createdAt: Date;
}
