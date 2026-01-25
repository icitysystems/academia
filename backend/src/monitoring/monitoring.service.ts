import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import * as AWS from "aws-sdk";

interface MetricData {
	name: string;
	value: number;
	unit: "Count" | "Milliseconds" | "Bytes" | "Percent";
	dimensions?: Record<string, string>;
}

interface AlertConfig {
	metricName: string;
	threshold: number;
	comparisonOperator:
		| "GreaterThan"
		| "LessThan"
		| "GreaterThanOrEqual"
		| "LessThanOrEqual";
	evaluationPeriods: number;
	period: number;
	statistic: "Average" | "Sum" | "Maximum" | "Minimum";
	alarmActions?: string[];
}

@Injectable()
export class MonitoringService implements OnModuleInit {
	private readonly logger = new Logger(MonitoringService.name);
	private cloudwatch: AWS.CloudWatch;
	private sns: AWS.SNS;
	private readonly namespace = "Academia/Application";

	constructor() {
		this.cloudwatch = new AWS.CloudWatch({
			region: process.env.AWS_REGION || "us-east-1",
		});
		this.sns = new AWS.SNS({
			region: process.env.AWS_REGION || "us-east-1",
		});
	}

	async onModuleInit() {
		await this.setupAlarms();
	}

	/**
	 * Record a custom metric to CloudWatch
	 */
	async recordMetric(metric: MetricData): Promise<void> {
		try {
			const dimensions = Object.entries(metric.dimensions || {}).map(
				([Name, Value]) => ({
					Name,
					Value,
				}),
			);

			await this.cloudwatch
				.putMetricData({
					Namespace: this.namespace,
					MetricData: [
						{
							MetricName: metric.name,
							Value: metric.value,
							Unit: metric.unit,
							Timestamp: new Date(),
							Dimensions: dimensions,
						},
					],
				})
				.promise();
		} catch (error) {
			this.logger.error(`Failed to record metric ${metric.name}:`, error);
		}
	}

	/**
	 * Record multiple metrics in a batch
	 */
	async recordMetrics(metrics: MetricData[]): Promise<void> {
		try {
			const metricData = metrics.map((metric) => ({
				MetricName: metric.name,
				Value: metric.value,
				Unit: metric.unit,
				Timestamp: new Date(),
				Dimensions: Object.entries(metric.dimensions || {}).map(
					([Name, Value]) => ({
						Name,
						Value,
					}),
				),
			}));

			// CloudWatch allows max 20 metrics per request
			for (let i = 0; i < metricData.length; i += 20) {
				const batch = metricData.slice(i, i + 20);
				await this.cloudwatch
					.putMetricData({
						Namespace: this.namespace,
						MetricData: batch,
					})
					.promise();
			}
		} catch (error) {
			this.logger.error("Failed to record metrics batch:", error);
		}
	}

	/**
	 * Record API request metrics
	 */
	async recordApiRequest(
		endpoint: string,
		method: string,
		statusCode: number,
		latency: number,
	): Promise<void> {
		const dimensions = { Endpoint: endpoint, Method: method };

		await this.recordMetrics([
			{ name: "APIRequestCount", value: 1, unit: "Count", dimensions },
			{ name: "APILatency", value: latency, unit: "Milliseconds", dimensions },
			{
				name: `APIStatusCode${statusCode}`,
				value: 1,
				unit: "Count",
				dimensions,
			},
			{
				name: statusCode >= 400 ? "APIErrorCount" : "APISuccessCount",
				value: 1,
				unit: "Count",
				dimensions,
			},
		]);
	}

	/**
	 * Record database query metrics
	 */
	async recordDatabaseMetrics(
		operation: string,
		table: string,
		duration: number,
		success: boolean,
	): Promise<void> {
		await this.recordMetrics([
			{
				name: "DatabaseQueryDuration",
				value: duration,
				unit: "Milliseconds",
				dimensions: { Operation: operation, Table: table },
			},
			{
				name: success ? "DatabaseQuerySuccess" : "DatabaseQueryError",
				value: 1,
				unit: "Count",
				dimensions: { Operation: operation, Table: table },
			},
		]);
	}

	/**
	 * Record user activity metrics
	 */
	async recordUserActivity(
		activity:
			| "login"
			| "logout"
			| "signup"
			| "course_view"
			| "quiz_submit"
			| "assignment_submit",
		userId: string,
		metadata?: Record<string, string>,
	): Promise<void> {
		await this.recordMetric({
			name: `UserActivity_${activity}`,
			value: 1,
			unit: "Count",
			dimensions: {
				...metadata,
			},
		});
	}

	/**
	 * Record system health metrics
	 */
	async recordSystemHealth(): Promise<void> {
		const memoryUsage = process.memoryUsage();

		await this.recordMetrics([
			{
				name: "MemoryHeapUsed",
				value: memoryUsage.heapUsed / (1024 * 1024),
				unit: "Bytes",
			},
			{
				name: "MemoryHeapTotal",
				value: memoryUsage.heapTotal / (1024 * 1024),
				unit: "Bytes",
			},
			{
				name: "MemoryRSS",
				value: memoryUsage.rss / (1024 * 1024),
				unit: "Bytes",
			},
		]);
	}

	/**
	 * Record cache metrics
	 */
	async recordCacheMetrics(
		operation: "hit" | "miss" | "set" | "delete",
		cacheName: string,
	): Promise<void> {
		await this.recordMetric({
			name: `Cache_${operation}`,
			value: 1,
			unit: "Count",
			dimensions: { CacheName: cacheName },
		});
	}

	/**
	 * Record queue metrics
	 */
	async recordQueueMetrics(
		queueName: string,
		messagesProcessed: number,
		processingTime: number,
	): Promise<void> {
		await this.recordMetrics([
			{
				name: "QueueMessagesProcessed",
				value: messagesProcessed,
				unit: "Count",
				dimensions: { QueueName: queueName },
			},
			{
				name: "QueueProcessingTime",
				value: processingTime,
				unit: "Milliseconds",
				dimensions: { QueueName: queueName },
			},
		]);
	}

	/**
	 * Setup CloudWatch alarms
	 */
	private async setupAlarms(): Promise<void> {
		const alarms: AlertConfig[] = [
			{
				metricName: "APIErrorCount",
				threshold: 100,
				comparisonOperator: "GreaterThan",
				evaluationPeriods: 3,
				period: 300, // 5 minutes
				statistic: "Sum",
			},
			{
				metricName: "APILatency",
				threshold: 5000, // 5 seconds
				comparisonOperator: "GreaterThan",
				evaluationPeriods: 2,
				period: 300,
				statistic: "Average",
			},
			{
				metricName: "DatabaseQueryError",
				threshold: 10,
				comparisonOperator: "GreaterThan",
				evaluationPeriods: 1,
				period: 300,
				statistic: "Sum",
			},
			{
				metricName: "MemoryHeapUsed",
				threshold: 1500, // 1.5 GB
				comparisonOperator: "GreaterThan",
				evaluationPeriods: 3,
				period: 60,
				statistic: "Average",
			},
		];

		for (const alarm of alarms) {
			await this.createAlarm(alarm);
		}
	}

	/**
	 * Create a CloudWatch alarm
	 */
	private async createAlarm(config: AlertConfig): Promise<void> {
		const alarmName = `Academia-${config.metricName}-Alarm`;
		const snsTopicArn = process.env.ALERT_SNS_TOPIC_ARN;

		try {
			await this.cloudwatch
				.putMetricAlarm({
					AlarmName: alarmName,
					MetricName: config.metricName,
					Namespace: this.namespace,
					Threshold: config.threshold,
					ComparisonOperator: config.comparisonOperator,
					EvaluationPeriods: config.evaluationPeriods,
					Period: config.period,
					Statistic: config.statistic,
					AlarmActions: snsTopicArn ? [snsTopicArn] : [],
					OKActions: snsTopicArn ? [snsTopicArn] : [],
					AlarmDescription: `Alarm for ${config.metricName} exceeding ${config.threshold}`,
					TreatMissingData: "notBreaching",
				})
				.promise();

			this.logger.log(`Created alarm: ${alarmName}`);
		} catch (error) {
			this.logger.error(`Failed to create alarm ${alarmName}:`, error);
		}
	}

	/**
	 * Send an alert via SNS
	 */
	async sendAlert(
		subject: string,
		message: string,
		severity: "info" | "warning" | "critical",
	): Promise<void> {
		const snsTopicArn = process.env.ALERT_SNS_TOPIC_ARN;
		if (!snsTopicArn) {
			this.logger.warn("SNS topic ARN not configured, skipping alert");
			return;
		}

		try {
			await this.sns
				.publish({
					TopicArn: snsTopicArn,
					Subject: `[${severity.toUpperCase()}] ${subject}`,
					Message: JSON.stringify({
						severity,
						subject,
						message,
						timestamp: new Date().toISOString(),
						environment: process.env.NODE_ENV,
					}),
					MessageAttributes: {
						severity: {
							DataType: "String",
							StringValue: severity,
						},
					},
				})
				.promise();

			this.logger.log(`Alert sent: ${subject}`);
		} catch (error) {
			this.logger.error("Failed to send alert:", error);
		}
	}

	/**
	 * Get metric statistics
	 */
	async getMetricStatistics(
		metricName: string,
		startTime: Date,
		endTime: Date,
		period: number,
		statistics: ("Average" | "Sum" | "Maximum" | "Minimum")[],
		dimensions?: Record<string, string>,
	): Promise<AWS.CloudWatch.GetMetricStatisticsOutput> {
		try {
			const result = await this.cloudwatch
				.getMetricStatistics({
					Namespace: this.namespace,
					MetricName: metricName,
					StartTime: startTime,
					EndTime: endTime,
					Period: period,
					Statistics: statistics,
					Dimensions: Object.entries(dimensions || {}).map(([Name, Value]) => ({
						Name,
						Value,
					})),
				})
				.promise();

			return result;
		} catch (error) {
			this.logger.error(
				`Failed to get metric statistics for ${metricName}:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Create a dashboard
	 */
	async createDashboard(dashboardName: string, widgets: any[]): Promise<void> {
		try {
			await this.cloudwatch
				.putDashboard({
					DashboardName: dashboardName,
					DashboardBody: JSON.stringify({
						widgets,
					}),
				})
				.promise();

			this.logger.log(`Dashboard created: ${dashboardName}`);
		} catch (error) {
			this.logger.error(`Failed to create dashboard ${dashboardName}:`, error);
		}
	}
}

// Monitoring Interceptor
import {
	Injectable as InjectableInterceptor,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
	constructor(private readonly monitoringService: MonitoringService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest();
		const startTime = Date.now();

		return next.handle().pipe(
			tap({
				next: () => {
					const response = context.switchToHttp().getResponse();
					const latency = Date.now() - startTime;

					this.monitoringService.recordApiRequest(
						request.route?.path || request.url,
						request.method,
						response.statusCode,
						latency,
					);
				},
				error: (error) => {
					const latency = Date.now() - startTime;

					this.monitoringService.recordApiRequest(
						request.route?.path || request.url,
						request.method,
						error.status || 500,
						latency,
					);
				},
			}),
		);
	}
}

// Health Check Service
import {
	Injectable as InjectableHealth,
	Logger as LoggerHealth,
} from "@nestjs/common";
import {
	HealthIndicator,
	HealthIndicatorResult,
	HealthCheckError,
} from "@nestjs/terminus";

@Injectable()
export class ApplicationHealthIndicator extends HealthIndicator {
	private readonly logger = new LoggerHealth(ApplicationHealthIndicator.name);

	constructor(private readonly monitoringService: MonitoringService) {
		super();
	}

	async isHealthy(key: string): Promise<HealthIndicatorResult> {
		const memoryUsage = process.memoryUsage();
		const heapUsedPercent =
			(memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

		const isHealthy = heapUsedPercent < 90; // Less than 90% heap usage

		const result = this.getStatus(key, isHealthy, {
			heapUsed: Math.round(memoryUsage.heapUsed / (1024 * 1024)) + " MB",
			heapTotal: Math.round(memoryUsage.heapTotal / (1024 * 1024)) + " MB",
			heapUsedPercent: heapUsedPercent.toFixed(2) + "%",
			rss: Math.round(memoryUsage.rss / (1024 * 1024)) + " MB",
			uptime: process.uptime() + " seconds",
		});

		if (!isHealthy) {
			await this.monitoringService.sendAlert(
				"High Memory Usage",
				`Heap usage at ${heapUsedPercent.toFixed(2)}%`,
				"warning",
			);
			throw new HealthCheckError("Application memory check failed", result);
		}

		return result;
	}
}
