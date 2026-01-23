import { InputType, Field, ID, Float } from "@nestjs/graphql";
import { IsString, IsOptional, IsNumber, IsIn, Min } from "class-validator";

const CORRECTNESS_VALUES = ["CORRECT", "PARTIAL", "INCORRECT", "SKIPPED"];

@InputType()
export class ReviewResultInput {
	@Field(() => ID)
	@IsString()
	resultId: string;

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	assignedScore?: number;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsIn(CORRECTNESS_VALUES)
	predictedCorrectness?: string;
}
