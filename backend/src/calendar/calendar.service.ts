import {
	Injectable,
	Logger,
	NotFoundException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UserRole } from "../common/types";

/**
 * Calendar Service
 * Implements calendar and scheduling functionality per Specification 3A.1, 3A.2
 */
@Injectable()
export class CalendarService {
	private readonly logger = new Logger(CalendarService.name);

	constructor(private prisma: PrismaService) {}

	// ============================
	// Academic Calendar (3A.1, 3A.5)
	// ============================

	/**
	 * Get academic calendar events
	 * Includes: term dates, holidays, exam periods, registration deadlines
	 */
	async getAcademicCalendar(options?: {
		startDate?: Date;
		endDate?: Date;
		type?: string;
	}) {
		const startDate = options?.startDate || new Date();
		const endDate =
			options?.endDate ||
			new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

		// Get academic events from various sources
		const [assignments, quizzes, courses] = await Promise.all([
			// Assignment deadlines
			this.prisma.assignment.findMany({
				where: {
					dueDate: {
						gte: startDate,
						lte: endDate,
					},
					status: "PUBLISHED",
				},
				include: {
					lesson: {
						select: {
							module: {
								select: {
									course: { select: { id: true, title: true, code: true } },
								},
							},
						},
					},
				},
				orderBy: { dueDate: "asc" },
			}),

			// Quiz deadlines
			this.prisma.onlineQuiz.findMany({
				where: {
					availableUntil: {
						gte: startDate,
						lte: endDate,
					},
					status: "PUBLISHED",
				},
				include: {
					lesson: {
						select: {
							module: {
								select: {
									course: { select: { id: true, title: true, code: true } },
								},
							},
						},
					},
				},
				orderBy: { availableUntil: "asc" },
			}),

			// Course start/end dates
			this.prisma.course.findMany({
				where: {
					OR: [
						{
							startDate: { gte: startDate, lte: endDate },
						},
						{
							endDate: { gte: startDate, lte: endDate },
						},
					],
					status: "PUBLISHED",
				},
				select: {
					id: true,
					title: true,
					code: true,
					startDate: true,
					endDate: true,
				},
			}),
		]);

		const events: CalendarEvent[] = [];

		// Add assignment events
		for (const assignment of assignments) {
			events.push({
				id: `assignment-${assignment.id}`,
				type: "ASSIGNMENT_DUE",
				title: `Assignment Due: ${assignment.title}`,
				description: assignment.description,
				startDate: assignment.dueDate!,
				endDate: assignment.dueDate!,
				courseId: assignment.lesson?.module?.course?.id,
				courseName: assignment.lesson?.module?.course?.title,
				courseCode: assignment.lesson?.module?.course?.code,
				isAllDay: false,
				color: "#f44336", // Red for deadlines
			});
		}

		// Add quiz events
		for (const quiz of quizzes) {
			events.push({
				id: `quiz-${quiz.id}`,
				type: "QUIZ_DUE",
				title: `Quiz: ${quiz.title}`,
				description: quiz.description,
				startDate: quiz.availableFrom || quiz.availableUntil!,
				endDate: quiz.availableUntil!,
				courseId: quiz.lesson?.module?.course?.id,
				courseName: quiz.lesson?.module?.course?.title,
				courseCode: quiz.lesson?.module?.course?.code,
				isAllDay: false,
				color: "#ff9800", // Orange for quizzes
			});
		}

		// Add course start/end events
		for (const course of courses) {
			if (course.startDate) {
				events.push({
					id: `course-start-${course.id}`,
					type: "COURSE_START",
					title: `Course Starts: ${course.title}`,
					description: `${course.code} begins`,
					startDate: course.startDate,
					endDate: course.startDate,
					courseId: course.id,
					courseName: course.title,
					courseCode: course.code,
					isAllDay: true,
					color: "#4caf50", // Green for start
				});
			}
			if (course.endDate) {
				events.push({
					id: `course-end-${course.id}`,
					type: "COURSE_END",
					title: `Course Ends: ${course.title}`,
					description: `${course.code} concludes`,
					startDate: course.endDate,
					endDate: course.endDate,
					courseId: course.id,
					courseName: course.title,
					courseCode: course.code,
					isAllDay: true,
					color: "#9c27b0", // Purple for end
				});
			}
		}

		// Sort by start date
		events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

		return {
			events,
			startDate,
			endDate,
			totalEvents: events.length,
		};
	}

	/**
	 * Get student-specific calendar
	 * Shows only events for enrolled courses
	 */
	async getStudentCalendar(
		studentId: string,
		options?: { startDate?: Date; endDate?: Date },
	) {
		const student = await this.prisma.user.findUnique({
			where: { id: studentId },
		});

		if (!student) {
			throw new NotFoundException("Student not found");
		}

		const enrollments = await this.prisma.enrollment.findMany({
			where: { studentId, status: "ACTIVE" },
			select: { courseId: true },
		});

		const courseIds = enrollments.map((e) => e.courseId);

		const startDate = options?.startDate || new Date();
		const endDate =
			options?.endDate ||
			new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);

		const [assignments, quizzes] = await Promise.all([
			this.prisma.assignment.findMany({
				where: {
					dueDate: { gte: startDate, lte: endDate },
					status: "PUBLISHED",
					lesson: {
						module: {
							courseId: { in: courseIds },
						},
					},
				},
				include: {
					lesson: {
						select: {
							module: {
								select: {
									course: { select: { id: true, title: true, code: true } },
								},
							},
						},
					},
				},
			}),

			this.prisma.onlineQuiz.findMany({
				where: {
					availableUntil: { gte: startDate, lte: endDate },
					status: "PUBLISHED",
					lesson: {
						module: {
							courseId: { in: courseIds },
						},
					},
				},
				include: {
					lesson: {
						select: {
							module: {
								select: {
									course: { select: { id: true, title: true, code: true } },
								},
							},
						},
					},
				},
			}),
		]);

		const events: CalendarEvent[] = [];

		for (const assignment of assignments) {
			events.push({
				id: `assignment-${assignment.id}`,
				type: "ASSIGNMENT_DUE",
				title: `Due: ${assignment.title}`,
				description: assignment.description,
				startDate: assignment.dueDate!,
				endDate: assignment.dueDate!,
				courseId: assignment.lesson?.module?.course?.id,
				courseName: assignment.lesson?.module?.course?.title,
				courseCode: assignment.lesson?.module?.course?.code,
				isAllDay: false,
				color: "#f44336",
			});
		}

		for (const quiz of quizzes) {
			events.push({
				id: `quiz-${quiz.id}`,
				type: "QUIZ_DUE",
				title: `Quiz: ${quiz.title}`,
				description: quiz.description,
				startDate: quiz.availableFrom || quiz.availableUntil!,
				endDate: quiz.availableUntil!,
				courseId: quiz.lesson?.module?.course?.id,
				courseName: quiz.lesson?.module?.course?.title,
				courseCode: quiz.lesson?.module?.course?.code,
				isAllDay: false,
				color: "#ff9800",
			});
		}

		// Get upcoming deadlines summary
		const upcomingDeadlines = events
			.filter((e) => e.startDate >= new Date())
			.slice(0, 5);

		return {
			events: events.sort(
				(a, b) => a.startDate.getTime() - b.startDate.getTime(),
			),
			upcomingDeadlines,
			startDate,
			endDate,
		};
	}

	// ============================
	// Office Hours (2A.2, 3A.2)
	// ============================

	/**
	 * Get faculty office hours
	 */
	async getFacultyOfficeHours(facultyId: string) {
		const faculty = await this.prisma.user.findUnique({
			where: { id: facultyId },
		});

		if (!faculty || faculty.role !== UserRole.FACULTY) {
			throw new NotFoundException("Faculty member not found");
		}

		// Parse office hours from preferences
		const preferences = faculty.preferences
			? JSON.parse(faculty.preferences)
			: {};
		const officeHours = preferences.officeHours || [];

		return {
			facultyId,
			facultyName: faculty.name,
			officeHours,
		};
	}

	/**
	 * Set office hours for faculty
	 */
	async setOfficeHours(facultyId: string, officeHours: OfficeHourSlot[]) {
		const faculty = await this.prisma.user.findUnique({
			where: { id: facultyId },
		});

		if (!faculty || faculty.role !== UserRole.FACULTY) {
			throw new ForbiddenException("Faculty access required");
		}

		const preferences = faculty.preferences
			? JSON.parse(faculty.preferences)
			: {};
		preferences.officeHours = officeHours;

		await this.prisma.user.update({
			where: { id: facultyId },
			data: { preferences: JSON.stringify(preferences) },
		});

		return { success: true, officeHours };
	}

	/**
	 * Get available office hours slots for booking
	 */
	async getAvailableOfficeHours(
		facultyId: string,
		startDate?: Date,
		endDate?: Date,
	) {
		const faculty = await this.prisma.user.findUnique({
			where: { id: facultyId },
		});

		if (!faculty) {
			throw new NotFoundException("Faculty not found");
		}

		const preferences = faculty.preferences
			? JSON.parse(faculty.preferences)
			: {};
		const officeHours: OfficeHourSlot[] = preferences.officeHours || [];

		// Generate available slots for the next 2 weeks
		const start = startDate || new Date();
		const end = endDate || new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);

		const slots: AvailableSlot[] = [];
		const current = new Date(start);

		while (current <= end) {
			const dayOfWeek = current.getDay();
			const daySlots = officeHours.filter((oh) => oh.dayOfWeek === dayOfWeek);

			for (const slot of daySlots) {
				const slotDate = new Date(current);
				const [hours, minutes] = slot.startTime.split(":").map(Number);
				slotDate.setHours(hours, minutes, 0, 0);

				if (slotDate > new Date()) {
					slots.push({
						id: `${facultyId}-${slotDate.toISOString()}`,
						facultyId,
						facultyName: faculty.name,
						date: slotDate,
						startTime: slot.startTime,
						endTime: slot.endTime,
						location: slot.location,
						isVirtual: slot.isVirtual,
						meetingLink: slot.meetingLink,
						isBooked: false, // Would check against bookings
					});
				}
			}

			current.setDate(current.getDate() + 1);
		}

		return slots;
	}

	/**
	 * Book an office hour slot
	 */
	async bookOfficeHour(studentId: string, slotId: string, reason?: string) {
		// Parse slot ID to get faculty and datetime
		const [facultyId, dateStr] = slotId.split("-");

		const student = await this.prisma.user.findUnique({
			where: { id: studentId },
		});

		if (!student) {
			throw new NotFoundException("Student not found");
		}

		// Create support ticket as booking mechanism (temporary)
		const booking = await this.prisma.supportTicket.create({
			data: {
				submitterId: studentId,
				title: `Office Hour Booking`,
				description: `Office hour booking with faculty ${facultyId}. Reason: ${reason || "Not specified"}`,
				category: "ACADEMIC",
				priority: "MEDIUM",
				status: "OPEN",
			},
		});

		return {
			bookingId: booking.id,
			studentId,
			facultyId,
			scheduledAt: new Date(dateStr),
			reason,
			status: "CONFIRMED",
		};
	}

	// ============================
	// Course Schedule
	// ============================

	/**
	 * Get course schedule for instructor
	 */
	async getInstructorSchedule(instructorId: string) {
		const courses = await this.prisma.course.findMany({
			where: { instructorId, status: "PUBLISHED" },
			include: {
				enrollments: { where: { status: "ACTIVE" } },
				modules: {
					include: {
						lessons: true,
					},
				},
			},
		});

		return {
			instructorId,
			courses: courses.map((c) => ({
				id: c.id,
				title: c.title,
				code: c.code,
				enrolledStudents: c.enrollments.length,
				totalModules: c.modules.length,
				totalLessons: c.modules.reduce((sum, m) => sum + m.lessons.length, 0),
				startDate: c.startDate,
				endDate: c.endDate,
			})),
		};
	}

	/**
	 * Get upcoming deadlines for a course
	 */
	async getCourseDeadlines(courseId: string, days = 30) {
		const endDate = new Date();
		endDate.setDate(endDate.getDate() + days);

		const [assignments, quizzes] = await Promise.all([
			this.prisma.assignment.findMany({
				where: {
					lesson: { module: { courseId } },
					dueDate: { gte: new Date(), lte: endDate },
					status: "PUBLISHED",
				},
				orderBy: { dueDate: "asc" },
			}),

			this.prisma.onlineQuiz.findMany({
				where: {
					lesson: { module: { courseId } },
					availableUntil: { gte: new Date(), lte: endDate },
					status: "PUBLISHED",
				},
				orderBy: { availableUntil: "asc" },
			}),
		]);

		const deadlines = [
			...assignments.map((a) => ({
				id: a.id,
				type: "ASSIGNMENT",
				title: a.title,
				dueDate: a.dueDate,
				totalMarks: a.totalMarks,
			})),
			...quizzes.map((q) => ({
				id: q.id,
				type: "QUIZ",
				title: q.title,
				dueDate: q.availableUntil,
				totalMarks: q.totalMarks,
			})),
		].sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());

		return { courseId, deadlines };
	}
}

// Types - exported for use in resolver
export interface CalendarEvent {
	id: string;
	type: string;
	title: string;
	description?: string | null;
	startDate: Date;
	endDate: Date;
	courseId?: string;
	courseName?: string;
	courseCode?: string;
	isAllDay: boolean;
	color: string;
}

export interface OfficeHourSlot {
	dayOfWeek: number; // 0-6 (Sunday-Saturday)
	startTime: string; // "HH:MM"
	endTime: string; // "HH:MM"
	location?: string;
	isVirtual?: boolean;
	meetingLink?: string;
}

export interface AvailableSlot {
	id: string;
	facultyId: string;
	facultyName?: string | null;
	date: Date;
	startTime: string;
	endTime: string;
	location?: string;
	isVirtual?: boolean;
	meetingLink?: string;
	isBooked: boolean;
}
