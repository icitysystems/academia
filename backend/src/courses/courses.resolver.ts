import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CoursesService } from "./courses.service";
import {
	Course,
	CourseModule,
	CourseLesson,
	Enrollment,
	LessonProgress,
	Certificate,
	CourseCategory,
	CourseAnnouncement,
	CoursesResponse,
	EnrollmentsResponse,
} from "./models/course.model";
import {
	CreateCourseInput,
	UpdateCourseInput,
	CreateModuleInput,
	CreateCourseLessonInput,
	CoursesFilterInput,
	UpdateProgressInput,
	CreateAnnouncementInput,
} from "./dto/course.dto";

@Resolver(() => Course)
export class CoursesResolver {
	constructor(private coursesService: CoursesService) {}

	// ========== Public Queries ==========

	@Query(() => CoursesResponse)
	async courses(
		@Args("filter", { nullable: true }) filter?: CoursesFilterInput,
	): Promise<CoursesResponse> {
		return this.coursesService.getCourses(filter || { page: 1, pageSize: 20 });
	}

	@Query(() => Course)
	async course(@Args("id", { type: () => ID }) id: string): Promise<Course> {
		return this.coursesService.getCourse(id);
	}

	@Query(() => [CourseCategory])
	async courseCategories(): Promise<CourseCategory[]> {
		return this.coursesService.getCategories();
	}

	@Query(() => [CourseAnnouncement])
	async courseAnnouncements(
		@Args("courseId", { type: () => ID }) courseId: string,
	): Promise<CourseAnnouncement[]> {
		return this.coursesService.getCourseAnnouncements(courseId);
	}

	// ========== Instructor Mutations ==========

	@UseGuards(GqlAuthGuard)
	@Mutation(() => Course)
	async createCourse(
		@CurrentUser() user: { id: string },
		@Args("input") input: CreateCourseInput,
	): Promise<Course> {
		return this.coursesService.createCourse(user.id, input);
	}

	@UseGuards(GqlAuthGuard)
	@Mutation(() => Course)
	async updateCourse(
		@CurrentUser() user: { id: string },
		@Args("id", { type: () => ID }) id: string,
		@Args("input") input: UpdateCourseInput,
	): Promise<Course> {
		return this.coursesService.updateCourse(id, user.id, input);
	}

	@UseGuards(GqlAuthGuard)
	@Mutation(() => Course)
	async publishCourse(
		@CurrentUser() user: { id: string },
		@Args("id", { type: () => ID }) id: string,
	): Promise<Course> {
		return this.coursesService.publishCourse(id, user.id);
	}

	@UseGuards(GqlAuthGuard)
	@Mutation(() => Boolean)
	async deleteCourse(
		@CurrentUser() user: { id: string },
		@Args("id", { type: () => ID }) id: string,
	): Promise<boolean> {
		return this.coursesService.deleteCourse(id, user.id);
	}

	@UseGuards(GqlAuthGuard)
	@Query(() => [Course])
	async myCourses(@CurrentUser() user: { id: string }): Promise<Course[]> {
		return this.coursesService.getInstructorCourses(user.id);
	}

	@UseGuards(GqlAuthGuard)
	@Mutation(() => CourseModule)
	async createModule(
		@CurrentUser() user: { id: string },
		@Args("input") input: CreateModuleInput,
	): Promise<CourseModule> {
		return this.coursesService.createModule(user.id, input);
	}

	@UseGuards(GqlAuthGuard)
	@Mutation(() => Boolean)
	async deleteModule(
		@CurrentUser() user: { id: string },
		@Args("id", { type: () => ID }) id: string,
	): Promise<boolean> {
		return this.coursesService.deleteModule(id, user.id);
	}

	@UseGuards(GqlAuthGuard)
	@Mutation(() => CourseLesson)
	async createCourseLesson(
		@CurrentUser() user: { id: string },
		@Args("input") input: CreateCourseLessonInput,
	): Promise<CourseLesson> {
		return this.coursesService.createLesson(user.id, input);
	}

	@UseGuards(GqlAuthGuard)
	@Mutation(() => Boolean)
	async deleteLesson(
		@CurrentUser() user: { id: string },
		@Args("id", { type: () => ID }) id: string,
	): Promise<boolean> {
		return this.coursesService.deleteLesson(id, user.id);
	}

	@UseGuards(GqlAuthGuard)
	@Mutation(() => CourseAnnouncement)
	async createAnnouncement(
		@CurrentUser() user: { id: string },
		@Args("input") input: CreateAnnouncementInput,
	): Promise<CourseAnnouncement> {
		return this.coursesService.createAnnouncement(user.id, input);
	}

	// ========== Student Mutations & Queries ==========

	@UseGuards(GqlAuthGuard)
	@Mutation(() => Enrollment)
	async enrollInCourse(
		@CurrentUser() user: { id: string },
		@Args("courseId", { type: () => ID }) courseId: string,
	): Promise<Enrollment> {
		return this.coursesService.enrollInCourse(user.id, courseId);
	}

	@UseGuards(GqlAuthGuard)
	@Query(() => Enrollment, { nullable: true })
	async myEnrollment(
		@CurrentUser() user: { id: string },
		@Args("courseId", { type: () => ID }) courseId: string,
	): Promise<Enrollment | null> {
		try {
			return await this.coursesService.getEnrollment(user.id, courseId);
		} catch {
			return null;
		}
	}

	@UseGuards(GqlAuthGuard)
	@Query(() => EnrollmentsResponse)
	async myEnrollments(
		@CurrentUser() user: { id: string },
	): Promise<EnrollmentsResponse> {
		return this.coursesService.getUserEnrollments(user.id);
	}

	@UseGuards(GqlAuthGuard)
	@Mutation(() => LessonProgress)
	async updateLessonProgress(
		@CurrentUser() user: { id: string },
		@Args("enrollmentId", { type: () => ID }) enrollmentId: string,
		@Args("input") input: UpdateProgressInput,
	): Promise<LessonProgress> {
		return this.coursesService.updateLessonProgress(
			user.id,
			enrollmentId,
			input,
		);
	}

	@UseGuards(GqlAuthGuard)
	@Mutation(() => Certificate)
	async generateCertificate(
		@CurrentUser() user: { id: string },
		@Args("enrollmentId", { type: () => ID }) enrollmentId: string,
	): Promise<Certificate> {
		return this.coursesService.generateCertificate(user.id, enrollmentId);
	}

	@UseGuards(GqlAuthGuard)
	@Query(() => [Certificate])
	async myCertificates(
		@CurrentUser() user: { id: string },
	): Promise<Certificate[]> {
		return this.coursesService.getUserCertificates(user.id);
	}
}
