import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GraphQLJSON } from "graphql-type-json";
import { QuickLessonEntryService } from "./quick-lesson-entry.service";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";

/**
 * Quick Lesson Entry Resolver
 * Implements rapid lesson logging endpoints for teachers
 */
@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles("FACULTY")
export class QuickLessonEntryResolver {
	constructor(private quickLessonService: QuickLessonEntryService) {}

	@Mutation(() => GraphQLJSON, {
		name: "quickLessonEntry",
		description: "Create a quick lesson entry with minimal required fields",
	})
	async createQuickLesson(
		@CurrentUser() user: any,
		@Args("classSubjectId", { type: () => ID }) classSubjectId: string,
		@Args("date") date: string,
		@Args("topicTitle") topicTitle: string,
		@Args("duration", { nullable: true }) duration?: number,
		@Args("objectives", { type: () => [String], nullable: true })
		objectives?: string[],
		@Args("activities", { type: () => [String], nullable: true })
		activities?: string[],
		@Args("homework", { nullable: true }) homework?: string,
		@Args("notes", { nullable: true }) notes?: string,
		@Args("resources", { type: () => [String], nullable: true })
		resources?: string[],
		@Args("presentCount", { nullable: true }) presentCount?: number,
		@Args("absentCount", { nullable: true }) absentCount?: number,
		@Args("totalStudents", { nullable: true }) totalStudents?: number,
	) {
		return this.quickLessonService.createQuickLesson(user.sub, {
			classSubjectId,
			date: new Date(date),
			topicTitle,
			duration,
			objectives,
			activities,
			homework,
			notes,
			resources,
			attendance: totalStudents
				? {
						present: presentCount || 0,
						absent: absentCount || 0,
						total: totalStudents,
					}
				: undefined,
		});
	}

	@Mutation(() => GraphQLJSON, {
		name: "quickLessonBatch",
		description: "Create multiple lesson entries in batch",
	})
	async createQuickLessonBatch(
		@CurrentUser() user: any,
		@Args("lessons", { type: () => GraphQLJSON }) lessons: any[],
	) {
		return this.quickLessonService.createQuickLessonBatch(user.sub, {
			lessons: lessons.map((l) => ({
				...l,
				date: new Date(l.date),
			})),
		});
	}

	@Query(() => GraphQLJSON, {
		name: "suggestedTopics",
		description: "Get suggested topics based on syllabus for a class subject",
	})
	async getSuggestedTopics(
		@Args("classSubjectId", { type: () => ID }) classSubjectId: string,
		@Args("date", { nullable: true }) date?: string,
	) {
		return this.quickLessonService.getSuggestedTopics(
			classSubjectId,
			date ? new Date(date) : new Date(),
		);
	}

	@Query(() => GraphQLJSON, {
		name: "recentLessons",
		description: "Get recent lessons for quick reference",
	})
	async getRecentLessons(
		@CurrentUser() user: any,
		@Args("limit", { nullable: true }) limit?: number,
	) {
		return this.quickLessonService.getRecentLessons(user.sub, limit);
	}

	@Mutation(() => GraphQLJSON, {
		name: "cloneLesson",
		description: "Clone an existing lesson to a new date",
	})
	async cloneLesson(
		@CurrentUser() user: any,
		@Args("lessonId", { type: () => ID }) lessonId: string,
		@Args("newDate") newDate: string,
		@Args("newClassSubjectId", { type: () => ID, nullable: true })
		newClassSubjectId?: string,
	) {
		return this.quickLessonService.cloneLesson(
			user.sub,
			lessonId,
			new Date(newDate),
			newClassSubjectId,
		);
	}

	@Mutation(() => GraphQLJSON, {
		name: "saveLessonTemplate",
		description: "Save a lesson as a reusable template",
	})
	async saveLessonTemplate(
		@CurrentUser() user: any,
		@Args("lessonId", { type: () => ID }) lessonId: string,
		@Args("templateName") templateName: string,
	) {
		return this.quickLessonService.saveAsTemplate(
			user.sub,
			lessonId,
			templateName,
		);
	}

	@Query(() => GraphQLJSON, {
		name: "lessonTemplates",
		description: "Get saved lesson templates",
	})
	async getLessonTemplates(@CurrentUser() user: any) {
		return this.quickLessonService.getTemplates(user.sub);
	}

	@Mutation(() => GraphQLJSON, {
		name: "createLessonFromTemplate",
		description: "Create a new lesson from a saved template",
	})
	async createFromTemplate(
		@CurrentUser() user: any,
		@Args("templateId", { type: () => ID }) templateId: string,
		@Args("classSubjectId", { type: () => ID }) classSubjectId: string,
		@Args("date") date: string,
	) {
		return this.quickLessonService.createFromTemplate(
			user.sub,
			templateId,
			classSubjectId,
			new Date(date),
		);
	}

	@Query(() => GraphQLJSON, {
		name: "teachingGaps",
		description: "Get missing lessons/teaching gaps in a date range",
	})
	async getTeachingGaps(
		@CurrentUser() user: any,
		@Args("startDate") startDate: string,
		@Args("endDate") endDate: string,
	) {
		return this.quickLessonService.getTeachingGaps(
			user.sub,
			new Date(startDate),
			new Date(endDate),
		);
	}

	@Mutation(() => GraphQLJSON, {
		name: "parseVoiceLessonInput",
		description: "Parse voice transcript into lesson data",
	})
	async parseVoiceInput(
		@CurrentUser() user: any,
		@Args("transcript") transcript: string,
		@Args("classSubjectId", { type: () => ID }) classSubjectId: string,
	) {
		return this.quickLessonService.parseVoiceInput(
			user.sub,
			transcript,
			classSubjectId,
		);
	}
}
