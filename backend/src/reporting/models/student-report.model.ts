import { ObjectType, Field, Float } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";

@ObjectType()
export class StudentSheetResult {
	@Field()
	sheetId: string;

	@Field()
	templateName: string;

	@Field(() => Float)
	totalScore: number;

	@Field(() => Float)
	maxScore: number;

	@Field(() => Float)
	percentage: number;

	@Field()
	grade: string;

	@Field()
	gradedAt: Date;
}

@ObjectType()
export class StudentReport {
	@Field()
	studentId: string;

	@Field()
	studentName: string;

	@Field(() => [StudentSheetResult])
	sheets: StudentSheetResult[];

	@Field(() => Float)
	overallAverage: number;
}
