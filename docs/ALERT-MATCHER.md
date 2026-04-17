# Alert Matcher — Architecture & Operations

Worker that runs every 5 minutes, cross-references active `UserAlert` rows
against new events (TrafficIncident, RailwayAlert, AircraftPosition), and fires
notifications via Web Push, SES email, and optional Telegram.

---

## 1. Cron Registration

Add to `services/collector/crontabs/realtime`:

```
# User alert matcher — cross-references UserAlert with new events (every 5 min)
*/5 * * * * TASK=alert-matcher npx tsx index.ts 2>&1
```

Add to `VALID_TASKS` array in `services/collector/index.ts`:

```ts
// Real-time (every 2-5 min)
"v16", "incident", "panel", "detector", "intensity",
"alert-matcher",   // ← add this line
```

---

## 2. Architecture

```
cron (*/5)
  └─ TASK=alert-matcher
       └─ services/collector/tasks/alert-matcher/index.ts (run)
            ├─ Load UserAlert WHERE status=ACTIVE
            ├─ Compute query window (since = min(lastTriggeredAt) - 10min fallback)
            │
            ├─ [parallel]
            │   ├─ matchRoadAlerts  → TrafficIncident (isActive, roadNumber IN [...], firstSeenAt >= since)
            │   ├─ matchTrainAlerts → RailwayAlert + RenfeFleetPosition (delay >= 10min)
            │   └─ matchFlightAlerts → AircraftPosition (callsign IN [...], onGround=false)
            │
            ├─ For each MatchResult:
            │   ├─ REAL_TIME → notify(prisma, alert, match) → Promise.allSettled(channels)
            │   └─ DAILY/WEEKLY → lpush Redis key (flush job TBD)
            │
            └─ updateMany lastTriggeredAt for notified alerts
```

---

## 3. Matching Rules

### ROAD — `road:<code>[:km<start>-<end>]`

| Field | Description |
|-------|-------------|
| `road` | Road code, e.g. `A-2`, `N-630`, `AP-7` — uppercase, exact match |
| `kmStart` | Optional lower km bound (inclusive) |
| `kmEnd` | Optional upper km bound (inclusive) |

Matching:
- `TrafficIncident.roadNumber` must match (case-insensitive, normalized)
- If km range specified, `TrafficIncident.kmPoint` must fall within it
- Incident must be `isActive=true`
- `firstSeenAt >= since` (bounded query, not full table scan)

Examples:
- `road:A-2` — any incident on A-2
- `road:N-630:km80-100` — incidents on N-630 between km 80 and 100
- `road:AP-7:km200-250` — incidents on AP-7 between km 200 and 250

### TRAIN — `train:<brand>[:<origin>[-<dest>]]`

| Field | Description |
|-------|-------------|
| `brand` | Lowercased brand slug, e.g. `ave`, `cercanias`, `alvia`, `iryo` |
| `origin` | Lowercased origin station slug (optional) |
| `dest` | Lowercased destination station slug (optional) |

Matching (two event sources):

**Source 1 — RailwayAlert** (`isActive=true`, `firstSeenAt >= since`):
- Brand matched via `serviceType` normalization or `routeIds` string matching
- If origin specified, checked against alert description + routeIds (loose match)

**Source 2 — RenfeFleetPosition** (delay ≥ 10 min, `fetchedAt >= since`):
- `brand` matched against `RenfeFleetPosition.brand` (normalized)
- `origin`/`dest` checked against `originStation`/`destStation` (slug substring)

Examples:
- `train:ave` — any AVE service disruption or significant delay
- `train:cercanias:madrid` — Cercanías Madrid disruptions
- `train:iryo:madrid-barcelona` — Iryo Madrid→Barcelona delays

### FLIGHT — `flight:<callsign>`

| Field | Description |
|-------|-------------|
| `callsign` | IATA flight code / ICAO callsign, uppercase, e.g. `IB6250`, `VY1234` |

Matching:
- `AircraftPosition.callsign` must match (case-insensitive, trimmed)
- `onGround=false` (airborne only)
- `createdAt >= since`

Note: OpenSky data is ingested every 15 minutes (`TASK=opensky`). Matches appear
within one OpenSky polling cycle of the alert-matcher run.

---

## 4. Notification Channels

### PUSH (Web Push / VAPID)

- Package: `web-push` (not yet installed — see install section below)
- Reads `PushSubscription` rows for the user (T3.6 schema)
- HTTP 410 Gone → marks subscription as `isActive=false`
- Payload: title, body, URL, icon (192px), badge (72px), tag (dedup)

### EMAIL (Amazon SES)

- Uses existing `src/lib/email/ses.ts` (AWS SESv2)
- Reads `User.email` from DB
- Spanish-language HTML email with brand styling (tl-amber-600 CTA)
- Unsubscribe link: `${BASE_URL}/alertas?action=unsubscribe&alertId=<id>`

### TELEGRAM (optional)

- Uses `src/lib/telegram.ts` (plain fetch, no extra package)
- Reads `User.telegramId` from DB (T3.6 must add this field)
- HTML-formatted message with emoji + deep link
- Requires user to start bot first (to link their Telegram account)

---

## 5. Required Env Vars

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL via PgBouncer |
| `REDIS_URL` | Recommended | DAILY/WEEKLY accumulation; graceful degradation without it |
| `VAPID_PUBLIC_KEY` | For PUSH | VAPID public key (base64url) |
| `VAPID_PRIVATE_KEY` | For PUSH | VAPID private key (base64url) |
| `VAPID_SUBJECT` | For PUSH | Sender identity, e.g. `mailto:noticias@trafico.live` |
| `AWS_SES_REGION` | For EMAIL | e.g. `eu-west-1` |
| `AWS_SES_ACCESS_KEY` | For EMAIL | IAM access key with `ses:SendEmail` |
| `AWS_SES_SECRET_KEY` | For EMAIL | IAM secret key |
| `AWS_SES_FROM_EMAIL` | For EMAIL | Verified sender address |
| `TELEGRAM_BOT_TOKEN` | For TELEGRAM | Bot token from @BotFather |
| `TELEGRAM_CHANNEL` | Optional | Channel for broadcast messages |
| `NEXT_PUBLIC_BASE_URL` | Recommended | Canonical URL for deep links (default: `https://trafico.live`) |

Generate VAPID keys (one-time):

```bash
npx web-push generate-vapid-keys
```

---

## 6. Install Requirements

The `web-push` package is not yet installed. Add to both package files:

**`package.json` (root — for Next.js API routes if needed):**

```bash
npm install web-push
npm install --save-dev @types/web-push
```

**`services/collector/package.json` (collector worker):**

```json
{
  "dependencies": {
    "web-push": "^3.6.7"
  },
  "devDependencies": {
    "@types/web-push": "^3.6.4"
  }
}
```

All other dependencies (`ioredis`, `@aws-sdk/client-sesv2`, `@prisma/client`) are
already present in the respective `package.json` files.

---

## 7. T3.6 Schema Proposals

### UserAlert model (if not yet added by B9)

```prisma
model UserAlert {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  type            AlertType
  targetKey       String        // "road:A-2:km80-100" | "train:ave:madrid-malaga" | "flight:IB6250"
  frequency       AlertFrequency @default(REAL_TIME)
  status          AlertStatus   @default(ACTIVE)
  channels        AlertChannel[]
  lastTriggeredAt DateTime?     @db.Timestamptz
  createdAt       DateTime      @default(now()) @db.Timestamptz
  updatedAt       DateTime      @updatedAt @db.Timestamptz

  @@index([status])
  @@index([userId, status])
  @@index([type, status])
}

enum AlertType {
  ROAD
  TRAIN
  FLIGHT
}

enum AlertFrequency {
  REAL_TIME
  DAILY
  WEEKLY
}

enum AlertStatus {
  ACTIVE
  PAUSED
  DELETED
}

enum AlertChannel {
  PUSH
  EMAIL
  TELEGRAM
}
```

### PushSubscription model

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @unique
  p256dh    String   // Base64url-encoded P-256 DH public key
  auth      String   // Base64url-encoded auth secret
  isActive  Boolean  @default(true) // Set to false on HTTP 410 Gone
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  @@index([userId, isActive])
}
```

### User model additions

```prisma
model User {
  // ... existing fields ...
  telegramId       String?   // Telegram chat ID (set when user links account via bot)
  telegramLinkedAt DateTime? @db.Timestamptz
  alerts           UserAlert[]
  pushSubscriptions PushSubscription[]
}
```

### AlertAccumulation model (for DAILY/WEEKLY flush)

For a production-ready DAILY/WEEKLY flush, consider a proper DB accumulation table
instead of Redis (more durable, queryable):

```prisma
model AlertAccumulation {
  id          String   @id @default(cuid())
  alertId     String
  alert       UserAlert @relation(fields: [alertId], references: [id], onDelete: Cascade)
  matchedAt   DateTime @db.Timestamptz
  type        AlertType
  title       String
  body        String   @db.Text
  url         String
  eventRef    String
  flushedAt   DateTime? @db.Timestamptz // null = pending flush
  createdAt   DateTime @default(now()) @db.Timestamptz

  @@index([alertId, flushedAt])
  @@index([flushedAt])
}
```

Flush query: `WHERE flushedAt IS NULL AND createdAt < now() - interval '23h'`
(run daily at 08:00 or 18:00 via a separate `TASK=alert-flush` collector entry).

---

## 8. Edge Cases

| Case | Behaviour |
|------|-----------|
| Alert `status=PAUSED` | Excluded from query (`WHERE status=ACTIVE`) |
| Alert `status=DELETED` | Excluded from query |
| User has no push subscriptions | PUSH channel skipped silently, logged |
| Push subscription 410 Gone | Marked `isActive=false`, other subs still attempted |
| User has no `telegramId` | TELEGRAM channel skipped silently, logged |
| SES not configured | EMAIL channel skipped with warning |
| VAPID keys missing | PUSH channel skipped with warning |
| Redis unavailable | DAILY/WEEKLY falls back to immediate notification |
| Extended downtime (>24h) | Lookback capped at 24h to prevent full table scan |
| Match already sent this period | `shouldFireNow()` returns false → skipped |
| Partial channel failure | `Promise.allSettled` — other channels continue |
| Matcher throws | Caught per-matcher, logged, run continues with other types |

---

## 9. Observability

All runs emit structured console logs picked up by the Loki Docker log driver:

```
[alert-matcher] Starting alert matcher run at 2026-04-17T10:00:00.000Z
[alert-matcher] Loaded 42 active alert(s)
[alert-matcher] Query window: since 2026-04-17T09:50:00.000Z
[alert-matcher] Alert breakdown: ROAD=20 TRAIN=15 FLIGHT=7
[alert-matcher] Matches found: 3 total (ROAD=2 TRAIN=1 FLIGHT=0)
[alert-matcher] Updated lastTriggeredAt for 3 alert(s)
[alert-matcher] Done in 1.2s — alerts=42 matches=3 notified=3 accumulated=0 errors=0
```

GlitchTip captures exceptions via Sentry (initialized in `services/collector/index.ts`).

---

## 10. PR Proposal for `services/collector/index.ts`

Diff to add `alert-matcher` to the dispatcher:

```diff
 const VALID_TASKS = [
   // Real-time (every 2-5 min)
-  "v16", "incident", "panel", "detector", "intensity",
+  "v16", "incident", "panel", "detector", "intensity", "alert-matcher",
   // ...
 ];
```

No other changes needed — the dispatcher auto-imports `./tasks/${TASK}/collector.js`
which re-exports `run` from `index.ts`.
