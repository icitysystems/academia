import { InputType, Field, Float, Int, ID } from "@nestjs/graphql";
import { PaperType, QuestionType } from "../models";

@InputType()
export class CreateExamPaperInput {
	@Field()
	title: string;

	@Field()
	subject: string;

	@Field({ nullable: true })
	description?: string;

	@Field(() => PaperType, { defaultValue: PaperType.EXAM })
	paperType?: PaperType;

	@Field(() => Float)
	totalMarks: number;

	@Field(() => Int, { nullable: true })
	duration?: number;
}

@InputType()
export class UpdateExamPaperInput {
	@Field(() => ID)
	id: string;

	@Field({ nullable: true })
	title?: string;

	@Field({ nullable: true })
	subject?: string;

	@Field({ nullable: true })
	description?: string;

	@Field(() => PaperType, { nullable: true })
	paperType?: PaperType;

	@Field(() => Float, { nullable: true })
	totalMarks?: number;

	@Field(() => Int, { nullable: true })
	duration?: number;
}

@InputType()
export class CreateExamQuestionInput {
	@Field(() => ID)
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
	metadata?: string; // JSON for MCQ options, etc.
}

@InputType()
export class UpdateExamQuestionInput {
	@Field(() => ID)
	id: string;

	@Field({ nullable: true })
	questionText?: string;

	@Field(() => QuestionType, { nullable: true })
	questionType?: QuestionType;

	@Field(() => Float, { nullable: true })
	marks?: number;

	@Field({ nullable: true })
	imageUrl?: string;

	@Field({ nullable: true })
	metadata?: string;
}

@InputType()
export class BulkCreateQuestionsInput {
	@Field(() => ID)
	examPaperId: string;

	@Field(() => [QuestionInput])
	questions: QuestionInput[];
}

@InputType()
export class QuestionInput {
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
}
