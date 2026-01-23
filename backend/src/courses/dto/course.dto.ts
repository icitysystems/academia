import { InputType, Field, Int, Float } from "@nestjs/graphql";
import {
	IsNotEmpty,
	IsOptional,
	IsNumber,
	Min,
	Max,
	IsBoolean,
} from "class-validator";

@InputType()
export class CreateCourseInput {
	@Field()
	@IsNotEmpty()
	code: string;

	@Field()
	@IsNotEmpty()
	title: string;

	@Field({ nullable: true })
	@IsOptional()
	description?: string;

	@Field({ nullable: true })
	@IsOptional()
	shortDescription?: string;

	@Field({ nullable: true })
	@IsOptional()
	thumbnailUrl?: string;

	@Field({ nullable: true })
	@IsOptional()
	bannerUrl?: string;

	@Field({ nullable: true })
	@IsOptional()
	categoryId?: string;

	@Field({ defaultValue: "BEGINNER" })
	level: string;

	@Field({ defaultValue: "en" })
	language: string;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	duration?: number;

	@Field(() => Int, { defaultValue: 0 })
	@IsNumber()
	@Min(0)
	price: number;

	@Field({ defaultValue: "XAF" })
	currency: string;

	@Field({ defaultValue: false })
	@IsBoolean()
	isPublic: boolean;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	maxEnrollments?: number;

	@Field({ nullable: true })
	@IsOptional()
	startDate?: Date;

	@Field({ nullable: true })
	@IsOptional()
	endDate?: Date;

	@Field({ nullable: true })
	@IsOptional()
	prerequisites?: string;

	@Field({ nullable: true })
	@IsOptional()
	learningOutcomes?: string;

	@Field({ nullable: true })
	@IsOptional()
	syllabus?: string;
}

@InputType()
export class UpdateCourseInput {
	@Field({ nullable: true })
	@IsOptional()
	title?: string;

	@Field({ nullable: true })
	@IsOptional()
	description?: string;

	@Field({ nullable: true })
	@IsOptional()
	shortDescription?: string;

	@Field({ nullable: true })
	@IsOptional()
	thumbnailUrl?: string;

	@Field({ nullable: true })
	@IsOptional()
	bannerUrl?: string;

	@Field({ nullable: true })
	@IsOptional()
	categoryId?: string;

	@Field({ nullable: true })
	@IsOptional()
	level?: string;

	@Field({ nullable: true })
	@IsOptional()
	status?: string;

	@Field({ nullable: true })
	@IsOptional()
	language?: string;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	duration?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	price?: number;

	@Field({ nullable: true })
	@IsOptional()
	currency?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	isPublic?: boolean;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	maxEnrollments?: number;

	@Field({ nullable: true })
	@IsOptional()
	startDate?: Date;

	@Field({ nullable: true })
	@IsOptional()
	endDate?: Date;

	@Field({ nullable: true })
	@IsOptional()
	prerequisites?: string;

	@Field({ nullable: true })
	@IsOptional()
	learningOutcomes?: string;

	@Field({ nullable: true })
	@IsOptional()
	syllabus?: string;
}

@InputType()
export class CreateModuleInput {
	@Field()
	@IsNotEmpty()
	courseId: string;

	@Field()
	@IsNotEmpty()
	title: string;

	@Field({ nullable: true })
	@IsOptional()
	description?: string;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	orderIndex?: number;

	@Field({ defaultValue: false })
	@IsBoolean()
	isPublished: boolean;

	@Field({ nullable: true })
	@IsOptional()
	unlockDate?: Date;
}

@InputType()
export class CreateCourseLessonInput {
	@Field()
	@IsNotEmpty()
	moduleId: string;

	@Field()
	@IsNotEmpty()
	title: string;

	@Field({ nullable: true })
	@IsOptional()
	description?: string;

	@Field({ defaultValue: "VIDEO" })
	contentType: string;

	@Field({ nullable: true })
	@IsOptional()
	contentUrl?: string;

	@Field({ nullable: true })
	@IsOptional()
	contentText?: string;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	duration?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	orderIndex?: number;

	@Field({ defaultValue: false })
	@IsBoolean()
	isPublished: boolean;

	@Field({ defaultValue: false })
	@IsBoolean()
	isFree: boolean;
}

@InputType()
export class CoursesFilterInput {
	@Field({ nullable: true })
	@IsOptional()
	search?: string;

	@Field({ nullable: true })
	@IsOptional()
	categoryId?: string;

	@Field({ nullable: true })
	@IsOptional()
	level?: string;

	@Field({ nullable: true })
	@IsOptional()
	instructorId?: string;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	@Min(0)
	minPrice?: number;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsNumber()
	maxPrice?: number;

	@Field({ nullable: true })
	@IsOptional()
	language?: string;

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

@InputType()
export class UpdateProgressInput {
	@Field()
	@IsNotEmpty()
	lessonId: string;

	@Field(() => Float, { defaultValue: 0 })
	@IsNumber()
	@Min(0)
	@Max(100)
	progressPercent: number;

	@Field(() => Int, { defaultValue: 0 })
	@IsNumber()
	@Min(0)
	timeSpent: number;

	@Field({ defaultValue: false })
	@IsBoolean()
	isCompleted: boolean;
}

@InputType()
export class CreateAnnouncementInput {
	@Field()
	@IsNotEmpty()
	courseId: string;

	@Field()
	@IsNotEmpty()
	title: string;

	@Field()
	@IsNotEmpty()
	content: string;

	@Field({ defaultValue: false })
	@IsBoolean()
	isPinned: boolean;

	@Field({ defaultValue: false })
	@IsBoolean()
	sendEmail: boolean;
}
