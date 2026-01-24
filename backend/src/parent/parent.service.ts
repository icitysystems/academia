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
 * Parent Portal Service
 * Implements parent/guardian features as per Specification Section 2A.5
 *
 * Parents/Guardians can:
 * - Monitor linked student progress with privacy controls
 * - Set notification preferences for alerts
 * - View academic updates and communications
 */
@Injectable()
export class ParentService {
	private readonly logger = new Logger(ParentService.name);

	constructor(private prisma: PrismaService) {}

	// ============================
	// Parent Dashboard (2A.5)
	// ============================

	/**
	 * Get parent dashboard with linked student summaries
	 * As per Spec 2A.5: "Monitor linked student progress with privacy controls"
	 */
	async getParentDashboard(parentId: string) {
		await this.verifyParentRole(parentId);

		const linkedStudents = await this.getLinkedStudents(parentId);
		const recentNotifications = await this.getParentNotifications(parentId, 10);
		const upcomingEvents = await this.getLinkedStudentEvents(parentId);

		return {
			linkedStudents: await Promise.all(
				linkedStudents.map(async (student) => ({
					studentId: student.studentId,
					studentName: student.student.name,
					accessLevel: student.accessLevel,
					summary: await this.getStudentSummary(
						student.studentId,
						student.accessLevel,
					),
				})),
			),
			recentNotifications,
			upcomingEvents,
			lastUpdated: new Date(),
		};
	}

	/**
	 * Get detailed progress for a linked student
	 */
	async getStudentProgress(parentId: string, studentId: string) {
		const link = await this.verifyStudentLink(parentId, studentId);

		const student = await this.prisma.user.findUnique({
			where: { id: studentId },
			include: {
				enrollments: {
					include: {
						course: {
							select: { id: true, title: true, code: true },
						},
					},
				},
			},
		});

		if (!student) {
			throw new NotFoundException("Student not found");
		}

		// Apply privacy controls based on access level
		const courseProgress = await this.getCoursesProgress(
			studentId,
			link.accessLevel,
		);
		const attendanceData =
			link.accessLevel === "FULL"
				? await this.getAttendanceData(studentId)
				: null;
		const gradeData =
			link.accessLevel !== "MINIMAL"
				? await this.getGradeData(studentId)
				: null;

		return {
			studentId,
			studentName: student.name,
			accessLevel: link.accessLevel,
			enrollments: student.enrollments.length,
			courses: courseProgress,
			attendance: attendanceData,
			grades: gradeData,
			lastUpdated: new Date(),
		};
	}

	private async getStudentSummary(studentId: string, accessLevel: string) {
		const enrollments = await this.prisma.enrollment.count({
			where: { studentId },
		});

		const completedCourses = await this.prisma.enrollment.count({
			where: { studentId, status: "COMPLETED" },
		});

		// Only show grades if access level allows
		let averageGrade = null;
		if (accessLevel !== "MINIMAL") {
			const gradeResult = await this.prisma.assignmentSubmission.aggregate({
				_avg: { score: true },
				where: {
					studentId,
					score: { not: null },
				},
			});
			averageGrade = gradeResult._avg.score;
		}

		return {
			enrolledCourses: enrollments,
			completedCourses,
			averageGrade: averageGrade ? averageGrade.toFixed(1) : null,
			status: "Active",
		};
	}

	private async getCoursesProgress(studentId: string, accessLevel: string) {
		const enrollments = await this.prisma.enrollment.findMany({
			where: { studentId },
			include: {
				course: {
					select: {
						id: true,
						title: true,
						code: true,
						modules: {
							include: {
								lessons: true,
							},
						},
					},
				},
			},
		});

		return Promise.all(
			enrollments.map(async (e) => {
				// Count total lessons across all modules
				const totalLessons = e.course.modules.reduce(
					(sum, m) => sum + m.lessons.length,
					0,
				);

				// Get lesson IDs for this course
				const lessonIds = e.course.modules.flatMap((m) =>
					m.lessons.map((l) => l.id),
				);

				// Count completed lessons
				const completedLessons = await this.prisma.lessonProgress.count({
					where: {
						lessonId: { in: lessonIds },
						enrollment: { studentId },
						status: "COMPLETED",
					},
				});

				const baseInfo = {
					courseId: e.courseId,
					courseName: e.course.title,
					courseCode: e.course.code,
					status: e.status,
					progress:
						totalLessons > 0
							? Math.round((completedLessons / totalLessons) * 100)
							: 0,
				};

				// Add grade if access allows
				if (accessLevel !== "MINIMAL") {
					// Get assignments through lessons in this course
					const gradeResult = await this.prisma.assignmentSubmission.aggregate({
						_avg: { score: true },
						where: {
							studentId,
							assignment: {
								lesson: {
									module: { courseId: e.courseId },
								},
							},
							score: { not: null },
						},
					});
					return {
						...baseInfo,
						currentGrade: gradeResult._avg.score?.toFixed(1) || "N/A",
					};
				}

				return baseInfo;
			}),
		);
	}

	private async getAttendanceData(studentId: string) {
		// Simplified attendance - would use proper attendance records
		const recentProgress = await this.prisma.lessonProgress.findMany({
			where: {
				enrollment: { studentId },
			},
			orderBy: { updatedAt: "desc" },
			take: 30,
		});

		return {
			recentActivityDays: recentProgress.length,
			lastActive: recentProgress[0]?.updatedAt || null,
			engagementLevel:
				recentProgress.length > 20
					? "High"
					: recentProgress.length > 10
						? "Medium"
						: "Low",
		};
	}

	private async getGradeData(studentId: string) {
		const submissions = await this.prisma.assignmentSubmission.findMany({
			where: {
				studentId,
				score: { not: null },
			},
			orderBy: { submittedAt: "desc" },
			take: 10,
			include: {
				assignment: {
					select: {
						title: true,
						lesson: {
							select: {
								module: {
									select: { courseId: true },
								},
							},
						},
					},
				},
			},
		});

		const average =
			submissions.length > 0
				? submissions.reduce((sum, s) => sum + (s.score || 0), 0) /
					submissions.length
				: null;

		return {
			recentGrades: submissions.map((s) => ({
				assignment: s.assignment.title,
				score: s.score,
				submittedAt: s.submittedAt,
			})),
			averageGrade: average?.toFixed(1) || "N/A",
			gradesTrend: this.calculateGradeTrend(
				submissions.map((s) => s.score || 0),
			),
		};
	}

	private calculateGradeTrend(scores: number[]): string {
		if (scores.length < 2) return "Stable";
		const recent = scores.slice(0, Math.min(5, Math.floor(scores.length / 2)));
		const older = scores.slice(Math.floor(scores.length / 2));
		const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
		const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
		if (recentAvg > olderAvg + 5) return "Improving";
		if (recentAvg < olderAvg - 5) return "Declining";
		return "Stable";
	}

	// ============================
	// Student Linking (2A.5)
	// ============================

	/**
	 * Get linked students
	 */
	async getLinkedStudents(parentId: string) {
		await this.verifyParentRole(parentId);

		return this.prisma.studentParent.findMany({
			where: { parentId },
			include: {
				student: {
					select: {
						id: true,
						name: true,
						email: true,
						createdAt: true,
					},
				},
			},
		});
	}

	/**
	 * Request to link a student
	 */
	async requestStudentLink(parentId: string, studentEmail: string) {
		await this.verifyParentRole(parentId);

		const student = await this.prisma.user.findUnique({
			where: { email: studentEmail },
		});

		if (!student || student.role !== UserRole.STUDENT) {
			throw new NotFoundException("Student not found with that email");
		}

		// Check if link already exists
		const existingLink = await this.prisma.studentParent.findUnique({
			where: {
				studentId_parentId: {
					studentId: student.id,
					parentId,
				},
			},
		});

		if (existingLink) {
			throw new BadRequestException(
				"Student is already linked to your account",
			);
		}

		// Create pending link request
		const link = await this.prisma.studentParent.create({
			data: {
				studentId: student.id,
				parentId,
				relationship: "PARENT",
				accessLevel: "LIMITED", // Default to limited until student approves
				isVerified: false,
			},
		});

		// Would send notification to student for approval
		this.logger.log(
			`Link request created from parent ${parentId} to student ${student.id}`,
		);

		return {
			linkId: link.id,
			studentId: student.id,
			studentName: student.name,
			status: "PENDING_APPROVAL",
			message: "Link request sent to student for approval",
		};
	}

	/**
	 * Update link access level
	 */
	async updateLinkAccessLevel(
		parentId: string,
		studentId: string,
		accessLevel: string,
	) {
		const link = await this.verifyStudentLink(parentId, studentId);

		// Student must approve access level increases
		if (this.isHigherAccessLevel(accessLevel, link.accessLevel)) {
			throw new BadRequestException(
				"Student must approve access level increases",
			);
		}

		return this.prisma.studentParent.update({
			where: { id: link.id },
			data: { accessLevel },
		});
	}

	private isHigherAccessLevel(newLevel: string, currentLevel: string): boolean {
		const levels = ["MINIMAL", "LIMITED", "FULL"];
		return levels.indexOf(newLevel) > levels.indexOf(currentLevel);
	}

	// ============================
	// Notification Preferences (2A.5)
	// ============================

	/**
	 * Get notification preferences
	 * As per Spec 2A.5: "Set notification preferences for alerts"
	 */
	async getNotificationPreferences(parentId: string) {
		await this.verifyParentRole(parentId);

		const parent = await this.prisma.user.findUnique({
			where: { id: parentId },
			select: { notificationPreferences: true },
		});

		// Return existing or default preferences
		const defaults = {
			gradeAlerts: true,
			attendanceAlerts: true,
			assignmentDue: true,
			courseCompletion: true,
			weeklyDigest: true,
			emailNotifications: true,
			smsNotifications: false,
			pushNotifications: true,
			quietHoursStart: null,
			quietHoursEnd: null,
		};

		return {
			...defaults,
			...(parent?.notificationPreferences
				? JSON.parse(parent.notificationPreferences as string)
				: {}),
		};
	}

	/**
	 * Update notification preferences
	 */
	async updateNotificationPreferences(
		parentId: string,
		preferences: NotificationPreferences,
	) {
		await this.verifyParentRole(parentId);

		await this.prisma.user.update({
			where: { id: parentId },
			data: {
				notificationPreferences: preferences as any,
			},
		});

		return {
			success: true,
			message: "Notification preferences updated",
			preferences,
		};
	}

	// ============================
	// Parent Notifications (2A.5)
	// ============================

	/**
	 * Get parent notifications
	 */
	async getParentNotifications(parentId: string, limit = 20) {
		await this.verifyParentRole(parentId);

		// Get linked student IDs
		const links = await this.prisma.studentParent.findMany({
			where: { parentId },
			select: { studentId: true },
		});
		const studentIds = links.map((l) => l.studentId);

		if (studentIds.length === 0) {
			return [];
		}

		// Get recent events for linked students
		const notifications: Notification[] = [];

		// Recent grade submissions
		const recentGrades = await this.prisma.assignmentSubmission.findMany({
			where: {
				studentId: { in: studentIds },
				score: { not: null },
			},
			orderBy: { gradedAt: "desc" },
			take: limit,
			include: {
				student: { select: { name: true } },
				assignment: { select: { title: true } },
			},
		});

		for (const grade of recentGrades) {
			notifications.push({
				id: `grade-${grade.id}`,
				type: "GRADE_POSTED",
				title: "Grade Posted",
				message: `${grade.student.name} received a grade on "${grade.assignment.title}"`,
				timestamp: grade.gradedAt || grade.submittedAt,
				studentId: grade.studentId,
			});
		}

		// Recent enrollments
		const recentEnrollments = await this.prisma.enrollment.findMany({
			where: { studentId: { in: studentIds } },
			orderBy: { enrolledAt: "desc" },
			take: limit,
			include: {
				student: { select: { name: true } },
				course: { select: { title: true } },
			},
		});

		for (const enrollment of recentEnrollments) {
			notifications.push({
				id: `enrollment-${enrollment.id}`,
				type: "ENROLLMENT",
				title: "Course Enrollment",
				message: `${enrollment.student.name} enrolled in "${enrollment.course.title}"`,
				timestamp: enrollment.enrolledAt,
				studentId: enrollment.studentId,
			});
		}

		// Sort by timestamp and return
		return notifications
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
			.slice(0, limit);
	}

	/**
	 * Get upcoming events for linked students
	 */
	async getLinkedStudentEvents(parentId: string) {
		await this.verifyParentRole(parentId);

		const links = await this.prisma.studentParent.findMany({
			where: { parentId },
			select: { studentId: true },
		});
		const studentIds = links.map((l) => l.studentId);

		if (studentIds.length === 0) {
			return [];
		}

		// Get upcoming assignment deadlines
		const upcomingAssignments = await this.prisma.assignment.findMany({
			where: {
				dueDate: { gte: new Date() },
				lesson: {
					module: {
						course: {
							enrollments: {
								some: { studentId: { in: studentIds } },
							},
						},
					},
				},
			},
			orderBy: { dueDate: "asc" },
			take: 10,
			include: {
				lesson: {
					select: {
						module: {
							select: {
								course: { select: { title: true } },
							},
						},
					},
				},
			},
		});

		return upcomingAssignments.map((a) => ({
			id: a.id,
			type: "ASSIGNMENT_DUE",
			title: `Assignment Due: ${a.title}`,
			courseName: a.lesson?.module?.course?.title || "Unknown Course",
			dueDate: a.dueDate,
		}));
	}

	// ============================
	// Communication (2A.5)
	// ============================

	/**
	 * Get messages from instructors
	 */
	async getInstructorMessages(parentId: string) {
		await this.verifyParentRole(parentId);

		// Would use a proper messaging system
		// For now, return support tickets as a proxy
		const messages = await this.prisma.supportTicket.findMany({
			where: {
				submitterId: parentId,
			},
			include: {
				assignee: { select: { name: true } },
			},
			orderBy: { createdAt: "desc" },
			take: 20,
		});

		return messages;
	}

	/**
	 * Send message to instructor
	 */
	async sendInstructorMessage(parentId: string, input: SendMessageInput) {
		await this.verifyParentRole(parentId);

		// Create as support ticket for now
		const message = await this.prisma.supportTicket.create({
			data: {
				submitter: { connect: { id: parentId } },
				title: input.subject,
				subject: input.subject,
				description: input.message,
				category: "PARENT_INQUIRY",
				priority: "MEDIUM",
				status: "OPEN",
			},
		});

		return {
			messageId: message.id,
			status: "SENT",
			message: "Your message has been sent to the instructor",
		};
	}

	// ============================
	// Helper Methods
	// ============================

	private async verifyParentRole(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user || user.role !== UserRole.PARENT) {
			throw new ForbiddenException("Parent access required");
		}

		return user;
	}

	private async verifyStudentLink(parentId: string, studentId: string) {
		const link = await this.prisma.studentParent.findUnique({
			where: {
				studentId_parentId: {
					studentId,
					parentId,
				},
			},
		});

		if (!link) {
			throw new ForbiddenException(
				"You do not have access to this student's information",
			);
		}

		return link;
	}
}

// Types - exported for use in resolver
export interface Notification {
	id: string;
	type: string;
	title: string;
	message: string;
	timestamp: Date;
	studentId: string;
}

export interface NotificationPreferences {
	gradeAlerts?: boolean;
	attendanceAlerts?: boolean;
	assignmentDue?: boolean;
	courseCompletion?: boolean;
	weeklyDigest?: boolean;
	emailNotifications?: boolean;
	smsNotifications?: boolean;
	pushNotifications?: boolean;
	quietHoursStart?: string;
	quietHoursEnd?: string;
}

export interface SendMessageInput {
	recipientId?: string;
	subject: string;
	message: string;
	studentId?: string;
}
