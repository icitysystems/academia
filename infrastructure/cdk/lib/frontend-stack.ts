import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export interface AcademiaFrontendStackProps extends cdk.StackProps {
	domainName: string;
	subdomain: string;
	apiUrl: string;
	hostedZoneId?: string;
}

export class AcademiaFrontendStack extends cdk.Stack {
	public readonly distribution: cloudfront.IDistribution;
	public readonly bucket: s3.IBucket;

	constructor(scope: Construct, id: string, props: AcademiaFrontendStackProps) {
		super(scope, id, props);

		const fullDomain = `${props.subdomain}.${props.domainName}`;

		// Hosted Zone - use ID if provided
		let hostedZone: route53.IHostedZone | undefined;
		let certificate: acm.ICertificate | undefined;

		if (props.hostedZoneId) {
			hostedZone = route53.HostedZone.fromHostedZoneAttributes(
				this,
				"HostedZone",
				{
					hostedZoneId: props.hostedZoneId,
					zoneName: props.domainName,
				},
			);

			// ACM Certificate (must be in us-east-1 for CloudFront)
			certificate = new acm.DnsValidatedCertificate(this, "Certificate", {
				domainName: fullDomain,
				subjectAlternativeNames: [`*.${fullDomain}`],
				hostedZone,
				region: "us-east-1", // CloudFront requires us-east-1
			});
		}

		// S3 Bucket for Frontend
		this.bucket = new s3.Bucket(this, "FrontendBucket", {
			bucketName: `academia-frontend-${this.account}`,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			encryption: s3.BucketEncryption.S3_MANAGED,
			versioned: true,
			removalPolicy: cdk.RemovalPolicy.RETAIN,
		});

		// CloudFront Origin Access Identity
		const originAccessIdentity = new cloudfront.OriginAccessIdentity(
			this,
			"OAI",
			{
				comment: "Academia Frontend OAI",
			},
		);

		this.bucket.grantRead(originAccessIdentity);

		// CloudFront Distribution
		// Extract domain name from API URL (remove protocol and any path like /prod/)
		const apiOriginDomain = props.apiUrl
			.replace("https://", "")
			.replace("http://", "")
			.split("/")[0]; // Get just the domain part

		this.distribution = new cloudfront.Distribution(this, "Distribution", {
			defaultBehavior: {
				origin: new origins.S3Origin(this.bucket, {
					originAccessIdentity,
				}),
				viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
				cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
				compress: true,
			},
			additionalBehaviors: {
				"/api/*": {
					origin: new origins.HttpOrigin(apiOriginDomain, {
						protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
						originPath: "/prod",
					}),
					viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
					allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
					cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
					originRequestPolicy:
						cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
				},
				"/graphql": {
					origin: new origins.HttpOrigin(apiOriginDomain, {
						protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
						originPath: "/prod",
					}),
					viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
					allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
					cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
					originRequestPolicy:
						cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
				},
			},
			domainNames: hostedZone ? [fullDomain] : undefined,
			certificate,
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
			priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
		});

		// Route53 Records (only if hosted zone is available)
		if (hostedZone) {
			new route53.ARecord(this, "AliasRecord", {
				zone: hostedZone,
				recordName: fullDomain,
				target: route53.RecordTarget.fromAlias(
					new route53Targets.CloudFrontTarget(this.distribution),
				),
			});

			new route53.AaaaRecord(this, "AliasRecordIPv6", {
				zone: hostedZone,
				recordName: fullDomain,
				target: route53.RecordTarget.fromAlias(
					new route53Targets.CloudFrontTarget(this.distribution),
				),
			});
		}

		// Outputs
		new cdk.CfnOutput(this, "FrontendUrl", {
			value: hostedZone
				? `https://${fullDomain}`
				: `https://${this.distribution.distributionDomainName}`,
			description: "Frontend URL",
		});

		new cdk.CfnOutput(this, "DistributionId", {
			value: this.distribution.distributionId,
			description: "CloudFront Distribution ID",
		});

		new cdk.CfnOutput(this, "DistributionDomainName", {
			value: this.distribution.distributionDomainName,
			description: "CloudFront Distribution Domain Name",
		});

		new cdk.CfnOutput(this, "FrontendBucketName", {
			value: this.bucket.bucketName,
			description: "Frontend S3 Bucket",
		});
	}
}
