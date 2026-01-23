import {
	ObjectType,
	Field,
	ID,
	Int,
	Float,
	registerEnumType,
} from "@nestjs/graphql";

export enum CourseLevel {
	BEGINNER = "BEGINNER",
	INTERMEDIATE = "INTERMEDIATE",
	ADVANCED = "ADVANCED",
}

export enum CourseStatus {
	DRAFT = "DRAFT",
	PUBLISHED = "PUBLISHED",
	ARCHIVED = "ARCHIVED",
}

export enum EnrollmentStatus {
	ACTIVE = "ACTIVE",
	COMPLETED = "COMPLETED",
	DROPPED = "DROPPED",
	SUSPENDED = "SUSPENDED",
}

registerEnumType(CourseLevel, { name: "CourseLevel" });
registerEnumType(CourseStatus, { name: "CourseStatus" });
registerEnumType(EnrollmentStatus, { name: "EnrollmentStatus" });

@ObjectType()
export class CourseCategory {
	@Field(() => ID)
	id: string;

	@Field()
	name: string;

	@Field()
	slug: string;

	@Field({ nullable: true })
	description?: string;

	@Field({ nullable: true })
	iconUrl?: string;

	@Field(() => Int)
	orderIndex: number;

	@Field()
	createdAt: Date;
}

@ObjectType()
export class Course {
	@Field(() => ID)
	id: string;

	@Field()
	code: string;

	@Field()
	title: string;

	@Field({ nullable: true })
	description?: string;

	@Field({ nullable: true })
	shortDescription?: string;

	@Field({ nullable: true })
	thumbnailUrl?: string;

	@Field({ nullable: true })
	bannerUrl?: string;

	@Field()
	instructorId: string;

	@Field({ nullable: true })
	categoryId?: string;

	@Field(() => CourseCategory, { nullable: true })
	category?: CourseCategory;

	@Field()
	level: string;

	@Field()
	language: string;

	@Field(() => Int, { nullable: true })
	duration?: number;

	@Field(() => Int)
	price: number;

	@Field()
	currency: string;

	@Field()
	status: string;

	@Field()
	isPublic: boolean;

	@Field(() => Int, { nullable: true })
	maxEnrollments?: number;

	@Field({ nullable: true })
	startDate?: Date;

	@Field({ nullable: true })
	endDate?: Date;

	@Field({ nullable: true })
	prerequisites?: string;

	@Field({ nullable: true })
	learningOutcomes?: string;

	@Field({ nullable: true })
	syllabus?: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;

	@Field(() => [CourseModule], { nullable: true })
	modules?: CourseModule[];
}

@ObjectType()
export class CourseModule {
	@Field(() => ID)
	id: string;

	@Field()
	courseId: string;

	@Field()
	title: string;

	@Field({ nullable: true })
	description?: string;

	@Field(() => Int)
	orderIndex: number;

	@Field()
	isPublished: boolean;

	@Field({ nullable: true })
	unlockDate?: Date;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;

	@Field(() => [CourseLesson], { nullable: true })
	lessons?: CourseLesson[];
}

@ObjectType()
export class CourseLesson {
	@Field(() => ID)
	id: string;

	@Field()
	moduleId: string;

	@Field()
	title: string;

	@Field({ nullable: true })
	description?: string;

	@Field()
	contentType: string;

	@Field({ nullable: true })
	contentUrl?: string;

	@Field({ nullable: true })
	contentText?: string;

	@Field(() => Int, { nullable: true })
	duration?: number;

	@Field(() => Int)
	orderIndex: number;

	@Field()
	isPublished: boolean;

	@Field()
	isFree: boolean;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@ObjectType()
export class Enrollment {
	@Field(() => ID)
	id: string;

	@Field()
	courseId: string;

	@Field()
	studentId: string;

	@Field()
	status: string;

	@Field()
	enrolledAt: Date;

	@Field({ nullable: true })
	completedAt?: Date;

	@Field(() => Float)
	progress: number;

	@Field({ nullable: true })
	lastAccessedAt?: Date;

	@Field({ nullable: true })
	certificateId?: string;

	@Field({ nullable: true })
	paymentId?: string;

	@Field(() => Int, { nullable: true })
	amountPaid?: number;

	@Field(() => Course, { nullable: true })
	course?: Course;
}

@ObjectType()
export class LessonProgress {
	@Field(() => ID)
	id: string;

	@Field()
	enrollmentId: string;

	@Field()
	lessonId: string;

	@Field()
	status: string;

	@Field(() => Float)
	progressPercent: number;

	@Field(() => Int)
	timeSpent: number;

	@Field({ nullable: true })
	completedAt?: Date;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;

	@Field(() => CourseLesson, { nullable: true })
	lesson?: CourseLesson;
}

@ObjectType()
export class Certificate {
	@Field(() => ID)
	id: string;

	@Field()
	courseId: string;

	@Field()
	studentId: string;

	@Field()
	certificateNumber: string;

	@Field()
	issueDate: Date;

	@Field({ nullable: true })
	expiryDate?: Date;

	@Field({ nullable: true })
	grade?: string;

	@Field(() => Float, { nullable: true })
	score?: number;

	@Field({ nullable: true })
	templateId?: string;

	@Field({ nullable: true })
	pdfUrl?: string;

	@Field({ nullable: true })
	verificationUrl?: string;

	@Field(() => Course, { nullable: true })
	course?: Course;
}

@ObjectType()
export class CourseAnnouncement {
	@Field(() => ID)
	id: string;

	@Field()
	courseId: string;

	@Field()
	title: string;

	@Field()
	content: string;

	@Field()
	authorId: string;

	@Field()
	isPinned: boolean;

	@Field()
	sendEmail: boolean;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@ObjectType()
export class CoursesResponse {
	@Field(() => [Course])
	courses: Course[];

	@Field(() => Int)
	total: number;

	@Field(() => Int)
	page: number;

	@Field(() => Int)
	pageSize: number;
}

@ObjectType()
export class EnrollmentsResponse {
	@Field(() => [Enrollment])
	enrollments: Enrollment[];

	@Field(() => Int)
	total: number;
}
