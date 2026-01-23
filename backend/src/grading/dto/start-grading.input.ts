import { InputType, Field, ID } from "@nestjs/graphql";
import { IsString, IsArray, ArrayMinSize } from "class-validator";

@InputType()
export class StartGradingInput {
	@Field(() => ID)
	@IsString()
	templateId: string;

	@Field(() => [ID])
	@IsArray()
	@ArrayMinSize(1)
	sheetIds: string[];
}
