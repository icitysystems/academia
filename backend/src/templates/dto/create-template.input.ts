import { InputType, Field, Float } from "@nestjs/graphql";
import { IsString, IsOptional, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CreateRegionInput } from "./create-region.input";

@InputType()
export class CreateTemplateInput {
	@Field()
	@IsString()
	name: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	description?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	imageUrl?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	answerKeyUrl?: string;

	@Field(() => [CreateRegionInput], { nullable: true })
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateRegionInput)
	regions?: CreateRegionInput[];
}
