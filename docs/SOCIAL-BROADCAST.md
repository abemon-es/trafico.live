# Social Broadcast — Setup & Operations Guide

Auto-posting of extreme AEMET weather alerts and high-severity DGT traffic incidents to Bluesky, X (Twitter), and a Telegram public channel.

## Architecture

```
CRON (*/5 * * * *)
  └─ TASK=social-broadcast (services/collector/tasks/social-broadcast/index.ts)
       ├─ Query WeatherAlert (severity VERY_HIGH/HIGH, last 10 min, isActive)
       ├─ Query TrafficIncident (severity VERY_HIGH/HIGH, last 10 min, top 2)
       └─ For each event:
            ├─ composeWeatherAlert() / composeTrafficIncident()  → per-platform text
            └─ broadcast()  →  parallel dispatch to Bluesky + X + Telegram
                 └─ Redis SET NX dedup (24h TTL per event)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BLUESKY_HANDLE` | Bluesky | Account handle, e.g. `trafico.live` or `traficolive.bsky.social` |
| `BLUESKY_APP_PASSWORD` | Bluesky | App password from Settings > Privacy > App Passwords |
| `X_API_KEY` | X posting | Consumer Key from X Developer Portal |
| `X_API_SECRET` | X posting | Consumer Secret from X Developer Portal |
| `X_ACCESS_TOKEN` | X posting | Access Token (user context) from X Developer Portal |
| `X_ACCESS_TOKEN_SECRET` | X posting | Access Token Secret (user context) from X Developer Portal |
| `X_API_BEARER_TOKEN` | X read-only | App-only Bearer Token (not used for posting — see note below) |
| `TELEGRAM_BOT_TOKEN` | Telegram | Bot token from @BotFather |
| `TELEGRAM_CHANNEL` | Telegram | Channel username or numeric ID, e.g. `@TraficoLiveES` or `-1001234567890` |
| `REDIS_URL` | Dedup | Redis connection string (dedup disabled if missing, with warning) |

Any platform with missing credentials is skipped with a warning. The others proceed independently.

## Platform Setup

### Bluesky

1. Create an account at https://bsky.social (or custom domain handle)
2. Recommended handle: `@trafico.live` (requires DNS TXT record) or `@traficolive.bsky.social`
3. Go to **Settings > Privacy and security > App passwords**
4. Create a new app password named `social-broadcast`
5. Set `BLUESKY_HANDLE=traficolive.bsky.social` and `BLUESKY_APP_PASSWORD=<the-password>`

**Package required:**
```bash
npm install @atproto/api
```

The library is dynamically imported in `src/lib/bluesky.ts` — the collector will log an error and skip Bluesky if the package is not installed.

### X (Twitter)

X requires a **paid developer account** to post tweets via API:

- **Basic tier** ($100/month): write access to tweets, required for posting
- Free tier: read-only, cannot post

Setup:
1. Apply at https://developer.x.com → Projects & Apps → Create App
2. Under **User authentication settings**: enable OAuth 1.0a, set callback URL (e.g. `https://trafico.live`)
3. Generate **Access Token** and **Access Token Secret** (for the posting account)
4. Set all four env vars: `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`

**No extra npm package required** — uses Node.js built-in `crypto` for HMAC-SHA1 signing and native `fetch`.

Note: `X_API_BEARER_TOKEN` alone is app-only auth (read-only). Setting only the bearer token will cause the poster to skip with a warning.

### Telegram

1. Open Telegram and start a chat with [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow prompts → receive `TELEGRAM_BOT_TOKEN`
3. Create a public channel (e.g. `@TraficoLiveES`)
4. Add the bot as **Administrator** with "Post messages" permission
5. Set `TELEGRAM_BOT_TOKEN=<token>` and `TELEGRAM_CHANNEL=@TraficoLiveES`

The existing `src/lib/telegram.ts` (from C5) handles the API calls. No additional packages required.

## Deduplication Strategy

Each event gets a Redis key `social:bc:<eventId>` set with `SET NX EX 86400` (24h TTL).

- Weather: `social:bc:AEMET-<alertId>-<area>`
- Incident: `social:bc:incident:<situationId>`

`SET NX` is atomic — only the first process to run wins. Subsequent runs within 24h skip the event silently.

If Redis is unavailable, dedup is disabled and events are broadcast on every run matching the lookback window. To avoid duplicate spam in this scenario, the responsible operator should monitor the `[social-broadcast] Redis unavailable` log line.

### Proposed Schema Addition (T3.6)

To make dedup DB-backed (Redis-independent), propose adding to `WeatherAlert`:

```prisma
socialBroadcastAt DateTime? // Set when first broadcast; null = not yet sent
```

And to `TrafficIncident`:

```prisma
socialBroadcastAt DateTime? // Set when first broadcast
```

This allows the query to use `WHERE socialBroadcastAt IS NULL` instead of Redis NX, and persists broadcast history across Redis restarts.

## Rate Limits

| Platform | Limit | Our behaviour |
|----------|-------|---------------|
| Bluesky | ~300 posts/hour per account | Retry with exponential backoff on 429 |
| X Basic | 1,500 tweets/month | Retry up to 2×, honour `x-rate-limit-reset` |
| Telegram | 30 messages/second to a channel | Single send per event; no burst issue at 5-min cron |

Expected throughput: at most a handful of alerts per day in Spain. Rate limits are not a practical concern at this volume.

## Content Policy

- **Spanish only** — all messages in Spanish
- **Informational only** — never promotional, never affiliate links (LSSI separation)
- **Attribution** — weather alerts attributed to AEMET; traffic incidents attributed to DGT
- **No misleading urgency** — use precise severity levels (AVISO ROJO / NARANJA) matching AEMET's official classification
- **No emoji** — project convention; severity expressed as text labels

## First Test-Post Plan

1. Verify all env vars are set in `.env.local`
2. Create a test WeatherAlert in the DB with `severity='VERY_HIGH'` and `fetchedAt=now()`
3. Run locally:
   ```bash
   TASK=social-broadcast npx tsx services/collector/index.ts
   ```
4. Check output for `sent: [bluesky, x, telegram]` lines
5. Verify posts appear in each channel
6. Confirm Redis key exists: `redis-cli GET social:bc:<alertId>`
7. Run again — confirm all events log as `already broadcast, skipped`
8. Delete Redis key and run again — confirms retry path works

## Monitoring

Log lines to watch in Loki:

```logql
{container="trafico-social-broadcast"} |= "error"
{container="trafico-social-broadcast"} |= "Redis unavailable"
{container="trafico-social-broadcast"} |= "Finished in"
```

Alert rule: if `error` count > 3 in a 15-min window, page on-call.
