import {
	Injectable,
	Logger,
	OnModuleInit,
	OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface HealthCheckResult {
	status: "healthy" | "unhealthy" | "degraded";
	checks: {
		name: string;
		status: "pass" | "fail" | "warn";
		latency?: number;
		message?: string;
	}[];
	timestamp: Date;
	version: string;
	uptime: number;
}

@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(MonitoringService.name);
	private startTime: number;
	private metricsInterval: NodeJS.Timeout | null = null;
	private metrics: {
		requestCount: number;
		errorCount: number;
		avgResponseTime: number;
		responseTimes: number[];
	} = {
		requestCount: 0,
		errorCount: 0,
		avgResponseTime: 0,
		responseTimes: [],
	};

	constructor(private configService: ConfigService) {}

	onModuleInit() {
		this.startTime = Date.now();
		this.logger.log("Monitoring service initialized");

		// Start periodic metrics logging
		if (this.configService.get<boolean>("monitoring.enabled", true)) {
			this.metricsInterval = setInterval(() => {
				this.logAggregatedMetrics();
			}, 60000); // Every minute
		}
	}

	onModuleDestroy() {
		if (this.metricsInterval) {
			clearInterval(this.metricsInterval);
		}
	}

	recordRequest(duration: number, success: boolean) {
		this.metrics.requestCount++;
		this.metrics.responseTimes.push(duration);

		if (!success) {
			this.metrics.errorCount++;
		}

		// Keep only last 1000 response times for averaging
		if (this.metrics.responseTimes.length > 1000) {
			this.metrics.responseTimes = this.metrics.responseTimes.slice(-1000);
		}

		this.metrics.avgResponseTime =
			this.metrics.responseTimes.reduce((a, b) => a + b, 0) /
			this.metrics.responseTimes.length;
	}

	private logAggregatedMetrics() {
		const metrics = {
			type: "AGGREGATED_METRICS",
			timestamp: new Date().toISOString(),
			uptime: this.getUptime(),
			requests: {
				total: this.metrics.requestCount,
				errors: this.metrics.errorCount,
				errorRate:
					this.metrics.requestCount > 0
						? (this.metrics.errorCount / this.metrics.requestCount) * 100
						: 0,
			},
			performance: {
				avgResponseTime: Math.round(this.metrics.avgResponseTime),
				p95: this.getPercentile(95),
				p99: this.getPercentile(99),
			},
			memory: {
				heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
				heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
				external: Math.round(process.memoryUsage().external / 1024 / 1024),
			},
		};

		this.logger.log(JSON.stringify(metrics));

		// Reset counters
		this.metrics.requestCount = 0;
		this.metrics.errorCount = 0;
		this.metrics.responseTimes = [];
	}

	private getPercentile(percentile: number): number {
		if (this.metrics.responseTimes.length === 0) return 0;

		const sorted = [...this.metrics.responseTimes].sort((a, b) => a - b);
		const index = Math.ceil((percentile / 100) * sorted.length) - 1;
		return Math.round(sorted[index] || 0);
	}

	getUptime(): number {
		return Math.round((Date.now() - this.startTime) / 1000);
	}

	async performHealthCheck(): Promise<HealthCheckResult> {
		const checks: HealthCheckResult["checks"] = [];

		// Database health check
		const dbCheck = await this.checkDatabase();
		checks.push(dbCheck);

		// Memory check
		const memoryCheck = this.checkMemory();
		checks.push(memoryCheck);

		// Determine overall status
		const hasFailure = checks.some((c) => c.status === "fail");
		const hasWarning = checks.some((c) => c.status === "warn");

		return {
			status: hasFailure ? "unhealthy" : hasWarning ? "degraded" : "healthy",
			checks,
			timestamp: new Date(),
			version: process.env.npm_package_version || "unknown",
			uptime: this.getUptime(),
		};
	}

	private async checkDatabase(): Promise<HealthCheckResult["checks"][0]> {
		const startTime = Date.now();
		try {
			// This would typically use PrismaService to run a simple query
			// For now, we simulate a database check
			await new Promise((resolve) => setTimeout(resolve, 10));
			return {
				name: "database",
				status: "pass",
				latency: Date.now() - startTime,
			};
		} catch (error: any) {
			return {
				name: "database",
				status: "fail",
				latency: Date.now() - startTime,
				message: error.message,
			};
		}
	}

	private checkMemory(): HealthCheckResult["checks"][0] {
		const memUsage = process.memoryUsage();
		const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
		const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
		const heapPercentage = (heapUsedMB / heapTotalMB) * 100;

		let status: "pass" | "warn" | "fail" = "pass";
		let message: string | undefined;

		if (heapPercentage > 90) {
			status = "fail";
			message = `High memory usage: ${heapPercentage.toFixed(1)}%`;
		} else if (heapPercentage > 75) {
			status = "warn";
			message = `Elevated memory usage: ${heapPercentage.toFixed(1)}%`;
		}

		return {
			name: "memory",
			status,
			message,
		};
	}

	// Error tracking
	trackError(error: Error, context?: Record<string, any>) {
		const errorLog = {
			type: "ERROR",
			timestamp: new Date().toISOString(),
			error: {
				name: error.name,
				message: error.message,
				stack: error.stack,
			},
			context,
		};

		this.logger.error(JSON.stringify(errorLog));

		// In production, you would send this to an error tracking service
		// like Sentry, Rollbar, or CloudWatch
	}

	// Custom event tracking
	trackEvent(eventName: string, properties?: Record<string, any>) {
		const event = {
			type: "CUSTOM_EVENT",
			timestamp: new Date().toISOString(),
			event: eventName,
			properties,
		};

		this.logger.log(JSON.stringify(event));
	}
}
