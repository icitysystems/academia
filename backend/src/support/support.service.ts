import {
	Injectable,
	Logger,
	NotFoundException,
	ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
	UserRole,
	TicketStatus,
	TicketPriority,
	TicketCategory,
} from "../common/types";

/**
 * Support Ticket Service
 * Implements support staff functionality as per Specification Section 2A.4
 *
 * Support Staff can:
 * - Provide technical support for students and faculty
 * - Troubleshoot login, access, or system errors
 * - Maintain servers, databases, and security protocols
 * - Manage updates and system upgrades
 * - Monitor system performance and uptime
 */
@Injectable()
export class SupportService {
	private readonly logger = new Logger(SupportService.name);

	constructor(private prisma: PrismaService) {}

	// ============================
	// Ticket Management
	// ============================

	/**
	 * Create a support ticket - Any authenticated user
	 */
	async createTicket(input: CreateTicketInput, submitterId: string) {
		return this.prisma.supportTicket.create({
			data: {
				submitterId,
				title: input.title,
				description: input.description,
				category: input.category || TicketCategory.GENERAL,
				priority: input.priority || TicketPriority.MEDIUM,
				status: TicketStatus.OPEN,
			},
			include: {
				submitter: true,
				assignee: true,
			},
		});
	}

	/**
	 * Get ticket by ID
	 */
	async getTicket(ticketId: string, userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		const ticket = await this.prisma.supportTicket.findUnique({
			where: { id: ticketId },
			include: {
				submitter: true,
				assignee: true,
				comments: {
					orderBy: { createdAt: "asc" },
				},
			},
		});

		if (!ticket) {
			throw new NotFoundException("Ticket not found");
		}

		// Only submitter, assignee, support staff, or admin can view
		const canView =
			ticket.submitterId === userId ||
			ticket.assigneeId === userId ||
			user?.role === UserRole.SUPPORT_STAFF ||
			user?.role === UserRole.ADMIN;

		if (!canView) {
			throw new ForbiddenException("Not authorized to view this ticket");
		}

		return ticket;
	}

	/**
	 * Get user's tickets
	 */
	async getUserTickets(userId: string, status?: string) {
		return this.prisma.supportTicket.findMany({
			where: {
				submitterId: userId,
				...(status && { status }),
			},
			include: {
				assignee: true,
			},
			orderBy: { createdAt: "desc" },
		});
	}

	/**
	 * Get all tickets - Support staff and admin only
	 */
	async getAllTickets(
		userId: string,
		options?: {
			status?: string;
			category?: string;
			priority?: string;
			assigneeId?: string;
			skip?: number;
			take?: number;
		},
	) {
		await this.verifySupportRole(userId);

		const where: any = {};

		if (options?.status) where.status = options.status;
		if (options?.category) where.category = options.category;
		if (options?.priority) where.priority = options.priority;
		if (options?.assigneeId) where.assigneeId = options.assigneeId;

		const [tickets, total] = await Promise.all([
			this.prisma.supportTicket.findMany({
				where,
				include: {
					submitter: true,
					assignee: true,
				},
				orderBy: [
					{ priority: "desc" }, // URGENT first
					{ createdAt: "asc" }, // Oldest first
				],
				skip: options?.skip || 0,
				take: options?.take || 50,
			}),
			this.prisma.supportTicket.count({ where }),
		]);

		return { tickets, total };
	}

	/**
	 * Assign ticket to support staff
	 */
	async assignTicket(ticketId: string, assigneeId: string, userId: string) {
		await this.verifySupportRole(userId);

		// Verify assignee is support staff
		const assignee = await this.prisma.user.findUnique({
			where: { id: assigneeId },
		});

		if (
			!assignee ||
			(assignee.role !== UserRole.SUPPORT_STAFF &&
				assignee.role !== UserRole.ADMIN)
		) {
			throw new ForbiddenException("Assignee must be support staff or admin");
		}

		return this.prisma.supportTicket.update({
			where: { id: ticketId },
			data: {
				assigneeId,
				status: TicketStatus.IN_PROGRESS,
			},
			include: {
				submitter: true,
				assignee: true,
			},
		});
	}

	/**
	 * Update ticket status
	 */
	async updateTicketStatus(ticketId: string, status: string, userId: string) {
		await this.verifySupportRole(userId);

		const updateData: any = { status };

		if (status === TicketStatus.RESOLVED) {
			updateData.resolvedAt = new Date();
		}

		return this.prisma.supportTicket.update({
			where: { id: ticketId },
			data: updateData,
			include: {
				submitter: true,
				assignee: true,
			},
		});
	}

	/**
	 * Resolve ticket with resolution notes
	 */
	async resolveTicket(ticketId: string, resolution: string, userId: string) {
		await this.verifySupportRole(userId);

		return this.prisma.supportTicket.update({
			where: { id: ticketId },
			data: {
				status: TicketStatus.RESOLVED,
				resolution,
				resolvedAt: new Date(),
			},
			include: {
				submitter: true,
				assignee: true,
			},
		});
	}

	/**
	 * Close ticket
	 */
	async closeTicket(ticketId: string, userId: string) {
		await this.verifySupportRole(userId);

		return this.prisma.supportTicket.update({
			where: { id: ticketId },
			data: {
				status: TicketStatus.CLOSED,
			},
			include: {
				submitter: true,
				assignee: true,
			},
		});
	}

	/**
	 * Add comment to ticket
	 */
	async addComment(
		ticketId: string,
		content: string,
		isInternal: boolean,
		userId: string,
	) {
		const ticket = await this.prisma.supportTicket.findUnique({
			where: { id: ticketId },
		});

		if (!ticket) {
			throw new NotFoundException("Ticket not found");
		}

		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		// Only support staff can add internal comments
		if (
			isInternal &&
			user?.role !== UserRole.SUPPORT_STAFF &&
			user?.role !== UserRole.ADMIN
		) {
			throw new ForbiddenException(
				"Only support staff can add internal comments",
			);
		}

		// Verify user can comment
		const canComment =
			ticket.submitterId === userId ||
			ticket.assigneeId === userId ||
			user?.role === UserRole.SUPPORT_STAFF ||
			user?.role === UserRole.ADMIN;

		if (!canComment) {
			throw new ForbiddenException("Not authorized to comment on this ticket");
		}

		return this.prisma.ticketComment.create({
			data: {
				ticketId,
				authorId: userId,
				content,
				isInternal,
			},
		});
	}

	// ============================
	// Support Dashboard Stats
	// ============================

	/**
	 * Get support dashboard statistics
	 */
	async getDashboardStats(userId: string) {
		await this.verifySupportRole(userId);

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const [
			openTickets,
			inProgressTickets,
			resolvedToday,
			closedToday,
			byCategory,
			byPriority,
			avgResolutionTime,
		] = await Promise.all([
			this.prisma.supportTicket.count({
				where: { status: TicketStatus.OPEN },
			}),
			this.prisma.supportTicket.count({
				where: { status: TicketStatus.IN_PROGRESS },
			}),
			this.prisma.supportTicket.count({
				where: {
					status: TicketStatus.RESOLVED,
					resolvedAt: { gte: today },
				},
			}),
			this.prisma.supportTicket.count({
				where: {
					status: TicketStatus.CLOSED,
					updatedAt: { gte: today },
				},
			}),
			this.getTicketsByCategory(),
			this.getTicketsByPriority(),
			this.getAverageResolutionTime(),
		]);

		return {
			openTickets,
			inProgressTickets,
			resolvedToday,
			closedToday,
			byCategory,
			byPriority,
			avgResolutionTime,
		};
	}

	private async getTicketsByCategory() {
		return this.prisma.supportTicket.groupBy({
			by: ["category"],
			_count: { id: true },
			where: {
				status: { not: TicketStatus.CLOSED },
			},
		});
	}

	private async getTicketsByPriority() {
		return this.prisma.supportTicket.groupBy({
			by: ["priority"],
			_count: { id: true },
			where: {
				status: { not: TicketStatus.CLOSED },
			},
		});
	}

	private async getAverageResolutionTime() {
		const resolvedTickets = await this.prisma.supportTicket.findMany({
			where: {
				status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
				resolvedAt: { not: null },
			},
			select: {
				createdAt: true,
				resolvedAt: true,
			},
		});

		if (resolvedTickets.length === 0) return null;

		const totalTime = resolvedTickets.reduce((sum, ticket) => {
			const created = new Date(ticket.createdAt).getTime();
			const resolved = new Date(ticket.resolvedAt!).getTime();
			return sum + (resolved - created);
		}, 0);

		// Return average in hours
		return totalTime / resolvedTickets.length / (1000 * 60 * 60);
	}

	// ============================
	// System Monitoring (2A.4)
	// ============================

	/**
	 * Get system health status
	 * As per Specification 2A.4: "Monitor system performance and uptime"
	 */
	async getSystemHealth(userId: string) {
		await this.verifySupportRole(userId);

		// Basic system metrics (would be replaced with actual monitoring)
		const [totalUsers, activeUsers, recentLogins] = await Promise.all([
			this.prisma.user.count(),
			this.prisma.user.count({
				where: {
					lastLoginAt: {
						gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
					},
				},
			}),
			this.prisma.user.findMany({
				where: {
					lastLoginAt: { not: null },
				},
				orderBy: { lastLoginAt: "desc" },
				take: 10,
				select: {
					id: true,
					email: true,
					lastLoginAt: true,
				},
			}),
		]);

		return {
			status: "healthy",
			timestamp: new Date(),
			metrics: {
				totalUsers,
				activeUsers24h: activeUsers,
				recentLogins,
			},
		};
	}

	/**
	 * Get comprehensive system metrics
	 * As per Specification 2A.4: "Maintain servers, databases, and security protocols"
	 */
	async getSystemMetrics(userId: string) {
		await this.verifySupportRole(userId);

		const now = new Date();
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
		const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

		const [
			totalUsers,
			usersByRole,
			newUsersToday,
			newUsersThisWeek,
			activeGradingSessions,
			totalGradedSubmissions,
			pendingTickets,
			recentAuditLogs,
		] = await Promise.all([
			this.prisma.user.count(),
			this.prisma.user.groupBy({
				by: ["role"],
				_count: { id: true },
			}),
			this.prisma.user.count({
				where: { createdAt: { gte: oneDayAgo } },
			}),
			this.prisma.user.count({
				where: { createdAt: { gte: oneWeekAgo } },
			}),
			this.prisma.examGradingSession.count({
				where: { status: { in: ["PENDING", "CALIBRATING", "GRADING"] } },
			}),
			this.prisma.studentExamSubmission.count({
				where: { status: "GRADED" },
			}),
			this.prisma.supportTicket.count({
				where: {
					status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
				},
			}),
			this.prisma.auditLog.count({
				where: { createdAt: { gte: oneHourAgo } },
			}),
		]);

		return {
			timestamp: now,
			users: {
				total: totalUsers,
				byRole: usersByRole.reduce(
					(acc, item) => {
						acc[item.role] = item._count.id;
						return acc;
					},
					{} as Record<string, number>,
				),
				newToday: newUsersToday,
				newThisWeek: newUsersThisWeek,
			},
			grading: {
				activeSessions: activeGradingSessions,
				totalGraded: totalGradedSubmissions,
			},
			support: {
				pendingTickets,
			},
			activity: {
				logsLastHour: recentAuditLogs,
			},
		};
	}

	/**
	 * Get error logs for troubleshooting
	 * As per Specification 2A.4: "Troubleshoot login, access, or system errors"
	 */
	async getErrorLogs(
		userId: string,
		options?: {
			startDate?: Date;
			endDate?: Date;
			action?: string;
			limit?: number;
		},
	) {
		await this.verifySupportRole(userId);

		const where: any = {};

		if (options?.startDate || options?.endDate) {
			where.createdAt = {};
			if (options.startDate) where.createdAt.gte = options.startDate;
			if (options.endDate) where.createdAt.lte = options.endDate;
		}

		if (options?.action) {
			where.action = { contains: options.action };
		}

		// Filter for error-related actions
		where.OR = [
			{ action: { contains: "ERROR" } },
			{ action: { contains: "FAIL" } },
			{ action: { contains: "DENIED" } },
			{ action: { contains: "UNAUTHORIZED" } },
		];

		return this.prisma.auditLog.findMany({
			where,
			include: {
				user: {
					select: {
						id: true,
						email: true,
						name: true,
						role: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
			take: options?.limit || 100,
		});
	}

	/**
	 * Get all audit logs with filtering
	 * As per Specification 2A.4: System monitoring and logging
	 */
	async getAuditLogs(
		userId: string,
		options?: {
			userId?: string;
			action?: string;
			entityType?: string;
			startDate?: Date;
			endDate?: Date;
			limit?: number;
			offset?: number;
		},
	) {
		await this.verifySupportRole(userId);

		const where: any = {};

		if (options?.userId) where.userId = options.userId;
		if (options?.action) where.action = { contains: options.action };
		if (options?.entityType) where.entityType = options.entityType;

		if (options?.startDate || options?.endDate) {
			where.createdAt = {};
			if (options.startDate) where.createdAt.gte = options.startDate;
			if (options.endDate) where.createdAt.lte = options.endDate;
		}

		const [logs, total] = await Promise.all([
			this.prisma.auditLog.findMany({
				where,
				include: {
					user: {
						select: {
							id: true,
							email: true,
							name: true,
							role: true,
						},
					},
				},
				orderBy: { createdAt: "desc" },
				take: options?.limit || 50,
				skip: options?.offset || 0,
			}),
			this.prisma.auditLog.count({ where }),
		]);

		return { logs, total };
	}

	/**
	 * Create audit log entry
	 */
	async createAuditLog(
		action: string,
		userId?: string,
		details?: {
			entityType?: string;
			entityId?: string;
			details?: string;
			ipAddress?: string;
		},
	) {
		return this.prisma.auditLog.create({
			data: {
				userId,
				action,
				entityType: details?.entityType,
				entityId: details?.entityId,
				details: details?.details,
				ipAddress: details?.ipAddress,
			},
		});
	}

	/**
	 * Get user activity report for a specific user
	 * As per Specification 2A.4: Support staff troubleshooting capabilities
	 */
	async getUserActivityReport(userId: string, targetUserId: string) {
		await this.verifySupportRole(userId);

		const user = await this.prisma.user.findUnique({
			where: { id: targetUserId },
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true,
				lastLoginAt: true,
			},
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		const [recentActivity, ticketsSubmitted, gradingActivity, loginHistory] =
			await Promise.all([
				this.prisma.auditLog.findMany({
					where: { userId: targetUserId },
					orderBy: { createdAt: "desc" },
					take: 20,
				}),
				this.prisma.supportTicket.count({
					where: { submitterId: targetUserId },
				}),
				this.prisma.studentExamSubmission.count({
					where: {
						examPaper: { teacherId: targetUserId },
					},
				}),
				this.prisma.auditLog.findMany({
					where: {
						userId: targetUserId,
						action: { contains: "LOGIN" },
					},
					orderBy: { createdAt: "desc" },
					take: 10,
				}),
			]);

		return {
			user,
			recentActivity,
			stats: {
				ticketsSubmitted,
				gradingActivity,
			},
			loginHistory,
		};
	}

	/**
	 * Get database statistics for maintenance
	 * As per Specification 2A.4: "Maintain servers, databases, and security protocols"
	 */
	async getDatabaseStats(userId: string) {
		await this.verifySupportRole(userId);

		const [
			userCount,
			templateCount,
			answerSheetCount,
			examPaperCount,
			submissionCount,
			ticketCount,
			auditLogCount,
		] = await Promise.all([
			this.prisma.user.count(),
			this.prisma.template.count(),
			this.prisma.answerSheet.count(),
			this.prisma.examPaperSetup.count(),
			this.prisma.studentExamSubmission.count(),
			this.prisma.supportTicket.count(),
			this.prisma.auditLog.count(),
		]);

		return {
			timestamp: new Date(),
			tables: {
				users: userCount,
				templates: templateCount,
				answerSheets: answerSheetCount,
				examPapers: examPaperCount,
				submissions: submissionCount,
				supportTickets: ticketCount,
				auditLogs: auditLogCount,
			},
		};
	}

	/**
	 * Get server status
	 * As per Specification 2A.4: "Monitor system performance and uptime"
	 */
	async getServerStatus(userId: string) {
		await this.verifySupportRole(userId);

		const uptimeSeconds = process.uptime();
		const memoryUsage = process.memoryUsage();

		return {
			timestamp: new Date(),
			status: "healthy",
			uptime: {
				seconds: uptimeSeconds,
				formatted: this.formatUptime(uptimeSeconds),
			},
			memory: {
				heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
				heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
				rss: Math.round(memoryUsage.rss / 1024 / 1024),
				unit: "MB",
			},
			node: {
				version: process.version,
				platform: process.platform,
				arch: process.arch,
			},
		};
	}

	/**
	 * Get security alerts
	 * As per Specification 2A.4: Security monitoring
	 */
	async getSecurityAlerts(userId: string) {
		await this.verifySupportRole(userId);

		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		// Get failed login attempts and suspicious activities
		const [failedLogins, unauthorizedAccess, recentErrors] = await Promise.all([
			this.prisma.auditLog.count({
				where: {
					action: { contains: "LOGIN_FAILED" },
					createdAt: { gte: oneDayAgo },
				},
			}),
			this.prisma.auditLog.count({
				where: {
					action: { contains: "UNAUTHORIZED" },
					createdAt: { gte: oneDayAgo },
				},
			}),
			this.prisma.auditLog.findMany({
				where: {
					OR: [
						{ action: { contains: "ERROR" } },
						{ action: { contains: "FAILED" } },
						{ action: { contains: "UNAUTHORIZED" } },
					],
					createdAt: { gte: oneHourAgo },
				},
				include: {
					user: {
						select: { email: true },
					},
				},
				orderBy: { createdAt: "desc" },
				take: 20,
			}),
		]);

		return {
			timestamp: new Date(),
			summary: {
				failedLogins24h: failedLogins,
				unauthorizedAccess24h: unauthorizedAccess,
				errorsLastHour: recentErrors.length,
			},
			recentAlerts: recentErrors.map((log) => ({
				id: log.id,
				action: log.action,
				userId: log.userId,
				userEmail: log.user?.email,
				details: log.details,
				timestamp: log.createdAt,
			})),
		};
	}

	/**
	 * Get database health
	 * As per Specification 2A.4: Database maintenance
	 */
	async getDatabaseHealth(userId: string) {
		await this.verifySupportRole(userId);

		// Check database connectivity and basic stats
		const startTime = Date.now();
		await this.prisma.user.count();
		const queryTime = Date.now() - startTime;

		const dbStats = await this.getDatabaseStats(userId);

		return {
			timestamp: new Date(),
			status:
				queryTime < 1000 ? "healthy" : queryTime < 5000 ? "slow" : "critical",
			responseTime: queryTime,
			tables: dbStats.tables,
		};
	}

	/**
	 * Trigger maintenance task
	 * As per Specification 2A.4: "Manage updates and system upgrades"
	 */
	async triggerMaintenance(userId: string, taskType: string, options?: string) {
		await this.verifySupportRole(userId);

		// Log the maintenance request
		await this.prisma.auditLog.create({
			data: {
				userId,
				action: `MAINTENANCE_TRIGGERED_${taskType.toUpperCase()}`,
				details: options,
			},
		});

		// Simulate maintenance task execution
		const supportedTasks = [
			"CLEANUP_OLD_LOGS",
			"REINDEX_DATABASE",
			"CLEAR_CACHE",
			"HEALTH_CHECK",
		];

		if (!supportedTasks.includes(taskType.toUpperCase())) {
			return {
				success: false,
				message: `Unknown task type: ${taskType}. Supported: ${supportedTasks.join(", ")}`,
			};
		}

		return {
			success: true,
			taskType,
			status: "queued",
			message: `Maintenance task ${taskType} has been queued for execution`,
			timestamp: new Date(),
		};
	}

	private formatUptime(seconds: number): string {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		const parts = [];
		if (days > 0) parts.push(`${days}d`);
		if (hours > 0) parts.push(`${hours}h`);
		if (minutes > 0) parts.push(`${minutes}m`);
		parts.push(`${secs}s`);

		return parts.join(" ");
	}

	// ============================
	// Helper Methods
	// ============================

	private async verifySupportRole(userId: string) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});

		if (
			!user ||
			(user.role !== UserRole.SUPPORT_STAFF && user.role !== UserRole.ADMIN)
		) {
			throw new ForbiddenException("Support staff or admin access required");
		}

		return user;
	}
}

// Input types
interface CreateTicketInput {
	title: string;
	description: string;
	category?: string;
	priority?: string;
}
