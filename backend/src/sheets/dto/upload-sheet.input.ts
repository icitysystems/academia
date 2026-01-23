import { InputType, Field, ID } from "@nestjs/graphql";
import { IsString, IsOptional } from "class-validator";

@InputType()
export class UploadSheetInput {
	@Field(() => ID)
	@IsString()
	templateId: string;

	@Field()
	@IsString()
	imageData: string; // Base64 encoded image

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
