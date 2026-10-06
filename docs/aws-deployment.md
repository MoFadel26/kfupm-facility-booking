# AWS deployment progress

Deploying the API (no frontend) to AWS in us-east-1 on a budget of about $0, and under
$5/month. The account has no Free Tier, so the EC2 instance is stopped when not in use.

## Architecture

```
Mac / GitHub Actions --push image--> ECR
                                      |
visitors --HTTPS--> CloudFront --HTTP:80--> EC2 t3.micro (Docker Compose)
                    (GET/HEAD/OPTIONS)        |- api   (from ECR)
                                              |- db    (postgres:17-alpine)
                                              |
                     SSM Parameter Store -----+  settings and secrets
                     CloudWatch Logs     <----+  api logs
```

## Done

1. **Budgets**: `zero-spend-alert` and `monthly-cost-5usd`.
2. **Account access**: root has MFA. Day-to-day user is the IAM user `fadel-admin` (MFA, no
   access keys). CLI login: `aws login --profile rm-admin`.
3. **ECR**: repository `resourcemanager-api`, immutable tags, scan on push for all
   repositories, lifecycle rule keeping the last 3 images. Images pushed: `10db2ab`, `5e4f4a3`.
4. **SSM Parameter Store** (Standard tier):
   - `/resourcemanager/db-password` (SecureString)
   - `/resourcemanager/db-connection-string` (SecureString, `Host=db;Port=5432;Database=resourcemanager;Username=resourcemanager;Password=...`)
   - `/resourcemanager/cors-origin` (String, `http://localhost:5173`; the API refuses to start in Production without it)
5. **IAM role and firewall**:
   - Role `resourcemanager-ec2-role`: `AmazonSSMManagedInstanceCore`,
     `AmazonEC2ContainerRegistryPullOnly`, and inline policy `resourcemanager-app-access`
     (read `parameter/resourcemanager/*`, write to log group `/resourcemanager/api`).
   - Security group `resourcemanager-sg`: inbound HTTP 80 only from the CloudFront prefix
     list `com.amazonaws.global.cloudfront.origin-facing`. No SSH.
6. **Server**:
   - CloudWatch log group `/resourcemanager/api`, 1-week retention.
   - Config flags `Database:SeedSampleData` and `ApiDocs:Enabled` (commit `5e4f4a3`).
   - EC2 `resourcemanager-api`: Amazon Linux 2023, t3.micro, 8 GiB gp3, CPU credits
     Standard, no key pair, connect through Session Manager.
   - Docker and the Compose plugin installed. `/opt/resourcemanager/.env` built from SSM
     (root-only), `/opt/resourcemanager/compose.yaml` runs `db` and `api` (port 80 to 8080,
     api logs to CloudWatch).
   - Verified: `/health/ready` returns `Healthy`, logs appear in CloudWatch.

## In progress

7. **CloudFront**: blocked. Creating the distribution failed with "Your account must be
   verified before you can add new CloudFront resources". A case is open with AWS Support.
   Once verified, create it again with:
   - Plan: Free. Origin type: Other, origin domain: the instance's current Public IPv4 DNS,
     protocol HTTP only, port 80.
   - Viewer protocol: Redirect HTTP to HTTPS. Allowed methods: GET, HEAD, OPTIONS.
   - Cache policy: CachingDisabled. Origin request policy: AllViewer.
   - Security protections on, monitor mode off, rate limiting on.

## Not started

8. **GitHub Actions deploy** with OIDC (no stored AWS keys): build, push to ECR, update the
   server.
9. **Shutdown runbook**, resume bullet, and README deployment section.

## Things to know

- The instance has no Elastic IP, so its public DNS changes on every stop and start. Update
  the CloudFront origin after each start.
- Running cost is about $0.015/hour (instance and public IPv4). Stopped, it is about
  $0.70/month (disk and ECR storage).
- The ECR login on the server lasts 12 hours. Run `aws ecr get-login-password ... | sudo
  docker login ...` again before pulling a new image.
- Harmless log lines at startup: missing `libgssapi_krb5.so.2`, a failed query on
  `__EFMigrationsHistory` on the first run, and "Failed to determine the https port for
  redirect".
