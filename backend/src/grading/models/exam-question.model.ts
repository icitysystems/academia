import {
	ObjectType,
	Field,
	ID,
	Float,
	Int,
	registerEnumType,
} from "@nestjs/graphql";

export enum QuestionType {
	MCQ = "MCQ",
	SHORT_ANSWER = "SHORT_ANSWER",
	LONG_ANSWER = "LONG_ANSWER",
	TRUE_FALSE = "TRUE_FALSE",
	NUMERIC = "NUMERIC",
	ESSAY = "ESSAY",
	DIAGRAM = "DIAGRAM",
}

registerEnumType(QuestionType, {
	name: "QuestionType",
	description: "Type of exam question",
});

@ObjectType()
export class ExamQuestion {
	@Field(() => ID)
	id: string;

	@Field()
	examPaperId: string;

	@Field(() => Int)
	questionNumber: number;

	@Field()
	questionText: string;

	@Field(() => QuestionType)
	questionType: QuestionType;

	@Field(() => Float)
	marks: number;

	@Field({ nullable: true })
	imageUrl?: string;

	@Field({ nullable: true })
	metadata?: string;

	@Field(() => Int)
	orderIndex: number;

	@Field()
	createdAt: Date;
}

@ObjectType()
export class MCQOption {
	@Field()
	label: string;

	@Field()
	text: string;

	@Field()
	isCorrect: boolean;
}
