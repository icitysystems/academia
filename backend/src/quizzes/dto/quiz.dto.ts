import { InputType, Field, ID, Int, Float } from "@nestjs/graphql";

// ============================================
// Quiz DTOs
// ============================================

@InputType()
export class CreateQuizInput {
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

	@Field({ nullable: true, defaultValue: "QUIZ" })
	type?: string;

	@Field(() => Int)
	totalMarks: number;

	@Field(() => Int, { nullable: true })
	passingMarks?: number;

	@Field(() => Int, { nullable: true })
	duration?: number;

	@Field(() => Int, { nullable: true, defaultValue: 1 })
	maxAttempts?: number;

	@Field({ nullable: true, defaultValue: false })
	shuffleQuestions?: boolean;

	@Field({ nullable: true, defaultValue: false })
	shuffleOptions?: boolean;

	@Field({ nullable: true, defaultValue: "IMMEDIATELY" })
	showResults?: string;

	@Field({ nullable: true, defaultValue: true })
	showCorrectAnswers?: boolean;

	@Field({ nullable: true, defaultValue: true })
	showFeedback?: boolean;

	@Field({ nullable: true })
	availableFrom?: Date;

	@Field({ nullable: true })
	availableUntil?: Date;

	@Field({ nullable: true })
	accessCode?: string;
}

@InputType()
export class UpdateQuizInput {
	@Field({ nullable: true })
	title?: string;

	@Field({ nullable: true })
	description?: string;

	@Field({ nullable: true })
	instructions?: string;

	@Field({ nullable: true })
	type?: string;

	@Field(() => Int, { nullable: true })
	totalMarks?: number;

	@Field(() => Int, { nullable: true })
	passingMarks?: number;

	@Field(() => Int, { nullable: true })
	duration?: number;

	@Field(() => Int, { nullable: true })
	maxAttempts?: number;

	@Field({ nullable: true })
	shuffleQuestions?: boolean;

	@Field({ nullable: true })
	shuffleOptions?: boolean;

	@Field({ nullable: true })
	showResults?: string;

	@Field({ nullable: true })
	showCorrectAnswers?: boolean;

	@Field({ nullable: true })
	showFeedback?: boolean;

	@Field({ nullable: true })
	availableFrom?: Date;

	@Field({ nullable: true })
	availableUntil?: Date;

	@Field({ nullable: true })
	accessCode?: string;

	@Field({ nullable: true })
	status?: string;
}

@InputType()
export class QuizFilterInput {
	@Field({ nullable: true })
	classSubjectId?: string;

	@Field({ nullable: true })
	lessonId?: string;

	@Field({ nullable: true })
	type?: string;

	@Field({ nullable: true })
	status?: string;

	@Field({ nullable: true })
	search?: string;

	@Field(() => Int, { nullable: true, defaultValue: 1 })
	page?: number;

	@Field(() => Int, { nullable: true, defaultValue: 10 })
	pageSize?: number;
}

// ============================================
// Question DTOs
// ============================================

@InputType()
export class CreateQuizQuestionInput {
	@Field(() => ID)
	quizId: string;

	@Field()
	type: string;

	@Field()
	questionText: string;

	@Field({ nullable: true })
	questionMedia?: string;

	@Field({ nullable: true })
	options?: string; // JSON

	@Field({ nullable: true })
	correctAnswer?: string; // JSON

	@Field({ nullable: true })
	explanation?: string;

	@Field(() => Float)
	marks: number;

	@Field(() => Float, { nullable: true, defaultValue: 0 })
	negativeMarks?: number;

	@Field({ nullable: true, defaultValue: "MEDIUM" })
	difficulty?: string;

	@Field({ nullable: true })
	topic?: string;

	@Field(() => Int)
	orderIndex: number;

	@Field({ nullable: true, defaultValue: true })
	isRequired?: boolean;
}

@InputType()
export class UpdateQuizQuestionInput {
	@Field({ nullable: true })
	type?: string;

	@Field({ nullable: true })
	questionText?: string;

	@Field({ nullable: true })
	questionMedia?: string;

	@Field({ nullable: true })
	options?: string;

	@Field({ nullable: true })
	correctAnswer?: string;

	@Field({ nullable: true })
	explanation?: string;

	@Field(() => Float, { nullable: true })
	marks?: number;

	@Field(() => Float, { nullable: true })
	negativeMarks?: number;

	@Field({ nullable: true })
	difficulty?: string;

	@Field({ nullable: true })
	topic?: string;

	@Field(() => Int, { nullable: true })
	orderIndex?: number;

	@Field({ nullable: true })
	isRequired?: boolean;
}

// ============================================
// Attempt & Response DTOs
// ============================================

@InputType()
export class StartAttemptInput {
	@Field(() => ID)
	quizId: string;

	@Field({ nullable: true })
	accessCode?: string;

	@Field({ nullable: true })
	enrollmentId?: string;
}

@InputType()
export class SubmitResponseInput {
	@Field(() => ID)
	attemptId: string;

	@Field(() => ID)
	questionId: string;

	@Field({ nullable: true })
	response?: string; // JSON

	@Field(() => Int, { nullable: true })
	timeSpent?: number;

	@Field({ nullable: true })
	flagged?: boolean;
}

@InputType()
export class SubmitAttemptInput {
	@Field(() => ID)
	attemptId: string;
}

@InputType()
export class GradeAttemptInput {
	@Field(() => ID)
	attemptId: string;

	@Field({ nullable: true })
	feedback?: string;

	@Field(() => [ManualGradeInput], { nullable: true })
	manualGrades?: ManualGradeInput[];
}

@InputType()
export class ManualGradeInput {
	@Field(() => ID)
	responseId: string;

	@Field(() => Float)
	marksAwarded: number;

	@Field({ nullable: true })
	feedback?: string;
}
