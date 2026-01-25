import {
	Injectable,
	Logger,
	NotFoundException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UserRole } from "../common/types";

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

	// ============================
	// Billing & Payments Methods (2A.5)
	// ============================

	/**
	 * Get billing info for linked students
	 * As per Spec 2A.5: "Access billing and payment information"
	 */
	async getParentBillingInfo(parentId: string) {
		await this.verifyParentRole(parentId);

		const links = await this.prisma.studentParent.findMany({
			where: { parentId, canViewPayments: true },
			include: {
				student: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});

		const billingInfo = await Promise.all(
			links.map(async (link) => {
				const payments = await this.prisma.payment.findMany({
					where: { userId: link.studentId },
					orderBy: { createdAt: "desc" },
					take: 5,
				});

				const totalDue = await this.prisma.payment.aggregate({
					_sum: { amount: true },
					where: { userId: link.studentId, status: "PENDING" },
				});

				const totalPaid = await this.prisma.payment.aggregate({
					_sum: { amount: true },
					where: { userId: link.studentId, status: "COMPLETED" },
				});

				return {
					studentId: link.studentId,
					studentName: link.student.name,
					totalDue: totalDue._sum.amount || 0,
					totalPaid: totalPaid._sum.amount || 0,
					recentPayments: payments.map((p) => ({
						id: p.id,
						amount: p.amount,
						type: p.type,
						status: p.status,
						dueDate: p.dueDate,
						paidAt: p.paidAt,
					})),
				};
			}),
		);

		return {
			linkedStudents: billingInfo,
			lastUpdated: new Date(),
		};
	}

	/**
	 * Get payment history for a linked student
	 */
	async getStudentPaymentHistory(parentId: string, studentId: string) {
		const link = await this.verifyStudentLink(parentId, studentId);

		if (!link.canViewPayments) {
			throw new ForbiddenException(
				"Not authorized to view payment information",
			);
		}

		const payments = await this.prisma.payment.findMany({
			where: { userId: studentId },
			orderBy: { createdAt: "desc" },
		});

		const summary = {
			totalPaid: 0,
			totalPending: 0,
			totalOverdue: 0,
		};

		const now = new Date();
		for (const payment of payments) {
			if (payment.status === "COMPLETED") {
				summary.totalPaid += payment.amount;
			} else if (payment.status === "PENDING") {
				if (payment.dueDate && payment.dueDate < now) {
					summary.totalOverdue += payment.amount;
				} else {
					summary.totalPending += payment.amount;
				}
			}
		}

		return {
			studentId,
			payments: payments.map((p) => ({
				id: p.id,
				amount: p.amount,
				currency: p.currency,
				type: p.type,
				status: p.status,
				description: p.description,
				dueDate: p.dueDate,
				paidAt: p.paidAt,
				receiptUrl: p.receiptUrl,
				createdAt: p.createdAt,
			})),
			summary,
		};
	}

	/**
	 * Get tuition balance for a linked student
	 */
	async getStudentTuitionBalance(parentId: string, studentId: string) {
		const link = await this.verifyStudentLink(parentId, studentId);

		if (!link.canViewPayments) {
			throw new ForbiddenException(
				"Not authorized to view payment information",
			);
		}

		// Get course enrollments with fees
		const enrollments = await this.prisma.enrollment.findMany({
			where: { studentId, status: "ACTIVE" },
			include: {
				course: {
					select: { id: true, title: true, price: true, currency: true },
				},
			},
		});

		// Get pending tuition payments
		const pendingPayments = await this.prisma.payment.findMany({
			where: { userId: studentId, type: "TUITION", status: "PENDING" },
		});

		const totalTuition = enrollments.reduce(
			(sum, e) => sum + (e.course.price || 0),
			0,
		);
		const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
		const amountPaid = enrollments.reduce(
			(sum, e) => sum + (e.amountPaid || 0),
			0,
		);

		return {
			studentId,
			totalTuition,
			amountPaid,
			balanceDue: totalTuition - amountPaid,
			pendingPayments: totalPending,
			enrollments: enrollments.map((e) => ({
				courseId: e.courseId,
				courseTitle: e.course.title,
				fee: e.course.price,
				paid: e.amountPaid || 0,
			})),
			dueDate: pendingPayments[0]?.dueDate || null,
		};
	}

	/**
	 * Get available payment options
	 */
	async getPaymentOptions(parentId: string) {
		await this.verifyParentRole(parentId);

		return {
			methods: [
				{
					id: "card",
					name: "Credit/Debit Card",
					description:
						"Pay securely with Visa, Mastercard, or American Express",
					isEnabled: true,
				},
				{
					id: "bank_transfer",
					name: "Bank Transfer",
					description: "Direct bank transfer to institution account",
					isEnabled: true,
				},
				{
					id: "mobile_money",
					name: "Mobile Money",
					description: "Pay via MTN, Orange, or other mobile money services",
					isEnabled: true,
				},
			],
			installmentPlans: [
				{
					id: "full",
					name: "Full Payment",
					description: "Pay the full amount at once",
					discount: 5,
				},
				{
					id: "semester",
					name: "Per Semester",
					description: "Split payment across semesters",
					discount: 0,
				},
				{
					id: "monthly",
					name: "Monthly Installments",
					description: "Pay in 6 monthly installments",
					surcharge: 2,
				},
			],
		};
	}

	/**
	 * Get academic calendar for linked students
	 */
	async getStudentAcademicCalendar(parentId: string, studentId?: string) {
		await this.verifyParentRole(parentId);

		const links = await this.prisma.studentParent.findMany({
			where: {
				parentId,
				...(studentId ? { studentId } : {}),
			},
			select: { studentId: true },
		});

		const studentIds = links.map((l) => l.studentId);

		if (studentIds.length === 0) {
			return { events: [] };
		}

		// Get enrolled course IDs
		const enrollments = await this.prisma.enrollment.findMany({
			where: { studentId: { in: studentIds }, status: "ACTIVE" },
			select: { courseId: true },
		});
		const courseIds = [...new Set(enrollments.map((e) => e.courseId))];

		const now = new Date();
		const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

		// Get upcoming assignments and quizzes
		const [assignments, quizzes, courses] = await Promise.all([
			this.prisma.assignment.findMany({
				where: {
					lesson: { module: { courseId: { in: courseIds } } },
					dueDate: { gte: now, lte: endDate },
					status: "PUBLISHED",
				},
				include: {
					lesson: {
						select: {
							module: { select: { course: { select: { title: true } } } },
						},
					},
				},
				orderBy: { dueDate: "asc" },
			}),

			this.prisma.onlineQuiz.findMany({
				where: {
					lesson: { module: { courseId: { in: courseIds } } },
					availableUntil: { gte: now, lte: endDate },
					status: "PUBLISHED",
				},
				include: {
					lesson: {
						select: {
							module: { select: { course: { select: { title: true } } } },
						},
					},
				},
				orderBy: { availableUntil: "asc" },
			}),

			this.prisma.course.findMany({
				where: { id: { in: courseIds } },
				select: { id: true, title: true, startDate: true, endDate: true },
			}),
		]);

		const events = [];

		for (const a of assignments) {
			events.push({
				id: `assignment-${a.id}`,
				type: "ASSIGNMENT",
				title: a.title,
				courseName: a.lesson?.module?.course?.title,
				date: a.dueDate,
				description: `Assignment due for ${a.lesson?.module?.course?.title}`,
			});
		}

		for (const q of quizzes) {
			events.push({
				id: `quiz-${q.id}`,
				type: "QUIZ",
				title: q.title,
				courseName: q.lesson?.module?.course?.title,
				date: q.availableUntil,
				description: `Quiz deadline for ${q.lesson?.module?.course?.title}`,
			});
		}

		for (const c of courses) {
			if (c.endDate && c.endDate >= now && c.endDate <= endDate) {
				events.push({
					id: `course-end-${c.id}`,
					type: "COURSE_END",
					title: `Course Ends: ${c.title}`,
					courseName: c.title,
					date: c.endDate,
				});
			}
		}

		return {
			events: events.sort((a, b) => a.date.getTime() - b.date.getTime()),
			startDate: now,
			endDate,
		};
	}

	// ============================
	// Frontend Dashboard Methods
	// ============================

	/**
	 * Get children with enrolled courses and grades for frontend dashboard
	 */
	async getMyChildren(parentId: string) {
		await this.verifyParentRole(parentId);

		const links = await this.prisma.studentParent.findMany({
			where: { parentId, isVerified: true },
			include: {
				student: {
					include: {
						enrollments: {
							where: { status: { in: ["ACTIVE", "COMPLETED"] } },
							include: {
								course: {
									include: {
										instructor: { select: { name: true } },
									},
								},
								lessonProgress: true,
							},
						},
					},
				},
			},
		});

		return Promise.all(
			links.map(async (link) => {
				const student = link.student;
				const enrollments = student.enrollments;

				// Calculate GPA from assignment submissions
				const submissions = await this.prisma.assignmentSubmission.findMany({
					where: { studentId: student.id, score: { not: null } },
					select: { score: true, maxScore: true },
				});

				const overallGPA =
					submissions.length > 0
						? (
								submissions.reduce(
									(sum, s) => sum + ((s.score || 0) / (s.maxScore || 100)) * 4,
									0,
								) / submissions.length
							).toFixed(2)
						: null;

				// Get attendance rate (from lesson completions)
				const totalLessons = enrollments.reduce(
					(sum, e) => sum + (e.lessonProgress?.length || 0),
					0,
				);
				const completedLessons = enrollments.reduce(
					(sum, e) =>
						sum +
						(e.lessonProgress?.filter((lp: any) => lp.completed).length || 0),
					0,
				);
				const attendanceRate =
					totalLessons > 0
						? Math.round((completedLessons / totalLessons) * 100)
						: null;

				// Get recent grades
				const recentGrades = await this.prisma.assignmentSubmission.findMany({
					where: { studentId: student.id, score: { not: null } },
					include: {
						assignment: {
							include: {
								lesson: {
									include: {
										module: {
											include: { course: { select: { title: true } } },
										},
									},
								},
							},
						},
					},
					orderBy: { gradedAt: "desc" },
					take: 5,
				});

				// Get upcoming deadlines
				const now = new Date();
				const upcomingDeadlines = await this.prisma.assignment.findMany({
					where: {
						lesson: {
							module: {
								course: {
									enrollments: { some: { studentId: student.id } },
								},
							},
						},
						dueDate: { gte: now },
						status: "PUBLISHED",
					},
					include: {
						lesson: {
							include: {
								module: {
									include: { course: { select: { title: true } } },
								},
							},
						},
					},
					orderBy: { dueDate: "asc" },
					take: 5,
				});

				return {
					id: student.id,
					name: student.name,
					email: student.email,
					enrolledCourses: enrollments.map((e) => ({
						id: e.course.id,
						title: e.course.title,
						progress: e.progress || 0,
						currentGrade: null, // Grade calculated from submissions
						instructor: e.course.instructor?.name || "TBD",
						status: e.status,
					})),
					recentGrades: recentGrades.map((g) => ({
						id: g.id,
						courseName: g.assignment.lesson?.module?.course?.title,
						assignmentTitle: g.assignment.title,
						score: g.score,
						maxScore: g.maxScore || g.assignment.totalMarks,
						gradedAt: g.gradedAt,
					})),
					upcomingDeadlines: upcomingDeadlines.map((d) => ({
						id: d.id,
						title: d.title,
						courseName: d.lesson?.module?.course?.title,
						dueDate: d.dueDate,
						type: "ASSIGNMENT",
					})),
					attendanceRate,
					overallGPA,
				};
			}),
		);
	}

	/**
	 * Get payment history for parent frontend
	 */
	async getPaymentHistoryForParent(parentId: string) {
		await this.verifyParentRole(parentId);

		const studentIds = await this.getLinkedStudentIds(parentId);

		// Get all payments for linked students
		const payments = await this.prisma.payment.findMany({
			where: {
				userId: { in: studentIds },
			},
			orderBy: { createdAt: "desc" },
			take: 20,
		});

		return payments.map((p) => ({
			id: p.id,
			description: p.description || "Course Payment",
			amount: p.amount,
			status: p.status,
			paidAt: p.status === "COMPLETED" ? p.updatedAt : null,
			dueDate: p.createdAt,
		}));
	}

	/**
	 * Get upcoming payments for parent frontend
	 */
	async getUpcomingPayments(parentId: string) {
		await this.verifyParentRole(parentId);

		const studentIds = await this.getLinkedStudentIds(parentId);

		// Get pending payments
		const pendingPayments = await this.prisma.payment.findMany({
			where: {
				userId: { in: studentIds },
				status: "PENDING",
			},
			orderBy: { createdAt: "asc" },
		});

		// Also check for upcoming subscription renewals
		const subscriptions = await this.prisma.subscription.findMany({
			where: {
				userId: { in: studentIds },
				status: "ACTIVE",
			},
			include: { plan: true },
		});

		const upcomingSubscriptions = subscriptions
			.filter((s) => s.currentPeriodEnd)
			.map((s) => ({
				id: `sub-${s.id}`,
				description: `${s.plan.name} Subscription Renewal`,
				amount:
					s.billingCycle === "YEARLY"
						? s.plan.priceYearly
						: s.plan.priceMonthly,
				dueDate: s.currentPeriodEnd,
			}));

		return [
			...pendingPayments.map((p) => ({
				id: p.id,
				description: p.description || "Payment Due",
				amount: p.amount,
				dueDate: p.createdAt,
			})),
			...upcomingSubscriptions,
		];
	}

	/**
	 * Get announcements for parents
	 */
	async getParentAnnouncements(parentId: string) {
		await this.verifyParentRole(parentId);

		const studentIds = await this.getLinkedStudentIds(parentId);

		// Get course announcements for enrolled courses
		const enrollments = await this.prisma.enrollment.findMany({
			where: { studentId: { in: studentIds }, status: "ACTIVE" },
			select: { courseId: true },
		});
		const courseIds = [...new Set(enrollments.map((e) => e.courseId))];

		const announcements = await this.prisma.courseAnnouncement.findMany({
			where: { courseId: { in: courseIds } },
			orderBy: { createdAt: "desc" },
			take: 10,
		});

		return announcements.map((a) => ({
			id: a.id,
			title: a.title,
			message: a.content,
			createdAt: a.createdAt,
			priority: a.isPinned ? "HIGH" : "NORMAL",
		}));
	}

	/**
	 * Helper to get linked student IDs
	 */
	private async getLinkedStudentIds(parentId: string): Promise<string[]> {
		const links = await this.prisma.studentParent.findMany({
			where: { parentId, isVerified: true },
			select: { studentId: true },
		});
		return links.map((l) => l.studentId);
	}
}
