import {
	ObjectType,
	Field,
	ID,
	Int,
	Float,
	registerEnumType,
} from "@nestjs/graphql";

export enum AssignmentStatus {
	DRAFT = "DRAFT",
	PUBLISHED = "PUBLISHED",
	CLOSED = "CLOSED",
}

export enum SubmissionStatus {
	DRAFT = "DRAFT",
	SUBMITTED = "SUBMITTED",
	GRADED = "GRADED",
	RETURNED = "RETURNED",
}

registerEnumType(AssignmentStatus, { name: "AssignmentStatus" });
registerEnumType(SubmissionStatus, { name: "SubmissionStatus" });

@ObjectType()
export class Assignment {
	@Field(() => ID)
	id: string;

	@Field({ nullable: true })
	lessonId?: string;

	@Field({ nullable: true })
	classSubjectId?: string;

	@Field()
	title: string;

	@Field({ nullable: true })
	description?: string;

	@Field({ nullable: true })
	instructions?: string;

	@Field()
	createdById: string;

	@Field({ nullable: true })
	dueDate?: Date;

	@Field(() => Int)
	totalMarks: number;

	@Field()
	allowLate: boolean;

	@Field(() => Float)
	latePenalty: number;

	@Field(() => Int, { nullable: true })
	maxFileSize?: number;

	@Field(() => [String], { nullable: true })
	allowedFileTypes?: string[];

	@Field({ nullable: true })
	rubric?: string;

	@Field()
	status: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;

	@Field(() => [AssignmentSubmission], { nullable: true })
	submissions?: AssignmentSubmission[];

	@Field(() => Int, { nullable: true })
	totalSubmissions?: number;
}

@ObjectType()
export class AssignmentSubmission {
	@Field(() => ID)
	id: string;

	@Field()
	assignmentId: string;

	@Field(() => Assignment, { nullable: true })
	assignment?: Assignment;

	@Field()
	studentId: string;

	@Field({ nullable: true })
	enrollmentId?: string;

	@Field()
	submittedAt: Date;

	@Field({ nullable: true })
	content?: string;

	@Field({ nullable: true })
	fileUrl?: string;

	@Field({ nullable: true })
	fileName?: string;

	@Field()
	isLate: boolean;

	@Field()
	status: string;

	@Field(() => Float, { nullable: true })
	score?: number;

	@Field(() => Float, { nullable: true })
	maxScore?: number;

	@Field({ nullable: true })
	feedback?: string;

	@Field({ nullable: true })
	gradedAt?: Date;

	@Field({ nullable: true })
	gradedById?: string;
}

@ObjectType()
export class AssignmentStats {
	@Field(() => Int)
	totalAssigned: number;

	@Field(() => Int)
	totalSubmitted: number;

	@Field(() => Int)
	totalGraded: number;

	@Field(() => Int)
	totalLate: number;

	@Field(() => Float)
	averageScore: number;

	@Field(() => Float)
	submissionRate: number;
}
