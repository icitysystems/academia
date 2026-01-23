import { InputType, Field, ID, Int, Float } from "@nestjs/graphql";

// ============================================
// Scheme of Work DTOs
// ============================================

@InputType()
export class GenerateSchemeInput {
	@Field(() => ID)
	syllabusId: string;

	@Field()
	academicYear: string;

	@Field()
	term: string;

	@Field(() => Int, { nullable: true })
	totalWeeks?: number;
}

@InputType()
export class UpdateSchemeInput {
	@Field({ nullable: true })
	weeklyPlans?: string;

	@Field({ nullable: true })
	status?: string;
}

@InputType()
export class ApproveSchemeInput {
	@Field(() => ID)
	schemeId: string;
}

// ============================================
// Progression Record DTOs
// ============================================

@InputType()
export class CreateProgressionInput {
	@Field(() => ID)
	classSubjectId: string;

	@Field(() => Int)
	weekNumber: number;

	@Field()
	date: Date;

	@Field()
	plannedTopic: string;

	@Field({ nullable: true })
	actualTopic?: string;

	@Field(() => Int, { nullable: true })
	periodsUsed?: number;

	@Field({ nullable: true })
	completionStatus?: string;

	@Field({ nullable: true })
	remarks?: string;
}

@InputType()
export class UpdateProgressionInput {
	@Field({ nullable: true })
	actualTopic?: string;

	@Field(() => Int, { nullable: true })
	periodsUsed?: number;

	@Field({ nullable: true })
	completionStatus?: string;

	@Field({ nullable: true })
	remarks?: string;
}

// ============================================
// Presentation DTOs
// ============================================

@InputType()
export class GeneratePresentationInput {
	@Field(() => ID, { nullable: true })
	lessonPlanId?: string;

	@Field(() => ID, { nullable: true })
	topicId?: string;

	@Field()
	title: string;

	@Field({ nullable: true })
	template?: string;
}

@InputType()
export class UpdatePresentationInput {
	@Field({ nullable: true })
	title?: string;

	@Field({ nullable: true })
	slidesData?: string;
}

// ============================================
// Exam Paper DTOs
// ============================================

@InputType()
export class CreateExamPaperInput {
	@Field()
	title: string;

	@Field()
	subject: string;

	@Field()
	classLevel: string;

	@Field()
	examType: string;

	@Field()
	academicYear: string;

	@Field({ nullable: true })
	term?: string;

	@Field(() => Int)
	duration: number;

	@Field(() => Int)
	totalMarks: number;

	@Field()
	sections: string; // JSON string

	@Field({ nullable: true })
	instructions?: string;

	@Field({ nullable: true })
	coverPage?: string;

	@Field({ nullable: true })
	markingScheme?: string;
}

@InputType()
export class UpdateExamPaperInput {
	@Field({ nullable: true })
	title?: string;

	@Field({ nullable: true })
	subject?: string;

	@Field({ nullable: true })
	classLevel?: string;

	@Field({ nullable: true })
	examType?: string;

	@Field(() => Int, { nullable: true })
	duration?: number;

	@Field(() => Int, { nullable: true })
	totalMarks?: number;

	@Field({ nullable: true })
	sections?: string;

	@Field({ nullable: true })
	instructions?: string;

	@Field({ nullable: true })
	coverPage?: string;

	@Field({ nullable: true })
	markingScheme?: string;

	@Field({ nullable: true })
	status?: string;
}

@InputType()
export class ExamPaperFilterInput {
	@Field({ nullable: true })
	subject?: string;

	@Field({ nullable: true })
	classLevel?: string;

	@Field({ nullable: true })
	examType?: string;

	@Field({ nullable: true })
	academicYear?: string;

	@Field({ nullable: true })
	status?: string;

	@Field(() => Int, { nullable: true, defaultValue: 1 })
	page?: number;

	@Field(() => Int, { nullable: true, defaultValue: 10 })
	pageSize?: number;
}

// ============================================
// Question Bank DTOs
// ============================================

@InputType()
export class CreateQuestionInput {
	@Field()
	subject: string;

	@Field({ nullable: true })
	topic?: string;

	@Field()
	questionText: string;

	@Field()
	questionType: string;

	@Field({ nullable: true })
	options?: string; // JSON string for MCQ

	@Field({ nullable: true })
	correctAnswer?: string;

	@Field({ nullable: true })
	explanation?: string;

	@Field(() => Float, { nullable: true, defaultValue: 1 })
	marks?: number;

	@Field({ nullable: true, defaultValue: "MEDIUM" })
	difficulty?: string;

	@Field({ nullable: true })
	bloomLevel?: string;

	@Field(() => [String], { nullable: true })
	tags?: string[];

	@Field({ nullable: true, defaultValue: false })
	isPublic?: boolean;
}

@InputType()
export class UpdateQuestionInput {
	@Field({ nullable: true })
	questionText?: string;

	@Field({ nullable: true })
	options?: string;

	@Field({ nullable: true })
	correctAnswer?: string;

	@Field({ nullable: true })
	explanation?: string;

	@Field(() => Float, { nullable: true })
	marks?: number;

	@Field({ nullable: true })
	difficulty?: string;

	@Field({ nullable: true })
	bloomLevel?: string;

	@Field(() => [String], { nullable: true })
	tags?: string[];

	@Field({ nullable: true })
	isPublic?: boolean;
}

@InputType()
export class QuestionFilterInput {
	@Field({ nullable: true })
	subject?: string;

	@Field({ nullable: true })
	topic?: string;

	@Field({ nullable: true })
	questionType?: string;

	@Field({ nullable: true })
	difficulty?: string;

	@Field({ nullable: true })
	bloomLevel?: string;

	@Field({ nullable: true })
	search?: string;

	@Field({ nullable: true })
	isPublic?: boolean;

	@Field(() => Int, { nullable: true, defaultValue: 1 })
	page?: number;

	@Field(() => Int, { nullable: true, defaultValue: 10 })
	pageSize?: number;
}
