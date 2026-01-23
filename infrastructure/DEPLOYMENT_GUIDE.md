# AWS Deployment Guide for Academia Platform

## Summary of Completed Work

### ✅ Tests Updated and Fixed

All backend unit tests have been updated and are passing:

- **Auth Service Tests**: 8 tests passing
- **Storage Service Tests**: 7 tests passing
- **Image Processing Service Tests**: 5 tests passing
- **Total**: 20 tests passing

### ✅ Builds Completed

- **Backend**: TypeScript compiled successfully to `backend/dist/`
- **Frontend**: React app built successfully to `frontend/build/`
- **CDK Infrastructure**: TypeScript compiled successfully

### ✅ CDK Synthesis Completed

CloudFormation templates generated successfully in `infrastructure/cdk/cdk.out/`

## Deployment Instructions

### Prerequisites

1. **AWS CLI** installed and configured
2. **Valid AWS credentials** with appropriate permissions
3. **Node.js** and **npm** installed

### Step 1: Configure AWS Credentials

If you haven't already, configure your AWS credentials:

```powershell
aws configure
```

You'll need to provide:

- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

To verify credentials are working:

```powershell
aws sts get-caller-identity
```

### Step 2: Deploy to AWS

Run the automated deployment script:

```powershell
cd c:\dev\academia\infrastructure
.\deploy-aws.ps1
```

This script will:

1. Verify AWS credentials
2. Build backend application
3. Build frontend application
4. Synthesize CDK stacks
5. Deploy both stacks to AWS
6. Automatically invalidate CloudFront cache
7. Display deployment outputs

**Estimated time**: 10-20 minutes

### Step 3: Invalidate CloudFront (if needed)

If you make changes after deployment and need to invalidate the cache manually:

```powershell
cd c:\dev\academia\infrastructure
.\invalidate-cloudfront.ps1
```

Or manually:

```powershell
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
```

## Alternative: Manual Deployment

If you prefer to deploy manually:

### Deploy Backend Stack

```powershell
cd c:\dev\academia\infrastructure\cdk
npx cdk deploy AcademiaBackendStack --require-approval never
```

### Deploy Frontend Stack

```powershell
cd c:\dev\academia\infrastructure\cdk
npx cdk deploy AcademiaFrontendStack --require-approval never
```

## What Gets Deployed

### Backend Stack (AcademiaBackendStack)

- **VPC** with public and private subnets
- **RDS PostgreSQL** database (or Aurora Serverless)
- **Lambda Function** running NestJS application
- **API Gateway** (or Lambda Function URL)
- **S3 Bucket** for file storage
- **CloudWatch** logs and metrics
- **Secrets Manager** for database credentials

### Frontend Stack (AcademiaFrontendStack)

- **S3 Bucket** for static hosting
- **CloudFront Distribution** for CDN
- **Route53** DNS records (if custom domain configured)
- **ACM Certificate** for HTTPS (if custom domain)

## Post-Deployment

### Access Your Application

After successful deployment, you'll receive:

- **API URL**: The backend GraphQL endpoint
- **CloudFront URL**: The frontend application URL
- **Distribution ID**: For CloudFront cache invalidation

### Environment Variables

Update your frontend environment to point to the deployed backend:

1. Note the API URL from deployment outputs
2. Update frontend configuration if needed
3. Redeploy frontend if configuration changes

### Database Migration

Run Prisma migrations on the deployed database:

```powershell
cd c:\dev\academia\backend
npx prisma migrate deploy --schema=./prisma/schema.production.prisma
```

### Monitoring

- **CloudWatch Logs**: Monitor Lambda and API Gateway logs
- **CloudWatch Metrics**: Track API usage, errors, and performance
- **RDS Performance Insights**: Monitor database performance
- **X-Ray**: Distributed tracing (if enabled)

## Troubleshooting

### AWS Credentials Error

**Error**: `Unable to resolve AWS account to use`

**Solution**: Configure AWS credentials:

```powershell
aws configure
```

### Security Token Invalid

**Error**: `The security token included in the request is invalid`

**Solution**: Your credentials may be expired. Refresh them:

- If using temporary credentials (SSO), re-authenticate
- If using long-term credentials, verify they're still valid

### CloudFormation Stack Failed

**Solution**: Check CloudFormation console for detailed error messages:

```powershell
aws cloudformation describe-stack-events --stack-name AcademiaBackendStack
```

### Lambda Function Errors

**Solution**: Check CloudWatch logs:

```powershell
aws logs tail /aws/lambda/AcademiaBackend --follow
```

## Stack Outputs

After deployment, the following outputs are available:

### Backend Stack

- `ApiUrl`: GraphQL API endpoint
- `DatabaseEndpoint`: RDS endpoint (if applicable)
- `BucketName`: S3 bucket for storage
- `LambdaFunctionArn`: Lambda function ARN

### Frontend Stack

- `CloudFrontUrl`: Frontend application URL
- `CloudFrontDistributionId`: For cache invalidation
- `BucketName`: S3 bucket name
- `DomainName`: Custom domain (if configured)

## Cost Estimation

Approximate monthly costs (us-east-1):

- **Lambda**: ~$5-20 (depends on traffic)
- **RDS/Aurora**: ~$15-100 (depends on instance size)
- **S3**: ~$1-10 (depends on storage)
- **CloudFront**: ~$1-50 (depends on traffic)
- **API Gateway**: ~$3-30 (depends on requests)

**Total**: ~$25-200/month depending on usage

## Clean Up

To avoid ongoing charges, destroy the stacks when done:

```powershell
cd c:\dev\academia\infrastructure\cdk
npx cdk destroy --all
```

**Warning**: This will delete all resources including databases and stored files!

## Support

For issues or questions:

1. Check CloudWatch Logs for errors
2. Review CloudFormation events
3. Consult AWS documentation
4. Check CDK documentation: https://docs.aws.amazon.com/cdk/

## Next Steps

1. ✅ Configure custom domain (optional)
2. ✅ Set up CI/CD pipeline (GitHub Actions, etc.)
3. ✅ Configure monitoring and alerts
4. ✅ Set up automated backups
5. ✅ Implement security best practices
6. ✅ Load test the application
