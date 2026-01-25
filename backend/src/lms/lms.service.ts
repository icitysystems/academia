import {
	Injectable,
	Logger,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";

/**
 * Supported LMS providers
 */
export enum LMSProvider {
	MOODLE = "MOODLE",
	CANVAS = "CANVAS",
	BLACKBOARD = "BLACKBOARD",
	GOOGLE_CLASSROOM = "GOOGLE_CLASSROOM",
	BRIGHTSPACE = "BRIGHTSPACE",
}

/**
 * LMS connection configuration
 */
interface LMSConnectionConfig {
	provider: LMSProvider;
	apiUrl: string;
	apiKey?: string;
	clientId?: string;
	clientSecret?: string;
	accessToken?: string;
	refreshToken?: string;
}

/**
 * LMS Service
 * Handles integration with external Learning Management Systems
 */
@Injectable()
export class LMSService {
	private readonly logger = new Logger(LMSService.name);

	constructor(private prisma: PrismaService) {}

	// ============================
	// CONNECTION MANAGEMENT
	// ============================

	/**
	 * Create or update LMS connection
	 */
	async configureLMSConnection(
		institutionId: string,
		config: LMSConnectionConfig,
		adminId: string,
	) {
		// Store connection config (encrypted in production)
		// Using support ticket as a workaround for storing config
		const existingConfig = await this.prisma.supportTicket.findFirst({
			where: {
				title: { startsWith: `LMS_CONFIG_${institutionId}` },
			},
		});

		if (existingConfig) {
			await this.prisma.supportTicket.update({
				where: { id: existingConfig.id },
				data: {
					description: JSON.stringify({
						...config,
						// Don't store secrets in plain text in production
						apiKey: config.apiKey ? "***" : undefined,
						clientSecret: config.clientSecret ? "***" : undefined,
						accessToken: config.accessToken ? "***" : undefined,
						lastUpdated: new Date(),
						updatedBy: adminId,
					}),
				},
			});
		} else {
			await this.prisma.supportTicket.create({
				data: {
					submitterId: adminId,
					title: `LMS_CONFIG_${institutionId}_${config.provider}`,
					description: JSON.stringify({
						provider: config.provider,
						apiUrl: config.apiUrl,
						configured: true,
						createdAt: new Date(),
						createdBy: adminId,
					}),
					category: "OTHER",
					priority: "LOW",
					status: "RESOLVED",
				},
			});
		}

		await this.prisma.auditLog.create({
			data: {
				userId: adminId,
				action: "CONFIGURE_LMS_CONNECTION",
				entityType: "LMSConnection",
				entityId: institutionId,
				details: JSON.stringify({ provider: config.provider }),
			},
		});

		return {
			success: true,
			provider: config.provider,
			apiUrl: config.apiUrl,
			status: "CONFIGURED",
		};
	}

	/**
	 * Test LMS connection
	 */
	async testLMSConnection(institutionId: string, provider: LMSProvider) {
		this.logger.log(`Testing ${provider} connection for ${institutionId}`);

		// Simulate connection test
		const isConnected = Math.random() > 0.1; // 90% success rate for demo

		return {
			provider,
			status: isConnected ? "CONNECTED" : "FAILED",
			latency: Math.round(Math.random() * 200 + 50),
			lastChecked: new Date(),
			capabilities: isConnected ? this.getProviderCapabilities(provider) : [],
		};
	}

	/**
	 * Get LMS provider capabilities
	 */
	private getProviderCapabilities(provider: LMSProvider): string[] {
		const capabilities: Record<LMSProvider, string[]> = {
			[LMSProvider.MOODLE]: [
				"COURSE_SYNC",
				"GRADE_EXPORT",
				"USER_SYNC",
				"ASSIGNMENT_IMPORT",
				"QUIZ_IMPORT",
				"CALENDAR_SYNC",
			],
			[LMSProvider.CANVAS]: [
				"COURSE_SYNC",
				"GRADE_EXPORT",
				"USER_SYNC",
				"ASSIGNMENT_IMPORT",
				"RUBRIC_IMPORT",
				"ANNOUNCEMENT_SYNC",
			],
			[LMSProvider.BLACKBOARD]: [
				"COURSE_SYNC",
				"GRADE_EXPORT",
				"USER_SYNC",
				"CONTENT_SYNC",
			],
			[LMSProvider.GOOGLE_CLASSROOM]: [
				"COURSE_SYNC",
				"ASSIGNMENT_IMPORT",
				"USER_SYNC",
				"GRADE_EXPORT",
				"STREAM_SYNC",
			],
			[LMSProvider.BRIGHTSPACE]: [
				"COURSE_SYNC",
				"GRADE_EXPORT",
				"USER_SYNC",
				"COMPETENCY_SYNC",
			],
		};

		return capabilities[provider] || [];
	}

	// ============================
	// COURSE SYNC
	// ============================

	/**
	 * Get LMS mapping for a course (stored in audit logs)
	 */
	private async getLMSMapping(courseId: string): Promise<{
		externalId?: string;
		provider?: string;
		lastSyncedAt?: Date;
	} | null> {
		const mapping = await this.prisma.auditLog.findFirst({
			where: {
				entityType: "LMSMapping",
				entityId: courseId,
				action: "LMS_COURSE_MAPPED",
			},
			orderBy: { createdAt: "desc" },
		});

		if (mapping && mapping.details) {
			try {
				return JSON.parse(mapping.details);
			} catch {
				return null;
			}
		}
		return null;
	}

	/**
	 * Store LMS mapping for a course
	 */
	private async storeLMSMapping(
		courseId: string,
		externalId: string,
		provider: LMSProvider,
	) {
		await this.prisma.auditLog.create({
			data: {
				userId: "system",
				action: "LMS_COURSE_MAPPED",
				entityType: "LMSMapping",
				entityId: courseId,
				details: JSON.stringify({
					externalId,
					provider,
					lastSyncedAt: new Date(),
				}),
			},
		});
	}

	/**
	 * Find course by LMS external ID
	 */
	private async findCourseByExternalId(
		externalId: string,
	): Promise<string | null> {
		const mapping = await this.prisma.auditLog.findFirst({
			where: {
				entityType: "LMSMapping",
				action: "LMS_COURSE_MAPPED",
				details: { contains: externalId },
			},
			orderBy: { createdAt: "desc" },
		});

		return mapping?.entityId || null;
	}

	/**
	 * Sync courses from LMS
	 */
	async syncCoursesFromLMS(
		institutionId: string,
		provider: LMSProvider,
		options?: {
			courseIds?: string[];
			syncEnrollments?: boolean;
			syncContent?: boolean;
		},
	) {
		this.logger.log(`Syncing courses from ${provider}`);

		// In production, this would call the actual LMS API
		// For now, simulate the sync process

		const syncedCourses = [];
		const errors = [];

		// Simulate fetching courses from LMS
		const lmsCourses = await this.fetchLMSCourses(provider, options?.courseIds);

		for (const lmsCourse of lmsCourses) {
			try {
				// Check if course exists by external ID mapping or title
				const existingCourseId = await this.findCourseByExternalId(
					lmsCourse.id,
				);
				let course = existingCourseId
					? await this.prisma.course.findUnique({
							where: { id: existingCourseId },
						})
					: await this.prisma.course.findFirst({
							where: { title: lmsCourse.title },
						});

				if (course) {
					// Update existing course
					course = await this.prisma.course.update({
						where: { id: course.id },
						data: {
							title: lmsCourse.title,
							description: lmsCourse.description,
						},
					});

					// Update LMS mapping
					await this.storeLMSMapping(course.id, lmsCourse.id, provider);
				} else {
					// Get a default instructor for new courses
					const defaultInstructor = await this.prisma.user.findFirst({
						where: { role: "FACULTY" },
					});

					if (!defaultInstructor) {
						throw new Error("No instructor available to assign to course");
					}

					// Create new course
					course = await this.prisma.course.create({
						data: {
							title: lmsCourse.title,
							description: lmsCourse.description,
							code: lmsCourse.code || `LMS-${Date.now()}`,
							instructorId: defaultInstructor.id,
							status: "DRAFT",
						},
					});

					// Store LMS mapping
					await this.storeLMSMapping(course.id, lmsCourse.id, provider);
				}

				// Sync enrollments if requested
				if (options?.syncEnrollments && lmsCourse.enrollments) {
					await this.syncEnrollments(course.id, lmsCourse.enrollments);
				}

				syncedCourses.push({
					courseId: course.id,
					title: course.title,
					status: "SYNCED",
				});
			} catch (error: any) {
				errors.push({
					lmsCourseId: lmsCourse.id,
					error: error.message,
				});
			}
		}

		return {
			totalProcessed: lmsCourses.length,
			successCount: syncedCourses.length,
			errorCount: errors.length,
			syncedCourses,
			errors,
			syncedAt: new Date(),
		};
	}

	/**
	 * Simulate fetching courses from LMS
	 */
	private async fetchLMSCourses(
		provider: LMSProvider,
		courseIds?: string[],
	): Promise<any[]> {
		// Simulate LMS API response
		return [
			{
				id: "lms-course-1",
				title: "Introduction to Computer Science",
				description: "Fundamentals of programming and algorithms",
				code: "CS101",
				enrollments: [
					{ studentId: "student-1", role: "STUDENT" },
					{ studentId: "student-2", role: "STUDENT" },
				],
			},
			{
				id: "lms-course-2",
				title: "Data Structures",
				description: "Arrays, linked lists, trees, and graphs",
				code: "CS201",
			},
		];
	}

	/**
	 * Sync enrollments for a course
	 */
	private async syncEnrollments(
		courseId: string,
		enrollments: Array<{ studentId: string; role: string }>,
	) {
		for (const enrollment of enrollments) {
			// Try to find user by email pattern (in production, would use proper LMS user mapping)
			const user = await this.prisma.user.findFirst({
				where: {
					role: "STUDENT",
					email: { contains: enrollment.studentId },
				},
			});

			if (!user) {
				// Skip if user doesn't exist locally
				continue;
			}

			// Check if already enrolled
			const existing = await this.prisma.enrollment.findFirst({
				where: {
					courseId,
					studentId: user.id,
				},
			});

			if (!existing) {
				await this.prisma.enrollment.create({
					data: {
						courseId,
						studentId: user.id,
						status: "ACTIVE",
						enrolledAt: new Date(),
					},
				});
			}
		}
	}

	// ============================
	// GRADE EXPORT
	// ============================

	/**
	 * Export grades to LMS
	 */
	async exportGradesToLMS(
		courseId: string,
		provider: LMSProvider,
		options?: {
			assignmentId?: string;
			studentIds?: string[];
		},
	) {
		const course = await this.prisma.course.findUnique({
			where: { id: courseId },
		});

		if (!course) {
			throw new NotFoundException("Course not found");
		}

		// Get grades to export
		const grades = await this.getGradesForExport(courseId, options);

		// In production, this would call the actual LMS API
		// For now, simulate the export process

		const exportResults = {
			exported: [] as any[],
			failed: [] as any[],
		};

		for (const grade of grades) {
			try {
				// Simulate API call to LMS
				await this.simulateLMSGradePost(provider, grade);

				exportResults.exported.push({
					studentId: grade.studentId,
					assignmentId: grade.assignmentId,
					grade: grade.grade,
					status: "EXPORTED",
				});
			} catch (error: any) {
				exportResults.failed.push({
					studentId: grade.studentId,
					error: error.message,
				});
			}
		}

		// Log the export
		await this.prisma.auditLog.create({
			data: {
				userId: "system",
				action: "EXPORT_GRADES_TO_LMS",
				entityType: "Course",
				entityId: courseId,
				details: JSON.stringify({
					provider,
					exportedCount: exportResults.exported.length,
					failedCount: exportResults.failed.length,
				}),
			},
		});

		return {
			courseId,
			provider,
			totalGrades: grades.length,
			exportedCount: exportResults.exported.length,
			failedCount: exportResults.failed.length,
			results: exportResults,
			exportedAt: new Date(),
		};
	}

	/**
	 * Get grades for export
	 */
	private async getGradesForExport(
		courseId: string,
		options?: { assignmentId?: string; studentIds?: string[] },
	) {
		const grades: Array<{
			studentId: string;
			assignmentId: string;
			grade: number;
		}> = [];

		// Get course lesson IDs first
		const courseModules = await this.prisma.courseModule.findMany({
			where: { courseId },
			include: { lessons: true },
		});

		const lessonIds = courseModules.flatMap((m) => m.lessons.map((l) => l.id));

		// Get assignment submissions through lesson relationship
		const submissions = await this.prisma.assignmentSubmission.findMany({
			where: {
				assignment: { lessonId: { in: lessonIds } },
				score: { not: null },
				...(options?.assignmentId && { assignmentId: options.assignmentId }),
				...(options?.studentIds && { studentId: { in: options.studentIds } }),
			},
			include: {
				assignment: true,
			},
		});

		for (const submission of submissions) {
			grades.push({
				studentId: submission.studentId,
				assignmentId: submission.assignmentId,
				grade: submission.score || 0,
			});
		}

		// Get quiz grades through lesson relationship
		const quizAttempts = await this.prisma.quizAttempt.findMany({
			where: {
				quiz: { lessonId: { in: lessonIds } },
				submittedAt: { not: null },
				...(options?.studentIds && { studentId: { in: options.studentIds } }),
			},
			include: {
				quiz: true,
			},
		});

		for (const attempt of quizAttempts) {
			grades.push({
				studentId: attempt.studentId,
				assignmentId: attempt.quizId,
				grade: attempt.percentage || 0,
			});
		}

		return grades;
	}

	/**
	 * Simulate posting grade to LMS
	 */
	private async simulateLMSGradePost(provider: LMSProvider, grade: any) {
		// Simulate network delay
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Simulate occasional failures
		if (Math.random() < 0.05) {
			throw new Error("LMS API temporarily unavailable");
		}
	}

	// ============================
	// CONTENT IMPORT
	// ============================

	/**
	 * Import assignments from LMS
	 */
	async importAssignmentsFromLMS(
		courseId: string,
		provider: LMSProvider,
		lmsAssignmentIds?: string[],
	) {
		const course = await this.prisma.course.findUnique({
			where: { id: courseId },
			include: {
				modules: {
					include: {
						lessons: { take: 1 },
					},
				},
			},
		});

		if (!course) {
			throw new NotFoundException("Course not found");
		}

		// Get first lesson to attach assignments (or create a default module/lesson)
		let lessonId = course.modules[0]?.lessons[0]?.id;

		if (!lessonId) {
			// Create a default module and lesson for imported assignments
			const module = await this.prisma.courseModule.create({
				data: {
					courseId,
					title: "Imported Assignments",
					description: "Assignments imported from LMS",
					orderIndex: 999,
				},
			});

			const lesson = await this.prisma.courseLesson.create({
				data: {
					moduleId: module.id,
					title: "LMS Assignments",
					contentType: "ASSIGNMENT",
					orderIndex: 1,
				},
			});

			lessonId = lesson.id;
		}

		// Get LMS mapping for the course
		const lmsMapping = await this.getLMSMapping(courseId);

		// Simulate fetching assignments from LMS
		const lmsAssignments = await this.fetchLMSAssignments(
			provider,
			lmsMapping?.externalId || "",
			lmsAssignmentIds,
		);

		const imported = [];
		const errors = [];

		for (const lmsAssignment of lmsAssignments) {
			try {
				const assignment = await this.prisma.assignment.create({
					data: {
						lessonId,
						createdById: course.instructorId,
						title: lmsAssignment.title,
						description: lmsAssignment.description,
						dueDate: lmsAssignment.dueDate
							? new Date(lmsAssignment.dueDate)
							: null,
						totalMarks: lmsAssignment.maxScore || 100,
					},
				});

				// Store LMS assignment mapping
				await this.prisma.auditLog.create({
					data: {
						userId: "system",
						action: "LMS_ASSIGNMENT_IMPORTED",
						entityType: "Assignment",
						entityId: assignment.id,
						details: JSON.stringify({
							externalId: lmsAssignment.id,
							provider,
							importedAt: new Date(),
						}),
					},
				});

				imported.push({
					assignmentId: assignment.id,
					title: assignment.title,
					status: "IMPORTED",
				});
			} catch (error: any) {
				errors.push({
					lmsAssignmentId: lmsAssignment.id,
					error: error.message,
				});
			}
		}

		return {
			courseId,
			provider,
			totalProcessed: lmsAssignments.length,
			importedCount: imported.length,
			errorCount: errors.length,
			imported,
			errors,
			importedAt: new Date(),
		};
	}

	/**
	 * Simulate fetching assignments from LMS
	 */
	private async fetchLMSAssignments(
		provider: LMSProvider,
		lmsCourseId: string,
		assignmentIds?: string[],
	): Promise<any[]> {
		return [
			{
				id: "lms-assignment-1",
				title: "Homework 1: Variables and Types",
				description: "Complete exercises on basic data types",
				dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				maxScore: 100,
			},
			{
				id: "lms-assignment-2",
				title: "Project: Calculator App",
				description: "Build a simple calculator application",
				dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
				maxScore: 150,
			},
		];
	}

	// ============================
	// SYNC STATUS & LOGS
	// ============================

	/**
	 * Get LMS sync status for a course
	 */
	async getLMSSyncStatus(courseId: string) {
		const course = await this.prisma.course.findUnique({
			where: { id: courseId },
		});

		if (!course) {
			throw new NotFoundException("Course not found");
		}

		// Get LMS mapping
		const lmsMapping = await this.getLMSMapping(courseId);

		// Get recent sync logs
		const syncLogs = await this.prisma.auditLog.findMany({
			where: {
				entityId: courseId,
				action: { contains: "LMS" },
			},
			orderBy: { createdAt: "desc" },
			take: 10,
		});

		return {
			courseId,
			externalId: lmsMapping?.externalId || null,
			externalProvider: lmsMapping?.provider || null,
			lastSyncedAt: lmsMapping?.lastSyncedAt || null,
			syncStatus: lmsMapping?.lastSyncedAt ? "SYNCED" : "NOT_SYNCED",
			recentSyncLogs: syncLogs.map((log) => ({
				action: log.action,
				timestamp: log.createdAt,
				details: log.details,
			})),
		};
	}

	/**
	 * Get all configured LMS connections
	 */
	async getLMSConnections(adminId: string) {
		const configs = await this.prisma.supportTicket.findMany({
			where: {
				title: { startsWith: "LMS_CONFIG_" },
			},
		});

		return configs.map((config) => {
			const data = JSON.parse(config.description);
			return {
				id: config.id,
				provider: data.provider,
				apiUrl: data.apiUrl,
				configured: data.configured,
				lastUpdated: data.lastUpdated || config.updatedAt,
			};
		});
	}
}
