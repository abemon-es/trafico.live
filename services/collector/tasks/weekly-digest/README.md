# Weekly Digest Collector

Sends the weekly traffic newsletter to all confirmed `DigestSubscriber` records
every Monday at 09:00 CET.

## Architecture

```
compose.ts      — Orchestrates Prisma queries, builds DigestData object
queries.ts      — One query function per digest section (pure Prisma, no HTTP)
render.ts       — Produces inline-styled HTML + plain-text from DigestData
index.ts        — Entry point: fetches subscribers, sends emails via AWS SES
```

### Alternative React rendering path

`src/emails/weekly-digest.tsx` — React component that renders the same email.
Useful for previewing with `npx email dev` (React Email dev server).

## Registering in the dispatcher

**Do NOT edit `services/collector/index.ts` directly** — add to VALID_TASKS:

```typescript
// In services/collector/index.ts, add to VALID_TASKS array:
"weekly-digest",
```

And add a case in `getPostIngestionTriggers` if needed, or run standalone
via the cron entry below.

## Cron entry

Add to `services/collector/crontabs/daily`:

```cron
# Weekly digest — Monday 09:00 CET (08:00 UTC)
0 8 * * 1 TASK=weekly-digest npx tsx index.ts 2>&1
```

**CET = UTC+1 (winter) / UTC+2 (summer CEST).** The cron runs at 08:00 UTC
which maps to 09:00 CET in winter and 10:00 CEST in summer. Adjust the UTC
hour seasonally if strict 09:00 CET is required, or use `TZ=Europe/Madrid`
in the container environment.

## Docker service

Runs in the existing **`collector-daily`** container (`docker-compose.collectors.yml`).
No new container needed — the daily container already has 1536MB RAM and
`CRONTAB_TIER: daily`.

## Local preview

```bash
# Render HTML to stdout (no email sent)
cd services/collector
DATABASE_URL="..." TASK=weekly-digest npx tsx tasks/weekly-digest/index.ts --preview > /tmp/digest.html
open /tmp/digest.html
```

## Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection |
| `AWS_SES_ACCESS_KEY` | Yes | — | IAM key with `ses:SendEmail` |
| `AWS_SES_SECRET_KEY` | Yes | — | IAM secret |
| `AWS_SES_FROM_EMAIL` | No | `noticias@trafico.live` | Verified sender |
| `AWS_SES_FROM_NAME` | No | `trafico.live` | Display name |
| `AWS_SES_REGION` | No | `eu-west-1` | SES region |
| `NEXT_PUBLIC_BASE_URL` | No | `https://trafico.live` | Canonical URL for CTAs |

### Resend webhook (for event tracking)

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_WEBHOOK_SECRET` | Yes (webhook) | Signing secret from Resend dashboard |

Note: The project currently uses **AWS SES** for sending. The webhook handler
at `/api/newsletter/events` is Resend-compatible. If the email provider is
changed to Resend in the future, update `index.ts` to use the Resend SDK.
For SES event tracking, configure SES → SNS → this endpoint (adapting the
signature verification to SNS format).

## Proposed schema additions

Add to `prisma/schema.prisma` before running `npm run db:migrate`:

```prisma
// Email delivery events for newsletter open/click tracking
model DigestEmailEvent {
  id        String   @id @default(cuid())
  emailId   String   // Provider message ID (SES MessageId or Resend email_id)
  email     String   // Recipient address
  eventType String   // delivered | opened | clicked | bounced | complained
  metadata  Json?    // Event-specific: { link, bounceType, userAgent }
  createdAt DateTime @default(now())

  @@index([email])
  @@index([emailId])
  @@index([eventType, createdAt])
}
```

Until the migration runs, events are logged to stdout (safe fallback in route.ts).

## First-run checklist

1. `npm run db:migrate` to add `DigestEmailEvent` table
2. `DATABASE_URL="..." npx tsx tasks/weekly-digest/index.ts --preview > /tmp/digest.html`
3. Open `digest.html` in browser — verify layout on mobile + desktop
4. Send a test to own inbox:
   ```bash
   # Insert a test subscriber
   psql $DATABASE_URL -c "INSERT INTO \"DigestSubscriber\" (email, \"isActive\", \"confirmedAt\", \"unsubscribeToken\") VALUES ('test@example.com', true, now(), gen_random_uuid());"
   TASK=weekly-digest npx tsx index.ts
   ```
5. Check open/click tracking via Resend dashboard (or SES CloudWatch)
6. Verify unsubscribe link works end-to-end
7. Remove test subscriber
8. Enable production cron

## Ongoing KPIs

| Metric | Target |
|--------|--------|
| Open rate | > 35% |
| Click rate | > 8% |
| Bounce rate | < 2% |
| Complaint rate | < 0.1% |

Monitor weekly in the SES/Resend dashboard. Complaints above 0.08% trigger
provider warnings — the handler immediately unsubscribes complainants (LSSI compliance).

## A/B testing (future sprint)

Subject line variants can be added to `index.ts` by assigning alternating
subjects per subscriber ID hash. Track via `DigestEmailEvent` metadata.
Implementation spec deferred to a future sprint.
