import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as rds from "aws-cdk-lib/aws-rds";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";

export interface AcademiaBackendLambdaStackProps extends cdk.StackProps {
	domainName: string;
	subdomain: string;
	hostedZoneId?: string;
}

export class AcademiaBackendLambdaStack extends cdk.Stack {
	public readonly apiUrl: string;
	public readonly assetsBucket: s3.IBucket;
	public readonly vpc: ec2.IVpc;

	constructor(
		scope: Construct,
		id: string,
		props: AcademiaBackendLambdaStackProps,
	) {
		super(scope, id, props);

		const fullDomain = `${props.subdomain}.${props.domainName}`;
		const apiDomain = `api.${fullDomain}`;

		// ========================================================================
		// VPC & Networking
		// ========================================================================
		this.vpc = new ec2.Vpc(this, "AcademiaVpc", {
			vpcName: "academia-vpc",
			maxAzs: 2,
			natGateways: 1,
			subnetConfiguration: [
				{
					name: "Public",
					subnetType: ec2.SubnetType.PUBLIC,
					cidrMask: 24,
				},
				{
					name: "Private",
					subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
					cidrMask: 24,
				},
				{
					name: "Isolated",
					subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					cidrMask: 24,
				},
			],
		});

		// Security Groups
		const lambdaSecurityGroup = new ec2.SecurityGroup(
			this,
			"LambdaSecurityGroup",
			{
				vpc: this.vpc,
				description: "Security group for Academia Lambda functions",
				allowAllOutbound: true,
			},
		);

		const dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
			vpc: this.vpc,
			description: "Security group for Academia RDS",
			allowAllOutbound: false,
		});

		// Allow Lambda to connect to RDS
		dbSecurityGroup.addIngressRule(
			lambdaSecurityGroup,
			ec2.Port.tcp(5432),
			"Allow Lambda to connect to RDS",
		);

		// ========================================================================
		// Route 53 & Certificates (Optional)
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

			// ACM Certificate for API (regional - same region as API Gateway)
			apiCertificate = new acm.Certificate(this, "ApiCertificate", {
				domainName: apiDomain,
				validation: acm.CertificateValidation.fromDns(hostedZone),
			});
		}

		// ========================================================================
		// Database (RDS PostgreSQL)
		// ========================================================================
		const dbSecret = new secretsmanager.Secret(this, "DbSecret", {
			secretName: "academia/database/credentials",
			description: "Academia database credentials",
			generateSecretString: {
				secretStringTemplate: JSON.stringify({ username: "academia_admin" }),
				generateStringKey: "password",
				excludePunctuation: true,
				passwordLength: 32,
			},
		});

		const database = new rds.DatabaseInstance(this, "AcademiaDatabase", {
			engine: rds.DatabaseInstanceEngine.postgres({
				version: rds.PostgresEngineVersion.VER_15,
			}),
			instanceType: ec2.InstanceType.of(
				ec2.InstanceClass.T3,
				ec2.InstanceSize.MICRO,
			),
			vpc: this.vpc,
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
			},
			securityGroups: [dbSecurityGroup],
			credentials: rds.Credentials.fromSecret(dbSecret),
			databaseName: "academia",
			allocatedStorage: 20,
			maxAllocatedStorage: 100,
			storageEncrypted: true,
			multiAz: false,
			autoMinorVersionUpgrade: true,
			backupRetention: cdk.Duration.days(7),
			deletionProtection: false,
			removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
		});

		// ========================================================================
		// S3 Bucket for Assets
		// ========================================================================
		this.assetsBucket = new s3.Bucket(this, "AssetsBucket", {
			bucketName: `academia-assets-${this.account}`,
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
					allowedOrigins: [`https://${fullDomain}`, `https://${apiDomain}`],
					allowedHeaders: ["*"],
					maxAge: 3600,
				},
			],
			removalPolicy: cdk.RemovalPolicy.RETAIN,
		});

		// ========================================================================
		// Secrets
		// ========================================================================
		const jwtSecret = new secretsmanager.Secret(this, "JwtSecret", {
			secretName: "academia/jwt-secret",
			description: "Academia JWT signing secret",
			generateSecretString: {
				passwordLength: 64,
				excludePunctuation: true,
			},
		});

		const stripeSecret = new secretsmanager.Secret(this, "StripeSecret", {
			secretName: "academia/stripe-secret",
			description: "Stripe API keys",
			secretStringValue: cdk.SecretValue.unsafePlainText(
				JSON.stringify({
					secretKey: "sk_test_placeholder",
					webhookSecret: "whsec_placeholder",
				}),
			),
		});

		// ========================================================================
		// Lambda Function (Backend) - Using pre-built code from S3
		// ========================================================================

		// The backend code will be uploaded to S3 and deployed via the deployment script
		// For now, create a placeholder Lambda that will be updated during deployment
		const backendFn = new lambda.Function(this, "BackendFunction", {
			functionName: "academia-backend",
			runtime: lambda.Runtime.NODEJS_20_X,
			handler: "dist/lambda.handler",
			code: lambda.Code.fromInline(`
				exports.handler = async (event) => {
					return {
						statusCode: 200,
						body: JSON.stringify({ 
							message: 'Academia Backend - Please deploy the backend code',
							timestamp: new Date().toISOString()
						})
					};
				};
			`),
			vpc: this.vpc,
			vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
			securityGroups: [lambdaSecurityGroup],
			timeout: cdk.Duration.seconds(30),
			memorySize: 1024,
			environment: {
				NODE_ENV: "production",
				FRONTEND_URL: `https://${fullDomain}`,
				CORS_ORIGINS: `https://${fullDomain}`,
				DB_SECRET_ARN: dbSecret.secretArn,
				DB_HOST: database.dbInstanceEndpointAddress,
				DB_PORT: database.dbInstanceEndpointPort,
				DB_NAME: "academia",
				STORAGE_PROVIDER: "s3",
				AWS_S3_BUCKET: this.assetsBucket.bucketName,
				JWT_SECRET_ARN: jwtSecret.secretArn,
				STRIPE_SECRET_ARN: stripeSecret.secretArn,
			},
		});

		// Grant permissions
		dbSecret.grantRead(backendFn);
		jwtSecret.grantRead(backendFn);
		stripeSecret.grantRead(backendFn);
		this.assetsBucket.grantReadWrite(backendFn);

		// ========================================================================
		// API Gateway
		// ========================================================================
		const api = new apigateway.RestApi(this, "AcademiaApi", {
			restApiName: "academia-api",
			description: "Academia GraphQL API",
			deployOptions: {
				stageName: "prod",
			},
			domainName: hostedZone
				? {
						domainName: apiDomain,
						certificate: apiCertificate!,
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

		const lambdaIntegration = new apigateway.LambdaIntegration(backendFn, {
			allowTestInvoke: false,
		});

		// Add proxy to handle all routes (this includes root ANY)
		api.root.addProxy({
			defaultIntegration: lambdaIntegration,
			anyMethod: true,
		});

		// ========================================================================
		// Route53 Records
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

		// Set API URL
		this.apiUrl = hostedZone ? `https://${apiDomain}` : api.url;

		// ========================================================================
		// Outputs
		// ========================================================================
		new cdk.CfnOutput(this, "VpcId", {
			value: this.vpc.vpcId,
			description: "VPC ID",
		});

		new cdk.CfnOutput(this, "DbEndpoint", {
			value: database.dbInstanceEndpointAddress,
			description: "Database endpoint",
		});

		new cdk.CfnOutput(this, "DbSecretArn", {
			value: dbSecret.secretArn,
			description: "Database credentials secret ARN",
		});

		new cdk.CfnOutput(this, "ApiUrl", {
			value: this.apiUrl,
			description: "API URL",
		});

		new cdk.CfnOutput(this, "ApiGatewayUrl", {
			value: api.url,
			description: "API Gateway URL (for testing before DNS setup)",
		});

		new cdk.CfnOutput(this, "AssetsBucketName", {
			value: this.assetsBucket.bucketName,
			description: "Assets S3 Bucket",
		});

		new cdk.CfnOutput(this, "LambdaFunctionName", {
			value: backendFn.functionName,
			description: "Backend Lambda function name",
		});

		new cdk.CfnOutput(this, "LambdaFunctionArn", {
			value: backendFn.functionArn,
			description: "Backend Lambda function ARN",
		});
	}
}
