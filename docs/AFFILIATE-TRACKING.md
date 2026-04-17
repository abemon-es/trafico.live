# Affiliate Tracking — /ir Redirect Infrastructure

**Owner:** T4 (monetization lane)
**Status:** Shipped (T4.8)
**Related:** `docs/ROADMAP-ROUTING-AFFILIATE.md`

---

## Architecture

```
Browser                 trafico.live server          Partner site
  │                          │                            │
  │  GET /ir/trainline/       │                            │
  │    ave-madrid-barcelona   │                            │
  │──────────────────────────>│                            │
  │                          │─ resolveOffer() ──────────>│ (DB or static)
  │                          │<─ { deepLink, priceEur }   │
  │                          │                            │
  │                          │─ generateSubId()           │
  │                          │─ read/set tl_session cookie│
  │                          │                            │
  │                          │─ recordClick()   ──> AffiliateClick (fire-and-forget)
  │                          │─ sendEvent()     ──> GA4 Measurement Protocol (fire-and-forget)
  │                          │                            │
  │  302 → deepLink?subid=X  │                            │
  │<─────────────────────────│                            │
  │                          │                            │
  │──────────────────────────────────────────────────────>│
  │                    (user books)                        │
  │                          │                            │
  │               postback callback                       │
  │                    POST /api/admin/affiliates/convert  │
  │                          │<───────────────────────────│
  │                          │─ verify HMAC ──────────────│
  │                          │─ update AffiliateClick     │
  │                          │  converted=true, amount    │
  │                    200 OK│                            │
  │                          │───────────────────────────>│
```

Key invariant: **the 302 redirect is never blocked** by tracking ops — both DB insert and GA4 MP call are fire-and-forget via `.catch()`.

---

## Per-Partner subId Param Conventions

| Partner       | Network   | subId param | Example                                      |
|---------------|-----------|-------------|----------------------------------------------|
| Skyscanner    | Impact    | `adref`     | `...&adref=a1b2c3d4e5f6g7h8`                |
| Trainline     | Direct    | `subid`     | `...&subid=a1b2c3d4e5f6g7h8`                |
| DirectFerries | Direct    | `subid`     | `...&subid=a1b2c3d4e5f6g7h8`                |
| FlixBus       | Direct    | `sub1`      | `...&sub1=a1b2c3d4e5f6g7h8`                 |
| Awin          | Awin      | `clickref`  | `...&clickref=a1b2c3d4e5f6g7h8`             |
| Rakuten       | Rakuten   | `u1`        | `...&u1=a1b2c3d4e5f6g7h8`                   |

The subId is a 16-char hex string (8 random bytes). It is stored in `AffiliateClick.subId` and passed back in postback callbacks for reconciliation.

---

## Postback URLs — Configure in Partner Dashboards

Replace `{SUBDOMAIN}` with `trafico.live`.

### Awin
```
https://trafico.live/api/admin/affiliates/convert
Method: POST
Body: {"subId":"{clickref}","amount":"{commission}","currency":"{currency}","transactionId":"{transaction}","partner":"awin"}
Header: X-Postback-Signature: sha256={hmac_signature}
Secret env: AWIN_POSTBACK_SECRET
```

### Impact / Skyscanner
```
https://trafico.live/api/admin/affiliates/convert
Method: POST
Body: {"subId":"{adref}","amount":"{payout_amount}","currency":"{payout_currency}","transactionId":"{order_id}","partner":"skyscanner"}
Header: X-Postback-Signature: sha256={impact_hmac}
Secret env: IMPACT_POSTBACK_SECRET
```

### Trainline (direct partner)
```
https://trafico.live/api/admin/affiliates/convert
Method: POST
Body: {"subId":"{subid}","amount":"{commission}","currency":"EUR","transactionId":"{booking_ref}","partner":"trainline"}
Header: X-Postback-Signature: sha256={hmac}
Secret env: TRAINLINE_POSTBACK_SECRET
```

### DirectFerries
```
https://trafico.live/api/admin/affiliates/convert
Method: POST
Body: {"subId":"{subid}","amount":"{commission}","currency":"EUR","transactionId":"{booking_id}","partner":"directferries"}
Header: X-Postback-Signature: sha256={hmac}
Secret env: DIRECTFERRIES_POSTBACK_SECRET
```

### FlixBus
```
https://trafico.live/api/admin/affiliates/convert
Method: POST
Body: {"subId":"{sub1}","amount":"{commission}","currency":"EUR","transactionId":"{order_id}","partner":"flixbus"}
Header: X-Postback-Signature: sha256={hmac}
Secret env: FLIXBUS_POSTBACK_SECRET
```

### Rakuten
```
https://trafico.live/api/admin/affiliates/convert
Method: POST
Body: {"subId":"{u1}","amount":"{commission}","currency":"{currency}","transactionId":"{order_id}","partner":"rakuten"}
Header: X-Postback-Signature: sha256={hmac}
Secret env: RAKUTEN_POSTBACK_SECRET
```

**HMAC signature:** SHA-256 of the raw JSON request body, signed with the shared secret. Header format: `sha256=<hex>`.

---

## GA4 Measurement Protocol Setup

### 1. Get your API Secret

GA4 > Admin > Data Streams > your web stream > Measurement Protocol API secrets > Create.

### 2. Set env vars

```bash
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=your_mp_api_secret_here
```

### 3. Verify events arrive

Use GA4 > DebugView (or `?measurement_id=G-XX&debug_mode=1` on the MP endpoint) to confirm `affiliate_click` events arrive.

### 4. Event schema — affiliate_click

| Parameter   | Type    | Notes                                  |
|-------------|---------|----------------------------------------|
| `partner`   | string  | e.g. "trainline"                       |
| `slug`      | string  | e.g. "ave-madrid-barcelona"            |
| `product`   | string  | Human label from AffiliateOffer        |
| `value`     | number  | Price in EUR (if known)                |
| `currency`  | string  | "EUR"                                  |
| `session_id`| string  | tl_session cookie value                |
| `sub_id`    | string  | 16-char hex subId for reconciliation   |

---

## Reconciliation: postback → click row

When a conversion postback arrives:

1. `subId` in postback body is matched to `AffiliateClick.subId`
2. Row updated: `converted=true`, `convertedEur=amount`, `convertedAt=now()`

If no matching row is found (click TTL expired, or table not yet seeded), the endpoint returns `200 { ok: true, note: "click_not_found" }` to prevent the partner from retrying indefinitely.

---

## Monthly EPC and Revenue Reports (SQL)

### Clicks and conversions by partner (last 30 days)

```sql
SELECT
  provider,
  COUNT(*) AS clicks,
  SUM(CASE WHEN converted THEN 1 ELSE 0 END) AS conversions,
  ROUND(SUM(CASE WHEN converted THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) AS cvr_pct,
  SUM("convertedEur") AS revenue_eur,
  ROUND(SUM("convertedEur") / NULLIF(COUNT(*), 0), 4) AS epc_eur
FROM "AffiliateClick"
WHERE "clickedAt" >= NOW() - INTERVAL '30 days'
GROUP BY provider
ORDER BY revenue_eur DESC NULLS LAST;
```

### Top routes by revenue (last 30 days)

```sql
SELECT
  route,
  COUNT(*) AS clicks,
  SUM(CASE WHEN converted THEN 1 ELSE 0 END) AS conversions,
  SUM("convertedEur") AS revenue_eur
FROM "AffiliateClick"
WHERE "clickedAt" >= NOW() - INTERVAL '30 days'
  AND converted = TRUE
GROUP BY route
ORDER BY revenue_eur DESC NULLS LAST
LIMIT 50;
```

### Daily revenue trend

```sql
SELECT
  DATE("clickedAt") AS day,
  provider,
  SUM("convertedEur") AS revenue_eur
FROM "AffiliateClick"
WHERE converted = TRUE
  AND "clickedAt" >= NOW() - INTERVAL '90 days'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;
```

---

## Environment Variables

| Variable                      | Required | Purpose                                        |
|-------------------------------|----------|------------------------------------------------|
| `GA4_MEASUREMENT_ID`          | Yes      | GA4 stream ID (G-XXXXXXXXXX)                   |
| `GA4_API_SECRET`              | Yes      | GA4 Measurement Protocol API secret            |
| `NEXT_PUBLIC_BASE_URL`        | Yes      | Canonical URL for postback URL construction    |
| `AWIN_POSTBACK_SECRET`        | Partners | HMAC secret for Awin postbacks                 |
| `IMPACT_POSTBACK_SECRET`      | Partners | HMAC secret for Impact/Skyscanner postbacks    |
| `RAKUTEN_POSTBACK_SECRET`     | Partners | HMAC secret for Rakuten postbacks              |
| `FLIXBUS_POSTBACK_SECRET`     | Partners | HMAC secret for FlixBus postbacks              |
| `TRAINLINE_POSTBACK_SECRET`   | Partners | HMAC secret for Trainline postbacks            |
| `DIRECTFERRIES_POSTBACK_SECRET` | Partners | HMAC secret for DirectFerries postbacks      |

Missing `GA4_*` vars will log a warning in dev and skip the event silently in production.
Missing postback secrets will reject requests in production, allow in dev/staging.

---

## AffiliateOffer Seed Data (Pilot — 12 Offers)

Run against the production DB after `prisma migrate deploy` adds the `AffiliateOffer` table:

```sql
INSERT INTO "AffiliateOffer"
  (id, provider, "offerType", "originCode", "destCode", "departureAt", "arrivalAt",
   "priceCents", currency, "deeplinkUrl", "affiliateTag", "fetchedAt", "expiresAt")
VALUES
  -- Skyscanner
  (gen_random_uuid(), 'skyscanner', 'flight', 'MAD', 'ESP', NOW(), NOW() + INTERVAL '1 year',
   NULL, 'EUR',
   'https://www.skyscanner.net/transport/flights/mad/?utm_source=traficolive&utm_medium=affiliate&utm_campaign=es-domestic',
   'vuelos-espana', NOW(), NOW() + INTERVAL '30 days'),

  (gen_random_uuid(), 'skyscanner', 'flight', 'ESP', 'ESP', NOW(), NOW() + INTERVAL '1 year',
   NULL, 'EUR',
   'https://www.skyscanner.net/flights-to/es/vuelos-baratos-a-espana.html?utm_source=traficolive&utm_medium=affiliate',
   'vuelos-baratos', NOW(), NOW() + INTERVAL '30 days'),

  -- Trainline
  (gen_random_uuid(), 'trainline', 'train', 'MAD', 'BCN', NOW(), NOW() + INTERVAL '1 year',
   4900, 'EUR',
   'https://www.thetrainline.com/es/trains/spain/madrid-to-barcelona?utm_source=traficolive&utm_medium=affiliate',
   'ave-madrid-barcelona', NOW(), NOW() + INTERVAL '30 days'),

  (gen_random_uuid(), 'trainline', 'train', 'ESP', 'ESP', NOW(), NOW() + INTERVAL '1 year',
   NULL, 'EUR',
   'https://www.thetrainline.com/es/trains/spain?utm_source=traficolive&utm_medium=affiliate',
   'trenes-espana', NOW(), NOW() + INTERVAL '30 days'),

  -- DirectFerries
  (gen_random_uuid(), 'directferries', 'ferry', 'BCN', 'PMI', NOW(), NOW() + INTERVAL '1 year',
   7900, 'EUR',
   'https://www.directferries.es/ferry_espana_baleares.htm?aff=traficolive',
   'baleares', NOW(), NOW() + INTERVAL '30 days'),

  (gen_random_uuid(), 'directferries', 'ferry', 'CAD', 'LPA', NOW(), NOW() + INTERVAL '1 year',
   19900, 'EUR',
   'https://www.directferries.es/ferry_espana_canarias.htm?aff=traficolive',
   'canarias', NOW(), NOW() + INTERVAL '30 days'),

  -- FlixBus
  (gen_random_uuid(), 'flixbus', 'bus', 'MAD', 'BCN', NOW(), NOW() + INTERVAL '1 year',
   900, 'EUR',
   'https://www.flixbus.es/autobuses/espana/madrid-to-barcelona?utm_source=traficolive&utm_medium=partner',
   'madrid-barcelona', NOW(), NOW() + INTERVAL '30 days'),

  (gen_random_uuid(), 'flixbus', 'bus', 'ESP', 'ESP', NOW(), NOW() + INTERVAL '1 year',
   NULL, 'EUR',
   'https://www.flixbus.es/autobuses/espana?utm_source=traficolive&utm_medium=partner',
   'bus-espana', NOW(), NOW() + INTERVAL '30 days'),

  -- Awin
  (gen_random_uuid(), 'awin', 'fuel', 'ESP', 'ESP', NOW(), NOW() + INTERVAL '1 year',
   NULL, 'EUR',
   'https://www.repsol.es/gasolineras/?utm_source=awin&utm_medium=affiliate&awc=traficolive',
   'combustible', NOW(), NOW() + INTERVAL '30 days'),

  (gen_random_uuid(), 'awin', 'insurance', 'ESP', 'ESP', NOW(), NOW() + INTERVAL '1 year',
   NULL, 'EUR',
   'https://www.rastreator.com/seguros-de-coche.aspx?utm_source=awin&awc=traficolive',
   'seguros-auto', NOW(), NOW() + INTERVAL '30 days'),

  -- Rakuten
  (gen_random_uuid(), 'rakuten', 'hotel', 'ESP', 'ESP', NOW(), NOW() + INTERVAL '1 year',
   NULL, 'EUR',
   'https://www.booking.com/searchresults.es.html?cc1=es&utm_source=rakutenadvertising&utm_medium=affiliate&utm_campaign=traficolive',
   'hoteles-espana', NOW(), NOW() + INTERVAL '30 days'),

  (gen_random_uuid(), 'rakuten', 'car_rental', 'ESP', 'ESP', NOW(), NOW() + INTERVAL '1 year',
   NULL, 'EUR',
   'https://www.rentalcars.com/es/?utm_source=rakutenadvertising&utm_medium=affiliate&utm_campaign=traficolive',
   'coches-alquiler', NOW(), NOW() + INTERVAL '30 days');
```

---

## TODO

- [ ] Add `subId` field to `AffiliateClick` model in `prisma/schema.prisma` (B9 owns schema)
- [ ] Add `convertedEur`, `convertedAt`, `transactionId`, `sessionId`, `referrerPath` fields to `AffiliateClick`
- [ ] Run `prisma migrate dev --name add-affiliate-tracking-fields`
- [ ] Register approved affiliate partner IDs and update deeplink URLs once approved
- [ ] Configure HMAC secrets in production env (`.env.production`)
- [ ] Add GA4 event to GA4 > Configure > Events for `affiliate_click`
- [ ] Set up GA4 conversion for `affiliate_click` with `converted=true` parameter
- [ ] Add `affiliate_click` custom dimensions in GA4 (partner, slug, sub_id)
