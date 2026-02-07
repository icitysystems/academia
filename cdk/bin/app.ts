#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";
import * as path from "path";
import { AcademiaFrontendStack } from "../lib/frontend-stack";
import { AcademiaSesStack } from "../lib/ses-stack";
import { AcademiaServerlessStack } from "../lib/academia-serverless-stack";
import { environments, EnvironmentConfig } from "../lib/config/environments";

// Load environment-specific configuration
const deployEnvironment = process.env.ENVIRONMENT || "production";
dotenv.config({
	path: path.resolve(__dirname, `../.env.${deployEnvironment}`),
});
dotenv.config({ path: path.resolve(__dirname, "../.env") }); // Fallback

/**
 * Academia CDK Application - SERVERLESS ARCHITECTURE
 *
 * AWS Services Used:
 * - Route53: DNS management
 * - ACM: SSL/TLS certificates
 * - CloudFront: CDN
 * - S3: Static website hosting
 * - API Gateway: REST API
 * - Lambda: Serverless backend (NestJS)
 * - Secrets Manager: Secure credential storage
 * - Shared RDS PostgreSQL (icitysystems db.t3.micro): External database
 *
 * NOT USED: Docker, ECR, EC2, NAT Gateway, Fargate, VPC, DynamoDB
 *
 * Database: Uses shared icitysystems RDS instance with 'academia' database
 */

const app = new cdk.App();

// ============================================================================
// Configuration from environment variables
// ============================================================================
const config = {
	domainName:
		process.env.DOMAIN_NAME ||
		app.node.tryGetContext("domainName") ||
		"academia.icitysystems.org",
	hostedZoneId:
		process.env.HOSTED_ZONE_ID ||
		app.node.tryGetContext("hostedZoneId") ||
		"Z09710361JD7BJM1J1G9D",
	hostedZoneName:
		process.env.HOSTED_ZONE_NAME ||
		app.node.tryGetContext("hostedZoneName") ||
		"icitysystems.org",
	deployEnvironment: deployEnvironment as string | undefined,
	// Database (shared RDS PostgreSQL - icitysystems)
	rdsHost:
		process.env.RDS_HOST ||
		"icitysystems.cnpejzsnelnc.us-east-1.rds.amazonaws.com",
	rdsPort: process.env.RDS_PORT || "5432",
	rdsDatabase: process.env.RDS_DATABASE || "academia",
	dbCredentialsSecret:
		process.env.DB_CREDENTIALS_SECRET ||
		"icitysystems/academia/database/credentials",
};

const awsEnv: cdk.Environment = {
	account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
	region:
		process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || "us-east-1",
};

console.log(`
╔════════════════════════════════════════════════════════════╗
║           Academia CDK Deployment - SERVERLESS             ║
╠════════════════════════════════════════════════════════════╣
║  Domain: ${config.domainName.padEnd(47)}║
║  Region: ${(awsEnv.region || "us-east-1").padEnd(47)}║
║  Environment: ${(config.deployEnvironment || "all").padEnd(42)}║
║  Database: ${config.rdsDatabase.padEnd(45)}║
║  Architecture: Lambda + API Gateway + CloudFront + S3      ║
║  (No VPC, No NAT Gateway, No EC2, No DynamoDB)             ║
╚════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// SES Email Stack (Email Sending & Forwarding)
// ============================================================================
const sesStack = new AcademiaSesStack(app, "AcademiaSes", {
	env: awsEnv,
	description: "Academia SES Email Service - academia@icitysystems.org",
	domainName: "icitysystems.org",
	forwardingEmail: "icitysystems@gmail.com",
	tags: {
		Application: "Academia",
		Component: "Email",
		CostCenter: "academia-shared",
	},
});

// ============================================================================
// Environment-Specific Stacks
// ============================================================================
const environmentsToDeployUnfiltered: Array<[string, EnvironmentConfig]> =
	Object.entries(environments);

// Filter to single environment if specified
const environmentsToDeploy = config.deployEnvironment
	? environmentsToDeployUnfiltered.filter(
			([name]) => name === config.deployEnvironment,
		)
	: environmentsToDeployUnfiltered;

if (config.deployEnvironment && environmentsToDeploy.length === 0) {
	console.error(`Unknown environment: ${config.deployEnvironment}`);
	console.error(
		`Available environments: ${Object.keys(environments).join(", ")}`,
	);
	process.exit(1);
}

// Helper function
function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

// Create stacks for each environment (SERVERLESS ONLY)
for (const [envName, envConfig] of environmentsToDeploy) {
	// For production, use academia.icitysystems.org (no subdomain)
	// For other environments, use academia-{env}.icitysystems.org
	const serverlessSubdomain =
		envName === "production" ? "academia" : `academia-${envName}`;

	const serverlessStack = new AcademiaServerlessStack(
		app,
		`AcademiaServerless-${capitalize(envName)}`,
		{
			env: awsEnv,
			description: `Academia Serverless Stack - ${envName} (No VPC)`,
			environment: envName,
			domainName: config.hostedZoneName,
			subdomain: serverlessSubdomain,
			hostedZoneId: config.hostedZoneId,
			// Database configuration (shared RDS PostgreSQL)
			rdsHost: config.rdsHost,
			rdsPort: config.rdsPort,
			rdsDatabase: config.rdsDatabase,
			dbCredentialsSecret: config.dbCredentialsSecret,
			tags: {
				Application: "Academia",
				Environment: envName,
				Component: "Serverless",
				Architecture: "VPC-Free",
			},
		},
	);

	console.log(`  ✓ Created serverless stack for ${envName} environment`);
	console.log(`    - Stack: AcademiaServerless-${capitalize(envName)}`);
	console.log(`    - Database: academia (shared RDS PostgreSQL)`);
}

// ============================================================================
// Cost Summary
// ============================================================================
console.log(`
╔════════════════════════════════════════════════════════════╗
║           Estimated Monthly Cost (~1M requests)            ║
╠════════════════════════════════════════════════════════════╣
║  RDS db.t3.micro (icitysystems)   $12.41   (SHARED)        ║
║  RDS Storage (20GB gp2)           $2.30    (SHARED)        ║
║  Lambda (invocations)             $8.35                    ║
║  API Gateway (1M requests)        $3.50                    ║
║  S3 Storage (5GB)                 $0.12                    ║
║  CloudFront (50GB transfer)       $4.25                    ║
║  Route53 (subdomain)              $0.50                    ║
║  Secrets Manager (2 secrets)      $0.40                    ║
║  SES Email (~1000 emails)         $0.10                    ║
╠════════════════════════════════════════════════════════════╣
║  TOTAL ESTIMATED                  ~$32/month               ║
╚════════════════════════════════════════════════════════════╝

Deploy commands:
  # Deploy everything
  npx cdk deploy --all

  # Deploy SES email stack
  npx cdk deploy AcademiaSes

  # Deploy specific environment
  npx cdk deploy AcademiaServerless-Production -c environment=production

  # Deploy to development
  ENVIRONMENT=dev1 npx cdk deploy AcademiaServerless-Dev1
`);

app.synth();
