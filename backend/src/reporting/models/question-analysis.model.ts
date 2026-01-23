import { ObjectType, Field, ID, Int, Float } from "@nestjs/graphql";

@ObjectType()
export class QuestionAnalysis {
	@Field(() => ID)
	regionId: string;

	@Field()
	label: string;

	@Field()
	questionType: string;

	@Field(() => Int)
	totalAttempts: number;

	@Field(() => Int)
	correctCount: number;

	@Field(() => Int)
	partialCount: number;

	@Field(() => Int)
	incorrectCount: number;

	@Field(() => Float)
	averageScore: number;

	@Field(() => Float)
	difficultyIndex: number;
}
