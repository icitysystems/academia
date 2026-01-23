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
