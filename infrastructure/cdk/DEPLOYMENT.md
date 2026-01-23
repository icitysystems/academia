# Academia AWS Deployment Guide (Serverless)

This guide explains how to deploy the Academia application to AWS using CDK with Lambda (serverless).

## Architecture

```
                         ┌─────────────────────────┐
                         │     Route 53 (DNS)      │
                         │  academia.icitysystems  │
                         │         .org            │
                         └───────────┬─────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           │
┌─────────────────┐       ┌─────────────────┐                   │
│   CloudFront    │       │   CloudFront    │                   │
│   (Frontend)    │       │   (/api, /gql)  │                   │
└────────┬────────┘       └────────┬────────┘                   │
         │                         │                            │
         ▼                         └─────────────────┐          │
┌─────────────────┐                                  │          │
│   S3 Bucket     │                                  ▼          │
│   (Frontend)    │                       ┌─────────────────┐   │
└─────────────────┘                       │   API Gateway   │◄──┘
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │     Lambda      │
                                          │   (Backend)     │
                                          └────────┬────────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              │                    │                    │
                              ▼                    ▼                    ▼
                    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
                    │      RDS        │  │   S3 (Assets)   │  │ Secrets Manager │
                    │   PostgreSQL    │  │                 │  │                 │
                    └─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Benefits of Serverless Architecture

- **No Docker required** - Lambda bundles the code directly
- **Cost-effective** - Pay only for actual usage
- **Auto-scaling** - Lambda scales automatically with demand
- **No infrastructure management** - AWS manages servers

## Prerequisites

1. **AWS Account** with administrator access
2. **AWS CLI** installed and configured
3. **Node.js** >= 18.x
4. **(Optional)** Route 53 hosted zone for custom domain

## Quick Deploy (Without Custom Domain)

```powershell
# 1. Configure AWS credentials
aws configure --profile appbuilder

# 2. Deploy everything
cd infrastructure
.\deploy-cdk.ps1 -Target all -Profile appbuilder
```

## Deploy with Custom Domain

If you have a Route 53 hosted zone for your domain:

```powershell
# Get your hosted zone ID
aws route53 list-hosted-zones --query "HostedZones[?Name=='icitysystems.org.'].Id" --output text --profile appbuilder

# Deploy with hosted zone
.\deploy-cdk.ps1 -Target all -Profile appbuilder -HostedZoneId "Z1234567890ABC"
```

## Step-by-Step Deployment

### 1. Configure AWS Credentials

```bash
aws configure --profile appbuilder
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter default region: us-east-1
# Enter output format: json
```

### 2. Install Dependencies

```powershell
# Install CDK dependencies
cd infrastructure/cdk
npm install

# Install backend dependencies
cd ../../backend
npm install
npx prisma generate
```

### 3. Bootstrap CDK (First Time Only)

```powershell
cd infrastructure/cdk
npx cdk bootstrap --profile appbuilder
```

### 4. Deploy Infrastructure

```powershell
# Deploy all stacks
npx cdk deploy --all --require-approval never --profile appbuilder

# Or with custom domain
npx cdk deploy --all --require-approval never --profile appbuilder -c hostedZoneId=YOUR_HOSTED_ZONE_ID
```

### 5. Get Deployment Outputs

```powershell
# Get API URL
aws cloudformation describe-stacks --stack-name AcademiaBackendStack --query "Stacks[0].Outputs" --profile appbuilder --region us-east-1

# Get Frontend URL
aws cloudformation describe-stacks --stack-name AcademiaFrontendStack --query "Stacks[0].Outputs" --profile appbuilder --region us-east-1
```

## Post-Deployment Configuration

### Update Stripe Secrets

After deployment, update the Stripe API keys in Secrets Manager:

```powershell
aws secretsmanager put-secret-value `
    --secret-id academia/stripe-secret `
    --secret-string '{"secretKey":"sk_live_YOUR_KEY","webhookSecret":"whsec_YOUR_SECRET"}' `
    --profile appbuilder --region us-east-1
```

### Run Database Migrations

The database schema needs to be applied:

1. Connect to the database using the credentials from Secrets Manager
2. Run Prisma migrations

```bash
# Get database credentials
aws secretsmanager get-secret-value --secret-id academia/database/credentials --profile appbuilder --region us-east-1

# Set DATABASE_URL and run migrations locally
DATABASE_URL="postgresql://user:pass@endpoint:5432/academia" npx prisma migrate deploy
```

## Cost Estimate

Monthly estimated costs (US East region):

- RDS t3.micro: ~$15/month
- Lambda: ~$5-20/month (based on usage)
- API Gateway: ~$3-10/month (based on usage)
- S3: ~$1-5/month
- CloudFront: ~$5-20/month
- NAT Gateway: ~$35/month
- Secrets Manager: ~$2/month

**Total: ~$66-107/month** (varies based on usage)

## Troubleshooting

### CDK Synth Errors

```powershell
# Check for TypeScript errors
cd infrastructure/cdk
npm run build

# Synthesize templates
npx cdk synth --profile appbuilder
```

### Lambda Deployment Issues

```powershell
# View Lambda logs
aws logs tail /aws/lambda/academia-backend --follow --profile appbuilder --region us-east-1
```

### Database Connection Issues

1. Ensure Lambda is in the correct VPC subnet
2. Check security group rules allow PostgreSQL (5432)
3. Verify database credentials in Secrets Manager

### Frontend Deployment

```powershell
# Build and deploy frontend manually
cd frontend
npm run build
aws s3 sync build/ s3://BUCKET_NAME/ --delete --profile appbuilder

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*" --profile appbuilder
```

## Cleanup

To destroy all resources:

```powershell
cd infrastructure/cdk
npx cdk destroy --all --profile appbuilder
```

Note: S3 buckets and RDS snapshots may be retained based on removal policies.
