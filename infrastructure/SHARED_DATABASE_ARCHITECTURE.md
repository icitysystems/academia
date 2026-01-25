# Academia - Shared Database Architecture

## Overview

The Academia platform uses a **single Aurora PostgreSQL db.t4g.micro instance** shared across all 5 environments, with **separate databases** for each environment. This architecture optimizes costs while maintaining data isolation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SharedDatabaseStack                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Shared VPC (academia-shared-vpc)                 │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │              Aurora PostgreSQL db.t4g.micro                    │ │   │
│  │  │  ┌──────────────┬──────────────┬──────────────────────────┐   │ │   │
│  │  │  │academia_dev1 │academia_dev2 │academia_testing          │   │ │   │
│  │  │  ├──────────────┼──────────────┼──────────────────────────┤   │ │   │
│  │  │  │academia_staging│academia_production                     │   │ │   │
│  │  │  └──────────────┴──────────────┴──────────────────────────┘   │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
           │              │              │              │              │
           ▼              ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Backend-Dev1 │ │ Backend-Dev2 │ │Backend-Test  │ │Backend-Stage │ │Backend-Prod  │
│   Lambda     │ │   Lambda     │ │   Lambda     │ │   Lambda     │ │   Lambda     │
│ (dev1.*)     │ │ (dev2.*)     │ │ (test.*)     │ │ (staging.*)  │ │ (app.*)      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

## Stacks

| Stack Name                   | Description                                 |
| ---------------------------- | ------------------------------------------- |
| `AcademiaSharedDatabase`     | Shared VPC, Aurora cluster, Secrets Manager |
| `AcademiaBackend-Dev1`       | Lambda, API Gateway, S3 for dev1            |
| `AcademiaBackend-Dev2`       | Lambda, API Gateway, S3 for dev2            |
| `AcademiaBackend-Testing`    | Lambda, API Gateway, S3 for testing         |
| `AcademiaBackend-Staging`    | Lambda, API Gateway, S3 for staging         |
| `AcademiaBackend-Production` | Lambda, API Gateway, S3 for production      |
| `AcademiaFrontend-*`         | S3, CloudFront for each environment         |

## Databases

| Environment | Database Name         | URL Pattern        |
| ----------- | --------------------- | ------------------ |
| dev1        | `academia_dev1`       | dev1.domain.com    |
| dev2        | `academia_dev2`       | dev2.domain.com    |
| testing     | `academia_testing`    | test.domain.com    |
| staging     | `academia_staging`    | staging.domain.com |
| production  | `academia_production` | app.domain.com     |

## Cost Estimate (~1M total requests/month)

| Service                                     | Monthly Cost   |
| ------------------------------------------- | -------------- |
| **Aurora db.t4g.micro (1 shared instance)** | $29.20         |
| Aurora Storage (20GB)                       | $2.00          |
| Aurora I/O (1M requests)                    | $0.20          |
| Lambda (5 environments)                     | $8.35          |
| API Gateway (1M requests)                   | $3.50          |
| S3 Storage (5 × 5GB)                        | $0.58          |
| CloudFront (50GB transfer)                  | $4.25          |
| Route53 (5 subdomains)                      | $0.90          |
| Secrets Manager (8 secrets)                 | $1.60          |
| **TOTAL**                                   | **~$51/month** |

### Cost Comparison

| Architecture                  | Monthly Cost | Savings              |
| ----------------------------- | ------------ | -------------------- |
| **Shared db.t4g.micro**       | ~$51         | -                    |
| Separate db.t4g.micro per env | ~$491        | You save $440/month  |
| Aurora Serverless per env     | ~$250+       | You save $200+/month |

## Deployment Commands

### Deploy Everything

```bash
cd infrastructure/cdk
npx cdk deploy --all
```

### Deploy Shared Database Only

```bash
npx cdk deploy AcademiaSharedDatabase
```

### Deploy Specific Environment

```bash
# Dev1
npx cdk deploy AcademiaBackend-Dev1 AcademiaFrontend-Dev1 -c environment=dev1

# Production
npx cdk deploy AcademiaBackend-Production AcademiaFrontend-Production -c environment=production
```

### Initialize Databases

After deploying the shared database, run the initialization script:

```bash
# Using Node.js script
node scripts/init-databases.js

# Or using SQL directly (requires psql and VPC access)
psql -h <aurora-endpoint> -U academia_admin -f scripts/init-databases.sql
```

### Run Migrations

```bash
# For each environment
DATABASE_URL="postgresql://academia_admin:***@<endpoint>:5432/academia_dev1" \
  npx prisma migrate deploy

DATABASE_URL="postgresql://academia_admin:***@<endpoint>:5432/academia_production" \
  npx prisma migrate deploy
```

## CI/CD Pipeline

The GitHub Actions pipeline automatically:

1. **Deploys Shared Database** (first time only)
2. **Deploys Environment Stacks** based on branch:
   - `feature/*` → dev1
   - `develop` → dev2
   - `release/*` → testing
   - `main` → staging
   - `v*` tags → production (manual approval)
3. **Runs Migrations** for the environment-specific database
4. **Invalidates CloudFront** cache

## Security Considerations

1. **Database Isolation**: Each environment has its own database - no shared tables
2. **Credentials**: Master credentials stored in Secrets Manager
3. **Network**: Aurora in private subnets, only accessible from VPC
4. **Lambda Access**: Each Lambda has its own security group, allowed to connect to Aurora

## Scaling Notes

1. **db.t4g.micro**: 2 vCPUs, 1GB RAM - suitable for development/staging
2. **For higher load**: Scale up to db.t4g.small (2GB) or db.t4g.medium (4GB)
3. **Read replicas**: Can add Aurora read replicas for production without changing architecture
4. **Migration path**: Easy to move production to dedicated cluster later

## Files

| File                           | Purpose                                    |
| ------------------------------ | ------------------------------------------ |
| `lib/shared-database-stack.ts` | SharedDatabaseStack - VPC, Aurora, Secrets |
| `lib/academia-app-stack.ts`    | Per-environment backend stack              |
| `lib/frontend-stack.ts`        | Per-environment frontend stack             |
| `lib/config/environments.ts`   | Environment configurations                 |
| `bin/app.ts`                   | CDK app entry point                        |
| `scripts/init-databases.sql`   | SQL to create databases                    |
| `scripts/init-databases.js`    | Node.js database initializer               |
