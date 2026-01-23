import {
	Resolver,
	Query,
	Mutation,
	Args,
	ID,
	Int,
	Context,
} from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import {
	School,
	Class,
	Subject,
	ClassSubject,
	Syllabus,
	Lesson,
	LessonAttachment,
	ProgressSummary,
	LessonReport,
	DashboardSummary,
	SchoolStatus,
	ClassStatus,
	LessonStatus,
} from "./models/lesson-tracking.models";
import {
	CreateSchoolInput,
	UpdateSchoolInput,
	CreateClassInput,
	UpdateClassInput,
	CreateSubjectInput,
	UpdateSubjectInput,
	AssignSubjectInput,
	UpdateClassSubjectInput,
	CreateSyllabusInput,
	UpdateSyllabusInput,
	CreateSyllabusUnitInput,
	CreateSyllabusChapterInput,
	CreateSyllabusTopicInput,
	CreateLessonInput,
	UpdateLessonInput,
	GenerateReportInput,
	AddAttachmentInput,
	AddLinkInput,
	ExportReportInput,
} from "./dto/lesson-tracking.inputs";
import { SchoolsService } from "./services/schools.service";
import { ClassesService } from "./services/classes.service";
import { SubjectsService } from "./services/subjects.service";
import { SyllabiService } from "./services/syllabi.service";
import { LessonsService } from "./services/lessons.service";
import { AnalyticsService } from "./services/analytics.service";

@Resolver()
@UseGuards(GqlAuthGuard)
export class LessonsResolver {
	constructor(
		private schoolsService: SchoolsService,
		private classesService: ClassesService,
		private subjectsService: SubjectsService,
		private syllabiService: SyllabiService,
		private lessonsService: LessonsService,
		private analyticsService: AnalyticsService,
	) {}

	// ============================================
	// School Queries
	// ============================================

	@Query(() => [School])
	async schools(
		@Context() context,
		@Args("status", { type: () => SchoolStatus, nullable: true })
		status?: SchoolStatus,
	) {
		const userId = context.req.user.userId;
		return this.schoolsService.findAll(userId, status);
	}

	@Query(() => School, { nullable: true })
	async school(@Context() context, @Args("id", { type: () => ID }) id: string) {
		const userId = context.req.user.userId;
		return this.schoolsService.findOne(id, userId);
	}

	@Query(() => [School])
	async mySchools(@Context() context) {
		const userId = context.req.user.userId;
		return this.schoolsService.findAll(userId);
	}

	// ============================================
	// Class Queries
	// ============================================

	@Query(() => [Class])
	async classes(
		@Context() context,
		@Args("schoolId", { type: () => ID, nullable: true }) schoolId?: string,
		@Args("status", { type: () => ClassStatus, nullable: true })
		status?: ClassStatus,
	) {
		const userId = context.req.user.userId;
		return this.classesService.findAll(userId, schoolId, status);
	}

	@Query(() => Class, { nullable: true })
	async class(@Context() context, @Args("id", { type: () => ID }) id: string) {
		const userId = context.req.user.userId;
		return this.classesService.findOne(id, userId);
	}

	@Query(() => [Class])
	async myClasses(@Context() context) {
		const userId = context.req.user.userId;
		return this.classesService.findAll(userId);
	}

	// ============================================
	// Subject Queries
	// ============================================

	@Query(() => [Subject])
	async subjects(
		@Args("search", { type: () => String, nullable: true }) search?: string,
	) {
		return this.subjectsService.findAll(search);
	}

	@Query(() => Subject, { nullable: true })
	async subject(@Args("id", { type: () => ID }) id: string) {
		return this.subjectsService.findOne(id);
	}

	@Query(() => ClassSubject, { nullable: true })
	async classSubject(@Args("id", { type: () => ID }) id: string) {
		return this.subjectsService.findClassSubject(id);
	}

	@Query(() => [ClassSubject])
	async classSubjects(
		@Args("classId", { type: () => ID, nullable: true }) classId?: string,
		@Args("teacherId", { type: () => ID, nullable: true }) teacherId?: string,
	) {
		return this.subjectsService.findClassSubjects(classId, teacherId);
	}

	// ============================================
	// Syllabus Queries
	// ============================================

	@Query(() => Syllabus, { nullable: true })
	async syllabus(@Args("id", { type: () => ID }) id: string) {
		return this.syllabiService.findOne(id);
	}

	@Query(() => [Syllabus])
	async syllabusTemplates(
		@Args("templateSource", { type: () => String, nullable: true })
		templateSource?: string,
	) {
		return this.syllabiService.findTemplates(templateSource);
	}

	// ============================================
	// Lesson Queries
	// ============================================

	@Query(() => Lesson, { nullable: true })
	async lesson(@Args("id", { type: () => ID }) id: string) {
		return this.lessonsService.findOne(id);
	}

	@Query(() => [Lesson])
	async lessons(
		@Args("classId", { type: () => ID, nullable: true }) classId?: string,
		@Args("classSubjectId", { type: () => ID, nullable: true })
		classSubjectId?: string,
		@Args("teacherId", { type: () => ID, nullable: true }) teacherId?: string,
		@Args("dateFrom", { nullable: true }) dateFrom?: Date,
		@Args("dateTo", { nullable: true }) dateTo?: Date,
		@Args("status", { type: () => LessonStatus, nullable: true })
		status?: LessonStatus,
	) {
		return this.lessonsService.findAll({
			classId,
			classSubjectId,
			teacherId,
			dateFrom,
			dateTo,
			status,
		});
	}

	// ============================================
	// Analytics Queries
	// ============================================

	@Query(() => ProgressSummary)
	async progressSummary(
		@Args("classSubjectId", { type: () => ID }) classSubjectId: string,
	) {
		return this.analyticsService.getProgressSummary(classSubjectId);
	}

	@Query(() => LessonReport)
	async lessonReport(@Args("input") input: GenerateReportInput) {
		return this.analyticsService.getLessonReport(input);
	}

	@Query(() => DashboardSummary)
	async dashboardSummary(@Context() context) {
		const userId = context.req.user.userId;
		return this.analyticsService.getDashboardSummary(userId);
	}

	// ============================================
	// School Mutations
	// ============================================

	@Mutation(() => School)
	async createSchool(
		@Context() context,
		@Args("input") input: CreateSchoolInput,
	) {
		const userId = context.req.user.userId;
		return this.schoolsService.createSchool(userId, input);
	}

	@Mutation(() => School)
	async updateSchool(
		@Context() context,
		@Args("id", { type: () => ID }) id: string,
		@Args("input") input: UpdateSchoolInput,
	) {
		const userId = context.req.user.userId;
		return this.schoolsService.update(id, userId, input);
	}

	@Mutation(() => Boolean)
	async deleteSchool(
		@Context() context,
		@Args("id", { type: () => ID }) id: string,
	) {
		const userId = context.req.user.userId;
		return this.schoolsService.delete(id, userId);
	}

	@Mutation(() => Boolean)
	async addTeacherToSchool(
		@Args("schoolId", { type: () => ID }) schoolId: string,
		@Args("teacherId", { type: () => ID }) teacherId: string,
		@Args("isPrimary", { type: () => Boolean, nullable: true })
		isPrimary?: boolean,
	) {
		return this.schoolsService.addTeacherToSchool(
			schoolId,
			teacherId,
			isPrimary,
		);
	}

	@Mutation(() => Boolean)
	async removeTeacherFromSchool(
		@Args("schoolId", { type: () => ID }) schoolId: string,
		@Args("teacherId", { type: () => ID }) teacherId: string,
	) {
		return this.schoolsService.removeTeacherFromSchool(schoolId, teacherId);
	}

	// ============================================
	// Class Mutations
	// ============================================

	@Mutation(() => Class)
	async createClass(
		@Context() context,
		@Args("input") input: CreateClassInput,
	) {
		const userId = context.req.user.userId;
		return this.classesService.createClass(userId, input);
	}

	@Mutation(() => Class)
	async updateClass(
		@Context() context,
		@Args("id", { type: () => ID }) id: string,
		@Args("input") input: UpdateClassInput,
	) {
		const userId = context.req.user.userId;
		return this.classesService.update(id, userId, input);
	}

	@Mutation(() => Boolean)
	async deleteClass(
		@Context() context,
		@Args("id", { type: () => ID }) id: string,
	) {
		const userId = context.req.user.userId;
		return this.classesService.delete(id, userId);
	}

	@Mutation(() => Class)
	async archiveClass(
		@Context() context,
		@Args("id", { type: () => ID }) id: string,
	) {
		const userId = context.req.user.userId;
		return this.classesService.archiveClass(id, userId);
	}

	// ============================================
	// Subject Mutations
	// ============================================

	@Mutation(() => Subject)
	async createSubject(@Args("input") input: CreateSubjectInput) {
		return this.subjectsService.createSubject(input);
	}

	@Mutation(() => Subject)
	async updateSubject(
		@Args("id", { type: () => ID }) id: string,
		@Args("input") input: UpdateSubjectInput,
	) {
		return this.subjectsService.update(id, input);
	}

	@Mutation(() => ClassSubject)
	async assignSubjectToClass(@Args("input") input: AssignSubjectInput) {
		return this.subjectsService.assignSubjectToClass(input);
	}

	@Mutation(() => ClassSubject)
	async updateClassSubject(
		@Args("id", { type: () => ID }) id: string,
		@Args("input") input: UpdateClassSubjectInput,
	) {
		return this.subjectsService.updateClassSubject(id, input);
	}

	@Mutation(() => Boolean)
	async removeSubjectFromClass(@Args("id", { type: () => ID }) id: string) {
		return this.subjectsService.removeSubjectFromClass(id);
	}

	// ============================================
	// Syllabus Mutations
	// ============================================

	@Mutation(() => Syllabus)
	async createSyllabus(
		@Context() context,
		@Args("input") input: CreateSyllabusInput,
	) {
		const userId = context.req.user.userId;
		return this.syllabiService.createSyllabus(userId, input);
	}

	@Mutation(() => Syllabus)
	async updateSyllabus(
		@Args("id", { type: () => ID }) id: string,
		@Args("input") input: UpdateSyllabusInput,
	) {
		return this.syllabiService.update(id, input);
	}

	@Mutation(() => Syllabus)
	async importSyllabusTemplate(
		@Context() context,
		@Args("classSubjectId", { type: () => ID }) classSubjectId: string,
		@Args("templateId", { type: () => ID }) templateId: string,
	) {
		const userId = context.req.user.userId;
		return this.syllabiService.importTemplate(
			classSubjectId,
			templateId,
			userId,
		);
	}

	@Mutation(() => Syllabus)
	async createSyllabusUnit(@Args("input") input: CreateSyllabusUnitInput) {
		return this.syllabiService.createUnit(input);
	}

	@Mutation(() => Syllabus)
	async createSyllabusChapter(
		@Args("input") input: CreateSyllabusChapterInput,
	) {
		return this.syllabiService.createChapter(input);
	}

	@Mutation(() => Syllabus)
	async createSyllabusTopic(@Args("input") input: CreateSyllabusTopicInput) {
		return this.syllabiService.createTopic(input);
	}

	// ============================================
	// Lesson Mutations
	// ============================================

	@Mutation(() => Lesson)
	async createLesson(
		@Context() context,
		@Args("input") input: CreateLessonInput,
	) {
		const userId = context.req.user.userId;
		return this.lessonsService.createLesson(userId, input);
	}

	@Mutation(() => Lesson)
	async updateLesson(
		@Context() context,
		@Args("id", { type: () => ID }) id: string,
		@Args("input") input: UpdateLessonInput,
	) {
		const userId = context.req.user.userId;
		return this.lessonsService.update(id, userId, input);
	}

	@Mutation(() => Boolean)
	async deleteLesson(
		@Context() context,
		@Args("id", { type: () => ID }) id: string,
	) {
		const userId = context.req.user.userId;
		return this.lessonsService.delete(id, userId);
	}

	@Mutation(() => [Lesson])
	async bulkCreateLessons(
		@Context() context,
		@Args("input", { type: () => [CreateLessonInput] })
		input: CreateLessonInput[],
	) {
		const userId = context.req.user.userId;
		return this.lessonsService.bulkCreate(userId, input);
	}

	@Mutation(() => Boolean)
	async deleteLessonAttachment(@Args("id", { type: () => ID }) id: string) {
		return this.lessonsService.deleteAttachment(id);
	}

	@Mutation(() => LessonAttachment)
	async addLessonAttachment(@Args("input") input: AddAttachmentInput) {
		return this.lessonsService.addAttachment(
			input.lessonId,
			input.fileName,
			input.fileUrl,
			input.fileType,
			input.fileSize,
		);
	}

	@Mutation(() => LessonAttachment)
	async addLessonLink(@Args("input") input: AddLinkInput) {
		return this.lessonsService.addLink(input.lessonId, input.url, input.title);
	}

	@Mutation(() => String)
	async exportLessonReport(
		@Context() context,
		@Args("input") input: ExportReportInput,
	) {
		const userId = context.req.user.userId;
		return this.analyticsService.exportReport(userId, input);
	}
}
