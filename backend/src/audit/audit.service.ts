import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

/**
 * Security event types for audit logging
 */
export enum AuditEventType {
	// Authentication events
	LOGIN_SUCCESS = "LOGIN_SUCCESS",
	LOGIN_FAILURE = "LOGIN_FAILURE",
	LOGOUT = "LOGOUT",
	PASSWORD_CHANGE = "PASSWORD_CHANGE",
	PASSWORD_RESET_REQUEST = "PASSWORD_RESET_REQUEST",
	PASSWORD_RESET_COMPLETE = "PASSWORD_RESET_COMPLETE",
	MFA_ENABLED = "MFA_ENABLED",
	MFA_DISABLED = "MFA_DISABLED",
	MFA_CHALLENGE_SUCCESS = "MFA_CHALLENGE_SUCCESS",
	MFA_CHALLENGE_FAILURE = "MFA_CHALLENGE_FAILURE",

	// SSO events
	SSO_LOGIN_INITIATED = "SSO_LOGIN_INITIATED",
	SSO_LOGIN_SUCCESS = "SSO_LOGIN_SUCCESS",
	SSO_LOGIN_FAILURE = "SSO_LOGIN_FAILURE",

	// Session events
	SESSION_CREATED = "SESSION_CREATED",
	SESSION_EXPIRED = "SESSION_EXPIRED",
	SESSION_REVOKED = "SESSION_REVOKED",
	SESSION_REFRESH = "SESSION_REFRESH",

	// Access events
	UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
	FORBIDDEN_ACCESS = "FORBIDDEN_ACCESS",
	RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

	// Data events
	DATA_EXPORT = "DATA_EXPORT",
	DATA_IMPORT = "DATA_IMPORT",
	SENSITIVE_DATA_ACCESS = "SENSITIVE_DATA_ACCESS",
	BULK_DELETE = "BULK_DELETE",

	// Admin events
	USER_CREATED = "USER_CREATED",
	USER_UPDATED = "USER_UPDATED",
	USER_DELETED = "USER_DELETED",
	USER_ROLE_CHANGED = "USER_ROLE_CHANGED",
	USER_SUSPENDED = "USER_SUSPENDED",
	USER_REACTIVATED = "USER_REACTIVATED",

	// System events
	SYSTEM_CONFIG_CHANGED = "SYSTEM_CONFIG_CHANGED",
	API_KEY_CREATED = "API_KEY_CREATED",
	API_KEY_REVOKED = "API_KEY_REVOKED",
}

export enum AuditSeverity {
	INFO = "INFO",
	WARNING = "WARNING",
	ERROR = "ERROR",
	CRITICAL = "CRITICAL",
}

export interface AuditLogEntry {
	eventType: AuditEventType;
	severity: AuditSeverity;
	userId?: string;
	targetUserId?: string;
	ipAddress?: string;
	userAgent?: string;
	resourceType?: string;
	resourceId?: string;
	action?: string;
	details?: Record<string, any>;
	success: boolean;
	errorMessage?: string;
}

@Injectable()
export class AuditService {
	private readonly logger = new Logger(AuditService.name);

	constructor(private prisma: PrismaService) {}

	/**
	 * Log a security audit event
	 */
	async log(entry: AuditLogEntry): Promise<void> {
		try {
			// Store in database
			await this.prisma.auditLog.create({
				data: {
					eventType: entry.eventType,
					severity: entry.severity,
					userId: entry.userId,
					targetUserId: entry.targetUserId,
					ipAddress: entry.ipAddress,
					userAgent: entry.userAgent,
					resourceType: entry.resourceType,
					resourceId: entry.resourceId,
					action: entry.action,
					details: entry.details ? JSON.stringify(entry.details) : null,
					success: entry.success,
					errorMessage: entry.errorMessage,
					timestamp: new Date(),
				},
			});

			// Also log to console for real-time monitoring
			const logLevel =
				entry.severity === AuditSeverity.CRITICAL ||
				entry.severity === AuditSeverity.ERROR
					? "error"
					: entry.severity === AuditSeverity.WARNING
						? "warn"
						: "log";

			this.logger[logLevel](
				`[AUDIT] ${entry.eventType} - User: ${entry.userId || "anonymous"} - Success: ${entry.success}`,
				entry.details,
			);
		} catch (error) {
			// Don't let audit logging failures affect the main operation
			this.logger.error("Failed to write audit log", error);
		}
	}

	/**
	 * Log authentication success
	 */
	async logLoginSuccess(
		userId: string,
		ipAddress?: string,
		userAgent?: string,
		method: "password" | "sso" | "mfa" = "password",
	): Promise<void> {
		await this.log({
			eventType: AuditEventType.LOGIN_SUCCESS,
			severity: AuditSeverity.INFO,
			userId,
			ipAddress,
			userAgent,
			action: "login",
			details: { method },
			success: true,
		});
	}

	/**
	 * Log authentication failure
	 */
	async logLoginFailure(
		email: string,
		ipAddress?: string,
		userAgent?: string,
		reason?: string,
	): Promise<void> {
		await this.log({
			eventType: AuditEventType.LOGIN_FAILURE,
			severity: AuditSeverity.WARNING,
			ipAddress,
			userAgent,
			action: "login",
			details: { email, reason },
			success: false,
			errorMessage: reason,
		});
	}

	/**
	 * Log MFA events
	 */
	async logMfaEvent(
		userId: string,
		eventType:
			| AuditEventType.MFA_ENABLED
			| AuditEventType.MFA_DISABLED
			| AuditEventType.MFA_CHALLENGE_SUCCESS
			| AuditEventType.MFA_CHALLENGE_FAILURE,
		success: boolean,
		ipAddress?: string,
	): Promise<void> {
		await this.log({
			eventType,
			severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
			userId,
			ipAddress,
			action: "mfa",
			success,
		});
	}

	/**
	 * Log role changes
	 */
	async logRoleChange(
		adminUserId: string,
		targetUserId: string,
		oldRole: string,
		newRole: string,
		ipAddress?: string,
	): Promise<void> {
		await this.log({
			eventType: AuditEventType.USER_ROLE_CHANGED,
			severity: AuditSeverity.WARNING,
			userId: adminUserId,
			targetUserId,
			ipAddress,
			action: "role_change",
			details: { oldRole, newRole },
			success: true,
		});
	}

	/**
	 * Log data export events
	 */
	async logDataExport(
		userId: string,
		resourceType: string,
		recordCount: number,
		format: string,
		ipAddress?: string,
	): Promise<void> {
		await this.log({
			eventType: AuditEventType.DATA_EXPORT,
			severity: AuditSeverity.INFO,
			userId,
			ipAddress,
			resourceType,
			action: "export",
			details: { recordCount, format },
			success: true,
		});
	}

	/**
	 * Log unauthorized access attempts
	 */
	async logUnauthorizedAccess(
		path: string,
		ipAddress?: string,
		userAgent?: string,
		userId?: string,
	): Promise<void> {
		await this.log({
			eventType: AuditEventType.UNAUTHORIZED_ACCESS,
			severity: AuditSeverity.WARNING,
			userId,
			ipAddress,
			userAgent,
			action: "access_denied",
			details: { path },
			success: false,
		});
	}

	/**
	 * Log rate limit violations
	 */
	async logRateLimitExceeded(
		ipAddress: string,
		endpoint: string,
		userId?: string,
	): Promise<void> {
		await this.log({
			eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
			severity: AuditSeverity.WARNING,
			userId,
			ipAddress,
			action: "rate_limit",
			details: { endpoint },
			success: false,
		});
	}

	/**
	 * Query audit logs with filters
	 */
	async queryLogs(options: {
		userId?: string;
		eventTypes?: AuditEventType[];
		severity?: AuditSeverity[];
		startDate?: Date;
		endDate?: Date;
		success?: boolean;
		skip?: number;
		take?: number;
	}) {
		const {
			userId,
			eventTypes,
			severity,
			startDate,
			endDate,
			success,
			skip = 0,
			take = 50,
		} = options;

		const where: any = {};

		if (userId) where.userId = userId;
		if (eventTypes?.length) where.eventType = { in: eventTypes };
		if (severity?.length) where.severity = { in: severity };
		if (success !== undefined) where.success = success;
		if (startDate || endDate) {
			where.timestamp = {};
			if (startDate) where.timestamp.gte = startDate;
			if (endDate) where.timestamp.lte = endDate;
		}

		const [logs, total] = await Promise.all([
			this.prisma.auditLog.findMany({
				where,
				orderBy: { timestamp: "desc" },
				skip,
				take,
			}),
			this.prisma.auditLog.count({ where }),
		]);

		return { logs, total, skip, take };
	}

	/**
	 * Get security summary for dashboard
	 */
	async getSecuritySummary(days: number = 7) {
		const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

		const [loginFailures, unauthorizedAccess, rateLimits, mfaEvents] =
			await Promise.all([
				this.prisma.auditLog.count({
					where: {
						eventType: AuditEventType.LOGIN_FAILURE,
						timestamp: { gte: since },
					},
				}),
				this.prisma.auditLog.count({
					where: {
						eventType: AuditEventType.UNAUTHORIZED_ACCESS,
						timestamp: { gte: since },
					},
				}),
				this.prisma.auditLog.count({
					where: {
						eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
						timestamp: { gte: since },
					},
				}),
				this.prisma.auditLog.count({
					where: {
						eventType: {
							in: [
								AuditEventType.MFA_ENABLED,
								AuditEventType.MFA_CHALLENGE_FAILURE,
							],
						},
						timestamp: { gte: since },
					},
				}),
			]);

		return {
			period: `${days} days`,
			loginFailures,
			unauthorizedAccess,
			rateLimits,
			mfaEvents,
			riskLevel:
				loginFailures > 100 || unauthorizedAccess > 50
					? "HIGH"
					: loginFailures > 20 || unauthorizedAccess > 10
						? "MEDIUM"
						: "LOW",
		};
	}
}
