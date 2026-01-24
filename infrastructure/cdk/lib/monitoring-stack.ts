import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatch_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sns_subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface AcademiaMonitoringStackProps extends cdk.StackProps {
	vpc: ec2.IVpc;
	lambdaFunctionName: string;
	databaseIdentifier: string;
	apiGatewayName: string;
	distributionId: string;
	assetsBucketName: string;
	alertEmail?: string;
}

export class AcademiaMonitoringStack extends cdk.Stack {
	public readonly alarmTopic: sns.ITopic;
	public readonly dashboard: cloudwatch.Dashboard;

	constructor(
		scope: Construct,
		id: string,
		props: AcademiaMonitoringStackProps,
	) {
		super(scope, id, props);

		// ========================================================================
		// SNS Topic for Alarms
		// ========================================================================
		this.alarmTopic = new sns.Topic(this, "AlarmTopic", {
			topicName: "academia-alarms",
			displayName: "Academia Production Alarms",
		});

		// Add email subscription if provided
		if (props.alertEmail) {
			this.alarmTopic.addSubscription(
				new sns_subscriptions.EmailSubscription(props.alertEmail),
			);
		}

		const alarmAction = new cloudwatch_actions.SnsAction(this.alarmTopic);

		// ========================================================================
		// VPC Flow Logs
		// ========================================================================
		const flowLogsLogGroup = new logs.LogGroup(this, "VpcFlowLogsGroup", {
			logGroupName: "/aws/vpc/academia-flow-logs",
			retention: logs.RetentionDays.ONE_MONTH,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		const flowLogsRole = new iam.Role(this, "VpcFlowLogsRole", {
			assumedBy: new iam.ServicePrincipal("vpc-flow-logs.amazonaws.com"),
		});

		flowLogsLogGroup.grantWrite(flowLogsRole);

		new ec2.CfnFlowLog(this, "VpcFlowLog", {
			resourceId: props.vpc.vpcId,
			resourceType: "VPC",
			trafficType: "ALL",
			deliverLogsPermissionArn: flowLogsRole.roleArn,
			logGroupName: flowLogsLogGroup.logGroupName,
			logFormat:
				"${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status}",
			maxAggregationInterval: 60,
		});

		// ========================================================================
		// Lambda Function Alarms
		// ========================================================================

		// Lambda Errors Alarm
		const lambdaErrorsAlarm = new cloudwatch.Alarm(this, "LambdaErrorsAlarm", {
			alarmName: "Academia-Lambda-Errors",
			alarmDescription: "Lambda function errors exceeded threshold",
			metric: new cloudwatch.Metric({
				namespace: "AWS/Lambda",
				metricName: "Errors",
				dimensionsMap: {
					FunctionName: props.lambdaFunctionName,
				},
				statistic: "Sum",
				period: cdk.Duration.minutes(5),
			}),
			threshold: 10,
			evaluationPeriods: 2,
			comparisonOperator:
				cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
		});
		lambdaErrorsAlarm.addAlarmAction(alarmAction);
		lambdaErrorsAlarm.addOkAction(alarmAction);

		// Lambda Duration Alarm (P95 > 10 seconds)
		const lambdaDurationAlarm = new cloudwatch.Alarm(
			this,
			"LambdaDurationAlarm",
			{
				alarmName: "Academia-Lambda-Duration",
				alarmDescription: "Lambda function duration exceeded 10 seconds (P95)",
				metric: new cloudwatch.Metric({
					namespace: "AWS/Lambda",
					metricName: "Duration",
					dimensionsMap: {
						FunctionName: props.lambdaFunctionName,
					},
					statistic: "p95",
					period: cdk.Duration.minutes(5),
				}),
				threshold: 10000, // 10 seconds in ms
				evaluationPeriods: 3,
				comparisonOperator:
					cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			},
		);
		lambdaDurationAlarm.addAlarmAction(alarmAction);

		// Lambda Throttles Alarm
		const lambdaThrottlesAlarm = new cloudwatch.Alarm(
			this,
			"LambdaThrottlesAlarm",
			{
				alarmName: "Academia-Lambda-Throttles",
				alarmDescription: "Lambda function is being throttled",
				metric: new cloudwatch.Metric({
					namespace: "AWS/Lambda",
					metricName: "Throttles",
					dimensionsMap: {
						FunctionName: props.lambdaFunctionName,
					},
					statistic: "Sum",
					period: cdk.Duration.minutes(5),
				}),
				threshold: 5,
				evaluationPeriods: 2,
				comparisonOperator:
					cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			},
		);
		lambdaThrottlesAlarm.addAlarmAction(alarmAction);

		// Lambda Concurrent Executions Alarm
		const lambdaConcurrencyAlarm = new cloudwatch.Alarm(
			this,
			"LambdaConcurrencyAlarm",
			{
				alarmName: "Academia-Lambda-Concurrency",
				alarmDescription: "Lambda concurrent executions approaching limit",
				metric: new cloudwatch.Metric({
					namespace: "AWS/Lambda",
					metricName: "ConcurrentExecutions",
					dimensionsMap: {
						FunctionName: props.lambdaFunctionName,
					},
					statistic: "Maximum",
					period: cdk.Duration.minutes(1),
				}),
				threshold: 800, // Default limit is 1000
				evaluationPeriods: 3,
				comparisonOperator:
					cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			},
		);
		lambdaConcurrencyAlarm.addAlarmAction(alarmAction);

		// ========================================================================
		// RDS Database Alarms
		// ========================================================================

		// RDS CPU Utilization Alarm
		const rdsCpuAlarm = new cloudwatch.Alarm(this, "RdsCpuAlarm", {
			alarmName: "Academia-RDS-CPU",
			alarmDescription: "RDS CPU utilization exceeded 80%",
			metric: new cloudwatch.Metric({
				namespace: "AWS/RDS",
				metricName: "CPUUtilization",
				dimensionsMap: {
					DBInstanceIdentifier: props.databaseIdentifier,
				},
				statistic: "Average",
				period: cdk.Duration.minutes(5),
			}),
			threshold: 80,
			evaluationPeriods: 3,
			comparisonOperator:
				cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
		});
		rdsCpuAlarm.addAlarmAction(alarmAction);
		rdsCpuAlarm.addOkAction(alarmAction);

		// RDS Free Storage Space Alarm (< 5GB)
		const rdsStorageAlarm = new cloudwatch.Alarm(this, "RdsStorageAlarm", {
			alarmName: "Academia-RDS-FreeStorage",
			alarmDescription: "RDS free storage space below 5GB",
			metric: new cloudwatch.Metric({
				namespace: "AWS/RDS",
				metricName: "FreeStorageSpace",
				dimensionsMap: {
					DBInstanceIdentifier: props.databaseIdentifier,
				},
				statistic: "Average",
				period: cdk.Duration.minutes(5),
			}),
			threshold: 5 * 1024 * 1024 * 1024, // 5GB in bytes
			evaluationPeriods: 2,
			comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
		});
		rdsStorageAlarm.addAlarmAction(alarmAction);
		rdsStorageAlarm.addOkAction(alarmAction);

		// RDS Database Connections Alarm
		const rdsConnectionsAlarm = new cloudwatch.Alarm(
			this,
			"RdsConnectionsAlarm",
			{
				alarmName: "Academia-RDS-Connections",
				alarmDescription: "RDS database connections approaching limit",
				metric: new cloudwatch.Metric({
					namespace: "AWS/RDS",
					metricName: "DatabaseConnections",
					dimensionsMap: {
						DBInstanceIdentifier: props.databaseIdentifier,
					},
					statistic: "Average",
					period: cdk.Duration.minutes(5),
				}),
				threshold: 80, // t3.micro has ~90 max connections
				evaluationPeriods: 2,
				comparisonOperator:
					cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			},
		);
		rdsConnectionsAlarm.addAlarmAction(alarmAction);

		// RDS Freeable Memory Alarm (< 256MB)
		const rdsMemoryAlarm = new cloudwatch.Alarm(this, "RdsMemoryAlarm", {
			alarmName: "Academia-RDS-FreeableMemory",
			alarmDescription: "RDS freeable memory below 256MB",
			metric: new cloudwatch.Metric({
				namespace: "AWS/RDS",
				metricName: "FreeableMemory",
				dimensionsMap: {
					DBInstanceIdentifier: props.databaseIdentifier,
				},
				statistic: "Average",
				period: cdk.Duration.minutes(5),
			}),
			threshold: 256 * 1024 * 1024, // 256MB in bytes
			evaluationPeriods: 3,
			comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
		});
		rdsMemoryAlarm.addAlarmAction(alarmAction);

		// RDS Read/Write Latency Alarm
		const rdsReadLatencyAlarm = new cloudwatch.Alarm(
			this,
			"RdsReadLatencyAlarm",
			{
				alarmName: "Academia-RDS-ReadLatency",
				alarmDescription: "RDS read latency exceeded 100ms",
				metric: new cloudwatch.Metric({
					namespace: "AWS/RDS",
					metricName: "ReadLatency",
					dimensionsMap: {
						DBInstanceIdentifier: props.databaseIdentifier,
					},
					statistic: "Average",
					period: cdk.Duration.minutes(5),
				}),
				threshold: 0.1, // 100ms in seconds
				evaluationPeriods: 3,
				comparisonOperator:
					cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			},
		);
		rdsReadLatencyAlarm.addAlarmAction(alarmAction);

		// ========================================================================
		// API Gateway Alarms
		// ========================================================================

		// API Gateway 4XX Errors
		const api4xxAlarm = new cloudwatch.Alarm(this, "Api4xxAlarm", {
			alarmName: "Academia-API-4xxErrors",
			alarmDescription: "API Gateway 4XX error rate exceeded 5%",
			metric: new cloudwatch.Metric({
				namespace: "AWS/ApiGateway",
				metricName: "4XXError",
				dimensionsMap: {
					ApiName: props.apiGatewayName,
				},
				statistic: "Average",
				period: cdk.Duration.minutes(5),
			}),
			threshold: 0.05, // 5%
			evaluationPeriods: 3,
			comparisonOperator:
				cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
		});
		api4xxAlarm.addAlarmAction(alarmAction);

		// API Gateway 5XX Errors
		const api5xxAlarm = new cloudwatch.Alarm(this, "Api5xxAlarm", {
			alarmName: "Academia-API-5xxErrors",
			alarmDescription: "API Gateway 5XX errors detected",
			metric: new cloudwatch.Metric({
				namespace: "AWS/ApiGateway",
				metricName: "5XXError",
				dimensionsMap: {
					ApiName: props.apiGatewayName,
				},
				statistic: "Sum",
				period: cdk.Duration.minutes(5),
			}),
			threshold: 5,
			evaluationPeriods: 2,
			comparisonOperator:
				cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
		});
		api5xxAlarm.addAlarmAction(alarmAction);
		api5xxAlarm.addOkAction(alarmAction);

		// API Gateway Latency Alarm
		const apiLatencyAlarm = new cloudwatch.Alarm(this, "ApiLatencyAlarm", {
			alarmName: "Academia-API-Latency",
			alarmDescription: "API Gateway latency exceeded 5 seconds (P95)",
			metric: new cloudwatch.Metric({
				namespace: "AWS/ApiGateway",
				metricName: "Latency",
				dimensionsMap: {
					ApiName: props.apiGatewayName,
				},
				statistic: "p95",
				period: cdk.Duration.minutes(5),
			}),
			threshold: 5000, // 5 seconds in ms
			evaluationPeriods: 3,
			comparisonOperator:
				cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
		});
		apiLatencyAlarm.addAlarmAction(alarmAction);

		// ========================================================================
		// CloudFront Alarms
		// ========================================================================

		// CloudFront Error Rate Alarm
		const cloudfrontErrorAlarm = new cloudwatch.Alarm(
			this,
			"CloudFrontErrorAlarm",
			{
				alarmName: "Academia-CloudFront-ErrorRate",
				alarmDescription: "CloudFront error rate exceeded 5%",
				metric: new cloudwatch.Metric({
					namespace: "AWS/CloudFront",
					metricName: "TotalErrorRate",
					dimensionsMap: {
						DistributionId: props.distributionId,
						Region: "Global",
					},
					statistic: "Average",
					period: cdk.Duration.minutes(5),
				}),
				threshold: 5, // 5%
				evaluationPeriods: 3,
				comparisonOperator:
					cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			},
		);
		cloudfrontErrorAlarm.addAlarmAction(alarmAction);

		// ========================================================================
		// Application Log Groups
		// ========================================================================

		// Backend Lambda Log Group
		const backendLogGroup = new logs.LogGroup(this, "BackendLogGroup", {
			logGroupName: `/aws/lambda/${props.lambdaFunctionName}`,
			retention: logs.RetentionDays.TWO_WEEKS,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		// Create metric filter for application errors
		const errorMetricFilter = new logs.MetricFilter(this, "ErrorMetricFilter", {
			logGroup: backendLogGroup,
			metricNamespace: "Academia/Application",
			metricName: "ApplicationErrors",
			filterPattern: logs.FilterPattern.anyTerm("ERROR", "Exception", "FATAL"),
			metricValue: "1",
		});

		// Application Error Alarm
		const appErrorAlarm = new cloudwatch.Alarm(this, "ApplicationErrorAlarm", {
			alarmName: "Academia-Application-Errors",
			alarmDescription: "Application errors detected in logs",
			metric: new cloudwatch.Metric({
				namespace: "Academia/Application",
				metricName: "ApplicationErrors",
				statistic: "Sum",
				period: cdk.Duration.minutes(5),
			}),
			threshold: 20,
			evaluationPeriods: 2,
			comparisonOperator:
				cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
		});
		appErrorAlarm.addAlarmAction(alarmAction);

		// ========================================================================
		// CloudWatch Dashboard
		// ========================================================================
		this.dashboard = new cloudwatch.Dashboard(this, "AcademiaDashboard", {
			dashboardName: "Academia-Production",
		});

		// Lambda Metrics Row
		this.dashboard.addWidgets(
			new cloudwatch.TextWidget({
				markdown: "# Academia Production Dashboard\n## Lambda Backend Metrics",
				width: 24,
				height: 1,
			}),
		);

		this.dashboard.addWidgets(
			new cloudwatch.GraphWidget({
				title: "Lambda Invocations",
				left: [
					new cloudwatch.Metric({
						namespace: "AWS/Lambda",
						metricName: "Invocations",
						dimensionsMap: { FunctionName: props.lambdaFunctionName },
						statistic: "Sum",
						period: cdk.Duration.minutes(1),
					}),
				],
				width: 8,
				height: 6,
			}),
			new cloudwatch.GraphWidget({
				title: "Lambda Duration (ms)",
				left: [
					new cloudwatch.Metric({
						namespace: "AWS/Lambda",
						metricName: "Duration",
						dimensionsMap: { FunctionName: props.lambdaFunctionName },
						statistic: "Average",
						period: cdk.Duration.minutes(1),
					}),
					new cloudwatch.Metric({
						namespace: "AWS/Lambda",
						metricName: "Duration",
						dimensionsMap: { FunctionName: props.lambdaFunctionName },
						statistic: "p95",
						period: cdk.Duration.minutes(1),
					}),
				],
				width: 8,
				height: 6,
			}),
			new cloudwatch.GraphWidget({
				title: "Lambda Errors & Throttles",
				left: [
					new cloudwatch.Metric({
						namespace: "AWS/Lambda",
						metricName: "Errors",
						dimensionsMap: { FunctionName: props.lambdaFunctionName },
						statistic: "Sum",
						period: cdk.Duration.minutes(1),
						color: "#d62728",
					}),
					new cloudwatch.Metric({
						namespace: "AWS/Lambda",
						metricName: "Throttles",
						dimensionsMap: { FunctionName: props.lambdaFunctionName },
						statistic: "Sum",
						period: cdk.Duration.minutes(1),
						color: "#ff7f0e",
					}),
				],
				width: 8,
				height: 6,
			}),
		);

		// RDS Metrics Row
		this.dashboard.addWidgets(
			new cloudwatch.TextWidget({
				markdown: "## RDS Database Metrics",
				width: 24,
				height: 1,
			}),
		);

		this.dashboard.addWidgets(
			new cloudwatch.GraphWidget({
				title: "RDS CPU Utilization (%)",
				left: [
					new cloudwatch.Metric({
						namespace: "AWS/RDS",
						metricName: "CPUUtilization",
						dimensionsMap: { DBInstanceIdentifier: props.databaseIdentifier },
						statistic: "Average",
						period: cdk.Duration.minutes(1),
					}),
				],
				width: 6,
				height: 6,
			}),
			new cloudwatch.GraphWidget({
				title: "RDS Database Connections",
				left: [
					new cloudwatch.Metric({
						namespace: "AWS/RDS",
						metricName: "DatabaseConnections",
						dimensionsMap: { DBInstanceIdentifier: props.databaseIdentifier },
						statistic: "Average",
						period: cdk.Duration.minutes(1),
					}),
				],
				width: 6,
				height: 6,
			}),
			new cloudwatch.GraphWidget({
				title: "RDS Free Storage (GB)",
				left: [
					new cloudwatch.Metric({
						namespace: "AWS/RDS",
						metricName: "FreeStorageSpace",
						dimensionsMap: { DBInstanceIdentifier: props.databaseIdentifier },
						statistic: "Average",
						period: cdk.Duration.minutes(5),
					}),
				],
				width: 6,
				height: 6,
			}),
			new cloudwatch.GraphWidget({
				title: "RDS Read/Write Latency (s)",
				left: [
					new cloudwatch.Metric({
						namespace: "AWS/RDS",
						metricName: "ReadLatency",
						dimensionsMap: { DBInstanceIdentifier: props.databaseIdentifier },
						statistic: "Average",
						period: cdk.Duration.minutes(1),
					}),
					new cloudwatch.Metric({
						namespace: "AWS/RDS",
						metricName: "WriteLatency",
						dimensionsMap: { DBInstanceIdentifier: props.databaseIdentifier },
						statistic: "Average",
						period: cdk.Duration.minutes(1),
					}),
				],
				width: 6,
				height: 6,
			}),
		);

		// API Gateway Metrics Row
		this.dashboard.addWidgets(
			new cloudwatch.TextWidget({
				markdown: "## API Gateway Metrics",
				width: 24,
				height: 1,
			}),
		);

		this.dashboard.addWidgets(
			new cloudwatch.GraphWidget({
				title: "API Gateway Requests",
				left: [
					new cloudwatch.Metric({
						namespace: "AWS/ApiGateway",
						metricName: "Count",
						dimensionsMap: { ApiName: props.apiGatewayName },
						statistic: "Sum",
						period: cdk.Duration.minutes(1),
					}),
				],
				width: 8,
				height: 6,
			}),
			new cloudwatch.GraphWidget({
				title: "API Gateway Latency (ms)",
				left: [
					new cloudwatch.Metric({
						namespace: "AWS/ApiGateway",
						metricName: "Latency",
						dimensionsMap: { ApiName: props.apiGatewayName },
						statistic: "Average",
						period: cdk.Duration.minutes(1),
					}),
					new cloudwatch.Metric({
						namespace: "AWS/ApiGateway",
						metricName: "Latency",
						dimensionsMap: { ApiName: props.apiGatewayName },
						statistic: "p95",
						period: cdk.Duration.minutes(1),
					}),
				],
				width: 8,
				height: 6,
			}),
			new cloudwatch.GraphWidget({
				title: "API Gateway Errors",
				left: [
					new cloudwatch.Metric({
						namespace: "AWS/ApiGateway",
						metricName: "4XXError",
						dimensionsMap: { ApiName: props.apiGatewayName },
						statistic: "Sum",
						period: cdk.Duration.minutes(1),
						color: "#ff7f0e",
					}),
					new cloudwatch.Metric({
						namespace: "AWS/ApiGateway",
						metricName: "5XXError",
						dimensionsMap: { ApiName: props.apiGatewayName },
						statistic: "Sum",
						period: cdk.Duration.minutes(1),
						color: "#d62728",
					}),
				],
				width: 8,
				height: 6,
			}),
		);

		// CloudFront Metrics Row
		this.dashboard.addWidgets(
			new cloudwatch.TextWidget({
				markdown: "## CloudFront CDN Metrics",
				width: 24,
				height: 1,
			}),
		);

		this.dashboard.addWidgets(
			new cloudwatch.GraphWidget({
				title: "CloudFront Requests",
				left: [
					new cloudwatch.Metric({
						namespace: "AWS/CloudFront",
						metricName: "Requests",
						dimensionsMap: {
							DistributionId: props.distributionId,
							Region: "Global",
						},
						statistic: "Sum",
						period: cdk.Duration.minutes(1),
					}),
				],
				width: 8,
				height: 6,
			}),
			new cloudwatch.GraphWidget({
				title: "CloudFront Cache Hit Rate (%)",
				left: [
					new cloudwatch.Metric({
						namespace: "AWS/CloudFront",
						metricName: "CacheHitRate",
						dimensionsMap: {
							DistributionId: props.distributionId,
							Region: "Global",
						},
						statistic: "Average",
						period: cdk.Duration.minutes(5),
					}),
				],
				width: 8,
				height: 6,
			}),
			new cloudwatch.GraphWidget({
				title: "CloudFront Error Rate (%)",
				left: [
					new cloudwatch.Metric({
						namespace: "AWS/CloudFront",
						metricName: "TotalErrorRate",
						dimensionsMap: {
							DistributionId: props.distributionId,
							Region: "Global",
						},
						statistic: "Average",
						period: cdk.Duration.minutes(5),
						color: "#d62728",
					}),
				],
				width: 8,
				height: 6,
			}),
		);

		// Alarm Status Widget
		this.dashboard.addWidgets(
			new cloudwatch.TextWidget({
				markdown: "## Alarm Status",
				width: 24,
				height: 1,
			}),
		);

		this.dashboard.addWidgets(
			new cloudwatch.AlarmStatusWidget({
				title: "All Alarms",
				alarms: [
					lambdaErrorsAlarm,
					lambdaDurationAlarm,
					lambdaThrottlesAlarm,
					lambdaConcurrencyAlarm,
					rdsCpuAlarm,
					rdsStorageAlarm,
					rdsConnectionsAlarm,
					rdsMemoryAlarm,
					rdsReadLatencyAlarm,
					api4xxAlarm,
					api5xxAlarm,
					apiLatencyAlarm,
					cloudfrontErrorAlarm,
					appErrorAlarm,
				],
				width: 24,
				height: 4,
			}),
		);

		// ========================================================================
		// Outputs
		// ========================================================================
		new cdk.CfnOutput(this, "AlarmTopicArn", {
			value: this.alarmTopic.topicArn,
			description: "SNS Topic ARN for alarms",
		});

		new cdk.CfnOutput(this, "DashboardUrl", {
			value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=Academia-Production`,
			description: "CloudWatch Dashboard URL",
		});

		new cdk.CfnOutput(this, "FlowLogsLogGroup", {
			value: flowLogsLogGroup.logGroupName,
			description: "VPC Flow Logs CloudWatch Log Group",
		});
	}
}
