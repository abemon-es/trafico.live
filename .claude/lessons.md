# Lessons & Gotchas

> Auto-extracted from Claude Code session history.



## Key Decisions

### [2026-01-26]
I see the project uses MapLibre GL instead of Leaflet. Let me check the TrafficMap component to understand the map implementation.

### [2026-01-26]
The Coolify service config seems misconfigured - it's building the main app instead of the collector's Dockerfile. Let me try deploying directly from the collector directory.

### [2026-01-26]
Build passed. All carreteras pages now show as `ƒ (Dynamic)` - they'll be rendered on demand instead of during build. Committing and pushing.

### [2026-01-26]
Now I see the issue. The **gas-station-collector** only needs `DATABASE_URL` (no Redis required), but there's a configuration discrepancy:

| Service | DATABASE_URL hostname |
|---------|----------------------|
| **web** | `postgres:5432` (internal network) |
| **gas-station-collect

### [2026-01-26]
Yes, you can absolutely use Coolify-managed Redis instead of Upstash. Here's the comparison:

## Upstash Redis vs Self-hosted Redis (Coolify)

| Aspect | Upstash Redis | Self-hosted Redis (Coolify) |
|--------|---------------|---------------|
| **Type** | Serverless (HTTP-based) | Traditional (TCP connection) |
| **Pricing** 

### [2026-01-26]
I see the issue. The build system is using auto-detection instead of the Dockerfile. It's building the Next.js app instead of using the weather-collector's Dockerfile.

### [2026-01-26]
Phase 1 results show one issue: `trafico.abemon.es` returns 404 instead of redirecting. Let me check the API health response and then proceed to Phase 2 security audit.

### [2026-01-26]
Plan written. The approach is straightforward:

- **Frontend continues working** - same-origin requests pass through automatically
- **External requests blocked** - returns 401 without valid API key  
- **Health endpoint exempt** - monitoring services still work
- **Optional API key** - for internal

### [2026-01-26]
I see the issue - The platform is building the entire Next.js app instead of the collector service. The collector needs its own configuration. Let me check the collector's package.json and create a proper Dockerfile.

### [2026-01-26]
The service is still running Next.js instead of the collector. The service needs to be configured to use the Dockerfile. Let me check if I can configure this via CLI.

### [2026-01-26]
Now let me update the historico routes. These use `Request` instead of `NextRequest`, so I need to update the imports and function signatures.

### [2026-01-26]
Found the issue. Look at the prices:

- **Station 161**: `"Precio Gasoleo B": "626,000"` → 626.000 (overflow for Decimal(5,3))
- **Station 316**: `"Precio Gasoleo B": "669,000"` → 669.000 (overflow for Decimal(5,3))

The MINETUR API is returning bulk prices (per 1000L?) instead of per-liter prices f

### [2026-01-26]
The Gasoleo B prices are currently empty (likely reset during schema migration). The next collector run will populate them with normalized per-litre prices. ## Summary

| Task | Status |
|------|--------|
| Maritime price normalization code | ✅ Deployed |
| Schema reverted to Decimal(5,3) | ✅ Applie

### [2026-01-21]
Got it - Coolify cron and 7d+4w+3m retention. Let me launch a Plan agent to design the Coolify cron service architecture while you check the databases.

### [2026-01-21]
The build is using Railpack instead of the Dockerfile. I need to configure the service to use the Dockerfile builder. Let me set the root directory.

