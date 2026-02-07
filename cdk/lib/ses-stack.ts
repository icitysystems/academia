import * as cdk from "aws-cdk-lib";
import * as ses from "aws-cdk-lib/aws-ses";
import * as sesActions from "aws-cdk-lib/aws-ses-actions";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

export interface AcademiaSesStackProps extends cdk.StackProps {
	domainName: string;
	hostedZoneId?: string;
	forwardingEmail: string; // Email to forward incoming mail to (e.g., icitysystems@gmail.com)
	skipDomainIdentity?: boolean; // Skip creating domain identity if it already exists
}

/**
 * AWS SES Stack for Academia Platform
 *
 * Sets up:
 * 1. SES domain identity for icitysystems.org (optional - skip if exists)
 * 2. Email receiving rules for academia@icitysystems.org
 * 3. Email forwarding to external Gmail address
 * 4. S3 bucket for storing received emails
 */
export class AcademiaSesStack extends cdk.Stack {
	public readonly emailIdentityArn: string;

	constructor(scope: Construct, id: string, props: AcademiaSesStackProps) {
		super(scope, id, props);

		const {
			domainName,
			hostedZoneId,
			forwardingEmail,
			skipDomainIdentity = true,
		} = props;

		// S3 bucket to store incoming emails
		const emailBucket = new s3.Bucket(this, "EmailBucket", {
			bucketName: `academia-emails-${this.account}`,
			encryption: s3.BucketEncryption.S3_MANAGED,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			lifecycleRules: [
				{
					expiration: cdk.Duration.days(90), // Keep emails for 90 days
				},
			],
			removalPolicy: cdk.RemovalPolicy.RETAIN,
		});

		// Allow SES to write to the bucket
		emailBucket.addToResourcePolicy(
			new iam.PolicyStatement({
				principals: [new iam.ServicePrincipal("ses.amazonaws.com")],
				actions: ["s3:PutObject"],
				resources: [`${emailBucket.bucketArn}/*`],
				conditions: {
					StringEquals: {
						"aws:SourceAccount": this.account,
					},
				},
			}),
		);

		// Lambda function to forward emails to Gmail
		const forwarderFunction = new lambda.Function(this, "EmailForwarder", {
			functionName: "academia-email-forwarder",
			runtime: lambda.Runtime.NODEJS_20_X,
			handler: "index.handler",
			timeout: cdk.Duration.seconds(30),
			memorySize: 256,
			environment: {
				FORWARD_TO: forwardingEmail,
				FROM_EMAIL: `academia@${domainName}`,
				EMAIL_BUCKET: emailBucket.bucketName,
			},
			code: lambda.Code.fromInline(`
const { SESClient, SendRawEmailCommand } = require('@aws-sdk/client-ses');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const ses = new SESClient({});
const s3 = new S3Client({});

exports.handler = async (event) => {
  console.log('Email forwarder triggered:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const sesNotification = record.ses;
    const messageId = sesNotification.mail.messageId;
    const bucket = process.env.EMAIL_BUCKET;

    try {
      // Get the email from S3
      const s3Response = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: messageId,
      }));

      // Read the email content
      const chunks = [];
      for await (const chunk of s3Response.Body) {
        chunks.push(chunk);
      }
      let emailContent = Buffer.concat(chunks).toString('utf-8');

      // Modify headers for forwarding
      const originalFrom = sesNotification.mail.commonHeaders.from[0];
      const originalSubject = sesNotification.mail.commonHeaders.subject || '(no subject)';

      // Replace the From header to comply with SES policies
      // Keep original sender info in the subject
      emailContent = emailContent.replace(
        /^From: .*/m,
        \`From: "Academia Forwarded" <\${process.env.FROM_EMAIL}>\`
      );

      // Add Reply-To header with original sender
      if (!emailContent.match(/^Reply-To:/m)) {
        emailContent = emailContent.replace(
          /^From: /m,
          \`Reply-To: \${originalFrom}\\nFrom: \`
        );
      }

      // Modify subject to indicate forwarding
      emailContent = emailContent.replace(
        /^Subject: .*/m,
        \`Subject: [Fwd: Academia] \${originalSubject}\`
      );

      // Replace the To header
      emailContent = emailContent.replace(
        /^To: .*/m,
        \`To: \${process.env.FORWARD_TO}\`
      );

      // Send the forwarded email
      await ses.send(new SendRawEmailCommand({
        RawMessage: { Data: Buffer.from(emailContent) },
        Destinations: [process.env.FORWARD_TO],
        Source: process.env.FROM_EMAIL,
      }));

      console.log(\`Email \${messageId} forwarded successfully to \${process.env.FORWARD_TO}\`);
    } catch (error) {
      console.error(\`Failed to forward email \${messageId}:\`, error);
      throw error;
    }
  }

  return { status: 'success' };
};
			`),
		});

		// Grant Lambda permissions
		emailBucket.grantRead(forwarderFunction);
		forwarderFunction.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ["ses:SendRawEmail", "ses:SendEmail"],
				resources: ["*"],
			}),
		);

		// Allow SES to invoke the Lambda
		forwarderFunction.addPermission("SESInvoke", {
			principal: new iam.ServicePrincipal("ses.amazonaws.com"),
			sourceAccount: this.account,
		});

		// SES Email Identity for the domain (skip if already exists)
		if (!skipDomainIdentity) {
			new ses.EmailIdentity(this, "DomainIdentity", {
				identity: ses.Identity.domain(domainName),
				mailFromDomain: `mail.${domainName}`,
			});
		}

		this.emailIdentityArn = `arn:aws:ses:${this.region}:${this.account}:identity/${domainName}`;

		// Receipt Rule Set
		const ruleSet = new ses.ReceiptRuleSet(this, "EmailRuleSet", {
			receiptRuleSetName: "academia-email-rules",
		});

		// Receipt Rule for academia@icitysystems.org
		new ses.ReceiptRule(this, "AcademiaEmailRule", {
			ruleSet,
			receiptRuleName: "academia-forward-rule",
			recipients: [`academia@${domainName}`],
			actions: [
				// First, save to S3
				new sesActions.S3({
					bucket: emailBucket,
				}),
				// Then, invoke Lambda to forward
				new sesActions.Lambda({
					function: forwarderFunction,
					invocationType: sesActions.LambdaInvocationType.EVENT,
				}),
			],
			scanEnabled: true,
		});

		// Outputs
		new cdk.CfnOutput(this, "EmailIdentityArn", {
			value: this.emailIdentityArn,
			description: "SES Email Identity ARN",
		});

		new cdk.CfnOutput(this, "EmailBucketName", {
			value: emailBucket.bucketName,
			description: "S3 bucket for storing received emails",
		});

		new cdk.CfnOutput(this, "ForwarderFunctionArn", {
			value: forwarderFunction.functionArn,
			description: "Email forwarder Lambda function ARN",
		});

		// Instructions for DNS setup
		new cdk.CfnOutput(this, "DnsSetupInstructions", {
			value: `
DNS Records Required for SES:
1. Domain verification: Check SES console for DKIM CNAME records
2. MX Record: Add MX record for inbound-smtp.${this.region}.amazonaws.com with priority 10
3. SPF Record: Add TXT record "v=spf1 include:amazonses.com ~all"
4. MAIL FROM: Add MX record for mail.${domainName} pointing to feedback-smtp.${this.region}.amazonses.com

After DNS verification:
- Activate the receipt rule set 'academia-email-rules' in SES console
- Request production access if still in sandbox mode
			`,
			description: "DNS setup instructions for SES",
		});
	}
}
