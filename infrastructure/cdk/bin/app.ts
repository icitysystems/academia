#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AcademiaBackendLambdaStack } from "../lib/academia-backend-lambda-stack";
import { AcademiaFrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();

const env = {
	account: process.env.CDK_DEFAULT_ACCOUNT,
	region: process.env.AWS_REGION || "us-east-1",
};

const domainName = "icitysystems.org";
const subdomain = "academia";
const hostedZoneId = app.node.tryGetContext("hostedZoneId") || undefined;

// Backend Infrastructure Stack - VPC, RDS, Lambda, S3
const backendStack = new AcademiaBackendLambdaStack(
	app,
	"AcademiaBackendStack",
	{
		env,
		domainName,
		subdomain,
		hostedZoneId,
		description: "Academia Backend Infrastructure (VPC, RDS, Lambda, S3)",
	},
);

// Frontend Stack - S3 + CloudFront
const frontendStack = new AcademiaFrontendStack(app, "AcademiaFrontendStack", {
	env,
	domainName,
	subdomain,
	apiUrl: backendStack.apiUrl,
	hostedZoneId,
	description: "Academia Frontend on S3 + CloudFront",
});
frontendStack.addDependency(backendStack);

// Tags
cdk.Tags.of(app).add("Project", "Academia");
cdk.Tags.of(app).add("Environment", "Production");
cdk.Tags.of(app).add("ManagedBy", "CDK");
