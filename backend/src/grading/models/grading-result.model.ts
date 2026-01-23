import { ObjectType, Field, ID, Float } from "@nestjs/graphql";
import { TemplateRegion } from "../../templates/models/template-region.model";
import { AnswerSheet } from "../../sheets/models/answer-sheet.model";

@ObjectType()
export class GradingResult {
	@Field(() => ID)
	id: string;

	@Field()
	jobId: string;

	@Field()
	sheetId: string;

	@Field()
	regionId: string;

	@Field(() => String)
	predictedCorrectness: string;

	@Field(() => Float)
	confidence: number;

	@Field(() => Float)
	assignedScore: number;

	@Field({ nullable: true })
	explanation?: string;

	@Field()
	needsReview: boolean;

	@Field({ nullable: true })
	reviewedAt?: Date;

	@Field()
	createdAt: Date;

	@Field(() => TemplateRegion, { nullable: true })
	region?: TemplateRegion;

	@Field(() => AnswerSheet, { nullable: true })
	sheet?: AnswerSheet;
}
