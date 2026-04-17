# Weekly Digest — Operational Guide

Weekly email newsletter for trafico.live. Sent every Monday at 09:00 CET to all
confirmed subscribers with the week's traffic, fuel, weather, and rail highlights.

## Cron schedule

```
0 8 * * 1   TASK=weekly-digest npx tsx index.ts
```

- **Day:** Monday only (guarded in `index.ts`)
- **Time:** 08:00 UTC = 09:00 CET (winter) / 10:00 CEST (summer)
- **Container:** `collector-daily` (existing, no new container required)
- **File:** `services/collector/crontabs/daily` — append entry above

## Docker service allocation

Uses the existing **`collector-daily`** container defined in
`docker-compose.collectors.yml`. Specs:

```yaml
mem_limit: 1536m
cpus: 1.0
CRONTAB_TIER: daily
```

The digest send takes ~5–30s depending on subscriber count. No memory increase needed.

## Environment variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | Yes | — | PostgreSQL via PgBouncer |
| `AWS_SES_ACCESS_KEY` | Yes | — | IAM key with `ses:SendEmail` |
| `AWS_SES_SECRET_KEY` | Yes | — | IAM secret |
| `AWS_SES_FROM_EMAIL` | No | `noticias@trafico.live` | Must be SES-verified |
| `AWS_SES_FROM_NAME` | No | `trafico.live` | Email display name |
| `AWS_SES_REGION` | No | `eu-west-1` | SES region |
| `NEXT_PUBLIC_BASE_URL` | No | `https://trafico.live` | CTA link base |
| `RESEND_WEBHOOK_SECRET` | For webhooks | — | Resend signing secret (event tracking) |

## Implementation overview

```
services/collector/tasks/weekly-digest/
├── index.ts      Entry point — fetches subscribers, sends via SES, updates lastSentAt
├── compose.ts    Orchestrates all queries → DigestData object
├── queries.ts    One Prisma query per section (incidents, road, weather, fuel, rail, stations)
├── render.ts     Inline-styled HTML + plain-text renderer
└── README.md     Developer guide

src/emails/weekly-digest.tsx            React Email component (preview + alt rendering)
src/app/api/newsletter/events/route.ts  Resend webhook (open/click/bounce/complaint tracking)
```

## Data sections

| Section | Source model | Fallback if empty |
|---------|-------------|-------------------|
| Top 5 incidents | `TrafficIncident` | Section omitted |
| Hottest road | `TrafficIncident` grouped | Section omitted |
| Weather highlights | `WeatherAlert` | Section omitted |
| Fuel trend | `FuelPriceDailyStats` | Section omitted |
| Rail stats | `RailwayDailyStats` | Section omitted |
| Top Cercanías stations | `RenfeFleetPosition` | Section omitted |

All sections are optional — the email always sends even if all sections are empty.

## Rate limiting

- **Batch size:** 100 subscribers per batch
- **Between batches:** 1 second pause
- **SES rate limit:** 14 msg/s (default sandbox); production limit depends on account
- **Daily quota:** Check SES sending quota in AWS console (default: 200/day sandbox, 50K/day production)

## Deduplication

`index.ts` checks if any `DigestSubscriber.lastSentAt >= today 00:00 UTC` before
sending. Re-runs on the same Monday are safe and idempotent.

## Event tracking (webhook)

Endpoint: `POST /api/newsletter/events`

Handled events:
| Event | Action |
|-------|--------|
| `email.delivered` | Log to `DigestEmailEvent` |
| `email.opened` | Log |
| `email.clicked` | Log with link |
| `email.bounced` (hard) | Log + mark `isActive=false` |
| `email.complained` | Log + mark `isActive=false` immediately (LSSI) |

### Proposed schema addition

```prisma
model DigestEmailEvent {
  id        String   @id @default(cuid())
  emailId   String   // Provider message ID
  email     String
  eventType String   // delivered | opened | clicked | bounced | complained
  metadata  Json?    // { link, bounceType, userAgent }
  createdAt DateTime @default(now())

  @@index([email])
  @@index([emailId])
  @@index([eventType, createdAt])
}
```

Run `npm run db:migrate` after adding to schema.

## First-run checklist

- [ ] Add `DigestEmailEvent` model to `prisma/schema.prisma`
- [ ] Run `npm run db:migrate`
- [ ] Preview render: `TASK=weekly-digest npx tsx tasks/weekly-digest/index.ts --preview > /tmp/digest.html`
- [ ] Open `digest.html` in browser and on mobile — check layout
- [ ] Manual send to own inbox (insert test subscriber, run, verify email received)
- [ ] Confirm unsubscribe link redirects to `trafico.live?unsubscribed=true`
- [ ] Add cron entry to `services/collector/crontabs/daily`
- [ ] Add `weekly-digest` to `VALID_TASKS` in `services/collector/index.ts`
- [ ] Configure Resend webhook URL: `https://trafico.live/api/newsletter/events`
- [ ] Set `RESEND_WEBHOOK_SECRET` in environment
- [ ] Monitor first production send — check SES dashboard for bounces

## KPIs and targets

| Metric | Target | Alert threshold |
|--------|--------|----------------|
| Open rate | > 35% | < 20% for 3 consecutive weeks |
| Click rate | > 8% | < 4% |
| Bounce rate | < 2% | > 5% |
| Complaint rate | < 0.1% | > 0.08% (SES warning zone) |

## A/B testing (future sprint)

Planned: subject line variants based on subscriber ID hash (even/odd split).
Track via `DigestEmailEvent.metadata` field.

## Compliance (LSSI-SM / GDPR)

- Double opt-in: subscribers must confirm via `/api/digest/confirm`
- Every email contains a personalized unsubscribe link (`/api/digest/unsubscribe?token=...`)
- Complaints immediately set `isActive=false` (no 24h delay)
- Hard bounces automatically unsubscribe (`isActive=false`)
- `DigestSubscriber.lastSentAt` tracks last successful send
