# Academia AWS Infrastructure

This directory contains AWS CDK infrastructure code for deploying the Academia application using a serverless architecture (Lambda + API Gateway).

## Architecture

The infrastructure is deployed as two stacks:

### Backend Stack (`AcademiaBackendStack`)

- **Network Layer**

  - VPC with public, private, and isolated subnets
  - NAT Gateway for outbound internet access
  - Security groups for Lambda and RDS

- **Database Layer**

  - RDS PostgreSQL instance (PostgreSQL 15)
  - Secrets Manager for credentials
  - Private subnet deployment

- **Backend Layer (Serverless)**

  - Lambda function for NestJS backend
  - API Gateway REST API
  - S3 bucket for file storage

- **Secrets**
  - JWT signing secret
  - Stripe API keys

### Frontend Stack (`AcademiaFrontendStack`)

- S3 bucket for static hosting
- CloudFront distribution
- ACM SSL certificate (optional, with hosted zone)
- Route53 DNS records (optional, with hosted zone)

## Prerequisites

1. **AWS CLI** - Install and configure with your credentials

   ```bash
   aws configure --profile appbuilder
   ```

2. **Node.js** - Version 18.x or later

3. **AWS CDK CLI** - Install globally

   ```bash
   npm install -g aws-cdk
   ```

4. **(Optional) Domain Setup** - Route53 hosted zone for custom domain

## Deployment

### Quick Start

```powershell
# Install dependencies
npm install

# Bootstrap CDK (first time only)
npx cdk bootstrap --profile appbuilder

# Deploy all stacks
npx cdk deploy --all --require-approval never --profile appbuilder
```

### With Custom Domain

```powershell
# Get your hosted zone ID
aws route53 list-hosted-zones --query "HostedZones[?Name=='icitysystems.org.'].Id" --output text --profile appbuilder

# Deploy with domain
npx cdk deploy --all --require-approval never --profile appbuilder -c hostedZoneId=YOUR_ZONE_ID
```

### Using the Deployment Script

```powershell
cd infrastructure
.\deploy-cdk.ps1 -Target all -Profile appbuilder
```

## Useful Commands

- `npx cdk synth` - Synthesize CloudFormation templates
- `npx cdk diff` - Compare deployed stack with current state
- `npx cdk deploy` - Deploy this stack to AWS
- `npx cdk destroy` - Remove all stacks

## Stack Outputs

After deployment, you can get the outputs:

```powershell
# Backend outputs (API URL, Lambda ARN, etc.)
aws cloudformation describe-stacks --stack-name AcademiaBackendStack --query "Stacks[0].Outputs" --profile appbuilder --region us-east-1

# Frontend outputs (CloudFront URL, S3 bucket, etc.)
aws cloudformation describe-stacks --stack-name AcademiaFrontendStack --query "Stacks[0].Outputs" --profile appbuilder --region us-east-1
```

## Cleanup

To destroy all resources:

```powershell
npx cdk destroy --all --profile appbuilder
```

**Warning**: This will delete all data including the database!

## Cost Estimation

Monthly costs (us-east-1):

- **Lambda**: ~$1-5/month (pay per invocation)
- **API Gateway**: ~$3.50/million requests
- **RDS t3.micro**: ~$15/month
- **NAT Gateway**: ~$32/month + data transfer
- **S3**: ~$0.023/GB
- **CloudFront**: ~$0.085/GB transfer

**Estimated total: ~$50-60/month** for low traffic

## Troubleshooting

### CDK Bootstrap Fails

Ensure your AWS credentials have sufficient permissions:

```bash
aws sts get-caller-identity --profile appbuilder
```

### Certificate Validation Timeout

ACM certificates require DNS validation. Ensure your hosted zone is correctly configured.

### Lambda Function Errors

Check CloudWatch logs:

```bash
aws logs tail /aws/lambda/academia-backend --follow --profile appbuilder
```

### Database Connection Issues

Verify security groups allow traffic from Lambda to RDS on port 5432.

## Security Considerations

1. **Secrets**: All sensitive values are stored in AWS Secrets Manager
2. **Network**: Database is in private subnets with no public access
3. **TLS**: All traffic is encrypted with ACM certificates
4. **IAM**: Follows least-privilege principle for all roles
