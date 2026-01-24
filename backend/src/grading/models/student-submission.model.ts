import {
	ObjectType,
	Field,
	ID,
	Float,
	Int,
	registerEnumType,
} from "@nestjs/graphql";

export enum SubmissionStatus {
	UPLOADED = "UPLOADED",
	PROCESSING = "PROCESSING",
	GRADED = "GRADED",
	REVIEWED = "REVIEWED",
	ERROR = "ERROR",
}

export enum CorrectnessLevel {
	CORRECT = "CORRECT",
	PARTIAL = "PARTIAL",
	INCORRECT = "INCORRECT",
}

registerEnumType(SubmissionStatus, {
	name: "SubmissionStatus",
	description: "Status of student submission",
});

registerEnumType(CorrectnessLevel, {
	name: "CorrectnessLevel",
	description: "Correctness level of an answer",
});

@ObjectType()
export class StudentExamSubmission {
	@Field(() => ID)
	id: string;

	@Field()
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

	@Field(() => SubmissionStatus)
	status: SubmissionStatus;

	@Field(() => Float, { nullable: true })
	totalScore?: number;

	@Field(() => Float, { nullable: true })
	percentage?: number;

	@Field({ nullable: true })
	grade?: string;

	@Field({ nullable: true })
	feedback?: string;

	@Field({ nullable: true })
	gradedAt?: Date;

	@Field({ nullable: true })
	reviewedAt?: Date;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;

	@Field(() => [StudentResponse], { nullable: true })
	responses?: StudentResponse[];
}

@ObjectType()
export class StudentResponse {
	@Field(() => ID)
	id: string;

	@Field()
	submissionId: string;

	@Field()
	questionId: string;

	@Field({ nullable: true })
	extractedAnswer?: string;

	@Field(() => Float, { nullable: true })
	assignedScore?: number;

	@Field(() => Float)
	maxScore: number;

	@Field(() => CorrectnessLevel, { nullable: true })
	predictedCorrectness?: CorrectnessLevel;

	@Field(() => Float, { nullable: true })
	confidence?: number;

	@Field({ nullable: true })
	explanation?: string;

	@Field(() => Float, { nullable: true })
	teacherOverride?: number;

	@Field({ nullable: true })
	teacherComment?: string;

	@Field()
	needsReview: boolean;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@ObjectType()
export class ExamGradingSession {
	@Field(() => ID)
	id: string;

	@Field()
	examPaperId: string;

	@Field()
	status: string;

	@Field(() => Int)
	totalSubmissions: number;

	@Field(() => Int)
	gradedSubmissions: number;

	@Field(() => Int)
	reviewedSubmissions: number;

	@Field(() => Float, { nullable: true })
	calibrationAccuracy?: number;

	@Field(() => Float, { nullable: true })
	averageConfidence?: number;

	@Field({ nullable: true })
	errorMessage?: string;

	@Field({ nullable: true })
	startedAt?: Date;

	@Field({ nullable: true })
	completedAt?: Date;

	@Field()
	createdAt: Date;
}

// GradingSummary is exported from grading-summary.model.ts
