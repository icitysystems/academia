# Academia Platform - Monthly Cost Estimate

## Configuration

- **Database**: RDS PostgreSQL db.t3.micro (2 vCPU, 1GB RAM) - Instance: icitysystems
- **Database Name**: academia
- **Architecture**: Single database for all environments
- **Total Requests**: 5 million/month across all environments
- **Region**: us-east-1 (N. Virginia)

---

## Cost Breakdown

| Service                            | Details                                 |    Monthly Cost |
| ---------------------------------- | --------------------------------------- | --------------: |
| **RDS db.t3.micro**                | 1 instance (730 hrs × $0.017/hr)        |          $12.41 |
| **RDS Storage**                    | 20GB gp2 @ $0.115/GB                    |           $2.30 |
| **Lambda (5 environments)**        | 5M invocations, 512MB, 500ms avg        |          $21.84 |
| **API Gateway**                    | 5M requests @ $3.50/million             |          $17.50 |
| **S3 Storage**                     | 25GB across 5 buckets @ $0.023/GB       |           $0.58 |
| **S3 Requests**                    | ~10M GET/PUT @ $0.005/1000              |           $0.05 |
| **CloudFront Data Transfer**       | 250GB @ $0.085/GB                       |          $21.25 |
| **CloudFront Requests**            | 5M @ $0.0075/10K                        |           $3.75 |
| **Route53**                        | 5 hosted zones + 5M queries             |           $2.50 |
| **Secrets Manager**                | 8 secrets @ $0.40/secret                |           $3.20 |
| **Data Transfer (AWS → Internet)** | ~50GB @ $0.09/GB                        |           $4.50 |
|                                    |                                         |                 |
| **TOTAL**                          |                                         |  **~$90/month** |

---

## Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│         RDS PostgreSQL db.t3.micro (icitysystems)           │
│                    ($12.41/month)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    academia                           │  │
│  │  (single database shared by all environments)         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
            │              │              │
            ▼              ▼              ▼
     dev1.domain     dev2.domain    test.domain
            │              │
            ▼              ▼
   staging.domain    app.domain
```

---

## Cost by Category

| Category                       |       Cost | Percentage |
| ------------------------------ | ---------: | :--------: |
| Database (RDS db.t3.micro)     |     $14.71 |    16%     |
| Compute (Lambda)               |     $21.84 |    24%     |
| API Gateway                    |     $17.50 |    19%     |
| CDN (CloudFront)               |     $25.00 |    28%     |
| Storage (S3)                   |      $0.63 |     1%     |
| Networking (Route53, Transfer) |      $7.00 |     8%     |
| Secrets Manager                |      $3.20 |     4%     |
| **Total**                      | **$89.88** |  **100%**  |

---

## Request Distribution (Example)

| Environment | Requests/Month | % of Total |
| ----------- | -------------: | :--------: |
| dev1        |        250,000 |     5%     |
| dev2        |        250,000 |     5%     |
| testing     |        500,000 |    10%     |
| staging     |      1,000,000 |    20%     |
| production  |      3,000,000 |    60%     |
| **Total**   |  **5,000,000** |  **100%**  |

---

## Comparison: Architecture Options

| Architecture                  | 5M Requests/month | Notes                |
| ----------------------------- | ----------------: | -------------------- |
| **RDS db.t3.micro (shared)**  |              ~$90 | ✅ Current setup     |
| Aurora db.t4g.micro (shared)  |             ~$109 | More expensive       |
| Separate db.t3.micro (×5)     |             ~$152 | 5× database cost     |
| Aurora Serverless v2 (×5)     |            ~$375+ | Variable, can spike  |

### Savings with RDS db.t3.micro

- **vs Aurora db.t4g.micro**: Save **$19/month** (17%)
- **vs Separate RDS Instances**: Save **$62/month** (41%)
- **vs Serverless**: Save **$285+/month** (76%)

---

## Scaling Considerations

### Current Instance: db.t3.micro (icitysystems)

- **vCPUs**: 2
- **Memory**: 1 GB
- **Network**: Up to 5 Gbps
- **Suitable for**: Development, testing, low-traffic production

### Upgrade Path (if needed)

| Instance      | vCPU | RAM  | Cost/month | When to Consider |
| ------------- | ---- | ---- | ---------- | ---------------- |
| db.t3.micro   | 2    | 1 GB | $12.41     | < 10M requests   |
| db.t3.small   | 2    | 2 GB | $24.82     | 10-25M requests  |
| db.t3.medium  | 2    | 4 GB | $49.64     | 25-50M requests  |
| db.t3.large   | 2    | 8 GB | $99.28     | 50-100M requests |

---

## Summary

| Metric                      | Value  |
| --------------------------- | ------ |
| **Total Monthly Cost**      | ~$90   |
| **Cost per 1,000 Requests** | $0.018 |
| **Cost per Environment**    | ~$18   |
| **Database Cost (fixed)**   | $14.71 |
| **Variable Costs**          | ~$75   |

---

## Notes

1. **Costs are estimates** based on AWS pricing as of February 2026
2. **Free tier not included** - assumes free tier exhausted
3. **Data transfer** assumes moderate API response sizes (~5KB avg)
4. **CloudFront** pricing based on US edge locations
5. **Lambda** calculated at 512MB memory, 500ms average duration
6. **RDS** uses existing icitysystems instance with academia database

---

_Generated: February 4, 2026_
