import { InputType, Field, ID, Int, Float } from "@nestjs/graphql";
import { IsString, IsOptional, IsNumber, Min, Max } from "class-validator";

@InputType()
export class TrainingConfigInput {
	@Field(() => Int, { nullable: true, defaultValue: 10 })
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(100)
	epochs?: number;

	@Field(() => Float, { nullable: true, defaultValue: 0.001 })
	@IsOptional()
	@IsNumber()
	learningRate?: number;

	@Field(() => Int, { nullable: true, defaultValue: 32 })
	@IsOptional()
	@IsNumber()
	@Min(1)
	batchSize?: number;

	@Field(() => Float, { nullable: true, defaultValue: 0.2 })
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(0.5)
	validationSplit?: number;
}

@InputType()
export class StartTrainingInput {
	@Field(() => ID)
	@IsString()
	templateId: string;

	@Field(() => TrainingConfigInput, { nullable: true })
	@IsOptional()
	config?: TrainingConfigInput;
}
