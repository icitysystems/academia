import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GraphQLJSON } from "graphql-type-json";
import { CalendarService } from "./calendar.service";
import { GqlAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/types";

/**
 * Calendar Resolver
 * Implements calendar and scheduling endpoints per Specification 3A.1, 3A.2, 3A.5
 */
@Resolver()
export class CalendarResolver {
	constructor(private calendarService: CalendarService) {}

	// ============================
	// Academic Calendar (Public)
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Get academic calendar events",
	})
	async academicCalendar(
		@Args("startDate", { nullable: true }) startDate?: string,
		@Args("endDate", { nullable: true }) endDate?: string,
		@Args("type", { nullable: true }) type?: string,
	) {
		return this.calendarService.getAcademicCalendar({
			startDate: startDate ? new Date(startDate) : undefined,
			endDate: endDate ? new Date(endDate) : undefined,
			type,
		});
	}

	// ============================
	// Student Calendar (3A.1)
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Get personalized student calendar with enrolled courses",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.STUDENT)
	async studentCalendar(
		@CurrentUser() user: any,
		@Args("startDate", { nullable: true }) startDate?: string,
		@Args("endDate", { nullable: true }) endDate?: string,
	) {
		return this.calendarService.getStudentCalendar(user.id, {
			startDate: startDate ? new Date(startDate) : undefined,
			endDate: endDate ? new Date(endDate) : undefined,
		});
	}

	@Query(() => GraphQLJSON, {
		description: "Get upcoming deadlines for student",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.STUDENT)
	async myDeadlines(
		@CurrentUser() user: any,
		@Args("days", { type: () => Int, nullable: true }) days?: number,
	) {
		const calendar = await this.calendarService.getStudentCalendar(user.id, {
			endDate: new Date(Date.now() + (days || 30) * 24 * 60 * 60 * 1000),
		});
		return calendar.upcomingDeadlines;
	}

	@Query(() => GraphQLJSON, {
		name: "upcomingDeadlines",
		description:
			"Get upcoming deadlines for student (alias for frontend compatibility)",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.STUDENT, UserRole.PARENT)
	async getUpcomingDeadlines(
		@CurrentUser() user: any,
		@Args("days", { type: () => Int, nullable: true }) days?: number,
	) {
		const calendar = await this.calendarService.getStudentCalendar(user.id, {
			endDate: new Date(Date.now() + (days || 30) * 24 * 60 * 60 * 1000),
		});
		return calendar.upcomingDeadlines || [];
	}

	// ============================
	// Faculty Office Hours (2A.2, 3A.2)
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Get faculty office hours",
	})
	@UseGuards(GqlAuthGuard)
	async facultyOfficeHours(
		@Args("facultyId", { type: () => ID }) facultyId: string,
	) {
		return this.calendarService.getFacultyOfficeHours(facultyId);
	}

	@Query(() => GraphQLJSON, {
		description: "Get available office hour slots for booking",
	})
	@UseGuards(GqlAuthGuard)
	async availableOfficeHours(
		@Args("facultyId", { type: () => ID }) facultyId: string,
		@Args("startDate", { nullable: true }) startDate?: string,
		@Args("endDate", { nullable: true }) endDate?: string,
	) {
		return this.calendarService.getAvailableOfficeHours(
			facultyId,
			startDate ? new Date(startDate) : undefined,
			endDate ? new Date(endDate) : undefined,
		);
	}

	@Mutation(() => GraphQLJSON, {
		description: "Set office hours for faculty",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.FACULTY)
	async setOfficeHours(
		@CurrentUser() user: any,
		@Args("officeHours", { type: () => GraphQLJSON })
		officeHours: any[],
	) {
		return this.calendarService.setOfficeHours(user.id, officeHours);
	}

	@Mutation(() => GraphQLJSON, {
		description: "Book an office hour slot",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.STUDENT)
	async bookOfficeHour(
		@CurrentUser() user: any,
		@Args("slotId") slotId: string,
		@Args("reason", { nullable: true }) reason?: string,
	) {
		return this.calendarService.bookOfficeHour(user.id, slotId, reason);
	}

	// ============================
	// Instructor Schedule (3A.2)
	// ============================

	@Query(() => GraphQLJSON, {
		description: "Get instructor's teaching schedule",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.FACULTY)
	async myTeachingSchedule(@CurrentUser() user: any) {
		return this.calendarService.getInstructorSchedule(user.id);
	}

	@Query(() => GraphQLJSON, {
		description: "Get upcoming deadlines for a course",
	})
	@UseGuards(GqlAuthGuard, RolesGuard)
	@Roles(UserRole.FACULTY, UserRole.ADMIN)
	async courseDeadlines(
		@Args("courseId", { type: () => ID }) courseId: string,
		@Args("days", { type: () => Int, nullable: true }) days?: number,
	) {
		return this.calendarService.getCourseDeadlines(courseId, days);
	}
}
