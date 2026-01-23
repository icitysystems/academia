import { ObjectType, Field, ID, Float } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import { AnswerSheet } from "../../sheets/models/answer-sheet.model";

@ObjectType()
export class PDFOutput {
	@Field(() => ID)
	id: string;

	@Field()
	sheetId: string;

	@Field()
	pdfUrl: string;

	@Field(() => Float)
	totalScore: number;

	@Field(() => Float)
	maxScore: number;

	@Field(() => GraphQLJSON, { nullable: true })
	breakdown?: any;

	@Field()
	createdAt: Date;

	@Field(() => AnswerSheet, { nullable: true })
	sheet?: AnswerSheet;
}
