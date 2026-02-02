import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sns from "aws-cdk-lib/aws-sns";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import { Construct } from "constructs";
import { EnvironmentConfig } from "./config/environments";

export interface AcademiaAppStackProps extends cdk.StackProps {
	domainName: string;
	subdomain: string;
	hostedZoneId?: string;
	environmentConfig: EnvironmentConfig;
	// Shared database references
	sharedVpc: ec2.IVpc;
	dbEndpoint: string;
	dbPort: string;
	dbSecretArn: string;
	dbSecurityGroupId: string;
}

/**
 * Academia Application Stack (per environment)
 *
 * Uses RDS PostgreSQL db.t3.micro (icitysystems) with 'academia' database.
 *
 * AWS Services:
 * - Lambda (backend API)
 * - API Gateway (REST API)
 * - S3 (file storage)
 * - Route53 (DNS)
 * - ACM (SSL certificates)
 * - Secrets Manager (production environment variables & DB credentials)
 */
export class AcademiaAppStack extends cdk.Stack {
	public readonly apiUrl: string;
	public readonly assetsBucket: s3.IBucket;
	public readonly lambdaFunctionName: string;
	public readonly apiGatewayName: string;

	constructor(scope: Construct, id: string, props: AcademiaAppStackProps) {
		super(scope, id, props);

		const envConfig = props.environmentConfig;
		const envName = envConfig.name;
		const fullDomain = `${props.subdomain}.${props.domainName}`;
		const apiDomain = `api.${fullDomain}`;

		// Database name - single database for all environments on icitysystems RDS instance
		const databaseName = "academia";

		// Import shared VPC
		const vpc = props.sharedVpc;

		// Import shared DB security group
		const dbSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
			this,
			"ImportedDbSG",
			props.dbSecurityGroupId,
		);

		// Security Group for Lambda
		const lambdaSecurityGroup = new ec2.SecurityGroup(this, "LambdaSG", {
			vpc,
			description: `Academia Lambda SG - ${envName}`,
			allowAllOutbound: true,
		});

		// Allow Lambda to connect to Aurora
		dbSecurityGroup.addIngressRule(
			lambdaSecurityGroup,
			ec2.Port.tcp(5432),
			`Allow Lambda ${envName} to Aurora`,
		);

		// ========================================================================
		// Route 53 & ACM Certificates
		// ========================================================================
		let hostedZone: route53.IHostedZone | undefined;
		let apiCertificate: acm.ICertificate | undefined;

		if (props.hostedZoneId) {
			hostedZone = route53.HostedZone.fromHostedZoneAttributes(
				this,
				"HostedZone",
				{
					hostedZoneId: props.hostedZoneId,
					zoneName: props.domainName,
				},
			);

			apiCertificate = new acm.Certificate(this, "ApiCertificate", {
				domainName: apiDomain,
				validation: acm.CertificateValidation.fromDns(hostedZone),
			});
		}

		// ========================================================================
		// S3 Bucket for Assets
		// ========================================================================
		this.assetsBucket = new s3.Bucket(this, "AssetsBucket", {
			bucketName: `academia-assets-${envName}-${this.account}`,
			versioned: true,
			encryption: s3.BucketEncryption.S3_MANAGED,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			cors: [
				{
					allowedMethods: [
						s3.HttpMethods.GET,
						s3.HttpMethods.PUT,
						s3.HttpMethods.POST,
						s3.HttpMethods.DELETE,
					],
					allowedOrigins: [
						`https://${fullDomain}`,
						`https://${apiDomain}`,
						"http://localhost:3000",
					],
					allowedHeaders: ["*"],
					maxAge: 3600,
				},
			],
			removalPolicy:
				envName === "production"
					? cdk.RemovalPolicy.RETAIN
					: cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: envName !== "production",
		});

		// ========================================================================
		// Application Secrets (JWT, Stripe, Email)
		// ========================================================================
		const jwtSecret = new secretsmanager.Secret(this, "JwtSecret", {
			secretName: `academia/${envName}/jwt-secret`,
			description: `Academia JWT secret - ${envName}`,
			generateSecretString: {
				passwordLength: 64,
				excludePunctuation: true,
			},
		});

		const stripeSecret = new secretsmanager.Secret(this, "StripeSecret", {
			secretName: `academia/${envName}/stripe-secret`,
			description: `Stripe API keys - ${envName}`,
			secretStringValue: cdk.SecretValue.unsafePlainText(
				JSON.stringify({
					secretKey: envName === "production" ? "" : "sk_test_placeholder",
					webhookSecret: "whsec_placeholder",
				}),
			),
		});

		// Import shared database secret
		const dbSecret = secretsmanager.Secret.fromSecretCompleteArn(
			this,
			"ImportedDbSecret",
			props.dbSecretArn,
		);

		// ========================================================================
		// Lambda Function (Backend API)
		// ========================================================================
		const lambdaConfig = envConfig.lambda;

		const backendLambda = new lambda.Function(this, "BackendFunction", {
			functionName: `academia-backend-${envName}`,
			runtime: lambda.Runtime.NODEJS_20_X,
			handler: "dist/lambda.handler",
			code: lambda.Code.fromInline(`
				exports.handler = async (event) => {
					return {
						statusCode: 200,
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ 
							message: 'Academia Backend - Deploy code via CI/CD',
							environment: '${envName}',
							database: '${databaseName}',
							timestamp: new Date().toISOString()
						})
					};
				};
			`),
			vpc,
			vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
			securityGroups: [lambdaSecurityGroup],
			timeout: cdk.Duration.seconds(lambdaConfig.timeout),
			memorySize: lambdaConfig.memorySize,
			reservedConcurrentExecutions: lambdaConfig.reservedConcurrency,
			environment: {
				NODE_ENV: envName === "production" ? "production" : "development",
				ENVIRONMENT: envName,
				FRONTEND_URL: `https://${fullDomain}`,
				CORS_ORIGINS: `https://${fullDomain},http://localhost:3000`,

				// Database (icitysystems RDS instance - academia database)
				DB_SECRET_ARN: props.dbSecretArn,
				DB_HOST: props.dbEndpoint,
				DB_PORT: props.dbPort,
				DB_NAME: databaseName,
				DATABASE_URL: `postgresql://\${DB_USER}:\${DB_PASS}@${props.dbEndpoint}:${props.dbPort}/${databaseName}`,

				// Storage
				STORAGE_PROVIDER: "s3",
				AWS_S3_BUCKET: this.assetsBucket.bucketName,
				AWS_S3_REGION: this.region,

				// Secrets
				JWT_SECRET_ARN: jwtSecret.secretArn,
				STRIPE_SECRET_ARN: stripeSecret.secretArn,
			},
		});

		// Grant permissions
		dbSecret.grantRead(backendLambda);
		jwtSecret.grantRead(backendLambda);
		stripeSecret.grantRead(backendLambda);
		this.assetsBucket.grantReadWrite(backendLambda);

		// ========================================================================
		// API Gateway
		// ========================================================================
		const api = new apigateway.RestApi(this, "AcademiaApi", {
			restApiName: `academia-api-${envName}`,
			description: `Academia API - ${envName}`,
			deployOptions: {
				stageName: envName === "production" ? "prod" : envName,
				throttlingRateLimit: this.getThrottlingRate(envName),
				throttlingBurstLimit: this.getThrottlingBurst(envName),
			},
			domainName:
				hostedZone && apiCertificate
					? { domainName: apiDomain, certificate: apiCertificate }
					: undefined,
			defaultCorsPreflightOptions: {
				allowOrigins: [`https://${fullDomain}`, "http://localhost:3000"],
				allowMethods: apigateway.Cors.ALL_METHODS,
				allowCredentials: true,
				allowHeaders: [
					"Content-Type",
					"Authorization",
					"X-Amz-Date",
					"X-Api-Key",
					"X-Amz-Security-Token",
				],
			},
		});

		const lambdaIntegration = new apigateway.LambdaIntegration(backendLambda, {
			allowTestInvoke: false,
		});

		// Add proxy for all paths - this handles /graphql and all other routes
		api.root.addProxy({
			defaultIntegration: lambdaIntegration,
			anyMethod: true,
		});

		// ========================================================================
		// Route53 DNS Records
		// ========================================================================
		if (hostedZone) {
			new route53.ARecord(this, "ApiAliasRecord", {
				zone: hostedZone,
				recordName: apiDomain,
				target: route53.RecordTarget.fromAlias(
					new route53Targets.ApiGateway(api),
				),
			});
		}

		// ========================================================================
		// Outputs
		// ========================================================================
		this.apiUrl = hostedZone ? `https://${apiDomain}` : api.url;
		this.lambdaFunctionName = backendLambda.functionName;
		this.apiGatewayName = api.restApiName;

		new cdk.CfnOutput(this, "ApiUrl", {
			value: this.apiUrl,
			description: "API URL",
			exportName: `academia-${envName}-api-url`,
		});

		new cdk.CfnOutput(this, "LambdaFunctionName", {
			value: backendLambda.functionName,
			description: "Lambda function name",
			exportName: `academia-${envName}-lambda-name`,
		});

		new cdk.CfnOutput(this, "AssetsBucketName", {
			value: this.assetsBucket.bucketName,
			description: "Assets S3 bucket",
			exportName: `academia-${envName}-assets-bucket`,
		});

		new cdk.CfnOutput(this, "DatabaseName", {
			value: databaseName,
			description: "Database name for this environment",
			exportName: `academia-${envName}-db-name`,
		});

		// ========================================================================
		// CloudWatch Alarms & Monitoring
		// ========================================================================
		if (envName === "staging" || envName === "production") {
			// Create SNS topic for alerts
			const alertTopic = new sns.Topic(this, "AlertTopic", {
				topicName: `academia-alerts-${envName}`,
				displayName: `Academia ${envName} Alerts`,
			});

			// Lambda Error Alarm
			const lambdaErrorAlarm = new cloudwatch.Alarm(this, "LambdaErrorAlarm", {
				alarmName: `academia-${envName}-lambda-errors`,
				alarmDescription: `Lambda function errors for ${envName} environment`,
				metric: backendLambda.metricErrors({
					period: cdk.Duration.minutes(5),
					statistic: "Sum",
				}),
				threshold: envName === "production" ? 5 : 10,
				evaluationPeriods: 2,
				comparisonOperator:
					cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
				treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			});
			lambdaErrorAlarm.addAlarmAction(
				new cloudwatchActions.SnsAction(alertTopic),
			);

			// Lambda Duration Alarm (slow responses)
			const lambdaDurationAlarm = new cloudwatch.Alarm(
				this,
				"LambdaDurationAlarm",
				{
					alarmName: `academia-${envName}-lambda-duration`,
					alarmDescription: `Lambda function duration exceeds threshold for ${envName}`,
					metric: backendLambda.metricDuration({
						period: cdk.Duration.minutes(5),
						statistic: "p95",
					}),
					threshold: envName === "production" ? 5000 : 10000, // 5s prod, 10s staging
					evaluationPeriods: 3,
					comparisonOperator:
						cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
					treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
				},
			);
			lambdaDurationAlarm.addAlarmAction(
				new cloudwatchActions.SnsAction(alertTopic),
			);

			// Lambda Throttles Alarm
			const lambdaThrottlesAlarm = new cloudwatch.Alarm(
				this,
				"LambdaThrottlesAlarm",
				{
					alarmName: `academia-${envName}-lambda-throttles`,
					alarmDescription: `Lambda function throttled for ${envName}`,
					metric: backendLambda.metricThrottles({
						period: cdk.Duration.minutes(5),
						statistic: "Sum",
					}),
					threshold: 1,
					evaluationPeriods: 1,
					comparisonOperator:
						cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
					treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
				},
			);
			lambdaThrottlesAlarm.addAlarmAction(
				new cloudwatchActions.SnsAction(alertTopic),
			);

			// API Gateway 5xx Errors Alarm
			const api5xxAlarm = new cloudwatch.Alarm(this, "Api5xxAlarm", {
				alarmName: `academia-${envName}-api-5xx`,
				alarmDescription: `API Gateway 5xx errors for ${envName}`,
				metric: api.metricServerError({
					period: cdk.Duration.minutes(5),
					statistic: "Sum",
				}),
				threshold: envName === "production" ? 5 : 10,
				evaluationPeriods: 2,
				comparisonOperator:
					cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
				treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			});
			api5xxAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

			// API Gateway 4xx Errors Alarm (high rate indicates potential issues)
			const api4xxAlarm = new cloudwatch.Alarm(this, "Api4xxAlarm", {
				alarmName: `academia-${envName}-api-4xx-high`,
				alarmDescription: `High rate of API Gateway 4xx errors for ${envName}`,
				metric: api.metricClientError({
					period: cdk.Duration.minutes(5),
					statistic: "Sum",
				}),
				threshold: envName === "production" ? 100 : 50,
				evaluationPeriods: 3,
				comparisonOperator:
					cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
				treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			});
			api4xxAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

			// API Gateway Latency Alarm
			const apiLatencyAlarm = new cloudwatch.Alarm(this, "ApiLatencyAlarm", {
				alarmName: `academia-${envName}-api-latency`,
				alarmDescription: `API Gateway latency exceeded for ${envName}`,
				metric: api.metricLatency({
					period: cdk.Duration.minutes(5),
					statistic: "p95",
				}),
				threshold: envName === "production" ? 3000 : 5000, // 3s prod, 5s staging
				evaluationPeriods: 3,
				comparisonOperator:
					cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
				treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			});
			apiLatencyAlarm.addAlarmAction(
				new cloudwatchActions.SnsAction(alertTopic),
			);

			// Output SNS Topic ARN
			new cdk.CfnOutput(this, "AlertTopicArn", {
				value: alertTopic.topicArn,
				description: "SNS Topic ARN for alerts",
				exportName: `academia-${envName}-alert-topic`,
			});
		}
	}

	private getThrottlingRate(envName: string): number {
		const rates: Record<string, number> = {
			dev1: 100,
			dev2: 100,
			testing: 500,
			staging: 1000,
			production: 5000,
		};
		return rates[envName] || 100;
	}

	private getThrottlingBurst(envName: string): number {
		const bursts: Record<string, number> = {
			dev1: 50,
			dev2: 50,
			testing: 200,
			staging: 500,
			production: 2500,
		};
		return bursts[envName] || 50;
	}
}
