# Tier Enforcement

How API tier gating, rate limiting, and 402/429 responses work in trafico.live.

---

## Rate Limit Table

| Tier       | Per Minute | Per Day             | Notes                         |
|------------|-----------|---------------------|-------------------------------|
| FREE       | 10 req    | 1,000 req           |                               |
| PRO        | 100 req   | 100,000 req         |                               |
| ENTERPRISE | 1,000 req | effectively unlimited | Short-circuits Redis check  |

ENTERPRISE is defined in `api-tiers.ts` with `rateLimitPerDay: Number.MAX_SAFE_INTEGER`. The enforcer
detects this and returns `allowed: true` immediately without a Redis round-trip.

---

## Feature-Path Matrix

| Path pattern                   | Required feature     | FREE | PRO | ENTERPRISE |
|--------------------------------|----------------------|------|-----|------------|
| `/api/accidentes/microdata`    | `accident_microdata` | ✗    | ✓   | ✓          |
| `/api/movilidad`               | `mobility_od`        | ✗    | ✓   | ✓          |
| `/api/combustible/historico`   | `historical_data`    | ✗    | ✓   | ✓          |
| `/api/combustible/tendencia`   | `trend_analysis`     | ✗    | ✓   | ✓          |
| `/api/clima/historico`         | `climate_data`       | ✗    | ✓   | ✓          |
| `/api/flotas`                  | `fleet_tracking`     | ✗    | ✓   | ✓          |
| `/api/trenes/posiciones`       | `fleet_tracking`     | ✗    | ✓   | ✓          |
| `/api/estadisticas/modal`      | `historical_data`    | ✗    | ✓   | ✓          |
| `/api/estadisticas`            | `historical_data`    | ✗    | ✓   | ✓          |
| All other `/api/*`             | _(none)_             | ✓    | ✓   | ✓          |

ENTERPRISE has the `"all"` feature which causes `tierHasFeature()` to always return `true`.

---

## 402 vs 429 Semantics

| Status | Reason               | Meaning                                    |
|--------|----------------------|--------------------------------------------|
| `402`  | `feature_locked`     | Tier doesn't include the required feature. Upgrade needed. |
| `429`  | `rate_limited_minute`| Per-minute window exhausted. Wait `Retry-After` seconds.   |
| `429`  | `rate_limited_day`   | Daily quota exhausted. Wait until UTC midnight.            |

All deny responses include:
- `error` — short Spanish label
- `mensaje` — human-readable Spanish explanation
- `upgrade` — link to `https://trafico.live/api-landing?upgrade=1`
- `reintentarEn` (rate limit only) — seconds until the window resets
- `Retry-After` header (rate limit only)

---

## Redis Key Schema

```
rl:{TIER}:{bucket}:{identifierHash}
```

- `TIER`           — `FREE`, `PRO`, or `ENTERPRISE`
- `bucket`         — `minute` or `day`
- `identifierHash` — SHA-256 hex of the API key (never plaintext)

Examples:
```
rl:FREE:minute:a3f1c2...
rl:PRO:day:9b2e44...
```

TTL is managed by `rate-limiter-flexible` (60s for minute bucket, 86400s for day bucket).

---

## Fail-Open Policy

All enforcement is fail-open: if Redis is unavailable or an unexpected error occurs,
the request is **allowed** rather than returning a 5xx. The caller sees `remaining: -1`
in the `EnforcementAllow` response to signal degraded state.

The middleware (B1) should set `X-RateLimit-Remaining: -1` in this case so callers
can detect the degraded state without being blocked.

---

## How to Test

```bash
# Should return 402 — FREE tier cannot access mobility_od
curl -s -H "x-api-key: <free-key>" https://trafico.live/api/movilidad | jq .

# Should return 200 — PRO tier has access
curl -s -H "x-api-key: <pro-key>" https://trafico.live/api/movilidad | jq .

# Hammer the endpoint to trigger 429 (minute limit = 10 for FREE)
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}\n" -H "x-api-key: <free-key>" https://trafico.live/api/incidencias
done
```

Expected output for a 402 deny:
```json
{
  "error": "Acceso restringido",
  "mensaje": "Esta funcionalidad no está disponible en tu plan actual. Actualiza tu suscripción para acceder.",
  "funcionalidadRequerida": "mobility_od",
  "upgrade": "https://trafico.live/api-landing?upgrade=1"
}
```

---

## How to Add a New Gated Path (2 steps)

1. **Add a rule to `src/lib/tier-paths.ts`:**
   ```ts
   { pattern: /^\/api\/your-new-endpoint/, feature: "your_feature" },
   ```

2. **Ensure the feature exists in the correct tier(s) in `src/lib/api-tiers.ts`:**
   ```ts
   PRO: {
     features: [
       // ... existing
       "your_feature",  // ← add here
     ],
   },
   ```

That's it. The feature gate in `enforceTier()` picks up the rule automatically.
No middleware changes needed — B1's middleware calls `enforceTier()` generically.

---

## File Map

| File | Role |
|------|------|
| `src/lib/api-tiers.ts` | Tier config + `tierHasFeature()` — read-only, do not modify |
| `src/lib/tier-paths.ts` | Path → feature mapping + `matchRule()` |
| `src/lib/tier-rate-limit.ts` | Redis-backed sliding window RL, `checkTierRateLimit()` |
| `src/lib/tier-enforcement.ts` | Main gate: `enforceTier()` + `buildDenyResponse()` |
| `src/middleware.ts` | B1 owned — imports `enforceTier` + `buildDenyResponse` |
| `src/app/api/billing/refund/route.ts` | Admin refund via Stripe |
| `src/app/api/billing/portal/route.ts` | Customer self-service Stripe portal |
