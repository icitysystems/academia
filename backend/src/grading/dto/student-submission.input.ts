import { InputType, Field, Float, ID } from "@nestjs/graphql";

@InputType()
export class CreateStudentSubmissionInput {
	@Field(() => ID)
	examPaperId: string;

	@Field({ nullable: true })
	studentId?: string;

	@Field()
	studentName: string;

	@Field({ nullable: true })
	studentEmail?: string;

	@Field()
	imageUrl: string;

	@Field({ nullable: true })
	thumbnailUrl?: string;
}

@InputType()
export class BulkUploadSubmissionsInput {
	@Field(() => ID)
	examPaperId: string;

	@Field(() => [StudentSubmissionItem])
	submissions: StudentSubmissionItem[];
}

@InputType()
export class StudentSubmissionItem {
	@Field({ nullable: true })
	studentId?: string;

	@Field()
	studentName: string;

	@Field({ nullable: true })
	studentEmail?: string;

	@Field()
	imageUrl: string;

	@Field({ nullable: true })
	thumbnailUrl?: string;
}

@InputType()
export class StartBatchGradingInput {
	@Field(() => ID)
	examPaperId: string;

	@Field(() => [ID], { nullable: true })
	submissionIds?: string[]; // If empty, grade all ungraded submissions
}

@InputType()
export class ReviewResponseInput {
	@Field(() => ID)
	responseId: string;

	@Field(() => Float, { nullable: true })
	teacherOverride?: number;

	@Field({ nullable: true })
	teacherComment?: string;

	@Field({ nullable: true })
	needsReview?: boolean;
}

@InputType()
export class BulkReviewInput {
	@Field(() => ID)
	submissionId: string;

	@Field(() => [ReviewResponseInput])
	reviews: ReviewResponseInput[];

	@Field({ nullable: true })
	overallFeedback?: string;
}

@InputType()
export class FinalizeGradingInput {
	@Field(() => ID)
	examPaperId: string;

	@Field({ nullable: true })
	publishResults?: boolean;
}
