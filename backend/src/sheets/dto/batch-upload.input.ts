import { InputType, Field, ID } from "@nestjs/graphql";
import { IsString, IsOptional, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

@InputType()
export class SheetInputItem {
	@Field()
	@IsString()
	imageData: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	fileName?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	studentId?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	studentName?: string;
}

@InputType()
export class BatchUploadInput {
	@Field(() => ID)
	@IsString()
	templateId: string;

	@Field(() => [SheetInputItem])
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => SheetInputItem)
	sheets: SheetInputItem[];
}
