# Architecture

## System Overview

```
                    ┌─────────────┐
                    │  Cloudflare  │
                    │  DNS + CDN   │
                    │  Email Route │
                    └──────┬──────┘
                           │ HTTPS
                    ┌──────▼──────┐
                    │ hetzner-prod │
                    │   (Coolify)  │
                    │              │
                    │  ┌────────┐  │         WireGuard VPN
                    │  │Next.js │  │        ┌─────────────┐
                    │  │  App   │──┼────────▶│ hetzner-dev │
                    │  │ :3000  │  │        │             │
                    │  └────────┘  │        │  PostgreSQL │
                    │              │        │  :6436 (PB) │
                    │  ┌────────┐  │        │  :5435 (PG) │
                    │  │Cron    │  │        │             │
                    │  │Jobs    │──┼────────▶│  Redis      │
                    │  │(10x)   │  │        │  :6385      │
                    │  └────────┘  │        └─────────────┘
                    └──────────────┘
```

## Components

### Next.js Application (hetzner-prod)

- **Framework:** Next.js 16 (App Router, React 19, TypeScript)
- **Port:** 3000 (behind Coolify reverse proxy with Traefik)
- **Pages:** 75+ routes, heavy SSG/ISR for SEO
- **API:** 55+ endpoints under `/api/`
- **Auth:** Same-origin allowed; external requests need `x-api-key` header
- **Rate limiting:** Redis-backed via `rate-limiter-flexible`

### Data Collectors (hetzner-prod)

- **Image:** `trafico-collector:latest` (single Docker image)
- **Dispatcher:** `TASK=` env var selects which collector runs
- **Scheduling:** System crontab → `/opt/trafico/run-collector.sh <task>`
- **Logs:** `/opt/trafico/logs/<task>.log` (auto-truncated at 1000 lines)
- **Network:** `--network coolify` to reach DB/Redis via WireGuard

### PostgreSQL (hetzner-dev)

- **Version:** PostgreSQL 16
- **Connection:** Via PgBouncer (transaction mode, pool=30)
- **Port:** 6436 (PgBouncer) / 5435 (direct PG)
- **Schema:** 960+ lines, 20+ models, heavy indexing for time-series queries
- **ORM:** Prisma 7 with `@prisma/adapter-pg`

### Redis (hetzner-dev)

- **Port:** 6385
- **Usage:** API response cache (5-10 min TTL), rate limiting, SSE state
- **Client:** ioredis singleton

### Cloudflare

- **DNS:** A record → hetzner-prod, MX → Cloudflare Email Routing
- **CDN:** Proxied, SSL termination
- **Email:** Catch-all → operator email; specific rules for security@, dpo@, legal@, hola@
- **Auth records:** SPF + DKIM + DMARC configured

## Data Flow

```
  Official APIs                    Collectors              Database              App
  ─────────────                    ──────────              ────────              ───
  DGT NAP (DATEX II) ──┐
  SCT Catalunya ────────┤
  Euskadi Open Data ────┤     ┌──────────────┐      ┌──────────┐      ┌──────────┐
  Madrid Informo ───────┼────▶│  Unified     │─────▶│PostgreSQL│─────▶│ Next.js  │
  Valencia OpenData ────┤     │  Collector   │      │  (Prisma)│      │  API +   │
  AEMET ────────────────┤     │  (Docker)    │      │          │      │  Pages   │
  MINETUR ──────────────┤     └──────────────┘      └────┬─────┘      └────┬─────┘
  MITERD ───────────────┘                                │                  │
                                                         │            ┌────▼─────┐
                                                         └───────────▶│  Redis   │
                                                           cache      │  (cache) │
                                                                      └──────────┘
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate compute/data servers | Isolation, independent scaling, cost control |
| PgBouncer | Connection pooling for short-lived collector + serverless queries |
| WireGuard VPN | Secure inter-server communication, <1ms RTT |
| Single collector image | One build, 10 cron jobs — reduces image sprawl and maintenance |
| Prisma adapter-pg | Required for PgBouncer compatibility (transaction mode) |
| Cloudflare Email Routing | Free, no mail server to manage, catch-all forwarding |
| MapLibre GL (not Leaflet) | GPU-accelerated vector tiles, better mobile performance |
| Tailwind v4 CSS-first | No config file, OKLCH tokens in globals.css |

## File Ownership

| Area | Key Files |
|------|-----------|
| App entry | `src/app/layout.tsx`, `src/app/page.tsx` |
| Routing/auth | `src/proxy.ts`, `src/lib/auth.ts`, `src/lib/api-utils.ts` |
| Database | `prisma/schema.prisma`, `src/lib/db.ts` |
| Cache | `src/lib/redis.ts` |
| Collectors | `services/collector/index.ts`, `services/collector/tasks/*/collector.ts` |
| Brand/design | `src/app/globals.css`, `brand-kit/BRAND.md` |
| SEO | `src/app/sitemap.ts`, `src/components/seo/StructuredData.tsx` |
| Infra | `docker-compose.collectors.yml`, `services/collector/Dockerfile` |
