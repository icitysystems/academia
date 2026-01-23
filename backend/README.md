# Academia Backend (scaffold)

This folder contains a minimal NestJS + GraphQL + Prisma scaffold to start the backend.

Quick start (Windows PowerShell):

```powershell
cd backend
npm install
npm run prisma:generate
npm run start:dev
```

Notes:

- Use PostgreSQL for local development and production.
- The backend is designed to run behind AWS API Gateway as an AWS Lambda (deployed via CDK).
