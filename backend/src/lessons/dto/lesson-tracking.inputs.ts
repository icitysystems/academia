import { InputType, Field, ID, Int, Float } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import {
	SchoolStatus,
	ClassStatus,
	TeachingMethod,
	LessonStatus,
} from "../models/lesson-tracking.models";

// ============================================
// School Inputs
// ============================================

@InputType()
export class CreateSchoolInput {
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
}

@InputType()
export class UpdateSchoolInput {
	@Field({ nullable: true })
	name?: string;

	@Field({ nullable: true })
	location?: string;

	@Field({ nullable: true })
	address?: string;

	@Field({ nullable: true })
	phone?: string;

	@Field({ nullable: true })
	email?: string;

	@Field(() => SchoolStatus, { nullable: true })
	status?: SchoolStatus;
}

// ============================================
// Class Inputs
// ============================================

@InputType()
export class CreateClassInput {
	@Field(() => ID)
	schoolId: string;

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
}

@InputType()
export class UpdateClassInput {
	@Field({ nullable: true })
	name?: string;

	@Field({ nullable: true })
	gradeLevel?: string;

	@Field({ nullable: true })
	section?: string;

	@Field({ nullable: true })
	academicYear?: string;

	@Field({ nullable: true })
	term?: string;

	@Field(() => Int, { nullable: true })
	studentCount?: number;

	@Field(() => GraphQLJSON, { nullable: true })
	schedule?: any;

	@Field(() => ClassStatus, { nullable: true })
	status?: ClassStatus;
}

// ============================================
// Subject Inputs
// ============================================

@InputType()
export class CreateSubjectInput {
	@Field()
	name: string;

	@Field({ nullable: true })
	code?: string;

	@Field({ nullable: true })
	description?: string;
}

@InputType()
export class UpdateSubjectInput {
	@Field({ nullable: true })
	name?: string;

	@Field({ nullable: true })
	code?: string;

	@Field({ nullable: true })
	description?: string;
}

// ============================================
// Class Subject Inputs
// ============================================

@InputType()
export class AssignSubjectInput {
	@Field(() => ID)
	classId: string;

	@Field(() => ID)
	subjectId: string;

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
}

@InputType()
export class UpdateClassSubjectInput {
	@Field(() => Float, { nullable: true })
	totalHours?: number;

	@Field(() => Float, { nullable: true })
	weeklyHours?: number;

	@Field({ nullable: true })
	startDate?: Date;

	@Field({ nullable: true })
	endDate?: Date;
}

// ============================================
// Syllabus Inputs
// ============================================

@InputType()
export class CreateSyllabusInput {
	@Field(() => ID)
	classSubjectId: string;

	@Field()
	name: string;

	@Field({ nullable: true })
	description?: string;

	@Field({ nullable: true })
	documentUrl?: string;

	@Field({ nullable: true })
	isTemplate?: boolean;

	@Field({ nullable: true })
	templateSource?: string;
}

@InputType()
export class UpdateSyllabusInput {
	@Field({ nullable: true })
	name?: string;

	@Field({ nullable: true })
	description?: string;

	@Field({ nullable: true })
	documentUrl?: string;
}

@InputType()
export class CreateSyllabusUnitInput {
	@Field(() => ID)
	syllabusId: string;

	@Field()
	title: string;

	@Field({ nullable: true })
	description?: string;

	@Field(() => Int)
	orderIndex: number;

	@Field(() => Float, { nullable: true })
	estimatedHours?: number;
}

@InputType()
export class CreateSyllabusChapterInput {
	@Field(() => ID)
	unitId: string;

	@Field()
	title: string;

	@Field({ nullable: true })
	description?: string;

	@Field(() => Int)
	orderIndex: number;

	@Field(() => Float, { nullable: true })
	estimatedHours?: number;
}

@InputType()
export class CreateSyllabusTopicInput {
	@Field(() => ID)
	chapterId: string;

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
}

// ============================================
// Lesson Inputs
// ============================================

@InputType()
export class AttendanceInput {
	@Field(() => Int)
	present: number;

	@Field(() => Int)
	total: number;
}

@InputType()
export class CreateLessonInput {
	@Field(() => ID)
	classId: string;

	@Field(() => ID)
	classSubjectId: string;

	@Field()
	date: Date;

	@Field(() => Float)
	duration: number;

	@Field(() => TeachingMethod, { nullable: true })
	teachingMethod?: TeachingMethod;

	@Field(() => [String], { nullable: true })
	materialsUsed?: string[];

	@Field({ nullable: true })
	homeworkAssigned?: string;

	@Field({ nullable: true })
	notes?: string;

	@Field(() => AttendanceInput, { nullable: true })
	attendance?: AttendanceInput;

	@Field(() => LessonStatus, { nullable: true })
	status?: LessonStatus;

	@Field(() => [ID])
	topicIds: string[];
}

@InputType()
export class UpdateLessonInput {
	@Field({ nullable: true })
	date?: Date;

	@Field(() => Float, { nullable: true })
	duration?: number;

	@Field(() => TeachingMethod, { nullable: true })
	teachingMethod?: TeachingMethod;

	@Field(() => [String], { nullable: true })
	materialsUsed?: string[];

	@Field({ nullable: true })
	homeworkAssigned?: string;

	@Field({ nullable: true })
	notes?: string;

	@Field(() => AttendanceInput, { nullable: true })
	attendance?: AttendanceInput;

	@Field(() => LessonStatus, { nullable: true })
	status?: LessonStatus;

	@Field(() => [ID], { nullable: true })
	topicIds?: string[];
}

// ============================================
// Report Inputs
// ============================================

@InputType()
export class GenerateReportInput {
	@Field(() => ID, { nullable: true })
	teacherId?: string;

	@Field(() => ID, { nullable: true })
	schoolId?: string;

	@Field(() => ID, { nullable: true })
	classId?: string;

	@Field(() => ID, { nullable: true })
	subjectId?: string;

	@Field()
	dateFrom: Date;

	@Field()
	dateTo: Date;
}

export enum ExportFormat {
	PDF = "PDF",
	EXCEL = "EXCEL",
	CSV = "CSV",
}

// ============================================
// Attachment Inputs
// ============================================

@InputType()
export class AddAttachmentInput {
	@Field(() => ID)
	lessonId: string;

	@Field()
	fileName: string;

	@Field()
	fileUrl: string;

	@Field()
	fileType: string;

	@Field(() => Int, { nullable: true })
	fileSize?: number;
}

@InputType()
export class AddLinkInput {
	@Field(() => ID)
	lessonId: string;

	@Field()
	url: string;

	@Field()
	title: string;
}

// ============================================
// Export Report Inputs
// ============================================

import { registerEnumType } from "@nestjs/graphql";

registerEnumType(ExportFormat, {
	name: "ExportFormat",
	description: "Available export formats for reports",
});

@InputType()
export class ExportReportInput {
	@Field(() => ID, { nullable: true })
	schoolId?: string;

	@Field(() => ID, { nullable: true })
	classId?: string;

	@Field(() => ID, { nullable: true })
	classSubjectId?: string;

	@Field()
	dateFrom: Date;

	@Field()
	dateTo: Date;

	@Field(() => ExportFormat)
	format: ExportFormat;
}
