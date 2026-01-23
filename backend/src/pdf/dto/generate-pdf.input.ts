import { InputType, Field, ID, Int, Float } from "@nestjs/graphql";
import { IsString, IsOptional, IsBoolean, IsNumber } from "class-validator";

@InputType()
export class PDFOptionsInput {
	@Field({ nullable: true, defaultValue: true })
	@IsOptional()
	@IsBoolean()
	includeOverlay?: boolean;

	@Field({ nullable: true, defaultValue: true })
	@IsOptional()
	@IsBoolean()
	includeScoreBreakdown?: boolean;

	@Field({ nullable: true, defaultValue: false })
	@IsOptional()
	@IsBoolean()
	includeConfidence?: boolean;

	@Field({ nullable: true, defaultValue: "#FF0000" })
	@IsOptional()
	@IsString()
	overlayColor?: string;

	@Field(() => Int, { nullable: true, defaultValue: 12 })
	@IsOptional()
	@IsNumber()
	fontSize?: number;
}

@InputType()
export class GeneratePDFInput {
	@Field(() => ID)
	@IsString()
	sheetId: string;

	@Field(() => PDFOptionsInput, { nullable: true })
	@IsOptional()
	options?: PDFOptionsInput;
}
