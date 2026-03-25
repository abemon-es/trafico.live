# trafico.live

Real-time Spanish traffic intelligence platform. Aggregates data from DGT, AEMET, SCT, Euskadi, Madrid, Valencia, and fuel price APIs into a unified dashboard with 75+ SEO pages.

**URL:** https://trafico.live
**Brand:** `~/Desarrollos/.claude-brands/trafico-live.md`
**Deployed on:** Railway

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| Cache | Redis (ioredis) |
| Maps | MapLibre GL |
| Charts | Recharts |
| CSS | Tailwind v4 (CSS-first, no `tailwind.config.ts`) |
| Data fetching | SWR (client), direct Prisma (server) |
| Fonts | Exo 2 (headings), DM Sans (body), JetBrains Mono (stats) |
| Icons | Lucide React exclusively |
| Analytics | Google Analytics |

## Quick Start

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # Production build (prisma generate + next build)
npm run db:push      # Push schema to DB
npm run db:migrate   # Run migrations
npm run db:studio    # Prisma Studio
npm run db:seed      # Seed database
```

## Architecture

### Frontend (`src/app/`)
- App Router with 75+ pages (heavy SEO: city traffic, gas stations, cameras, radares, incidents, EV charging, roads, provinces, ZBE, blog, seasonal)
- Components organized in: `ads`, `cameras`, `charts`, `gas-stations`, `home`, `incidents`, `layout`, `map`, `search`, `seo`, `stats`, `ui`, `v16`
- All pages Spanish-language

### API Routes (`src/app/api/`)
- 30+ endpoints for incidents, gas stations, roads, stats, weather, rankings, fuel prices, etc.
- Auth: same-origin allowed, external needs `x-api-key` header
- Rate limiting via `rate-limiter-flexible` + Redis
- Health check at `/api/health` (auth exempt)

### Data Collectors (`services/collector/`)
- Unified dispatcher (`TASK` env var selects collector)
- Valid tasks: `v16`, `incident`, `panel`, `weather`, `camera`, `radar`, `charger`, `speedlimit`
- Each collector: fetch → parse → upsert to PostgreSQL
- Legacy standalone collectors in `services/*-collector/` (being consolidated)
- Data sources: DGT (DATEX II XML), AEMET, SCT, Euskadi, Madrid, Valencia APIs

### Database (Prisma)
- 961-line schema with models for: V16 beacons, traffic incidents, weather conditions/alerts, cameras, radars, panels, speed limits, gas stations (terrestrial + maritime), EV chargers, roads, IMD data
- Heavy indexing for time-series queries
- Province/community/municipality administrative hierarchy
- Enums: RoadType, Direction, Severity, IncidentType, WeatherType, FuelType, etc.

### Middleware (`src/middleware.ts`)
- Legacy domain redirects (trafico.logisticsexpress.es, trafico.abemon.es → trafico.live)
- www → apex redirect
- API authentication for `/api/*` routes

## Key Files

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout with fonts, GA, structured data |
| `src/middleware.ts` | Domain redirects + API auth |
| `src/lib/auth.ts` | API key + same-origin authentication |
| `src/lib/api-utils.ts` | Rate limiting, IP extraction |
| `src/lib/redis.ts` | Redis client singleton |
| `src/lib/db.ts` | Prisma client |
| `src/lib/geo/` | Province mapping, INE codes, slugify |
| `prisma/schema.prisma` | Full data model (961 lines) |
| `services/collector/index.ts` | Unified collector dispatcher |
| `next.config.ts` | Security headers, rewrites, redirects |
| `src/app/globals.css` | Tailwind v4 config + brand tokens (OKLCH) |
| `src/app/sitemap.ts` | Dynamic sitemap generation |

## Conventions

- **Colors:** Always use `tl-*` / `tl-amber-*` tokens. Never raw hex. Never generic Tailwind colors.
- **Fonts:** Exo 2 headings, DM Sans body, JetBrains Mono for stats/prices. Never Inter/Roboto/Arial/Geist.
- **Numbers:** Display numerically, prices in monospace with 3 decimals, times in 24h format.
- **Data attribution:** Always cite the data source (DGT, AEMET, etc.)
- **CSS:** Tailwind v4 CSS-first — all theme config lives in `globals.css`, not a config file.
- **Rewrites:** `/combustible/*` → `/gasolineras/*`, `/alertas/*` → `/incidencias/*`
- **Redirects:** `/provincias` → `/espana`, `/mapa` → `/`

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `API_KEYS` | Comma-separated valid API keys |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics |
| `NEXT_PUBLIC_BASE_URL` | Canonical URL (https://trafico.live) |
| `TASK` | Collector task name (for services) |

## Security

- Full security headers (HSTS, CSP, X-Frame-Options, etc.) in `next.config.ts`
- API auth via same-origin check + x-api-key
- Rate limiting on all API routes (Redis-backed)
- Prisma parameterized queries (no raw SQL)
- Geolocation permission restricted to `self`
