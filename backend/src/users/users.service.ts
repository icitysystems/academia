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
				userId: studentId,
				status: "ACTIVE",
			},
			include: {
				course: {
					include: {
						lessons: true,
						onlineQuizzes: true,
						assignments: true,
					},
				},
			},
		});

		// Get upcoming assignments
		const upcomingAssignments = await this.prisma.assignment.findMany({
			where: {
				course: {
					enrollments: {
						some: { userId: studentId },
					},
				},
				dueDate: {
					gte: new Date(),
				},
			},
			orderBy: { dueDate: "asc" },
			take: 5,
		});

		// Get recent grades
		const recentGrades = await this.prisma.assignmentSubmission.findMany({
			where: {
				studentId,
				grade: { not: null },
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
				grade: { not: null },
			},
			include: {
				assignment: {
					include: { course: true },
				},
			},
			orderBy: { gradedAt: "desc" },
		});

		// Calculate GPA if applicable
		const grades = submissions.map((s) => s.grade).filter((g) => g !== null);
		const averageGrade =
			grades.length > 0
				? grades.reduce((a, b) => a + b, 0) / grades.length
				: null;

		return {
			submissions,
			averageGrade,
			totalSubmissions: submissions.length,
		};
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
						lessons: true,
						assignments: true,
					},
				},
			},
		});

		// Pending submissions to grade
		const pendingSubmissions = await this.prisma.assignmentSubmission.findMany({
			where: {
				assignment: {
					course: { instructorId: facultyId },
				},
				status: "SUBMITTED",
				grade: null,
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
			totalStudents: courses.reduce((sum, c) => sum + c._count.enrollments, 0),
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
				user: true,
			},
		});

		return enrollments.map((e) => ({
			studentId: e.userId,
			studentName: e.user.name,
			email: e.user.email,
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

		// Get student's submissions
		const submissions = await this.prisma.assignmentSubmission.findMany({
			where: {
				studentId,
				assignment: { courseId },
			},
			include: { assignment: true },
		});

		// Get quiz attempts
		const quizAttempts = await this.prisma.quizAttempt.findMany({
			where: {
				studentId,
				quiz: { courseId },
			},
			include: { quiz: true },
		});

		// Get lesson progress if applicable
		const lessonProgress = await this.prisma.lesson.count({
			where: {
				courseId,
				// Add completion tracking here
			},
		});

		return {
			studentId,
			courseId,
			submissions,
			quizAttempts,
			totalAssignments: submissions.length,
			completedAssignments: submissions.filter((s) => s.grade !== null).length,
			averageScore:
				submissions.filter((s) => s.grade !== null).length > 0
					? submissions
							.filter((s) => s.grade !== null)
							.reduce((sum, s) => sum + (s.grade || 0), 0) /
						submissions.filter((s) => s.grade !== null).length
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
		// Aggregate grade data
		const submissions = await this.prisma.assignmentSubmission.findMany({
			where: { grade: { not: null } },
			select: { grade: true },
		});

		const grades = submissions.map((s) => s.grade);
		const avgGrade =
			grades.length > 0
				? grades.reduce((a, b) => a + (b || 0), 0) / grades.length
				: 0;

		return {
			type: "ACADEMIC_PERFORMANCE",
			generatedAt: new Date(),
			totalSubmissions: submissions.length,
			averageGrade: avgGrade,
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
