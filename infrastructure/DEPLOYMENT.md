# AWS Deployment Guide for Academia (CDK + Serverless)

This project standardizes on a single stack for development and production:

- NestJS (TypeScript)
- GraphQL
- Prisma
- AWS CDK
- AWS Lambda
- Amazon API Gateway
- Amazon RDS (PostgreSQL)
- Amazon S3
- Amazon Route 53

This repository also contains older Terraform/ECS-style notes in history; those are not used.

## Deployment

Use the CDK deployment guide:

- See `infrastructure/cdk/DEPLOYMENT.md`
- Or run the PowerShell helper in `infrastructure/deploy-cdk.ps1`

## Notes

- Backend is deployed as a Lambda behind API Gateway.
- Database is PostgreSQL (RDS).
- Files (uploads, PDFs, templates) are stored in S3.
  aws logs tail /ecs/academia-backend --follow

````

### Database Connection Issues

1. Verify security group rules
2. Check VPC connectivity
3. Verify credentials in SSM Parameter Store

## Cleanup

To destroy all resources:

```bash
cd infrastructure/terraform
terraform destroy
````

**Warning**: This will delete all data including the database!
