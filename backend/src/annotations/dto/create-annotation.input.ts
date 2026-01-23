import { InputType, Field, ID, Float } from "@nestjs/graphql";
import {
	IsString,
	IsOptional,
	IsBoolean,
	IsArray,
	ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { GraphQLJSON } from "graphql-type-json";
import { QuestionLabelInput } from "./question-label.input";

@InputType()
export class CreateAnnotationInput {
	@Field(() => ID)
	@IsString()
	sheetId: string;

	@Field(() => GraphQLJSON, { nullable: true })
	@IsOptional()
	strokes?: any;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	comments?: string;

	@Field({ nullable: true, defaultValue: true })
	@IsOptional()
	@IsBoolean()
	isTrainingData?: boolean;

	@Field(() => [QuestionLabelInput], { nullable: true })
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => QuestionLabelInput)
	questionLabels?: QuestionLabelInput[];
}
