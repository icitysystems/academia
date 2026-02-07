import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayv2_integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";

/**
 * Academia Serverless Stack (VPC-Free Architecture)
 *
 * Serverless Architecture Pattern (following HMS pattern):
 * - Route53: DNS management for custom domains
 * - ACM: SSL/TLS certificates for HTTPS
 * - CloudFront: CDN for frontend static assets and API routing
 * - S3: Static website hosting for React frontend + assets storage
 * - API Gateway: HTTP API for backend routing
 * - Lambda: Serverless backend (NestJS/GraphQL)
 * - Secrets Manager: Secure credential storage
 * - SHARED RDS PostgreSQL (icitysystems db.t3.micro): External managed database
 *
 * NOT USED: Docker, ECR, EC2, NAT Gateway, Fargate, VPC
 *
 * DATABASE: Uses shared RDS instance 'icitysystems' with database 'academia'
 * Endpoint: icitysystems.cnpejzsnelnc.us-east-1.rds.amazonaws.com:5432/academia
 *
 * NOTE: Lambda connects to RDS directly (RDS is publicly accessible with
 * security groups allowing Lambda's outbound IP ranges). This eliminates
 * the need for VPC, NAT Gateway, and VPC Endpoints.
 */

export interface AcademiaServerlessStackProps extends cdk.StackProps {
	environment: string;
	// Domain configuration
	domainName?: string;
	subdomain?: string;
	hostedZoneId?: string;
	// Database configuration (shared RDS PostgreSQL)
	rdsHost?: string;
	rdsPort?: string;
	rdsDatabase?: string;
	dbCredentialsSecret?: string;
}

export class AcademiaServerlessStack extends cdk.Stack {
	public readonly apiUrl: cdk.CfnOutput;
	public readonly frontendUrl: cdk.CfnOutput;
	public readonly lambdaFunctionName: cdk.CfnOutput;

	constructor(
		scope: Construct,
		id: string,
		props: AcademiaServerlessStackProps,
	) {
		super(scope, id, props);

		const environment = props.environment;
		const domainName = props.domainName || "icitysystems.org";
		const subdomain = props.subdomain || `academia-${environment}`;
		const frontendDomainName = `${subdomain}.${domainName}`;
		const hostedZoneId = props.hostedZoneId;

		// Shared RDS PostgreSQL Instance Configuration (from props or defaults)
		const sharedDbHost =
			props.rdsHost || "icitysystems.cnpejzsnelnc.us-east-1.rds.amazonaws.com";
		const sharedDbPort = props.rdsPort || "5432";
		const sharedDbName = props.rdsDatabase || "academia";
		const dbCredentialsSecretName =
			props.dbCredentialsSecret || "icitysystems/academia/database/credentials";

		// ========================================
		// Route53 Hosted Zone (lookup by ID or name)
		// ========================================
		let hostedZone: route53.IHostedZone | undefined;
		let certificate: certificatemanager.ICertificate | undefined;

		try {
			if (hostedZoneId) {
				hostedZone = route53.HostedZone.fromHostedZoneAttributes(
					this,
					"HostedZone",
					{
						hostedZoneId,
						zoneName: domainName,
					},
				);
			} else {
				hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
					domainName: domainName,
				});
			}

			// ACM Certificate for CloudFront (must be in us-east-1)
			certificate = new certificatemanager.Certificate(this, "Certificate", {
				domainName: frontendDomainName,
				validation:
					certificatemanager.CertificateValidation.fromDns(hostedZone),
				certificateName: `Academia ${environment} Certificate`,
			});
		} catch {
			// If hosted zone not found, skip custom domain setup
			console.log("Hosted zone not found, using CloudFront default domain");
		}

		// ========================================
		// Secrets Manager - Database Credentials
		// Reference existing secret for shared icitysystems RDS instance
		// ========================================
		const dbCredentialsSecret = secretsmanager.Secret.fromSecretNameV2(
			this,
			"DbCredentials",
			"academia/shared/database/credentials",
		);

		// ========================================
		// Secrets Manager - JWT Secret
		// ========================================
		const jwtSecret = new secretsmanager.Secret(this, "JwtSecret", {
			secretName: `academia/${environment}/jwt-secret`,
			description: `Academia JWT secret - ${environment}`,
			generateSecretString: {
				passwordLength: 64,
				excludePunctuation: true,
			},
		});

		// ========================================
		// Secrets Manager - Stripe Configuration
		// ========================================
		const stripeSecret = new secretsmanager.Secret(this, "StripeSecret", {
			secretName: `academia/${environment}/stripe`,
			description: `Academia Stripe API Keys - ${environment}`,
			secretStringValue: cdk.SecretValue.unsafePlainText(
				JSON.stringify({
					secretKey: "sk_test_placeholder",
					webhookSecret: "whsec_placeholder",
				}),
			),
		});

		// ========================================
		// S3 Bucket - Frontend Static Assets
		// ========================================
		const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
			bucketName: frontendDomainName,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			encryption: s3.BucketEncryption.S3_MANAGED,
			versioned: true,
			removalPolicy:
				environment === "production"
					? cdk.RemovalPolicy.RETAIN
					: cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: environment !== "production",
		});

		// ========================================
		// S3 Bucket - User Assets/Uploads
		// ========================================
		const assetsBucket = new s3.Bucket(this, "AssetsBucket", {
			bucketName: `academia-assets-${environment}-${this.account}`,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			encryption: s3.BucketEncryption.S3_MANAGED,
			versioned: true,
			cors: [
				{
					allowedMethods: [
						s3.HttpMethods.GET,
						s3.HttpMethods.PUT,
						s3.HttpMethods.POST,
						s3.HttpMethods.DELETE,
					],
					allowedOrigins: [
						`https://${frontendDomainName}`,
						"http://localhost:3000",
						"http://localhost:5173",
					],
					allowedHeaders: ["*"],
					maxAge: 3600,
				},
			],
			removalPolicy:
				environment === "production"
					? cdk.RemovalPolicy.RETAIN
					: cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: environment !== "production",
		});

		// ========================================
		// Lambda IAM Role
		// ========================================
		const lambdaRole = new iam.Role(this, "LambdaExecutionRole", {
			assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					"service-role/AWSLambdaBasicExecutionRole",
				),
			],
			description: `Execution role for Academia Backend Lambda - ${environment}`,
		});

		// Grant Lambda access to Secrets Manager
		dbCredentialsSecret.grantRead(lambdaRole);
		jwtSecret.grantRead(lambdaRole);
		stripeSecret.grantRead(lambdaRole);

		// Grant Lambda access to S3 assets bucket
		assetsBucket.grantReadWrite(lambdaRole);

		// ========================================
		// Lambda Function - Backend API (NO VPC)
		// Connects directly to publicly accessible RDS
		// ========================================
		const backendLambda = new lambda.Function(this, "BackendFunction", {
			runtime: lambda.Runtime.NODEJS_20_X,
			handler: "dist/lambda.handler",
			code: lambda.Code.fromInline(`
				exports.handler = async (event) => {
					return {
						statusCode: 200,
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ 
							message: 'Academia Backend - Deploy code via CI/CD',
							environment: '${environment}',
							database: '${sharedDbName}',
							timestamp: new Date().toISOString()
						})
					};
				};
			`),
			timeout: cdk.Duration.seconds(30),
			memorySize: environment === "production" ? 2048 : 1024,
			role: lambdaRole,
			environment: {
				NODE_ENV: environment === "production" ? "production" : "development",
				ENVIRONMENT: environment,
				DB_SECRET_ARN: dbCredentialsSecret.secretArn,
				JWT_SECRET_ARN: jwtSecret.secretArn,
				STRIPE_SECRET_ARN: stripeSecret.secretArn,
				DB_HOST: sharedDbHost,
				DB_PORT: sharedDbPort,
				DB_NAME: sharedDbName,
				DATABASE_URL: `postgresql://\${DB_USER}:\${DB_PASS}@${sharedDbHost}:${sharedDbPort}/${sharedDbName}`,
				STORAGE_PROVIDER: "s3",
				AWS_S3_BUCKET: assetsBucket.bucketName,
				AWS_S3_REGION: this.region,
				FRONTEND_URL: `https://${frontendDomainName}`,
				CORS_ORIGINS: `https://${frontendDomainName},http://localhost:3000,http://localhost:5173`,
			},
			description: `Academia Backend API - ${environment} (Serverless, No VPC)`,
			functionName: `academia-backend-${environment}`,
		});

		// ========================================
		// HTTP API Gateway
		// ========================================
		const httpApi = new apigatewayv2.HttpApi(this, "AcademiaApi", {
			apiName: `academia-api-${environment}`,
			description: `Academia API - ${environment}`,
			corsPreflight: {
				allowOrigins: [
					`https://${frontendDomainName}`,
					"http://localhost:3000",
					"http://localhost:5173",
				],
				allowMethods: [
					apigatewayv2.CorsHttpMethod.GET,
					apigatewayv2.CorsHttpMethod.POST,
					apigatewayv2.CorsHttpMethod.PUT,
					apigatewayv2.CorsHttpMethod.DELETE,
					apigatewayv2.CorsHttpMethod.PATCH,
					apigatewayv2.CorsHttpMethod.OPTIONS,
				],
				allowHeaders: [
					"Content-Type",
					"Authorization",
					"X-Requested-With",
					"X-Amz-Date",
					"X-Api-Key",
					"X-Amz-Security-Token",
				],
				allowCredentials: true,
				maxAge: cdk.Duration.hours(1),
			},
		});

		// Lambda Integration
		const lambdaIntegration =
			new apigatewayv2_integrations.HttpLambdaIntegration(
				"LambdaIntegration",
				backendLambda,
			);

		// Add routes - catch all for API
		httpApi.addRoutes({
			path: "/{proxy+}",
			methods: [apigatewayv2.HttpMethod.ANY],
			integration: lambdaIntegration,
		});

		httpApi.addRoutes({
			path: "/",
			methods: [apigatewayv2.HttpMethod.ANY],
			integration: lambdaIntegration,
		});

		// ========================================
		// CloudFront Origin Access Identity
		// ========================================
		const oai = new cloudfront.OriginAccessIdentity(this, "OAI", {
			comment: `Academia ${environment} OAI`,
		});
		frontendBucket.grantRead(oai);

		// ========================================
		// CloudFront Distribution
		// ========================================
		const distribution = new cloudfront.Distribution(this, "Distribution", {
			defaultBehavior: {
				origin: new origins.S3Origin(frontendBucket, {
					originAccessIdentity: oai,
				}),
				viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
				allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
			},
			additionalBehaviors: {
				"/api/*": {
					origin: new origins.HttpOrigin(
						`${httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`,
					),
					viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
					cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
					originRequestPolicy:
						cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
					allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
				},
				"/graphql": {
					origin: new origins.HttpOrigin(
						`${httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`,
					),
					viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
					cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
					originRequestPolicy:
						cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
					allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
				},
				"/graphql/*": {
					origin: new origins.HttpOrigin(
						`${httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`,
					),
					viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
					cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
					originRequestPolicy:
						cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
					allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
				},
			},
			defaultRootObject: "index.html",
			errorResponses: [
				{
					httpStatus: 403,
					responseHttpStatus: 200,
					responsePagePath: "/index.html",
					ttl: cdk.Duration.minutes(5),
				},
				{
					httpStatus: 404,
					responseHttpStatus: 200,
					responsePagePath: "/index.html",
					ttl: cdk.Duration.minutes(5),
				},
			],
			certificate: certificate,
			domainNames: certificate ? [frontendDomainName] : undefined,
			priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
			httpVersion: cloudfront.HttpVersion.HTTP2,
		});

		// ========================================
		// Route53 DNS Records
		// ========================================
		if (hostedZone && certificate) {
			new route53.ARecord(this, "AliasRecord", {
				zone: hostedZone,
				recordName: subdomain,
				target: route53.RecordTarget.fromAlias(
					new route53targets.CloudFrontTarget(distribution),
				),
			});
		}

		// ========================================
		// Outputs
		// ========================================
		this.frontendUrl = new cdk.CfnOutput(this, "FrontendUrl", {
			value: certificate
				? `https://${frontendDomainName}`
				: `https://${distribution.distributionDomainName}`,
			description: "Frontend URL",
		});

		this.apiUrl = new cdk.CfnOutput(this, "ApiUrl", {
			value: httpApi.apiEndpoint,
			description: "API Gateway URL",
		});

		this.lambdaFunctionName = new cdk.CfnOutput(this, "LambdaFunctionName", {
			value: backendLambda.functionName,
			description: "Lambda function name for CI/CD deployments",
		});

		new cdk.CfnOutput(this, "FrontendBucketName", {
			value: frontendBucket.bucketName,
			description: "Frontend S3 bucket name",
		});

		new cdk.CfnOutput(this, "AssetsBucketName", {
			value: assetsBucket.bucketName,
			description: "Assets S3 bucket name",
		});

		new cdk.CfnOutput(this, "DistributionId", {
			value: distribution.distributionId,
			description: "CloudFront distribution ID",
		});

		new cdk.CfnOutput(this, "DatabaseEndpoint", {
			value: `${sharedDbHost}:${sharedDbPort}/${sharedDbName}`,
			description: "Shared RDS database endpoint",
		});
	}
}
