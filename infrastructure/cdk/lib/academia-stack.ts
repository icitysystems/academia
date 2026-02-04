import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as rds from "aws-cdk-lib/aws-rds";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { EnvironmentConfig } from "./config/environments";

export interface AcademiaBackendStackProps extends cdk.StackProps {
	domainName: string;
	subdomain: string;
	hostedZoneId?: string;
	environmentConfig: EnvironmentConfig;
}

/**
 * Academia Backend Stack
 *
 * AWS Services Used:
 * - Lambda (compute)
 * - API Gateway (REST API)
 * - Aurora Serverless v2 (PostgreSQL database)
 * - S3 (file storage)
 * - Route53 (DNS)
 * - ACM (SSL certificates)
 * - Secrets Manager (credentials)
 *
 * NOT using: EC2, ElastiCache, ECS, EKS
 */
export class AcademiaBackendStack extends cdk.Stack {
	public readonly apiUrl: string;
	public readonly assetsBucket: s3.IBucket;
	public readonly lambdaFunctionName: string;
	public readonly databaseClusterArn: string;
	public readonly apiGatewayName: string;

	constructor(scope: Construct, id: string, props: AcademiaBackendStackProps) {
		super(scope, id, props);

		const envConfig = props.environmentConfig;
		const envName = envConfig.name;
		const fullDomain = `${props.subdomain}.${props.domainName}`;
		// API domain: use apiSubdomain if configured, otherwise default to api.{subdomain}
		const apiDomain = envConfig.apiSubdomain
			? `${envConfig.apiSubdomain}.${props.domainName}`
			: `api.${fullDomain}`;

		// ========================================================================
		// VPC (Minimal - for Aurora Serverless)
		// ========================================================================
		const vpc = new ec2.Vpc(this, "AcademiaVpc", {
			vpcName: `academia-vpc-${envName}`,
			maxAzs: 2,
			natGateways: 0, // No NAT gateways - Lambda uses VPC endpoints
			subnetConfiguration: [
				{
					name: "Isolated",
					subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					cidrMask: 24,
				},
			],
		});

		// VPC Endpoints for Lambda to access AWS services without NAT
		vpc.addInterfaceEndpoint("SecretsManagerEndpoint", {
			service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
		});

		vpc.addInterfaceEndpoint("S3Endpoint", {
			service: ec2.InterfaceVpcEndpointAwsService.S3,
		});

		// Security Group for Aurora
		const dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
			vpc,
			description: `Academia Aurora security group - ${envName}`,
			allowAllOutbound: false,
		});

		// Security Group for Lambda
		const lambdaSecurityGroup = new ec2.SecurityGroup(
			this,
			"LambdaSecurityGroup",
			{
				vpc,
				description: `Academia Lambda security group - ${envName}`,
				allowAllOutbound: true,
			},
		);

		// Allow Lambda to connect to Aurora
		dbSecurityGroup.addIngressRule(
			lambdaSecurityGroup,
			ec2.Port.tcp(5432),
			"Allow Lambda to connect to Aurora",
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
		// Aurora PostgreSQL with db.t4g.micro (cost-effective provisioned)
		// ========================================================================
		const dbSecret = new secretsmanager.Secret(this, "DbSecret", {
			secretName: `academia/${envName}/database/credentials`,
			description: `Academia database credentials - ${envName}`,
			generateSecretString: {
				secretStringTemplate: JSON.stringify({ username: "academia_admin" }),
				generateStringKey: "password",
				excludePunctuation: true,
				passwordLength: 32,
			},
		});

		// Aurora Serverless v2 configuration based on environment
		const auroraConfig = this.getAuroraConfig(envName);

		const auroraCluster = new rds.DatabaseCluster(this, "AcademiaDatabase", {
			engine: rds.DatabaseClusterEngine.auroraPostgres({
				version: rds.AuroraPostgresEngineVersion.VER_16_4,
			}),
			credentials: rds.Credentials.fromSecret(dbSecret),
			defaultDatabaseName: "academia",
			clusterIdentifier: `academia-aurora-${envName}`,
			writer: rds.ClusterInstance.serverlessV2("writer", {
				publiclyAccessible: false,
			}),
			readers: auroraConfig.hasReader
				? [
						rds.ClusterInstance.serverlessV2("reader", {
							publiclyAccessible: false,
							scaleWithWriter: true,
						}),
					]
				: [],
			serverlessV2MinCapacity: auroraConfig.minCapacity,
			serverlessV2MaxCapacity: auroraConfig.maxCapacity,
			vpc,
			vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
			securityGroups: [dbSecurityGroup],
			storageEncrypted: true,
			backup: {
				retention: cdk.Duration.days(envConfig.database.backupRetention),
			},
			deletionProtection: envConfig.database.deletionProtection,
			removalPolicy: envConfig.database.deletionProtection
				? cdk.RemovalPolicy.RETAIN
				: cdk.RemovalPolicy.SNAPSHOT,
		});

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
		// Secrets (JWT, Stripe, Email)
		// ========================================================================
		const jwtSecret = new secretsmanager.Secret(this, "JwtSecret", {
			secretName: `academia/${envName}/jwt-secret`,
			description: `Academia JWT signing secret - ${envName}`,
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

		const emailSecret = new secretsmanager.Secret(this, "EmailSecret", {
			secretName: `academia/${envName}/email-config`,
			description: `Email service configuration - ${envName}`,
			secretStringValue: cdk.SecretValue.unsafePlainText(
				JSON.stringify({
					smtpHost: "",
					smtpPort: 587,
					smtpUser: "",
					smtpPass: "",
					fromEmail: `noreply@${fullDomain}`,
				}),
			),
		});

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

				// Database
				DB_SECRET_ARN: dbSecret.secretArn,
				DB_HOST: auroraCluster.clusterEndpoint.hostname,
				DB_PORT: auroraCluster.clusterEndpoint.port.toString(),
				DB_NAME: "academia",
				DATABASE_URL: `postgresql://\${DB_USER}:\${DB_PASS}@${auroraCluster.clusterEndpoint.hostname}:${auroraCluster.clusterEndpoint.port}/academia`,

				// Storage
				STORAGE_PROVIDER: "s3",
				AWS_S3_BUCKET: this.assetsBucket.bucketName,
				AWS_S3_REGION: this.region,

				// Secrets
				JWT_SECRET_ARN: jwtSecret.secretArn,
				STRIPE_SECRET_ARN: stripeSecret.secretArn,
				EMAIL_SECRET_ARN: emailSecret.secretArn,
			},
		});

		// Grant permissions
		dbSecret.grantRead(backendLambda);
		jwtSecret.grantRead(backendLambda);
		stripeSecret.grantRead(backendLambda);
		emailSecret.grantRead(backendLambda);
		this.assetsBucket.grantReadWrite(backendLambda);
		auroraCluster.grantDataApiAccess(backendLambda);

		// ========================================================================
		// API Gateway
		// ========================================================================
		const api = new apigateway.RestApi(this, "AcademiaApi", {
			restApiName: `academia-api-${envName}`,
			description: `Academia GraphQL API - ${envName}`,
			deployOptions: {
				stageName: envName === "production" ? "prod" : envName,
				throttlingRateLimit: this.getThrottlingRate(envName),
				throttlingBurstLimit: this.getThrottlingBurst(envName),
			},
			domainName:
				hostedZone && apiCertificate
					? {
							domainName: apiDomain,
							certificate: apiCertificate,
						}
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

		// Proxy all routes to Lambda
		api.root.addProxy({
			defaultIntegration: lambdaIntegration,
			anyMethod: true,
		});

		// Also handle root path
		api.root.addMethod("ANY", lambdaIntegration);

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
		this.databaseClusterArn = auroraCluster.clusterArn;
		this.apiGatewayName = api.restApiName;

		new cdk.CfnOutput(this, "ApiUrl", {
			value: this.apiUrl,
			description: "API URL",
			exportName: `academia-${envName}-api-url`,
		});

		new cdk.CfnOutput(this, "ApiGatewayUrl", {
			value: api.url,
			description: "API Gateway URL (direct)",
			exportName: `academia-${envName}-api-gateway-url`,
		});

		new cdk.CfnOutput(this, "LambdaFunctionName", {
			value: backendLambda.functionName,
			description: "Backend Lambda function name",
			exportName: `academia-${envName}-lambda-name`,
		});

		new cdk.CfnOutput(this, "AssetsBucketName", {
			value: this.assetsBucket.bucketName,
			description: "Assets S3 bucket name",
			exportName: `academia-${envName}-assets-bucket`,
		});

		new cdk.CfnOutput(this, "DatabaseEndpoint", {
			value: auroraCluster.clusterEndpoint.hostname,
			description: "Aurora cluster endpoint",
			exportName: `academia-${envName}-db-endpoint`,
		});

		new cdk.CfnOutput(this, "DatabaseSecretArn", {
			value: dbSecret.secretArn,
			description: "Database credentials secret ARN",
			exportName: `academia-${envName}-db-secret-arn`,
		});
	}

	/**
	 * Get Aurora db.t4g configuration based on environment
	 * All environments use db.t4g.micro for cost optimization
	 * Production gets a read replica for high availability
	 */
	private getAuroraConfig(envName: string): {
		minCapacity: number;
		maxCapacity: number;
		hasReader: boolean;
	} {
		switch (envName) {
			case "dev1":
			case "dev2":
				return { minCapacity: 0.5, maxCapacity: 2, hasReader: false };
			case "testing":
				return { minCapacity: 0.5, maxCapacity: 2, hasReader: false };
			case "staging":
				return { minCapacity: 0.5, maxCapacity: 4, hasReader: false };
			case "production":
				return { minCapacity: 0.5, maxCapacity: 8, hasReader: true };
			default:
				return { minCapacity: 0.5, maxCapacity: 2, hasReader: false };
		}
	}

	/**
	 * Get API Gateway throttling rate based on environment
	 */
	private getThrottlingRate(envName: string): number {
		switch (envName) {
			case "dev1":
			case "dev2":
				return 100;
			case "testing":
				return 500;
			case "staging":
				return 1000;
			case "production":
				return 5000;
			default:
				return 100;
		}
	}

	/**
	 * Get API Gateway throttling burst based on environment
	 */
	private getThrottlingBurst(envName: string): number {
		switch (envName) {
			case "dev1":
			case "dev2":
				return 50;
			case "testing":
				return 200;
			case "staging":
				return 500;
			case "production":
				return 2500;
			default:
				return 50;
		}
	}
}
