import { ObjectType, Field, ID, Float } from "@nestjs/graphql";

@ObjectType()
export class ModerationSample {
	@Field(() => ID)
	id: string;

	@Field()
	examPaperId: string;

	@Field({ nullable: true })
	studentName?: string;

	@Field()
	imageUrl: string;

	@Field(() => Float)
	totalScore: number;

	@Field({ nullable: true })
	feedback?: string;

	@Field()
	questionScores: string; // JSON

	@Field()
	isVerified: boolean;

	@Field()
	createdAt: Date;
}

@ObjectType()
export class QuestionScore {
	@Field()
	questionId: string;

	@Field(() => Float)
	score: number;

	@Field({ nullable: true })
	comment?: string;
}

@ObjectType()
export class CalibrationResult {
	@Field(() => Float)
	accuracy: number;

	@Field(() => Float)
	averageDeviation: number;

	@Field()
	isCalibrated: boolean;

	@Field({ nullable: true })
	message?: string;
}
