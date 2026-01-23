import { InputType, Field, Float, ID } from "@nestjs/graphql";

@InputType()
export class CreateModerationSampleInput {
	@Field(() => ID)
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
	questionScores: string; // JSON: [{questionId, score, comment}]
}

@InputType()
export class UpdateModerationSampleInput {
	@Field(() => ID)
	id: string;

	@Field({ nullable: true })
	studentName?: string;

	@Field(() => Float, { nullable: true })
	totalScore?: number;

	@Field({ nullable: true })
	feedback?: string;

	@Field({ nullable: true })
	questionScores?: string;
}

@InputType()
export class VerifyModerationSampleInput {
	@Field(() => ID)
	id: string;

	@Field()
	isVerified: boolean;
}

@InputType()
export class RunCalibrationInput {
	@Field(() => ID)
	examPaperId: string;
}
