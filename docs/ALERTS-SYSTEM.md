# Alerts System — Architecture & Privacy

> Status: S4 scaffold. API routes and UI complete. Push VAPID keys and Resend/Telegram dispatch pending.

## Overview

trafico.live Alerts lets authenticated users subscribe to real-time or digest notifications for:

| Type   | Target format             | Examples                        |
|--------|---------------------------|---------------------------------|
| ROAD   | `road:<code>`             | `road:A-6`, `road:AP-7`         |
| TRAIN  | `train:<route-slug>`      | `train:cercanias-c1-madrid`     |
| FLIGHT | `flight:<IATA-code>`      | `flight:IB6250`                 |

---

## Data Models

### UserAlert

Stores per-user alert definitions. Indexed on `(userId, status)` and `(type, targetKey, status)` for the matching engine.

Key fields:
- `targetKey` — machine-readable key used by the matching engine (e.g. `road:A-6`)
- `targetLabel` — human-readable label shown in the UI
- `channels` — array: `PUSH`, `EMAIL`, `TELEGRAM`
- `frequency` — `REAL_TIME` | `DAILY` | `WEEKLY`
- `status` — `ACTIVE` | `PAUSED` | `DELETED` (soft delete)

### PushSubscription

One row per browser/device. Stores VAPID subscription object fields for Web Push dispatch.

Upserted on endpoint (each device has a unique push endpoint). Multiple rows per user (one per device).

---

## Tier Limits

| Tier      | Active alert limit |
|-----------|--------------------|
| FREE      | 5                  |
| PRO       | Unlimited          |
| ENTERPRISE| Unlimited          |

Limit enforced in `POST /api/alerts` before inserting.

---

## Matching Engine (S4)

A cron worker (or Celery task) runs on a cadence matching each alert's `frequency`:

1. **REAL_TIME** — triggered by collector events (incident upsert, delay snapshot, flight status change). Direct fan-out to matching UserAlerts.
2. **DAILY** — scheduled at 06:00 local. Aggregates all events since last trigger per user and sends a digest.
3. **WEEKLY** — scheduled Monday 07:00. Same as daily but 7-day window.

### Road matching

- Incidents in `TrafficIncident` table are matched by road code from `road_id` or `description` field.
- `targetKey` format: `road:<DGT-code>` (e.g. `road:A-6`). Optional km range: `road:A-6:km50-90`.
- Match query: `WHERE road_id ILIKE $1 OR description ILIKE $1` with partial index on road code.

### Train matching

- Source: `RailwayAlert` table (GTFS-RT) and `RailwayDailyStats` (delay snapshots).
- `targetKey` format: `train:<brand>:<origin>-<dest>` or `train:cercanias-<network>`.
- Match: join on `RailwayRoute` where `brand ILIKE` or `originCity/destCity` contains slug.

### Flight matching

- Source: `AircraftPosition` (OpenSky) or future Flightradar integration.
- `targetKey` format: `flight:<IATA>` (e.g. `flight:IB6250`).
- Match: `WHERE callsign ILIKE $1` in `AircraftPosition`.

---

## Delivery Channels

### Web Push

Uses the Web Push Protocol with VAPID keys.

Setup:
1. Generate VAPID key pair: `npx web-push generate-vapid-keys`
2. Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` env vars.
3. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (public key exposed to client).

Library: `web-push` npm package (server-side dispatch).

Dispatch snippet (S4):
```ts
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:alertas@trafico.live",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

await webpush.sendNotification(subscription, JSON.stringify({
  title: "Incidencia en A-6",
  body: "Retención de 8 km en el pk 42, sentido Madrid.",
  url: "/incidencias/abc123",
}));
```

**HTTPS requirement:** Push subscriptions only work over HTTPS. On localhost without a dev certificate, `registerPushSubscription` will fail silently. Test on staging (HTTPS) first.

### Email (Resend)

Uses Resend transactional email.

- Template: `services/email/templates/alert-digest.tsx` (to be created in S4).
- Trigger: matching engine calls `Resend.emails.send()` with per-user digest.
- Rate limit: 1 email per alert per hour minimum (prevents spam on REAL_TIME mode).

### Telegram (S4)

Optional. User must link their Telegram user ID to their trafico.live account.

- Bot: `@traficoLiveBot` (to be created in S4).
- Flow: user clicks "Vincular Telegram" → deep link to bot → bot receives `/start <token>` → stores `telegramUserId` on user record.
- Dispatch: `Telegram Bot API sendMessage` to stored `telegramUserId`.

---

## Privacy

trafico.live treats alert configuration as private user data:

- **Isolation:** All API queries filter by `userId`. No alert data is accessible cross-user.
- **No third-party sharing:** Alert definitions (road codes, train lines, flight codes) are never shared with analytics providers, advertising networks, or affiliates.
- **Right to export:** Users can request a JSON export of their alerts via the account page (S4).
- **Right to deletion:** `DELETE /api/alerts/[id]` performs a soft delete (status = DELETED). Hard delete of all user data is handled by the account deletion flow.
- **Push subscription data:** Stored only in `PushSubscription` table. Endpoint + keys are used solely for Web Push dispatch and never shared.
- **Consent:** Push permission is requested once via `PushPermissionPrompt`. Declined state is remembered in `localStorage` key `tl:push-prompt-dismissed`. No re-prompting.
- **Telegram:** Opt-in only. User must actively link their Telegram account.

---

## API Reference

| Method   | Endpoint                          | Description                        |
|----------|-----------------------------------|------------------------------------|
| GET      | `/api/alerts`                     | List user's alerts (paginated)     |
| POST     | `/api/alerts`                     | Create alert                       |
| GET      | `/api/alerts/[id]`                | Get alert detail                   |
| PATCH    | `/api/alerts/[id]`                | Update alert (label/channels/freq/status) |
| DELETE   | `/api/alerts/[id]`                | Soft-delete alert                  |
| POST     | `/api/alerts/push-subscription`   | Register/update push subscription  |
| DELETE   | `/api/alerts/push-subscription`   | Unregister push subscription       |

Authentication: same-origin cookie session (B1) or `x-api-key` header (external).

---

## Environment Variables Required

| Variable                        | Purpose                                 |
|---------------------------------|-----------------------------------------|
| `VAPID_PUBLIC_KEY`              | VAPID public key (server push dispatch) |
| `VAPID_PRIVATE_KEY`             | VAPID private key (server push dispatch)|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`  | VAPID public key (client subscription)  |
| `RESEND_API_KEY`                | Resend email dispatch                   |
| `TELEGRAM_BOT_TOKEN`            | Telegram bot dispatch (S4)              |
