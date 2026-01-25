import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import * as crypto from "crypto";

/**
 * Calendar Export Service
 * Implements iCal (RFC 5545) export functionality for calendar events
 */

interface CalendarEvent {
	id: string;
	type: string;
	title: string;
	description?: string;
	startDate: Date;
	endDate: Date;
	location?: string;
	courseId?: string;
	courseName?: string;
	courseCode?: string;
	isAllDay: boolean;
	color?: string;
	recurrence?: string;
	reminder?: number; // minutes before event
}

@Injectable()
export class CalendarExportService {
	private readonly logger = new Logger(CalendarExportService.name);
	private readonly PRODUCT_ID = "-//Academia//Calendar//EN";
	private readonly DOMAIN = process.env.DOMAIN || "academia.edu";

	constructor(private prisma: PrismaService) {}

	/**
	 * Export user calendar to iCal format
	 */
	async exportUserCalendar(
		userId: string,
		options?: {
			startDate?: Date;
			endDate?: Date;
			courseId?: string;
			includeReminders?: boolean;
		},
	): Promise<string> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		// Get user's enrolled courses
		const enrollments = await this.prisma.enrollment.findMany({
			where: { studentId: userId },
			select: { courseId: true },
		});

		const courseIds = enrollments.map((e) => e.courseId);

		// Also include courses where user is instructor
		if (user.role === "FACULTY" || user.role === "ADMIN") {
			const instructedCourses = await this.prisma.course.findMany({
				where: { instructorId: userId },
				select: { id: true },
			});
			courseIds.push(...instructedCourses.map((c) => c.id));
		}

		if (options?.courseId) {
			// Filter to specific course
			if (!courseIds.includes(options.courseId)) {
				throw new NotFoundException("Course not found or not enrolled");
			}
			courseIds.length = 0;
			courseIds.push(options.courseId);
		}

		const startDate = options?.startDate || new Date();
		const endDate =
			options?.endDate ||
			new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

		const events = await this.getCalendarEvents(courseIds, startDate, endDate);

		return this.generateICal(
			events,
			user.name || user.email,
			options?.includeReminders,
		);
	}

	/**
	 * Generate a subscription URL for the user's calendar
	 */
	async generateCalendarSubscriptionUrl(userId: string): Promise<string> {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		// Generate a unique token for the subscription
		const token = crypto
			.createHash("sha256")
			.update(`${userId}-${process.env.JWT_SECRET || "secret"}-calendar`)
			.digest("hex")
			.substring(0, 32);

		return `webcal://${this.DOMAIN}/api/calendar/subscribe/${userId}/${token}`;
	}

	/**
	 * Verify calendar subscription token
	 */
	verifySubscriptionToken(userId: string, token: string): boolean {
		const expectedToken = crypto
			.createHash("sha256")
			.update(`${userId}-${process.env.JWT_SECRET || "secret"}-calendar`)
			.digest("hex")
			.substring(0, 32);

		return token === expectedToken;
	}

	/**
	 * Export course calendar to iCal format
	 */
	async exportCourseCalendar(courseId: string): Promise<string> {
		const course = await this.prisma.course.findUnique({
			where: { id: courseId },
		});

		if (!course) {
			throw new NotFoundException("Course not found");
		}

		const startDate = course.startDate || new Date();
		const endDate =
			course.endDate ||
			new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000);

		const events = await this.getCalendarEvents([courseId], startDate, endDate);

		return this.generateICal(events, `${course.code} - ${course.title}`);
	}

	/**
	 * Export assignment deadlines to iCal
	 */
	async exportAssignmentDeadlines(userId: string): Promise<string> {
		const enrollments = await this.prisma.enrollment.findMany({
			where: { studentId: userId },
			select: { courseId: true },
		});

		const courseIds = enrollments.map((e) => e.courseId);

		const assignments = await this.prisma.assignment.findMany({
			where: {
				lesson: {
					module: {
						courseId: { in: courseIds },
					},
				},
				dueDate: { gte: new Date() },
				status: "PUBLISHED",
			},
			include: {
				lesson: {
					include: {
						module: {
							include: {
								course: { select: { code: true, title: true } },
							},
						},
					},
				},
			},
			orderBy: { dueDate: "asc" },
		});

		const events: CalendarEvent[] = assignments.map((assignment) => ({
			id: `assignment-${assignment.id}`,
			type: "ASSIGNMENT_DUE",
			title: `📝 ${assignment.title}`,
			description: `Assignment for ${assignment.lesson?.module?.course?.code}\n\n${assignment.description || ""}`,
			startDate: assignment.dueDate!,
			endDate: assignment.dueDate!,
			courseCode: assignment.lesson?.module?.course?.code,
			courseName: assignment.lesson?.module?.course?.title,
			isAllDay: false,
			reminder: 60 * 24, // 1 day before
		}));

		return this.generateICal(events, "Assignment Deadlines", true);
	}

	/**
	 * Export exam schedule to iCal
	 */
	async exportExamSchedule(userId: string): Promise<string> {
		const enrollments = await this.prisma.enrollment.findMany({
			where: { studentId: userId },
			select: { courseId: true },
		});

		const courseIds = enrollments.map((e) => e.courseId);

		const quizzes = await this.prisma.onlineQuiz.findMany({
			where: {
				lesson: {
					module: {
						courseId: { in: courseIds },
					},
				},
				availableUntil: { gte: new Date() },
				status: "PUBLISHED",
			},
			include: {
				lesson: {
					include: {
						module: {
							include: {
								course: { select: { code: true, title: true } },
							},
						},
					},
				},
			},
			orderBy: { availableFrom: "asc" },
		});

		const events: CalendarEvent[] = quizzes.map((quiz) => ({
			id: `quiz-${quiz.id}`,
			type: "EXAM",
			title: `📋 ${quiz.title}`,
			description: `Quiz for ${quiz.lesson?.module?.course?.code}\n\nTime limit: ${quiz.duration ? `${quiz.duration} minutes` : "No limit"}\n\n${quiz.description || ""}`,
			startDate: quiz.availableFrom || quiz.availableUntil!,
			endDate: quiz.availableUntil!,
			courseCode: quiz.lesson?.module?.course?.code,
			courseName: quiz.lesson?.module?.course?.title,
			isAllDay: false,
			reminder: 60 * 24, // 1 day before
		}));

		return this.generateICal(events, "Exam Schedule", true);
	}

	/**
	 * Export instructor teaching schedule to iCal
	 * Note: CourseLesson doesn't have scheduledDate in schema,
	 * so we generate events based on course start date and module order
	 */
	async exportTeachingSchedule(instructorId: string): Promise<string> {
		const courses = await this.prisma.course.findMany({
			where: {
				instructorId,
				status: "PUBLISHED",
			},
			include: {
				modules: {
					orderBy: { orderIndex: "asc" },
					include: {
						lessons: {
							orderBy: { orderIndex: "asc" },
							select: {
								id: true,
								title: true,
								duration: true,
								createdAt: true,
							},
						},
					},
				},
			},
		});

		const events: CalendarEvent[] = [];

		for (const course of courses) {
			// Add course start/end
			if (course.startDate) {
				events.push({
					id: `course-start-${course.id}`,
					type: "COURSE_START",
					title: `🎓 Course Starts: ${course.code}`,
					description: course.title,
					startDate: course.startDate,
					endDate: course.startDate,
					courseCode: course.code,
					isAllDay: true,
				});
			}

			if (course.endDate) {
				events.push({
					id: `course-end-${course.id}`,
					type: "COURSE_END",
					title: `🏁 Course Ends: ${course.code}`,
					description: course.title,
					startDate: course.endDate,
					endDate: course.endDate,
					courseCode: course.code,
					isAllDay: true,
				});
			}

			// Note: CourseLesson doesn't have scheduledDate
			// If lessons had scheduled dates, we would add them here
			// For now, lessons are self-paced within the course duration
		}

		return this.generateICal(events, "Teaching Schedule", true);
	}

	// ========== Private Helper Methods ==========

	private async getCalendarEvents(
		courseIds: string[],
		startDate: Date,
		endDate: Date,
	): Promise<CalendarEvent[]> {
		const events: CalendarEvent[] = [];

		if (courseIds.length === 0) {
			return events;
		}

		const [assignments, quizzes, courses, lessons] = await Promise.all([
			// Assignments
			this.prisma.assignment.findMany({
				where: {
					lesson: {
						module: {
							courseId: { in: courseIds },
						},
					},
					dueDate: { gte: startDate, lte: endDate },
					status: "PUBLISHED",
				},
				include: {
					lesson: {
						include: {
							module: {
								include: {
									course: { select: { id: true, code: true, title: true } },
								},
							},
						},
					},
				},
			}),

			// Quizzes
			this.prisma.onlineQuiz.findMany({
				where: {
					lesson: {
						module: {
							courseId: { in: courseIds },
						},
					},
					availableUntil: { gte: startDate, lte: endDate },
					status: "PUBLISHED",
				},
				include: {
					lesson: {
						include: {
							module: {
								include: {
									course: { select: { id: true, code: true, title: true } },
								},
							},
						},
					},
				},
			}),

			// Courses
			this.prisma.course.findMany({
				where: {
					id: { in: courseIds },
					OR: [
						{ startDate: { gte: startDate, lte: endDate } },
						{ endDate: { gte: startDate, lte: endDate } },
					],
				},
			}),

			// CourseLesson doesn't have scheduledDate, so we can't query by date range
			// Instead, return empty array - lessons in this system are self-paced
			Promise.resolve([]),
		]);

		// Add assignments
		for (const assignment of assignments) {
			events.push({
				id: `assignment-${assignment.id}`,
				type: "ASSIGNMENT_DUE",
				title: `📝 ${assignment.title}`,
				description: assignment.description || "",
				startDate: assignment.dueDate!,
				endDate: assignment.dueDate!,
				courseId: assignment.lesson?.module?.course?.id,
				courseCode: assignment.lesson?.module?.course?.code,
				courseName: assignment.lesson?.module?.course?.title,
				isAllDay: false,
				color: "#f44336",
				reminder: 60 * 24,
			});
		}

		// Add quizzes
		for (const quiz of quizzes) {
			events.push({
				id: `quiz-${quiz.id}`,
				type: "QUIZ",
				title: `📋 ${quiz.title}`,
				description: `${quiz.description || ""}\nTime limit: ${quiz.duration ? `${quiz.duration} min` : "None"}`,
				startDate: quiz.availableFrom || quiz.availableUntil!,
				endDate: quiz.availableUntil!,
				courseId: quiz.lesson?.module?.course?.id,
				courseCode: quiz.lesson?.module?.course?.code,
				courseName: quiz.lesson?.module?.course?.title,
				isAllDay: false,
				color: "#ff9800",
				reminder: 60 * 24,
			});
		}

		// Add course events
		for (const course of courses) {
			if (course.startDate) {
				events.push({
					id: `course-start-${course.id}`,
					type: "COURSE_START",
					title: `🎓 ${course.code} Begins`,
					description: course.title,
					startDate: course.startDate,
					endDate: course.startDate,
					courseId: course.id,
					courseCode: course.code,
					courseName: course.title,
					isAllDay: true,
					color: "#4caf50",
				});
			}

			if (course.endDate) {
				events.push({
					id: `course-end-${course.id}`,
					type: "COURSE_END",
					title: `🏁 ${course.code} Ends`,
					description: course.title,
					startDate: course.endDate,
					endDate: course.endDate,
					courseId: course.id,
					courseCode: course.code,
					courseName: course.title,
					isAllDay: true,
					color: "#9c27b0",
				});
			}
		}

		// Note: lessons array is empty since CourseLesson doesn't have scheduledDate
		// In a scheduled course system, lessons would be added here

		return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
	}

	private generateICal(
		events: CalendarEvent[],
		calendarName: string,
		includeReminders = false,
	): string {
		const lines: string[] = [
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			`PRODID:${this.PRODUCT_ID}`,
			"CALSCALE:GREGORIAN",
			"METHOD:PUBLISH",
			`X-WR-CALNAME:${this.escapeText(calendarName)}`,
			`X-WR-TIMEZONE:UTC`,
		];

		for (const event of events) {
			lines.push("BEGIN:VEVENT");
			lines.push(`UID:${event.id}@${this.DOMAIN}`);
			lines.push(`DTSTAMP:${this.formatDateTime(new Date())}`);

			if (event.isAllDay) {
				lines.push(`DTSTART;VALUE=DATE:${this.formatDate(event.startDate)}`);
				lines.push(
					`DTEND;VALUE=DATE:${this.formatDate(new Date(event.endDate.getTime() + 24 * 60 * 60 * 1000))}`,
				);
			} else {
				lines.push(`DTSTART:${this.formatDateTime(event.startDate)}`);
				lines.push(`DTEND:${this.formatDateTime(event.endDate)}`);
			}

			lines.push(`SUMMARY:${this.escapeText(event.title)}`);

			if (event.description) {
				lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
			}

			if (event.location) {
				lines.push(`LOCATION:${this.escapeText(event.location)}`);
			}

			if (event.courseCode) {
				lines.push(`CATEGORIES:${event.courseCode}`);
			}

			// Add reminder/alarm
			if (includeReminders && event.reminder) {
				lines.push("BEGIN:VALARM");
				lines.push("ACTION:DISPLAY");
				lines.push(`DESCRIPTION:Reminder: ${this.escapeText(event.title)}`);
				lines.push(`TRIGGER:-PT${event.reminder}M`);
				lines.push("END:VALARM");
			}

			lines.push("END:VEVENT");
		}

		lines.push("END:VCALENDAR");

		return lines.join("\r\n");
	}

	private formatDateTime(date: Date): string {
		return date
			.toISOString()
			.replace(/[-:]/g, "")
			.replace(/\.\d{3}/, "");
	}

	private formatDate(date: Date): string {
		return date.toISOString().split("T")[0].replace(/-/g, "");
	}

	private escapeText(text: string): string {
		return text
			.replace(/\\/g, "\\\\")
			.replace(/;/g, "\\;")
			.replace(/,/g, "\\,")
			.replace(/\n/g, "\\n");
	}
}
