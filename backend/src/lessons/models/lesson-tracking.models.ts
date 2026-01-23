import {
	ObjectType,
	Field,
	ID,
	Int,
	Float,
	registerEnumType,
} from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";

// ============================================
// Enums
// ============================================

export enum SchoolStatus {
	ACTIVE = "ACTIVE",
	INACTIVE = "INACTIVE",
}

export enum ClassStatus {
	ACTIVE = "ACTIVE",
	ARCHIVED = "ARCHIVED",
}

export enum TeachingMethod {
	LECTURE = "LECTURE",
	DEMONSTRATION = "DEMONSTRATION",
	GROUP_WORK = "GROUP_WORK",
	LAB = "LAB",
	ACTIVITY = "ACTIVITY",
	DISCUSSION = "DISCUSSION",
	ASSESSMENT = "ASSESSMENT",
}

export enum LessonStatus {
	PLANNED = "PLANNED",
	COMPLETED = "COMPLETED",
	IN_PROGRESS = "IN_PROGRESS",
	SKIPPED = "SKIPPED",
	RESCHEDULED = "RESCHEDULED",
}

export enum AttachmentType {
	PDF = "PDF",
	DOCX = "DOCX",
	PPT = "PPT",
	IMAGE = "IMAGE",
	LINK = "LINK",
}

registerEnumType(SchoolStatus, { name: "SchoolStatus" });
registerEnumType(ClassStatus, { name: "ClassStatus" });
registerEnumType(TeachingMethod, { name: "TeachingMethod" });
registerEnumType(LessonStatus, { name: "LessonStatus" });
registerEnumType(AttachmentType, { name: "AttachmentType" });

// ============================================
// Subject Model (no dependencies)
// ============================================

@ObjectType()
export class Subject {
	@Field(() => ID)
	id: string;

	@Field()
	name: string;

	@Field({ nullable: true })
	code?: string;

	@Field({ nullable: true })
	description?: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

// ============================================
// Syllabus Models (must be before ClassSubject)
// ============================================

@ObjectType()
export class SyllabusTopic {
	@Field(() => ID)
	id: string;

	@Field()
	title: string;

	@Field({ nullable: true })
	description?: string;

	@Field(() => Int)
	orderIndex: number;

	@Field(() => Float, { nullable: true })
	estimatedHours?: number;

	@Field(() => [String], { nullable: true })
	learningOutcomes?: string[];

	@Field(() => [ID], { nullable: true })
	prerequisites?: string[];

	@Field()
	isCovered: boolean;

	@Field({ nullable: true })
	lastTaught?: Date;

	@Field()
	createdAt: Date;
}

@ObjectType()
export class SyllabusChapter {
	@Field(() => ID)
	id: string;

	@Field()
	title: string;

	@Field({ nullable: true })
	description?: string;

	@Field(() => Int)
	orderIndex: number;

	@Field(() => Float, { nullable: true })
	estimatedHours?: number;

	@Field(() => [SyllabusTopic], { nullable: true })
	topics?: SyllabusTopic[];

	@Field(() => Float, { nullable: true })
	completionPercentage?: number;

	@Field()
	createdAt: Date;
}

@ObjectType()
export class SyllabusUnit {
	@Field(() => ID)
	id: string;

	@Field()
	title: string;

	@Field({ nullable: true })
	description?: string;

	@Field(() => Int)
	orderIndex: number;

	@Field(() => Float, { nullable: true })
	estimatedHours?: number;

	@Field(() => [SyllabusChapter], { nullable: true })
	chapters?: SyllabusChapter[];

	@Field(() => Float, { nullable: true })
	completionPercentage?: number;

	@Field()
	createdAt: Date;
}

@ObjectType()
export class Syllabus {
	@Field(() => ID)
	id: string;

	@Field()
	name: string;

	@Field({ nullable: true })
	description?: string;

	@Field({ nullable: true })
	documentUrl?: string;

	@Field()
	isTemplate: boolean;

	@Field({ nullable: true })
	templateSource?: string;

	@Field(() => Int)
	totalTopics: number;

	@Field(() => Float)
	totalHours: number;

	@Field(() => [SyllabusUnit], { nullable: true })
	units?: SyllabusUnit[];

	@Field(() => Float, { nullable: true })
	completionPercentage?: number;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

// ============================================
// LessonAttachment (before Lesson)
// ============================================

@ObjectType()
export class LessonAttachment {
	@Field(() => ID)
	id: string;

	@Field()
	fileName: string;

	@Field()
	fileUrl: string;

	@Field()
	fileType: string;

	@Field(() => Int, { nullable: true })
	fileSize?: number;

	@Field()
	createdAt: Date;
}

@ObjectType()
export class LessonTopic {
	@Field(() => ID)
	id: string;

	@Field(() => SyllabusTopic, { nullable: true })
	topic?: SyllabusTopic;

	@Field()
	createdAt: Date;
}

// ============================================
// School Model
// ============================================

@ObjectType()
export class School {
	@Field(() => ID)
	id: string;

	@Field()
	name: string;

	@Field({ nullable: true })
	location?: string;

	@Field({ nullable: true })
	address?: string;

	@Field({ nullable: true })
	phone?: string;

	@Field({ nullable: true })
	email?: string;

	@Field()
	status: string;

	@Field(() => Int, { nullable: true })
	teacherCount?: number;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

// ============================================
// Class Model (forward reference to ClassSubject and Lesson)
// ============================================

@ObjectType()
export class Class {
	@Field(() => ID)
	id: string;

	@Field(() => School, { nullable: true })
	school?: School;

	@Field()
	name: string;

	@Field()
	gradeLevel: string;

	@Field({ nullable: true })
	section?: string;

	@Field()
	academicYear: string;

	@Field({ nullable: true })
	term?: string;

	@Field(() => Int, { nullable: true })
	studentCount?: number;

	@Field(() => GraphQLJSON, { nullable: true })
	schedule?: any;

	@Field()
	status: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

// ============================================
// ClassSubject Model (after Syllabus)
// ============================================

@ObjectType()
export class ClassSubject {
	@Field(() => ID)
	id: string;

	@Field(() => Class, { nullable: true })
	class?: Class;

	@Field(() => Subject, { nullable: true })
	subject?: Subject;

	@Field(() => ID)
	teacherId: string;

	@Field(() => Float, { nullable: true })
	totalHours?: number;

	@Field(() => Float, { nullable: true })
	weeklyHours?: number;

	@Field({ nullable: true })
	startDate?: Date;

	@Field({ nullable: true })
	endDate?: Date;

	@Field(() => Syllabus, { nullable: true })
	syllabus?: Syllabus;

	@Field(() => Float, { nullable: true })
	progressPercentage?: number;

	@Field(() => Float, { nullable: true })
	hoursCompleted?: number;

	@Field(() => Int, { nullable: true })
	lessonsCount?: number;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

// ============================================
// Lesson Model (after ClassSubject)
// ============================================

@ObjectType()
export class Lesson {
	@Field(() => ID)
	id: string;

	@Field(() => Class, { nullable: true })
	class?: Class;

	@Field(() => ClassSubject, { nullable: true })
	classSubject?: ClassSubject;

	@Field(() => ID)
	teacherId: string;

	@Field()
	date: Date;

	@Field(() => Float)
	duration: number;

	@Field({ nullable: true })
	teachingMethod?: string;

	@Field({ nullable: true })
	materialsUsed?: string;

	@Field({ nullable: true })
	homeworkAssigned?: string;

	@Field({ nullable: true })
	notes?: string;

	@Field({ nullable: true })
	attendance?: string;

	@Field()
	status: string;

	@Field(() => [LessonTopic], { nullable: true })
	topics?: LessonTopic[];

	@Field(() => [LessonAttachment], { nullable: true })
	attachments?: LessonAttachment[];

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

// ============================================
// Analytics Models
// ============================================

@ObjectType()
export class AttendanceInfo {
	@Field(() => Int)
	present: number;

	@Field(() => Int)
	total: number;

	@Field(() => Float)
	percentage: number;
}

@ObjectType()
export class ProgressSummary {
	@Field(() => ID)
	classSubjectId: string;

	@Field()
	subjectName: string;

	@Field()
	className: string;

	@Field(() => Int)
	totalTopics: number;

	@Field(() => Int)
	coveredTopics: number;

	@Field(() => Float)
	completionPercentage: number;

	@Field(() => Float)
	totalHours: number;

	@Field(() => Float)
	hoursCompleted: number;

	@Field(() => Int)
	lessonsCount: number;

	@Field(() => Float)
	averageDuration: number;

	@Field()
	onTrack: boolean;

	@Field({ nullable: true })
	projectedCompletionDate?: Date;
}

@ObjectType()
export class TeachingMethodDistribution {
	@Field(() => TeachingMethod)
	method: TeachingMethod;

	@Field(() => Int)
	count: number;

	@Field(() => Float)
	percentage: number;

	@Field(() => Float)
	totalHours: number;
}

@ObjectType()
export class DateRange {
	@Field()
	start: Date;

	@Field()
	end: Date;
}

@ObjectType()
export class LessonReport {
	@Field(() => DateRange)
	dateRange: DateRange;

	@Field(() => Int)
	totalLessons: number;

	@Field(() => Float)
	totalHours: number;

	@Field(() => Int)
	classesTaught: number;

	@Field(() => Int)
	subjectsTaught: number;

	@Field(() => Int)
	topicsCovered: number;

	@Field(() => [TeachingMethodDistribution])
	methodDistribution: TeachingMethodDistribution[];

	@Field(() => [ProgressSummary])
	progressSummaries: ProgressSummary[];
}

@ObjectType()
export class DashboardSummary {
	@Field(() => [Lesson])
	todayLessons: Lesson[];

	@Field(() => [Lesson])
	upcomingLessons: Lesson[];

	@Field(() => Float)
	weekProgress: number;

	@Field(() => Int)
	alertsCount: number;

	@Field(() => Int)
	schoolsCount: number;

	@Field(() => Int)
	classesCount: number;

	@Field(() => [ProgressSummary])
	recentProgress: ProgressSummary[];
}
