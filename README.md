# Academia - ML-Powered Grading System

An intelligent grading system that uses machine learning to assist educators in grading student work efficiently.

## Architecture

- **Backend**: NestJS + GraphQL + Prisma (deployed as AWS Lambda)
- **Frontend**: React + Material UI + Apollo (deployed on S3 + CloudFront)
- **Database**: PostgreSQL on Amazon RDS
- **Infrastructure**: AWS CDK (Infrastructure as Code)

## Project Structure

```
academia/
├── backend/          # NestJS GraphQL API (Lambda)
├── frontend/         # React SPA
├── infrastructure/   # AWS CDK deployment
│   ├── cdk/         # CDK stacks
│   └── deploy-cdk.ps1  # Deployment script
├── docs/            # Documentation
└── Specification.md # System specification
```

## Prerequisites

- Node.js 18+
- AWS CLI configured with credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

## Local Development

### Backend

```bash
cd backend
npm install
npx prisma generate
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## AWS Deployment

Deploy the entire system to AWS using CDK:

```powershell
cd infrastructure
.\deploy-cdk.ps1 -Target all -Profile appbuilder
```

Or manually:

```powershell
cd infrastructure/cdk
npm install
npx cdk bootstrap --profile appbuilder
npx cdk deploy --all --profile appbuilder --require-approval never
```

## AWS Services Used

| Service         | Purpose                         |
| --------------- | ------------------------------- |
| Lambda          | Backend API runtime             |
| API Gateway     | HTTP endpoint                   |
| RDS PostgreSQL  | Database                        |
| S3              | Frontend hosting & file storage |
| CloudFront      | CDN                             |
| Secrets Manager | Credential storage              |
| VPC             | Network isolation               |

## Documentation

- [Deployment Guide](infrastructure/cdk/DEPLOYMENT.md)
- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
