import { ObjectType, Field, ID, Int, registerEnumType } from "@nestjs/graphql";
import { TemplateRegion } from "./template-region.model";
import { User } from "../../auth/models/user.model";

// Define QuestionType enum for GraphQL
export enum QuestionTypeEnum {
	MCQ = "MCQ",
	TRUE_FALSE = "TRUE_FALSE",
	NUMERIC = "NUMERIC",
	SHORT_ANSWER = "SHORT_ANSWER",
	LONG_ANSWER = "LONG_ANSWER",
}

registerEnumType(QuestionTypeEnum, {
	name: "QuestionType",
	description: "Types of questions supported",
});

@ObjectType()
export class TemplateCounts {
	@Field(() => Int)
	sheets: number;

	@Field(() => Int)
	annotations: number;

	@Field(() => Int, { nullable: true })
	models?: number;
}

@ObjectType()
export class Template {
	@Field(() => ID)
	id: string;

	@Field()
	name: string;

	@Field({ nullable: true })
	description?: string;

	@Field(() => Int)
	version: number;

	@Field({ nullable: true })
	imageUrl?: string;

	@Field({ nullable: true })
	thumbnailUrl?: string;

	@Field({ nullable: true })
	answerKeyUrl?: string;

	@Field(() => [TemplateRegion])
	regions: TemplateRegion[];

	@Field(() => User)
	createdBy: User;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;

	@Field(() => TemplateCounts, { nullable: true })
	_count?: TemplateCounts;
}
