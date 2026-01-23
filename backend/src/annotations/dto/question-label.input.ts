import { InputType, Field, ID, Float } from "@nestjs/graphql";
import {
	IsString,
	IsIn,
	IsNumber,
	IsOptional,
	Min,
	Max,
} from "class-validator";

const CORRECTNESS_VALUES = ["CORRECT", "PARTIAL", "INCORRECT", "SKIPPED"];

@InputType()
export class QuestionLabelInput {
	@Field(() => ID)
	@IsString()
	regionId: string;

	@Field(() => String)
	@IsIn(CORRECTNESS_VALUES)
	correctness: string;

	@Field(() => Float)
	@IsNumber()
	@Min(0)
	score: number;

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(1)
	confidence?: number;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	comment?: string;
}
