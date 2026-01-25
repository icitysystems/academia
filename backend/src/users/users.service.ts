import {
	Injectable,
	Logger,
	NotFoundException,
	ForbiddenException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UserRole, RolePermissions } from "../common/types";

/**
 * Users Service implementing role-based functionality
 * as per Specification Sections 2A and 5.1
 */
@Injectable()
export class UsersService {
	private readonly logger = new Logger(UsersService.name);

	constructor(private prisma: PrismaService) {}

	// ============================
	// User CRUD Operations (Admin)
	// ============================

	/**
	 * Create a new user - Admin only
	 * As per Specification 2A.3: "Manage user accounts (students, faculty, staff)"
	 */
	async createUser(input: CreateUserInput, adminId: string) {
		await this.verifyAdminRole(adminId);

		return this.prisma.user.create({
			data: {
				email: input.email,
				name: input.name,
				firstName: input.firstName,
				lastName: input.lastName,
				role: input.role || UserRole.STUDENT,
				phone: input.phone,
			},
		});
	}

	/**
	 * Update a user - Admin or self
	 */
	async updateUser(
		userId: string,
		input: UpdateUserInput,
		requesterId: string,
	) {
		const requester = await this.prisma.user.findUnique({
			where: { id: requesterId },
		});

		// Allow self-update or admin update
		if (requesterId !== userId && requester?.role !== UserRole.ADMIN) {
			throw new ForbiddenException("Not authorized to update this user");
		}

		// Only admins can change roles
		if (input.role && requester?.role !== UserRole.ADMIN) {
			throw new ForbiddenException("Only admins can change user roles");
		}

		return this.prisma.user.update({
			where: { id: userId },
			data: input,
		});
	}

	/**
	 * Get user by ID
	 */
	async getUser(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
			include: {
				enrollments: true,
				instructedCourses: true,
			},
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		return user;
	}

	/**
	 * List users with filtering - Admin only
	 */
	async listUsers(
		adminId: string,
		options?: {
			role?: string;
			isActive?: boolean;
			search?: string;
			skip?: number;
			take?: number;
		},
	) {
		await this.verifyAdminRole(adminId);

		const where: any = {};

		if (options?.role) {
			where.role = options.role;
		}

		if (options?.isActive !== undefined) {
			where.isActive = options.isActive;
		}

		if (options?.search) {
			where.OR = [
				{ email: { contains: options.search } },
				{ name: { contains: options.search } },
				{ firstName: { contains: options.search } },
				{ lastName: { contains: options.search } },
			];
		}

		const [users, total] = await Promise.all([
			this.prisma.user.findMany({
				where,
				skip: options?.skip || 0,
				take: options?.take || 50,
				orderBy: { createdAt: "desc" },
			}),
			this.prisma.user.count({ where }),
		]);

		return { users, total };
	}

	/**
	 * Delete/deactivate user - Admin only
	 */
	async deleteUser(userId: string, adminId: string, hardDelete = false) {
		await this.verifyAdminRole(adminId);

		if (hardDelete) {
			return this.prisma.user.delete({
				where: { id: userId },
			});
		}

		return this.prisma.user.update({
			where: { id: userId },
			data: { isActive: false },
		});
	}

	// ============================
	// Student-Specific Actions (2A.1)
	// ============================

	/**
	 * Get student dashboard data
	 * Courses, grades, upcoming deadlines
	 */
	async getStudentDashboard(studentId: string) {
		await this.verifyRole(studentId, [UserRole.STUDENT]);

		const enrollments = await this.prisma.enrollment.findMany({
			where: {
				studentId: studentId,
				status: "ACTIVE",
			},
			include: {
				course: {
					include: {
						modules: {
							include: {
								lessons: true,
							},
						},
					},
				},
			},
		});

		// Get course IDs for upcoming assignments
		const courseIds = enrollments.map((e) => e.courseId);

		// Get upcoming assignments for enrolled courses
		const upcomingAssignments = await this.prisma.assignment.findMany({
			where: {
				lesson: {
					module: {
						courseId: { in: courseIds },
					},
				},
				dueDate: {
					gte: new Date(),
				},
			},
			orderBy: { dueDate: "asc" },
			take: 5,
		});

		// Get recent grades (using score)
		const recentGrades = await this.prisma.assignmentSubmission.findMany({
			where: {
				studentId,
				score: { not: null },
			},
			orderBy: { gradedAt: "desc" },
			take: 10,
			include: {
				assignment: true,
			},
		});

		return {
			enrollments,
			upcomingAssignments,
			recentGrades,
			enrollmentCount: enrollments.length,
		};
	}

	/**
	 * Request transcript
	 * As per Specification 2A.1: "Request transcripts or certificates"
	 */
	async requestTranscript(studentId: string, input: TranscriptRequestInput) {
		await this.verifyRole(studentId, [UserRole.STUDENT]);

		return this.prisma.transcriptRequest.create({
			data: {
				requesterId: studentId,
				purpose: input.purpose,
				copies: input.copies || 1,
				deliveryMethod: input.deliveryMethod || "DIGITAL",
				address: input.address,
				status: "PENDING",
			},
		});
	}

	/**
	 * Get student grades
	 */
	async getStudentGrades(studentId: string) {
		await this.verifyRole(studentId, [UserRole.STUDENT, UserRole.PARENT]);

		const submissions = await this.prisma.assignmentSubmission.findMany({
			where: {
				studentId,
				score: { not: null },
			},
			include: {
				assignment: {
					include: {
						lesson: {
							include: {
								module: {
									include: { course: true },
								},
							},
						},
					},
				},
			},
			orderBy: { gradedAt: "desc" },
		});

		// Calculate average score
		const scores = submissions
			.map((s) => s.score)
			.filter((s): s is number => s !== null);
		const averageScore =
			scores.length > 0
				? scores.reduce((a, b) => a + b, 0) / scores.length
				: null;

		return {
			submissions,
			averageScore,
			totalSubmissions: submissions.length,
		};
	}

	/**
	 * Get student grades formatted for dashboard display
	 * Returns grades grouped by course with GPA calculation
	 */
	async getMyGrades(studentId: string) {
		const enrollments = await this.prisma.enrollment.findMany({
			where: {
				studentId,
				status: { in: ["ACTIVE", "COMPLETED"] },
			},
			include: {
				course: true,
			},
		});

		const grades = await Promise.all(
			enrollments.map(async (enrollment) => {
				// Get submissions for this course
				const submissions = await this.prisma.assignmentSubmission.findMany({
					where: {
						studentId,
						score: { not: null },
						assignment: {
							lesson: {
								module: {
									courseId: enrollment.courseId,
								},
							},
						},
					},
				});

				// Calculate course grade
				const scores = submissions
					.map((s) => s.score)
					.filter((s): s is number => s !== null);
				const courseGrade =
					scores.length > 0
						? Math.round(
								(scores.reduce((a, b) => a + b, 0) / scores.length) * 10,
							) / 10
						: null;

				// Convert to GPA (4.0 scale)
				const gpa = courseGrade
					? courseGrade >= 90
						? 4.0
						: courseGrade >= 80
							? 3.0
							: courseGrade >= 70
								? 2.0
								: courseGrade >= 60
									? 1.0
									: 0.0
					: null;

				return {
					id: enrollment.id,
					courseId: enrollment.courseId,
					courseName: enrollment.course.title,
					grade: courseGrade
						? courseGrade >= 90
							? "A"
							: courseGrade >= 80
								? "B"
								: courseGrade >= 70
									? "C"
									: courseGrade >= 60
										? "D"
										: "F"
						: null,
					gpa,
					completedAt:
						enrollment.status === "COMPLETED" ? enrollment.completedAt : null,
				};
			}),
		);

		return grades.filter((g) => g.grade !== null);
	}

	/**
	 * Get student payments for dashboard display
	 * Returns payment history including pending payments
	 */
	async getMyPayments(studentId: string) {
		// Get subscription payments
		const subscriptions = await this.prisma.subscription.findMany({
			where: { userId: studentId },
			include: { plan: true },
			orderBy: { createdAt: "desc" },
			take: 20,
		});

		// Get donations (if any by this user)
		const donations = await this.prisma.donation.findMany({
			where: { userId: studentId },
			orderBy: { createdAt: "desc" },
			take: 10,
		});

		// Format as unified payment records
		const payments = [
			...subscriptions.map((sub) => ({
				id: sub.id,
				amount: sub.priceAtSubscription || sub.plan?.priceMonthly || 0,
				type: "SUBSCRIPTION" as const,
				status: sub.status === "ACTIVE" ? "PAID" : sub.status,
				dueDate: sub.currentPeriodEnd,
				paidAt: sub.createdAt,
				description: `${sub.plan?.name || "Subscription"} Plan`,
			})),
			...donations.map((don) => ({
				id: don.id,
				amount: don.amount,
				type: "DONATION" as const,
				status: don.status === "COMPLETED" ? "PAID" : don.status,
				dueDate: null,
				paidAt: don.completedAt || don.createdAt,
				description: don.message || "Donation",
			})),
		];

		// Sort by date
		payments.sort((a, b) => {
			const dateA = a.paidAt ? new Date(a.paidAt).getTime() : 0;
			const dateB = b.paidAt ? new Date(b.paidAt).getTime() : 0;
			return dateB - dateA;
		});

		return payments;
	}

	// ============================
	// Faculty-Specific Actions (2A.2)
	// ============================

	/**
	 * Get faculty dashboard data
	 * Courses taught, pending submissions, student stats
	 */
	async getFacultyDashboard(facultyId: string) {
		await this.verifyRole(facultyId, [UserRole.FACULTY]);

		const courses = await this.prisma.course.findMany({
			where: { instructorId: facultyId },
			include: {
				_count: {
					select: {
						enrollments: true,
						modules: true,
					},
				},
			},
		});

		// Get course IDs for this faculty
		const courseIds = courses.map((c) => c.id);

		// Pending submissions to grade
		const pendingSubmissions = await this.prisma.assignmentSubmission.findMany({
			where: {
				assignment: {
					lesson: {
						module: {
							courseId: { in: courseIds },
						},
					},
				},
				status: "SUBMITTED",
				score: null,
			},
			include: {
				assignment: true,
				student: true,
			},
			take: 20,
		});

		// Exam papers in progress
		const examPapers = await this.prisma.examPaperSetup.findMany({
			where: {
				teacherId: facultyId,
				status: { not: "COMPLETED" },
			},
			orderBy: { updatedAt: "desc" },
			take: 10,
		});

		return {
			courses,
			pendingSubmissions,
			examPapers,
			totalCourses: courses.length,
			totalStudents: courses.reduce(
				(sum, c) => sum + (c._count?.enrollments || 0),
				0,
			),
		};
	}

	/**
	 * Get class roster for a course
	 * As per Specification 2A.2: "Manage class rosters and attendance"
	 */
	async getClassRoster(facultyId: string, courseId: string) {
		await this.verifyRole(facultyId, [UserRole.FACULTY, UserRole.ADMIN]);

		const course = await this.prisma.course.findFirst({
			where: {
				id: courseId,
				instructorId: facultyId,
			},
		});

		if (!course) {
			throw new NotFoundException(
				"Course not found or you are not the instructor",
			);
		}

		const enrollments = await this.prisma.enrollment.findMany({
			where: { courseId },
			include: {
				student: true,
			},
		});

		return enrollments.map((e) => ({
			studentId: e.studentId,
			studentName: e.student.name,
			email: e.student.email,
			enrolledAt: e.enrolledAt,
			status: e.status,
		}));
	}

	/**
	 * Track student progress
	 * As per Specification 2A.2: "Track student progress and performance"
	 */
	async trackStudentProgress(
		facultyId: string,
		studentId: string,
		courseId: string,
	) {
		await this.verifyRole(facultyId, [UserRole.FACULTY]);

		// Verify faculty teaches this course
		const course = await this.prisma.course.findFirst({
			where: {
				id: courseId,
				instructorId: facultyId,
			},
		});

		if (!course) {
			throw new NotFoundException("Course not found");
		}

		// Get student's submissions for this course
		const submissions = await this.prisma.assignmentSubmission.findMany({
			where: {
				studentId,
				assignment: {
					lesson: {
						module: { courseId },
					},
				},
			},
			include: { assignment: true },
		});

		// Get quiz attempts for this course
		const quizAttempts = await this.prisma.quizAttempt.findMany({
			where: {
				studentId,
				quiz: {
					lesson: {
						module: { courseId },
					},
				},
			},
			include: { quiz: true },
		});

		// Get lesson progress
		const lessonProgress = await this.prisma.lessonProgress.count({
			where: {
				enrollment: {
					studentId,
					courseId,
				},
				status: "COMPLETED",
			},
		});

		return {
			studentId,
			courseId,
			submissions,
			quizAttempts,
			completedLessons: lessonProgress,
			totalAssignments: submissions.length,
			completedAssignments: submissions.filter((s) => s.score !== null).length,
			averageScore:
				submissions.filter((s) => s.score !== null).length > 0
					? submissions
							.filter((s) => s.score !== null)
							.reduce((sum, s) => sum + (s.score || 0), 0) /
						submissions.filter((s) => s.score !== null).length
					: null,
		};
	}

	// ============================
	// Admin-Specific Actions (2A.3)
	// ============================

	/**
	 * Get admin dashboard data
	 * System overview, user counts, recent activity
	 */
	async getAdminDashboard(adminId: string) {
		await this.verifyAdminRole(adminId);

		const [
			totalUsers,
			activeUsers,
			totalCourses,
			activeCourses,
			usersByRole,
			recentActivity,
		] = await Promise.all([
			this.prisma.user.count(),
			this.prisma.user.count({ where: { isActive: true } }),
			this.prisma.course.count(),
			this.prisma.course.count({ where: { status: "PUBLISHED" } }),
			this.getUsersByRole(),
			this.prisma.auditLog.findMany({
				orderBy: { createdAt: "desc" },
				take: 20,
				include: { user: true },
			}),
		]);

		return {
			totalUsers,
			activeUsers,
			totalCourses,
			activeCourses,
			usersByRole,
			recentActivity,
		};
	}

	/**
	 * Get user count by role
	 */
	private async getUsersByRole() {
		const roles = [
			UserRole.STUDENT,
			UserRole.FACULTY,
			UserRole.ADMIN,
			UserRole.SUPPORT_STAFF,
			UserRole.PARENT,
			UserRole.ALUMNI,
		];

		const counts = await Promise.all(
			roles.map(async (role) => ({
				role,
				count: await this.prisma.user.count({ where: { role } }),
			})),
		);

		return counts;
	}

	/**
	 * Generate institutional report
	 * As per Specification 2A.3: "Generate institutional reports"
	 */
	async generateInstitutionalReport(adminId: string, reportType: string) {
		await this.verifyAdminRole(adminId);

		switch (reportType) {
			case "ENROLLMENT":
				return this.generateEnrollmentReport();
			case "ACADEMIC_PERFORMANCE":
				return this.generateAcademicPerformanceReport();
			case "FINANCIAL":
				return this.generateFinancialReport();
			default:
				throw new BadRequestException("Unknown report type");
		}
	}

	private async generateEnrollmentReport() {
		const enrollments = await this.prisma.enrollment.groupBy({
			by: ["status"],
			_count: { id: true },
		});

		const byCourse = await this.prisma.enrollment.groupBy({
			by: ["courseId"],
			_count: { id: true },
		});

		return {
			type: "ENROLLMENT",
			generatedAt: new Date(),
			summary: enrollments,
			byCourse,
		};
	}

	private async generateAcademicPerformanceReport() {
		// Aggregate score data
		const submissions = await this.prisma.assignmentSubmission.findMany({
			where: { score: { not: null } },
			select: { score: true },
		});

		const scores = submissions
			.map((s) => s.score)
			.filter((s): s is number => s !== null);
		const avgScore =
			scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

		return {
			type: "ACADEMIC_PERFORMANCE",
			generatedAt: new Date(),
			totalSubmissions: submissions.length,
			averageScore: avgScore,
		};
	}

	private async generateFinancialReport() {
		const payments = await this.prisma.payment.findMany({
			where: { status: "COMPLETED" },
		});

		const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

		return {
			type: "FINANCIAL",
			generatedAt: new Date(),
			totalPayments: payments.length,
			totalRevenue,
		};
	}

	// ============================
	// Support Staff Actions (2A.4)
	// ============================

	/**
	 * Get support dashboard
	 */
	async getSupportDashboard(supportId: string) {
		await this.verifyRole(supportId, [UserRole.SUPPORT_STAFF, UserRole.ADMIN]);

		const [openTickets, inProgress, resolvedToday, myTickets] =
			await Promise.all([
				this.prisma.supportTicket.count({ where: { status: "OPEN" } }),
				this.prisma.supportTicket.count({ where: { status: "IN_PROGRESS" } }),
				this.prisma.supportTicket.count({
					where: {
						status: "RESOLVED",
						resolvedAt: {
							gte: new Date(new Date().setHours(0, 0, 0, 0)),
						},
					},
				}),
				this.prisma.supportTicket.findMany({
					where: { assigneeId: supportId },
					orderBy: { createdAt: "desc" },
					take: 10,
				}),
			]);

		return {
			openTickets,
			inProgress,
			resolvedToday,
			myTickets,
		};
	}

	/**
	 * Assign ticket to self or another support staff
	 */
	async assignTicket(ticketId: string, assigneeId: string, supportId: string) {
		await this.verifyRole(supportId, [UserRole.SUPPORT_STAFF, UserRole.ADMIN]);

		return this.prisma.supportTicket.update({
			where: { id: ticketId },
			data: {
				assigneeId,
				status: "IN_PROGRESS",
			},
		});
	}

	/**
	 * Resolve ticket
	 */
	async resolveTicket(ticketId: string, resolution: string, supportId: string) {
		await this.verifyRole(supportId, [UserRole.SUPPORT_STAFF, UserRole.ADMIN]);

		return this.prisma.supportTicket.update({
			where: { id: ticketId },
			data: {
				resolution,
				status: "RESOLVED",
				resolvedAt: new Date(),
			},
		});
	}

	// ============================
	// Parent-Specific Actions (2A.5)
	// ============================

	/**
	 * Get parent dashboard
	 * View linked students and their progress
	 */
	async getParentDashboard(parentId: string) {
		await this.verifyRole(parentId, [UserRole.PARENT]);

		const linkedStudents = await this.prisma.studentParent.findMany({
			where: { parentId },
			include: {
				student: {
					include: {
						enrollments: {
							include: { course: true },
						},
					},
				},
			},
		});

		return {
			students: linkedStudents.map((link) => ({
				student: link.student,
				relationship: link.relationship,
				canViewGrades: link.canViewGrades,
				canViewPayments: link.canViewPayments,
			})),
		};
	}

	/**
	 * Get student progress report for parent
	 * As per Specification 2A.5: "View student progress reports"
	 */
	async getStudentProgressForParent(parentId: string, studentId: string) {
		await this.verifyRole(parentId, [UserRole.PARENT]);

		// Verify parent-student relationship
		const relationship = await this.prisma.studentParent.findFirst({
			where: {
				parentId,
				studentId,
				canViewGrades: true,
			},
		});

		if (!relationship) {
			throw new ForbiddenException(
				"Not authorized to view this student's progress",
			);
		}

		return this.getStudentGrades(studentId);
	}

	/**
	 * Link parent to student account
	 * As per Specification 2A.5: "Link account to student(s)"
	 */
	async linkParentToStudent(
		parentId: string,
		studentEmail: string,
		relationship: string = "PARENT",
	) {
		await this.verifyRole(parentId, [UserRole.PARENT]);

		const student = await this.prisma.user.findFirst({
			where: { email: studentEmail, role: UserRole.STUDENT },
		});

		if (!student) {
			throw new NotFoundException("Student not found with this email");
		}

		// Check if already linked
		const existing = await this.prisma.studentParent.findUnique({
			where: {
				studentId_parentId: { parentId, studentId: student.id },
			},
		});

		if (existing) {
			throw new ForbiddenException("Already linked to this student");
		}

		return this.prisma.studentParent.create({
			data: {
				parentId,
				studentId: student.id,
				relationship,
				canViewGrades: true,
				canViewPayments: false,
			},
			include: {
				student: true,
				parent: true,
			},
		});
	}

	/**
	 * Remove parent-student link
	 */
	async unlinkParentFromStudent(parentId: string, studentId: string) {
		await this.verifyRole(parentId, [UserRole.PARENT, UserRole.ADMIN]);

		return this.prisma.studentParent.delete({
			where: {
				studentId_parentId: { parentId, studentId },
			},
		});
	}

	/**
	 * Get student schedule for parent
	 * As per Specification 2A.5: "Access student schedule"
	 */
	async getStudentScheduleForParent(parentId: string, studentId: string) {
		await this.verifyRole(parentId, [UserRole.PARENT]);

		const relationship = await this.prisma.studentParent.findFirst({
			where: { parentId, studentId },
		});

		if (!relationship) {
			throw new ForbiddenException("Not authorized to view this student");
		}

		// Get enrolled courses and their schedules
		const enrollments = await this.prisma.enrollment.findMany({
			where: { studentId: studentId, status: "ACTIVE" },
			include: {
				course: {
					include: {
						modules: {
							include: {
								lessons: {
									orderBy: { orderIndex: "asc" },
								},
							},
						},
					},
				},
			},
		});

		return {
			studentId,
			enrollments: enrollments.map((e) => ({
				courseId: e.courseId,
				courseName: e.course.title,
				enrolledAt: e.enrolledAt,
				modules: e.course.modules.map((m) => ({
					id: m.id,
					title: m.title,
					lessons: m.lessons.map((l) => ({
						id: l.id,
						title: l.title,
						contentType: l.contentType,
					})),
				})),
			})),
		};
	}

	/**
	 * Get student assignments for parent
	 * As per Specification 2A.5: "Access student assignments"
	 */
	async getStudentAssignmentsForParent(parentId: string, studentId: string) {
		await this.verifyRole(parentId, [UserRole.PARENT]);

		const relationship = await this.prisma.studentParent.findFirst({
			where: { parentId, studentId },
		});

		if (!relationship) {
			throw new ForbiddenException("Not authorized to view this student");
		}

		const submissions = await this.prisma.assignmentSubmission.findMany({
			where: { studentId },
			include: {
				assignment: {
					include: {
						lesson: {
							include: {
								module: {
									include: { course: true },
								},
							},
						},
					},
				},
			},
			orderBy: { submittedAt: "desc" },
		});

		return submissions.map((s) => ({
			id: s.id,
			assignmentTitle: s.assignment.title,
			courseName: s.assignment.lesson?.module?.course?.title || "N/A",
			dueDate: s.assignment.dueDate,
			submittedAt: s.submittedAt,
			status: s.status,
			score: relationship.canViewGrades ? s.score : null,
		}));
	}

	/**
	 * Get student exam results for parent
	 * As per Specification 2A.5: "View student progress reports"
	 */
	async getStudentExamResultsForParent(parentId: string, studentId: string) {
		await this.verifyRole(parentId, [UserRole.PARENT]);

		const relationship = await this.prisma.studentParent.findFirst({
			where: { parentId, studentId, canViewGrades: true },
		});

		if (!relationship) {
			throw new ForbiddenException(
				"Not authorized to view this student's exam results",
			);
		}

		const submissions = await this.prisma.studentExamSubmission.findMany({
			where: {
				studentId,
				status: { in: ["GRADED", "REVIEWED"] },
			},
			include: {
				examPaper: true,
			},
			orderBy: { gradedAt: "desc" },
		});

		return submissions.map((s) => ({
			id: s.id,
			examTitle: s.examPaper.title,
			subject: s.examPaper.subject,
			totalScore: s.totalScore,
			percentage: s.percentage,
			grade: s.grade,
			gradedAt: s.gradedAt,
		}));
	}

	/**
	 * Send message to teacher (parent-teacher communication)
	 * As per Specification 2A.5: "Communicate with faculty"
	 */
	async sendMessageToTeacher(
		parentId: string,
		teacherId: string,
		subject: string,
		message: string,
		studentId?: string,
	) {
		await this.verifyRole(parentId, [UserRole.PARENT]);

		// Verify teacher exists and is faculty
		const teacher = await this.prisma.user.findFirst({
			where: { id: teacherId, role: UserRole.FACULTY },
		});

		if (!teacher) {
			throw new NotFoundException("Teacher not found");
		}

		// If student specified, verify parent-student link
		if (studentId) {
			const relationship = await this.prisma.studentParent.findFirst({
				where: { parentId, studentId },
			});

			if (!relationship) {
				throw new ForbiddenException("Not linked to this student");
			}
		}

		// Create a support ticket for parent-teacher communication
		return this.prisma.supportTicket.create({
			data: {
				submitterId: parentId,
				assigneeId: teacherId,
				title: subject,
				description: message,
				category: "PARENT_COMMUNICATION",
				priority: "MEDIUM",
				status: "OPEN",
			},
			include: {
				submitter: true,
				assignee: true,
			},
		});
	}

	/**
	 * Get payment history for student (if parent has permission)
	 * As per Specification 2A.5 implied: Financial visibility
	 */
	async getStudentPaymentsForParent(parentId: string, studentId: string) {
		await this.verifyRole(parentId, [UserRole.PARENT]);

		const relationship = await this.prisma.studentParent.findFirst({
			where: { parentId, studentId, canViewPayments: true },
		});

		if (!relationship) {
			throw new ForbiddenException(
				"Not authorized to view this student's payments",
			);
		}

		return this.prisma.payment.findMany({
			where: { userId: studentId },
			orderBy: { createdAt: "desc" },
		});
	}

	// ============================
	// Alumni/Guest Access (2A.6)
	// ============================

	/**
	 * Get alumni portal access
	 * As per Specification 2A.6: "Limited access to resources"
	 */
	async getAlumniPortal(alumniId: string) {
		await this.verifyRole(alumniId, [UserRole.ALUMNI]);

		// Get alumni's historical data
		const [pastCourses, certificates, communityGroups] = await Promise.all([
			// Get completed enrollments
			this.prisma.enrollment.findMany({
				where: { studentId: alumniId, status: "COMPLETED" },
				include: { course: true },
			}),
			// Get certificates earned
			this.prisma.certificate.findMany({
				where: { studentId: alumniId },
			}),
			// Get community memberships (if model exists)
			Promise.resolve([]),
		]);

		return {
			pastCourses: pastCourses.map((e) => ({
				courseId: e.courseId,
				title: e.course.title,
				completedAt: e.completedAt,
			})),
			certificates,
			communityGroups,
			availableResources: await this.getPublicResources(),
		};
	}

	/**
	 * Get public resources available to alumni and guests
	 * As per Specification 2A.6
	 */
	async getPublicResources() {
		// Get publicly accessible courses
		const publicCourses = await this.prisma.course.findMany({
			where: {
				isPublic: true,
			},
			select: {
				id: true,
				title: true,
				description: true,
				thumbnailUrl: true,
				category: true,
			},
			take: 20,
		});

		return {
			courses: publicCourses,
		};
	}

	/**
	 * Get guest preview of course
	 * As per Specification 2A.6: "View public courses"
	 */
	async getGuestCoursePreview(courseId: string) {
		const course = await this.prisma.course.findFirst({
			where: {
				id: courseId,
				isPublic: true,
			},
			include: {
				modules: {
					include: {
						lessons: {
							where: { isFree: true },
							take: 3,
						},
					},
				},
			},
		});

		if (!course) {
			throw new NotFoundException(
				"Course not found or not publicly accessible",
			);
		}

		return {
			...course,
			isPreview: true,
			message: "Sign up or log in to access full course content",
		};
	}

	/**
	 * Request transcript for alumni
	 * As per Specification 2A.6: Alumni services
	 */
	async requestAlumniTranscript(alumniId: string, deliveryMethod: string) {
		await this.verifyRole(alumniId, [UserRole.ALUMNI]);

		return this.prisma.transcriptRequest.create({
			data: {
				requesterId: alumniId,
				deliveryMethod,
				status: "PENDING",
			},
		});
	}

	// ============================
	// ADMISSIONS WORKFLOW (Spec 3A.2)
	// ============================

	/**
	 * Create admission application
	 * As per Spec 3A.2: "Admissions management"
	 */
	async createAdmissionApplication(
		applicantData: AdmissionApplicationInput,
		adminId?: string,
	) {
		// Create user record first
		const user = await this.prisma.user.create({
			data: {
				email: applicantData.email,
				name: applicantData.name,
				firstName: applicantData.firstName,
				lastName: applicantData.lastName,
				phone: applicantData.phone,
				role: "APPLICANT", // Special role for applicants
				isActive: false, // Not active until admitted
			},
		});

		// Create application record using support ticket as workaround
		const application = await this.prisma.supportTicket.create({
			data: {
				submitterId: user.id,
				title: `Admission Application - ${applicantData.program}`,
				description: JSON.stringify({
					...applicantData,
					applicationDate: new Date(),
					status: "SUBMITTED",
				}),
				category: "OTHER",
				priority: "MEDIUM",
				status: "OPEN",
			},
		});

		// Create audit log
		await this.prisma.auditLog.create({
			data: {
				userId: adminId || user.id,
				action: "CREATE_ADMISSION_APPLICATION",
				entityType: "AdmissionApplication",
				entityId: application.id,
				details: JSON.stringify({ applicantEmail: applicantData.email }),
			},
		});

		return {
			applicationId: application.id,
			applicantId: user.id,
			status: "SUBMITTED",
			submittedAt: application.createdAt,
		};
	}

	/**
	 * Review admission application
	 */
	async reviewAdmissionApplication(
		applicationId: string,
		reviewData: {
			decision: "ACCEPTED" | "REJECTED" | "WAITLISTED" | "PENDING_DOCUMENTS";
			notes?: string;
			reviewerId: string;
		},
	) {
		await this.verifyAdminRole(reviewData.reviewerId);

		const application = await this.prisma.supportTicket.findUnique({
			where: { id: applicationId },
			include: { submitter: true },
		});

		if (!application) {
			throw new NotFoundException("Application not found");
		}

		const applicationData = JSON.parse(application.description);
		applicationData.reviewStatus = reviewData.decision;
		applicationData.reviewNotes = reviewData.notes;
		applicationData.reviewedAt = new Date();
		applicationData.reviewedBy = reviewData.reviewerId;

		// Update application
		await this.prisma.supportTicket.update({
			where: { id: applicationId },
			data: {
				description: JSON.stringify(applicationData),
				status:
					reviewData.decision === "ACCEPTED"
						? "RESOLVED"
						: reviewData.decision === "REJECTED"
							? "CLOSED"
							: "IN_PROGRESS",
			},
		});

		// If accepted, update user role to STUDENT
		if (reviewData.decision === "ACCEPTED") {
			await this.prisma.user.update({
				where: { id: application.submitterId },
				data: {
					role: "STUDENT",
					isActive: true,
				},
			});
		}

		// Create audit log
		await this.prisma.auditLog.create({
			data: {
				userId: reviewData.reviewerId,
				action: "REVIEW_ADMISSION_APPLICATION",
				entityType: "AdmissionApplication",
				entityId: applicationId,
				details: JSON.stringify({ decision: reviewData.decision }),
			},
		});

		return {
			applicationId,
			applicantId: application.submitterId,
			decision: reviewData.decision,
			reviewedAt: new Date(),
		};
	}

	/**
	 * Get admission applications list
	 */
	async getAdmissionApplications(
		adminId: string,
		filters?: {
			status?: string;
			program?: string;
			startDate?: Date;
			endDate?: Date;
		},
	) {
		await this.verifyAdminRole(adminId);

		const applications = await this.prisma.supportTicket.findMany({
			where: {
				title: { startsWith: "Admission Application" },
				...(filters?.startDate && {
					createdAt: { gte: filters.startDate },
				}),
				...(filters?.endDate && {
					createdAt: { lte: filters.endDate },
				}),
			},
			include: { submitter: true },
			orderBy: { createdAt: "desc" },
		});

		return applications
			.map((app) => {
				const data = JSON.parse(app.description);
				return {
					applicationId: app.id,
					applicantId: app.submitterId,
					applicantName: app.submitter.name,
					applicantEmail: app.submitter.email,
					program: data.program,
					status: data.reviewStatus || "SUBMITTED",
					submittedAt: app.createdAt,
					reviewedAt: data.reviewedAt,
				};
			})
			.filter((app) => {
				if (filters?.status && app.status !== filters.status) return false;
				if (filters?.program && app.program !== filters.program) return false;
				return true;
			});
	}

	/**
	 * Bulk import students
	 * As per Spec 3A.2: Bulk operations for admissions
	 */
	async bulkImportStudents(
		adminId: string,
		students: Array<{
			email: string;
			name: string;
			firstName?: string;
			lastName?: string;
			program?: string;
		}>,
	) {
		await this.verifyAdminRole(adminId);

		const results = {
			successful: [] as string[],
			failed: [] as { email: string; error: string }[],
		};

		for (const studentData of students) {
			try {
				// Check if user already exists
				const existing = await this.prisma.user.findUnique({
					where: { email: studentData.email },
				});

				if (existing) {
					results.failed.push({
						email: studentData.email,
						error: "Email already exists",
					});
					continue;
				}

				// Create student
				await this.prisma.user.create({
					data: {
						email: studentData.email,
						name: studentData.name,
						firstName: studentData.firstName,
						lastName: studentData.lastName,
						role: "STUDENT",
						isActive: true,
					},
				});

				results.successful.push(studentData.email);
			} catch (error: any) {
				results.failed.push({
					email: studentData.email,
					error: error.message,
				});
			}
		}

		// Audit log
		await this.prisma.auditLog.create({
			data: {
				userId: adminId,
				action: "BULK_IMPORT_STUDENTS",
				entityType: "User",
				entityId: "bulk",
				details: JSON.stringify({
					successCount: results.successful.length,
					failedCount: results.failed.length,
				}),
			},
		});

		return results;
	}

	// ============================
	// GRADUATION MANAGEMENT (Spec 3A.2)
	// ============================

	/**
	 * Get graduation candidates
	 * As per Spec 3A.2: "Graduation processing"
	 */
	async getGraduationCandidates(
		adminId: string,
		filters?: {
			program?: string;
			graduationDate?: Date;
			status?: string;
		},
	) {
		await this.verifyAdminRole(adminId);

		// Find students who have completed all requirements
		const students = await this.prisma.user.findMany({
			where: {
				role: "STUDENT",
				isActive: true,
			},
			include: {
				enrollments: {
					where: { status: "COMPLETED" },
					include: { course: true },
				},
			},
		});

		// Calculate graduation eligibility
		const candidates = [];
		const requiredCourses = 8; // Example threshold (courses completed)

		for (const student of students) {
			const completedCourses = student.enrollments.length;

			// Calculate GPA from quiz attempts and assignments
			const avgGrade = await this.calculateStudentGPA(student.id);

			if (completedCourses >= requiredCourses && avgGrade >= 2.0) {
				candidates.push({
					studentId: student.id,
					studentName: student.name,
					email: student.email,
					completedCourses,
					gpa: avgGrade,
					enrollmentCount: student.enrollments.length,
					status: "ELIGIBLE",
					estimatedGraduationDate: this.getNextGraduationDate(),
				});
			}
		}

		return {
			totalCandidates: candidates.length,
			candidates,
		};
	}

	/**
	 * Process graduation for a student
	 */
	async processGraduation(
		adminId: string,
		studentId: string,
		graduationData: {
			graduationDate: Date;
			honors?: string;
			program?: string;
		},
	) {
		await this.verifyAdminRole(adminId);

		const student = await this.prisma.user.findUnique({
			where: { id: studentId },
		});

		if (!student || student.role !== "STUDENT") {
			throw new NotFoundException("Student not found");
		}

		// Update student role to ALUMNI
		await this.prisma.user.update({
			where: { id: studentId },
			data: { role: "ALUMNI" },
		});

		// Create graduation record using support ticket
		const graduation = await this.prisma.supportTicket.create({
			data: {
				submitterId: studentId,
				title: `Graduation Record - ${studentId}`,
				description: JSON.stringify({
					graduationDate: graduationData.graduationDate,
					honors: graduationData.honors,
					program: graduationData.program,
					processedBy: adminId,
					processedAt: new Date(),
				}),
				category: "OTHER",
				status: "RESOLVED",
				priority: "LOW",
			},
		});

		// Audit log
		await this.prisma.auditLog.create({
			data: {
				userId: adminId,
				action: "PROCESS_GRADUATION",
				entityType: "User",
				entityId: studentId,
				details: JSON.stringify(graduationData),
			},
		});

		return {
			studentId,
			studentName: student.name,
			newRole: "ALUMNI",
			graduationDate: graduationData.graduationDate,
			honors: graduationData.honors,
			graduationRecordId: graduation.id,
		};
	}

	/**
	 * Bulk process graduations
	 */
	async bulkProcessGraduation(
		adminId: string,
		studentIds: string[],
		graduationDate: Date,
	) {
		await this.verifyAdminRole(adminId);

		const results = {
			successful: [] as string[],
			failed: [] as { studentId: string; error: string }[],
		};

		for (const studentId of studentIds) {
			try {
				await this.processGraduation(adminId, studentId, {
					graduationDate,
				});
				results.successful.push(studentId);
			} catch (error: any) {
				results.failed.push({
					studentId,
					error: error.message,
				});
			}
		}

		return results;
	}

	private async calculateStudentGPA(studentId: string): Promise<number> {
		const [quizAttempts, assignments] = await Promise.all([
			this.prisma.quizAttempt.findMany({
				where: { studentId, submittedAt: { not: null } },
			}),
			this.prisma.assignmentSubmission.findMany({
				where: { studentId, score: { not: null } },
			}),
		]);

		const allGrades: number[] = [
			...quizAttempts.map((q) => q.percentage || 0),
			...assignments.map((a) => a.score || 0),
		];

		if (allGrades.length === 0) return 0;

		const avgPercent = allGrades.reduce((a, b) => a + b, 0) / allGrades.length;
		// Convert to 4.0 scale
		if (avgPercent >= 90) return 4.0;
		if (avgPercent >= 80) return 3.0;
		if (avgPercent >= 70) return 2.0;
		if (avgPercent >= 60) return 1.0;
		return 0;
	}

	private getNextGraduationDate(): Date {
		const now = new Date();
		const month = now.getMonth();
		// Graduation in May or December
		if (month < 5) {
			return new Date(now.getFullYear(), 4, 15); // May 15
		} else if (month < 12) {
			return new Date(now.getFullYear(), 11, 15); // December 15
		}
		return new Date(now.getFullYear() + 1, 4, 15); // Next May
	}

	// ============================
	// Frontend Admin Dashboard Methods
	// ============================

	/**
	 * Get system statistics for admin dashboard
	 */
	async getSystemStats(adminId: string) {
		await this.verifyAdminRole(adminId);

		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const startOfDay = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);

		const [
			totalUsers,
			totalStudents,
			totalFaculty,
			totalCourses,
			activeCourses,
			totalEnrollments,
			newUsersThisMonth,
			activeUsersToday,
			payments,
			monthlyPayments,
			pendingPayments,
		] = await Promise.all([
			this.prisma.user.count(),
			this.prisma.user.count({ where: { role: UserRole.STUDENT } }),
			this.prisma.user.count({ where: { role: UserRole.FACULTY } }),
			this.prisma.course.count(),
			this.prisma.course.count({ where: { status: "PUBLISHED" } }),
			this.prisma.enrollment.count(),
			this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
			this.prisma.user.count({ where: { lastLoginAt: { gte: startOfDay } } }),
			this.prisma.payment.findMany({
				where: { status: "COMPLETED" },
				select: { amount: true },
			}),
			this.prisma.payment.findMany({
				where: { status: "COMPLETED", createdAt: { gte: startOfMonth } },
				select: { amount: true },
			}),
			this.prisma.payment.count({ where: { status: "PENDING" } }),
		]);

		const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0) / 100;
		const monthlyRevenue =
			monthlyPayments.reduce((sum, p) => sum + p.amount, 0) / 100;

		return {
			totalUsers,
			totalStudents,
			totalFaculty,
			totalCourses,
			activeCourses,
			totalEnrollments,
			totalRevenue,
			monthlyRevenue,
			pendingPayments,
			newUsersThisMonth,
			activeUsersToday,
		};
	}

	/**
	 * Get recent users for admin dashboard
	 */
	async getRecentUsers(adminId: string) {
		await this.verifyAdminRole(adminId);

		const users = await this.prisma.user.findMany({
			orderBy: { createdAt: "desc" },
			take: 10,
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				isActive: true,
				emailVerified: true,
				createdAt: true,
				lastLoginAt: true,
			},
		});

		return users;
	}

	/**
	 * Get recent enrollments for admin dashboard
	 */
	async getRecentEnrollments(adminId: string) {
		await this.verifyAdminRole(adminId);

		const enrollments = await this.prisma.enrollment.findMany({
			orderBy: { enrolledAt: "desc" },
			take: 10,
			include: {
				student: { select: { name: true } },
				course: { select: { title: true } },
			},
		});

		return enrollments.map((e) => ({
			id: e.id,
			studentName: e.student.name,
			courseName: e.course.title,
			enrolledAt: e.enrolledAt,
			paymentStatus: e.paymentId ? "PAID" : "PENDING",
		}));
	}

	/**
	 * Get pending approvals for admin dashboard
	 */
	async getPendingApprovals(adminId: string) {
		await this.verifyAdminRole(adminId);

		// Get pending course approvals, transcript requests, etc.
		const [pendingCourses, pendingTranscripts] = await Promise.all([
			this.prisma.course.findMany({
				where: { status: "PENDING_APPROVAL" },
				select: {
					id: true,
					title: true,
					createdAt: true,
					instructor: { select: { name: true } },
				},
				take: 5,
			}),
			this.prisma.transcriptRequest.findMany({
				where: { status: "PENDING" },
				select: {
					id: true,
					createdAt: true,
					requester: { select: { name: true } },
				},
				take: 5,
			}),
		]);

		const approvals = [
			...pendingCourses.map((c) => ({
				id: c.id,
				type: "COURSE_APPROVAL",
				title: c.title,
				requestedBy: c.instructor?.name,
				requestedAt: c.createdAt,
			})),
			...pendingTranscripts.map((t) => ({
				id: t.id,
				type: "TRANSCRIPT_REQUEST",
				title: "Transcript Request",
				requestedBy: t.requester?.name,
				requestedAt: t.createdAt,
			})),
		];

		return approvals.sort(
			(a, b) =>
				new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
		);
	}

	/**
	 * Get system alerts for admin dashboard
	 */
	async getSystemAlerts(adminId: string) {
		await this.verifyAdminRole(adminId);

		const alerts = [];

		// Check for various system conditions
		const pendingPaymentsCount = await this.prisma.payment.count({
			where: { status: "PENDING" },
		});

		if (pendingPaymentsCount > 10) {
			alerts.push({
				id: "alert-payments",
				type: "WARNING",
				message: `${pendingPaymentsCount} payments pending review`,
				createdAt: new Date(),
			});
		}

		const failedJobsCount = await this.prisma.gradingJob.count({
			where: { status: "FAILED" },
		});

		if (failedJobsCount > 0) {
			alerts.push({
				id: "alert-grading",
				type: "ERROR",
				message: `${failedJobsCount} grading jobs failed`,
				createdAt: new Date(),
			});
		}

		// Check for inactive courses
		const inactiveCourses = await this.prisma.course.count({
			where: {
				status: "PUBLISHED",
				updatedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
			},
		});

		if (inactiveCourses > 0) {
			alerts.push({
				id: "alert-inactive",
				type: "INFO",
				message: `${inactiveCourses} courses haven't been updated in 90 days`,
				createdAt: new Date(),
			});
		}

		return alerts;
	}

	/**
	 * Get all users with pagination for admin
	 */
	async getAllUsers(
		adminId: string,
		options: { role?: string; search?: string; page?: number; limit?: number },
	) {
		await this.verifyAdminRole(adminId);

		const page = options.page || 0;
		const limit = options.limit || 20;

		const where: any = {};

		if (options.role) {
			where.role = options.role;
		}

		if (options.search) {
			where.OR = [
				{ name: { contains: options.search, mode: "insensitive" } },
				{ email: { contains: options.search, mode: "insensitive" } },
			];
		}

		const [users, total] = await Promise.all([
			this.prisma.user.findMany({
				where,
				skip: page * limit,
				take: limit,
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					isActive: true,
					emailVerified: true,
					createdAt: true,
					lastLoginAt: true,
					_count: {
						select: {
							enrollments: true,
							instructedCourses: true,
						},
					},
				},
			}),
			this.prisma.user.count({ where }),
		]);

		return {
			users,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	// ============================
	// Helper Methods
	// ============================

	private async verifyRole(userId: string, allowedRoles: string[]) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (!user || !allowedRoles.includes(user.role)) {
			throw new ForbiddenException("Not authorized for this action");
		}

		return user;
	}

	private async verifyAdminRole(userId: string) {
		return this.verifyRole(userId, [UserRole.ADMIN]);
	}

	/**
	 * Check if user has permission for an action
	 */
	hasPermission(role: string, resource: string, action: string): boolean {
		const permissions = RolePermissions[role as keyof typeof RolePermissions];
		if (!permissions) return false;

		const resourcePermissions =
			permissions[resource as keyof typeof permissions];
		if (!resourcePermissions) return false;

		return (resourcePermissions as readonly string[]).includes(action);
	}
}

// Input types
interface CreateUserInput {
	email: string;
	name?: string;
	firstName?: string;
	lastName?: string;
	phone?: string;
	role?: string;
}

interface UpdateUserInput {
	name?: string;
	firstName?: string;
	lastName?: string;
	phone?: string;
	avatarUrl?: string;
	role?: string;
	isActive?: boolean;
}

interface TranscriptRequestInput {
	purpose?: string;
	copies?: number;
	deliveryMethod?: string;
	address?: string;
}

interface AdmissionApplicationInput {
	email: string;
	name: string;
	firstName?: string;
	lastName?: string;
	phone?: string;
	program: string;
	previousEducation?: string;
	documents?: string[];
}
