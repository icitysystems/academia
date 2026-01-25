# Academia Platform - Monthly Cost Estimate

## Configuration

- **Database**: Shared Aurora PostgreSQL db.t4g.micro (2 vCPU, 1GB RAM)
- **Architecture**: 5 separate databases on single instance
- **Total Requests**: 5 million/month across all environments
- **Region**: eu-west-2 (London)

---

## Cost Breakdown

| Service                            | Details                                |    Monthly Cost |
| ---------------------------------- | -------------------------------------- | --------------: |
| **Aurora db.t4g.micro**            | 1 shared instance (730 hrs × $0.04/hr) |          $29.20 |
| **Aurora Storage**                 | 35GB @ $0.10/GB                        |           $3.50 |
| **Aurora I/O**                     | 5M requests @ $0.20/million            |           $1.00 |
| **Lambda (5 environments)**        | 5M invocations, 512MB, 500ms avg       |          $21.84 |
| **API Gateway**                    | 5M requests @ $3.50/million            |          $17.50 |
| **S3 Storage**                     | 25GB across 5 buckets @ $0.023/GB      |           $0.58 |
| **S3 Requests**                    | ~10M GET/PUT @ $0.005/1000             |           $0.05 |
| **CloudFront Data Transfer**       | 250GB @ $0.085/GB                      |          $21.25 |
| **CloudFront Requests**            | 5M @ $0.0075/10K                       |           $3.75 |
| **Route53**                        | 5 hosted zones + 5M queries            |           $2.50 |
| **Secrets Manager**                | 8 secrets @ $0.40/secret               |           $3.20 |
| **Data Transfer (AWS → Internet)** | ~50GB @ $0.09/GB                       |           $4.50 |
|                                    |                                        |                 |
| **TOTAL**                          |                                        | **~$109/month** |

---

## Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Aurora PostgreSQL db.t4g.micro                    │
│                    ($29.20/month)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  academia_dev1  │  academia_dev2  │  academia_testing │  │
│  ├─────────────────┼─────────────────┼───────────────────┤  │
│  │       academia_staging       │   academia_production  │  │
│  └─────────────────────────────────────────────────────────┘  │
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

| Category                       |        Cost | Percentage |
| ------------------------------ | ----------: | :--------: |
| Database (Aurora)              |      $33.70 |    31%     |
| Compute (Lambda)               |      $21.84 |    20%     |
| API Gateway                    |      $17.50 |    16%     |
| CDN (CloudFront)               |      $25.00 |    23%     |
| Storage (S3)                   |       $0.63 |     1%     |
| Networking (Route53, Transfer) |       $7.00 |     6%     |
| Secrets Manager                |       $3.20 |     3%     |
| **Total**                      | **$108.87** |  **100%**  |

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

| Architecture               | 5M Requests/month | Notes               |
| -------------------------- | ----------------: | ------------------- |
| **Shared db.t4g.micro**    |             ~$109 | ✅ Recommended      |
| Separate db.t4g.micro (×5) |             ~$549 | 5× database cost    |
| Aurora Serverless v2 (×5)  |            ~$375+ | Variable, can spike |

### Savings with Shared Database

- **vs Separate Instances**: Save **$440/month** (80%)
- **vs Serverless**: Save **$266+/month** (71%)

---

## Scaling Considerations

### Current Instance: db.t4g.micro

- **vCPUs**: 2
- **Memory**: 1 GB
- **Network**: Up to 5 Gbps
- **Suitable for**: Development, testing, low-traffic production

### Upgrade Path (if needed)

| Instance      | vCPU | RAM  | Cost/month | When to Consider |
| ------------- | ---- | ---- | ---------- | ---------------- |
| db.t4g.micro  | 2    | 1 GB | $29.20     | < 10M requests   |
| db.t4g.small  | 2    | 2 GB | $58.40     | 10-25M requests  |
| db.t4g.medium | 2    | 4 GB | $116.80    | 25-50M requests  |
| db.t4g.large  | 2    | 8 GB | $233.60    | 50-100M requests |

---

## Summary

| Metric                      | Value  |
| --------------------------- | ------ |
| **Total Monthly Cost**      | ~$109  |
| **Cost per 1,000 Requests** | $0.022 |
| **Cost per Environment**    | ~$22   |
| **Database Cost (fixed)**   | $33.70 |
| **Variable Costs**          | ~$75   |

---

## Notes

1. **Costs are estimates** based on AWS pricing as of January 2026
2. **Free tier not included** - assumes free tier exhausted
3. **Data transfer** assumes moderate API response sizes (~5KB avg)
4. **CloudFront** pricing based on Europe/US edge locations
5. **Lambda** calculated at 512MB memory, 500ms average duration

---

_Generated: January 24, 2026_
