# Deployment notes (AWS)

Options:

- Frontend: host on S3 and map a domain with Route 53
- Backend: deploy NestJS (GraphQL) on AWS Lambda behind API Gateway (via CDK)
- Database: AWS RDS PostgreSQL
- Storage: S3 for scans, PDFs, templates, and media

Simple flow for a POC:

1. Deploy infrastructure with CDK (Lambda + API Gateway + RDS PostgreSQL + S3 + Route 53).
2. Deploy backend (Lambda) and run Prisma migrations against RDS PostgreSQL.
3. Deploy frontend build artifacts to S3 and point Route 53 to the site.
