#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SharedDatabaseStack } from "../lib/shared-database-stack";
import { AcademiaAppStack } from "../lib/academia-app-stack";
import { AcademiaFrontendStack } from "../lib/frontend-stack";
import { environments, EnvironmentConfig } from "../lib/config/environments";

/**
 * Academia CDK Application
 *
 * Architecture: RDS PostgreSQL db.t3.micro for production
 *
 * Stack hierarchy:
 * 1. SharedDatabaseStack - RDS PostgreSQL db.t3.micro instance (icitysystems)
 * 2. AcademiaAppStack (per env) - Lambda, API Gateway, S3 (uses shared DB)
 * 3. AcademiaFrontendStack (per env) - S3, CloudFront
 *
 * Database: academia
 *
 * AWS Services:
 * - Lambda (backend API)
 * - API Gateway (REST API)
 * - RDS PostgreSQL db.t3.micro
 * - S3 (assets + frontend)
 * - CloudFront (CDN)
 * - Route53 (DNS)
 * - ACM (SSL certificates)
 * - Secrets Manager
 */

const app = new cdk.App();

// ============================================================================
// Configuration
// ============================================================================
const config = {
	domainName: app.node.tryGetContext("domainName") || "academia-example.com",
	hostedZoneId: app.node.tryGetContext("hostedZoneId") || undefined,
	deployEnvironment: app.node.tryGetContext("environment") as
		| string
		| undefined,
};

const awsEnv: cdk.Environment = {
	account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
	region:
		process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || "eu-west-2",
};

console.log(`
╔════════════════════════════════════════════════════════════╗
║           Academia CDK Deployment                          ║
╠════════════════════════════════════════════════════════════╣
║  Domain: ${config.domainName.padEnd(47)}║
║  Region: ${(awsEnv.region || "eu-west-2").padEnd(47)}║
║  Environment: ${(config.deployEnvironment || "all").padEnd(42)}║
╚════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// Shared Database Stack (RDS PostgreSQL db.t3.micro - icitysystems)
// ============================================================================
const sharedDbStack = new SharedDatabaseStack(app, "AcademiaSharedDatabase", {
	env: awsEnv,
	description: "Academia RDS PostgreSQL database (db.t3.micro - icitysystems)",
	tags: {
		Application: "Academia",
		Component: "SharedDatabase",
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

// Helper functions
function getSubdomain(envName: string): string {
	// Subdomain prefixes for different environments
	// Production uses empty string since domainName is academia.icitysystems.org
	const subdomains: Record<string, string> = {
		dev1: "dev1",
		dev2: "dev2",
		testing: "test",
		staging: "staging",
		production: "", // No subdomain - domain is already academia.icitysystems.org
	};
	return subdomains[envName] ?? envName;
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

// Create stacks for each environment
for (const [envName, envConfig] of environmentsToDeploy) {
	const subdomain = getSubdomain(envName);

	// Backend Stack (Lambda, API Gateway, S3)
	const backendStack = new AcademiaAppStack(
		app,
		`AcademiaBackend-${capitalize(envName)}`,
		{
			env: awsEnv,
			description: `Academia Backend - ${envName}`,
			domainName: config.domainName,
			subdomain: subdomain,
			hostedZoneId: config.hostedZoneId,
			environmentConfig: envConfig,
			// Pass shared database references
			sharedVpc: sharedDbStack.vpc,
			dbEndpoint: sharedDbStack.dbEndpoint,
			dbPort: sharedDbStack.dbPort,
			dbSecretArn: sharedDbStack.dbSecretArn,
			dbSecurityGroupId: sharedDbStack.dbSecurityGroupId,
			tags: {
				Application: "Academia",
				Environment: envName,
				Component: "Backend",
			},
		},
	);

	// Backend depends on shared database
	backendStack.addDependency(sharedDbStack, "Backend requires shared database");

	// Frontend Stack (S3, CloudFront)
	const frontendStack = new AcademiaFrontendStack(
		app,
		`AcademiaFrontend-${capitalize(envName)}`,
		{
			env: awsEnv,
			description: `Academia Frontend - ${envName}`,
			domainName: config.domainName,
			subdomain: subdomain,
			hostedZoneId: config.hostedZoneId,
			apiUrl: backendStack.apiUrl,
			environmentConfig: envConfig,
			tags: {
				Application: "Academia",
				Environment: envName,
				Component: "Frontend",
			},
		},
	);

	// Frontend depends on backend for API URL
	frontendStack.addDependency(
		backendStack,
		"Frontend requires backend API URL",
	);

	console.log(`  ✓ Created stacks for ${envName} environment`);
	console.log(`    - Backend: AcademiaBackend-${capitalize(envName)}`);
	console.log(`    - Frontend: AcademiaFrontend-${capitalize(envName)}`);
	console.log(`    - Database: academia_${envName}`);
}

// ============================================================================
// Cost Summary
// ============================================================================
console.log(`
╔════════════════════════════════════════════════════════════╗
║           Estimated Monthly Cost (~1M requests)            ║
╠════════════════════════════════════════════════════════════╣
║  Aurora db.t4g.micro (shared)     $29.20                   ║
║  Aurora Storage (20GB)            $2.00                    ║
║  Aurora I/O (1M requests)         $0.20                    ║
║  Lambda (5 environments)          $8.35                    ║
║  API Gateway (1M requests)        $3.50                    ║
║  S3 Storage (5 × 5GB)             $0.58                    ║
║  CloudFront (50GB transfer)       $4.25                    ║
║  Route53 (5 subdomains)           $0.90                    ║
║  Secrets Manager (8 secrets)      $1.60                    ║
╠════════════════════════════════════════════════════════════╣
║  TOTAL ESTIMATED                  ~$51/month               ║
╚════════════════════════════════════════════════════════════╝

Deploy commands:
  # Deploy everything
  npx cdk deploy --all

  # Deploy shared database only
  npx cdk deploy AcademiaSharedDatabase

  # Deploy specific environment
  npx cdk deploy AcademiaBackend-Dev1 AcademiaFrontend-Dev1 -c environment=dev1

  # Deploy to production
  npx cdk deploy AcademiaBackend-Production AcademiaFrontend-Production -c environment=production
`);

app.synth();
