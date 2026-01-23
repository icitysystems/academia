import { ObjectType, Field, ID, Int, Float } from "@nestjs/graphql";

// ============================================
// OnlineQuiz Model
// ============================================

@ObjectType()
export class OnlineQuiz {
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

	@Field()
	type: string;

	@Field(() => Int)
	totalMarks: number;

	@Field(() => Int, { nullable: true })
	passingMarks?: number;

	@Field(() => Int, { nullable: true })
	duration?: number;

	@Field(() => Int)
	maxAttempts: number;

	@Field()
	shuffleQuestions: boolean;

	@Field()
	shuffleOptions: boolean;

	@Field()
	showResults: string;

	@Field()
	showCorrectAnswers: boolean;

	@Field()
	showFeedback: boolean;

	@Field({ nullable: true })
	availableFrom?: Date;

	@Field({ nullable: true })
	availableUntil?: Date;

	@Field({ nullable: true })
	accessCode?: string;

	@Field()
	status: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;

	@Field(() => [QuizQuestion], { nullable: true })
	questions?: QuizQuestion[];

	@Field(() => Int, { nullable: true })
	totalQuestions?: number;
}

// ============================================
// QuizQuestion Model
// ============================================

@ObjectType()
export class QuizQuestion {
	@Field(() => ID)
	id: string;

	@Field()
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

	@Field(() => Float)
	negativeMarks: number;

	@Field()
	difficulty: string;

	@Field({ nullable: true })
	topic?: string;

	@Field(() => Int)
	orderIndex: number;

	@Field()
	isRequired: boolean;

	@Field()
	createdAt: Date;
}

// ============================================
// QuizAttempt Model
// ============================================

@ObjectType()
export class QuizAttempt {
	@Field(() => ID)
	id: string;

	@Field()
	quizId: string;

	@Field()
	studentId: string;

	@Field({ nullable: true })
	enrollmentId?: string;

	@Field(() => Int)
	attemptNumber: number;

	@Field()
	status: string;

	@Field()
	startedAt: Date;

	@Field({ nullable: true })
	submittedAt?: Date;

	@Field(() => Int, { nullable: true })
	timeSpent?: number;

	@Field(() => Float, { nullable: true })
	totalScore?: number;

	@Field(() => Float, { nullable: true })
	maxScore?: number;

	@Field(() => Float, { nullable: true })
	percentage?: number;

	@Field({ nullable: true })
	grade?: string;

	@Field({ nullable: true })
	passed?: boolean;

	@Field({ nullable: true })
	feedback?: string;

	@Field({ nullable: true })
	gradedAt?: Date;

	@Field({ nullable: true })
	gradedById?: string;

	@Field(() => OnlineQuiz, { nullable: true })
	quiz?: OnlineQuiz;

	@Field(() => [QuizResponse], { nullable: true })
	responses?: QuizResponse[];
}

// ============================================
// QuizResponse Model
// ============================================

@ObjectType()
export class QuizResponse {
	@Field(() => ID)
	id: string;

	@Field()
	attemptId: string;

	@Field()
	questionId: string;

	@Field({ nullable: true })
	response?: string; // JSON

	@Field({ nullable: true })
	isCorrect?: boolean;

	@Field(() => Float, { nullable: true })
	marksAwarded?: number;

	@Field({ nullable: true })
	feedback?: string;

	@Field(() => Int, { nullable: true })
	timeSpent?: number;

	@Field()
	flagged: boolean;

	@Field()
	answeredAt: Date;

	@Field(() => QuizQuestion, { nullable: true })
	question?: QuizQuestion;
}

// ============================================
// List Results
// ============================================

@ObjectType()
export class QuizListResult {
	@Field(() => [OnlineQuiz])
	quizzes: OnlineQuiz[];

	@Field(() => Int)
	total: number;

	@Field(() => Int)
	page: number;

	@Field(() => Int)
	pageSize: number;
}

@ObjectType()
export class QuizStats {
	@Field(() => Int)
	totalAttempts: number;

	@Field(() => Int)
	totalPassed: number;

	@Field(() => Float)
	averageScore: number;

	@Field(() => Float)
	averageTimeSpent: number;

	@Field(() => Float)
	passRate: number;
}
