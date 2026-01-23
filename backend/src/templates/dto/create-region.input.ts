import { InputType, Field, Float } from "@nestjs/graphql";
import {
	IsString,
	IsIn,
	IsNumber,
	IsOptional,
	Min,
	Max,
} from "class-validator";
import { GraphQLJSON } from "graphql-type-json";

const QUESTION_TYPES = [
	"MCQ",
	"SHORT_ANSWER",
	"LONG_ANSWER",
	"TRUE_FALSE",
	"NUMERIC",
	"DIAGRAM",
];

@InputType()
export class CreateRegionInput {
	@Field()
	@IsString()
	label: string;

	@Field(() => String)
	@IsIn(QUESTION_TYPES)
	questionType: string;

	@Field(() => Float, { nullable: true, defaultValue: 1 })
	@IsOptional()
	@IsNumber()
	@Min(0)
	points?: number;

	@Field(() => Float)
	@IsNumber()
	@Min(0)
	@Max(100)
	bboxX: number;

	@Field(() => Float)
	@IsNumber()
	@Min(0)
	@Max(100)
	bboxY: number;

	@Field(() => Float)
	@IsNumber()
	@Min(0)
	@Max(100)
	bboxWidth: number;

	@Field(() => Float)
	@IsNumber()
	@Min(0)
	@Max(100)
	bboxHeight: number;

	@Field(() => GraphQLJSON, { nullable: true })
	@IsOptional()
	metadata?: any;
}
