import { InputType, Field, Int, Float } from "@nestjs/graphql";
import {
	IsNotEmpty,
	IsOptional,
	IsNumber,
	Min,
	Max,
	IsArray,
	IsBoolean,
} from "class-validator";

@InputType()
export class CreateAssignmentInput {
	@Field({ nullable: true })
	@IsOptional()
	lessonId?: string;

	@Field({ nullable: true })
	@IsOptional()
	classSubjectId?: string;

	@Field()
	@IsNotEmpty()
	title: string;

	@Field({ nullable: true })
	@IsOptional()
	description?: string;

	@Field({ nullable: true })
	@IsOptional()
	instructions?: string;

	@Field({ nullable: true })
	@IsOptional()
	dueDate?: Date;

	@Field(() => Int, { defaultValue: 100 })
	@IsNumber()
	@Min(1)
	totalMarks: number;

	@Field({ defaultValue: false })
	@IsBoolean()
	allowLate: boolean;

	@Field(() => Float, { defaultValue: 0 })
	@IsNumber()
	@Min(0)
	@Max(100)
	latePenalty: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(1)
	maxFileSize?: number;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	allowedFileTypes?: string[];

	@Field({ nullable: true })
	@IsOptional()
	rubric?: string;
}

@InputType()
export class UpdateAssignmentInput {
	@Field({ nullable: true })
	@IsOptional()
	title?: string;

	@Field({ nullable: true })
	@IsOptional()
	description?: string;

	@Field({ nullable: true })
	@IsOptional()
	instructions?: string;

	@Field({ nullable: true })
	@IsOptional()
	dueDate?: Date;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(1)
	totalMarks?: number;

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	allowLate?: boolean;

	@Field(() => Float, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100)
	latePenalty?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(1)
	maxFileSize?: number;

	@Field(() => [String], { nullable: true })
	@IsOptional()
	@IsArray()
	allowedFileTypes?: string[];

	@Field({ nullable: true })
	@IsOptional()
	rubric?: string;

	@Field({ nullable: true })
	@IsOptional()
	status?: string;
}

@InputType()
export class SubmitAssignmentInput {
	@Field()
	@IsNotEmpty()
	assignmentId: string;

	@Field({ nullable: true })
	@IsOptional()
	enrollmentId?: string;

	@Field({ nullable: true })
	@IsOptional()
	content?: string;

	@Field({ nullable: true })
	@IsOptional()
	fileUrl?: string;

	@Field({ nullable: true })
	@IsOptional()
	fileName?: string;
}

@InputType()
export class GradeSubmissionInput {
	@Field()
	@IsNotEmpty()
	submissionId: string;

	@Field(() => Float)
	@IsNumber()
	@Min(0)
	score: number;

	@Field({ nullable: true })
	@IsOptional()
	feedback?: string;
}

@InputType()
export class AssignmentFilterInput {
	@Field({ nullable: true })
	@IsOptional()
	search?: string;

	@Field({ nullable: true })
	@IsOptional()
	classSubjectId?: string;

	@Field({ nullable: true })
	@IsOptional()
	status?: string;

	@Field(() => Int, { defaultValue: 1 })
	@IsNumber()
	@Min(1)
	page: number;

	@Field(() => Int, { defaultValue: 20 })
	@IsNumber()
	@Min(1)
	@Max(100)
	pageSize: number;
}
