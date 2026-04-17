# Monthly Report Generator

Generates a monthly PDF report of traffic, weather, fuel, rail, maritime, and aviation
data for Spain and uploads it to Cloudflare R2.

## Schedule

Cron: `0 3 1 * *` — runs at 03:00 CET on the 1st of each month.

Targets the **previous** calendar month automatically.

## Output

- **PDF**: `monthly/YYYY-MM.pdf` in R2 bucket `trafico-reports`
- **Public URL**: `https://reports.trafico.live/monthly/YYYY-MM.pdf`
- **Article**: Prisma `Article` row with `category=MONTHLY_REPORT`, `slug=estado-trafico-YYYY-MM`

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection (via PgBouncer) |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET` | Bucket name (default: `trafico-reports`) |
| `R2_PUBLIC_BASE_URL` | Public URL prefix (default: `https://reports.trafico.live`) |

## Docker Container

Add to `docker-compose.collectors.yml`:

```yaml
report-monthly:
  image: trafico-collector
  environment:
    TASK: monthly-report
    R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
    R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
    R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
    R2_BUCKET: trafico-reports
    R2_PUBLIC_BASE_URL: https://reports.trafico.live
  mem_limit: 512m
  restart: "no"
```

Crontab entry (`services/collector/crontabs/monthly`):
```
0 3 1 * * TASK=monthly-report node dist/collector/index.js >> /var/log/monthly-report.log 2>&1
```

## Dependencies (not in root package.json)

```bash
npm install @react-pdf/renderer @aws-sdk/client-s3
```

`@react-pdf/renderer` requires Node 18+ and may need `--openssl-legacy-provider`
on some environments. It should be installed in the collector image.

## Publishing Flow

```
generate data (Prisma)
  → render PDF (@react-pdf/renderer)
    → upload to R2 (3 retries, non-blocking on failure)
      → create Article row (MONTHLY_REPORT)
        → [optional] trigger newsletter highlight
```

## Manual Run

```bash
DATABASE_URL="..." R2_ACCOUNT_ID="..." ... TASK=monthly-report npx ts-node services/collector/tasks/monthly-report/index.ts
```
