import {
	ObjectType,
	Field,
	ID,
	Int,
	Float,
	registerEnumType,
} from "@nestjs/graphql";

// ============================================
// Enums
// ============================================

export enum DocumentStatus {
	DRAFT = "DRAFT",
	APPROVED = "APPROVED",
	ACTIVE = "ACTIVE",
	PUBLISHED = "PUBLISHED",
	REVIEWED = "REVIEWED",
}

export enum CompletionStatus {
	COMPLETED = "COMPLETED",
	PARTIAL = "PARTIAL",
	NOT_COVERED = "NOT_COVERED",
	AHEAD = "AHEAD",
}

export enum QuestionType {
	MCQ = "MCQ",
	TRUE_FALSE = "TRUE_FALSE",
	SHORT_ANSWER = "SHORT_ANSWER",
	ESSAY = "ESSAY",
	FILL_BLANK = "FILL_BLANK",
	MATCHING = "MATCHING",
}

export enum DifficultyLevel {
	EASY = "EASY",
	MEDIUM = "MEDIUM",
	HARD = "HARD",
}

export enum BloomLevel {
	REMEMBER = "REMEMBER",
	UNDERSTAND = "UNDERSTAND",
	APPLY = "APPLY",
	ANALYZE = "ANALYZE",
	EVALUATE = "EVALUATE",
	CREATE = "CREATE",
}

registerEnumType(DocumentStatus, { name: "DocumentStatus" });
registerEnumType(CompletionStatus, { name: "CompletionStatus" });
registerEnumType(QuestionType, { name: "QuestionType" });
registerEnumType(DifficultyLevel, { name: "DifficultyLevel" });
registerEnumType(BloomLevel, { name: "BloomLevel" });

// ============================================
// Scheme of Work
// ============================================

@ObjectType()
export class SchemeOfWork {
	@Field(() => ID)
	id: string;

	@Field()
	syllabusId: string;

	@Field()
	academicYear: string;

	@Field()
	term: string;

	@Field()
	generatedById: string;

	@Field()
	weeklyPlans: string; // JSON string

	@Field(() => Int)
	totalWeeks: number;

	@Field()
	status: string;

	@Field({ nullable: true })
	approvedById?: string;

	@Field({ nullable: true })
	approvedAt?: Date;

	@Field(() => [String], { nullable: true })
	exportedFormats?: string[];

	@Field({ nullable: true })
	pdfUrl?: string;

	@Field({ nullable: true })
	docxUrl?: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

// ============================================
// Progression Record
// ============================================

@ObjectType()
export class ProgressionRecord {
	@Field(() => ID)
	id: string;

	@Field()
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

	@Field()
	completionStatus: string;

	@Field({ nullable: true })
	remarks?: string;

	@Field()
	teacherId: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

// ============================================
// Generated Presentation
// ============================================

@ObjectType()
export class GeneratedPresentation {
	@Field(() => ID)
	id: string;

	@Field({ nullable: true })
	lessonPlanId?: string;

	@Field({ nullable: true })
	topicId?: string;

	@Field()
	title: string;

	@Field()
	template: string;

	@Field(() => Int)
	slideCount: number;

	@Field()
	slidesData: string; // JSON string

	@Field({ nullable: true })
	pptxUrl?: string;

	@Field({ nullable: true })
	pdfUrl?: string;

	@Field()
	createdById: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

// ============================================
// Exam Paper
// ============================================

@ObjectType()
export class ExamPaper {
	@Field(() => ID)
	id: string;

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
	coverPage?: string; // JSON string

	@Field({ nullable: true })
	markingScheme?: string; // JSON string

	@Field()
	createdById: string;

	@Field()
	status: string;

	@Field({ nullable: true })
	docxUrl?: string;

	@Field({ nullable: true })
	pdfUrl?: string;

	@Field({ nullable: true })
	answerKeyUrl?: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

// ============================================
// Question Bank
// ============================================

@ObjectType()
export class QuestionBankItem {
	@Field(() => ID)
	id: string;

	@Field()
	subject: string;

	@Field({ nullable: true })
	topic?: string;

	@Field()
	questionText: string;

	@Field()
	questionType: string;

	@Field({ nullable: true })
	options?: string; // JSON string

	@Field({ nullable: true })
	correctAnswer?: string;

	@Field({ nullable: true })
	explanation?: string;

	@Field(() => Float)
	marks: number;

	@Field()
	difficulty: string;

	@Field({ nullable: true })
	bloomLevel?: string;

	@Field(() => [String], { nullable: true })
	tags?: string[];

	@Field()
	createdById: string;

	@Field()
	isPublic: boolean;

	@Field(() => Int)
	usageCount: number;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

// ============================================
// List Results
// ============================================

@ObjectType()
export class SchemeOfWorkList {
	@Field(() => [SchemeOfWork])
	items: SchemeOfWork[];

	@Field(() => Int)
	total: number;
}

@ObjectType()
export class ExamPaperList {
	@Field(() => [ExamPaper])
	items: ExamPaper[];

	@Field(() => Int)
	total: number;
}

@ObjectType()
export class QuestionBankList {
	@Field(() => [QuestionBankItem])
	items: QuestionBankItem[];

	@Field(() => Int)
	total: number;
}

@ObjectType()
export class PresentationList {
	@Field(() => [GeneratedPresentation])
	items: GeneratedPresentation[];

	@Field(() => Int)
	total: number;
}
