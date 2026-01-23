import {
	ObjectType,
	Field,
	ID,
	Float,
	Int,
	registerEnumType,
} from "@nestjs/graphql";
import { ExamQuestion } from "./exam-question.model";
import { ExpectedResponse } from "./expected-response.model";
import { ModerationSample } from "./moderation-sample.model";

export enum ExamPaperStatus {
	DRAFT = "DRAFT",
	QUESTIONS_ADDED = "QUESTIONS_ADDED",
	RESPONSES_SET = "RESPONSES_SET",
	MODERATION_READY = "MODERATION_READY",
	GRADING_ACTIVE = "GRADING_ACTIVE",
	COMPLETED = "COMPLETED",
}

export enum PaperType {
	EXAM = "EXAM",
	TEST = "TEST",
	QUIZ = "QUIZ",
	ASSIGNMENT = "ASSIGNMENT",
}

registerEnumType(ExamPaperStatus, {
	name: "ExamPaperStatus",
	description: "Status of the exam paper setup",
});

registerEnumType(PaperType, {
	name: "PaperType",
	description: "Type of paper being graded",
});

@ObjectType()
export class ExamPaperSetup {
	@Field(() => ID)
	id: string;

	@Field()
	title: string;

	@Field()
	subject: string;

	@Field({ nullable: true })
	description?: string;

	@Field(() => PaperType)
	paperType: PaperType;

	@Field(() => Float)
	totalMarks: number;

	@Field(() => Int, { nullable: true })
	duration?: number;

	@Field()
	teacherId: string;

	@Field(() => ExamPaperStatus)
	status: ExamPaperStatus;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;

	@Field(() => [ExamQuestion], { nullable: true })
	questions?: ExamQuestion[];

	@Field(() => [ExpectedResponse], { nullable: true })
	expectedResponses?: ExpectedResponse[];

	@Field(() => [ModerationSample], { nullable: true })
	moderationSamples?: ModerationSample[];

	@Field(() => Int, { nullable: true })
	questionCount?: number;

	@Field(() => Int, { nullable: true })
	submissionCount?: number;
}
