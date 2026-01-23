import { ObjectType, Field, ID, Int, Float } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";

@ObjectType()
export class ClassSummary {
	@Field(() => ID)
	templateId: string;

	@Field()
	templateName: string;

	@Field(() => Int)
	totalStudents: number;

	@Field(() => Float)
	averageScore: number;

	@Field(() => Float)
	highestScore: number;

	@Field(() => Float)
	lowestScore: number;

	@Field(() => Float)
	passRate: number;

	@Field(() => GraphQLJSON)
	gradeDistribution: Record<string, number>;
}
