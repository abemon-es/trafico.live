# trafico.live

Real-time Spanish traffic intelligence platform. Aggregates data from DGT, AEMET, SCT, Euskadi, Madrid, Valencia, and fuel price APIs into a unified dashboard with 75+ SEO pages.

**URL:** https://trafico.live
**Managed by:** Certus SPV, SLU
**Developed by:** [Abemon](https://abemon.es)
**Brand:** `~/Desarrollos/.claude-brands/trafico-live.md`
**Deployed on:** Coolify (hetzner-prod) — split web/collectors | DB: Postgres+PostGIS on hetzner-dev via PgBouncer
**Email:** Cloudflare Email Routing → catch-all to operator

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Database | PostgreSQL + PostGIS via Prisma 7 (`@prisma/adapter-pg`), PgBouncer pooling |
| Search | Typesense (14 collections, geo-search, daily sync) |
| Cache | Redis (ioredis) — dedicated instance :6441 |
| Maps | MapLibre GL |
| Charts | Recharts |
| CSS | Tailwind v4 (CSS-first, no `tailwind.config.ts`) |
| Data fetching | SWR (client), direct Prisma (server) |
| Fonts | Exo 2 (headings), DM Sans (body), JetBrains Mono (stats) |
| Icons | Lucide React exclusively |
| Analytics | Google Analytics |
| Logging | Loki (Docker log driver → `10.100.0.2:3100`) |
| Error tracking | Sentry via GlitchTip (client+server+collector) |

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
- App Router with 80+ pages (heavy SEO: city traffic, gas stations, cameras, radares, incidents, EV charging, roads, provinces, ZBE, blog, seasonal, IMD, counting stations)
- Components organized in: `ads`, `cameras`, `charts`, `gas-stations`, `home`, `incidents`, `layout`, `map`, `search`, `seo`, `stats`, `ui`, `v16`
- All pages Spanish-language
- Key traffic data pages:
  - `/estaciones-aforo` — MapLibre map with 14,400+ counting stations, color-coded by IMD
  - `/intensidad` — National IMD overview with province comparison, year evolution, road rankings
  - `/trenes` — Railway network map with Cercanías/AVE/LD lines, stations, real-time alerts

### API Routes (`src/app/api/`)
- 40+ endpoints for incidents, gas stations, roads, stats, weather, rankings, fuel prices, IMD, counting stations, traffic intensity, hourly profiles, etc.
- Auth: same-origin allowed, external needs `x-api-key` header
- Rate limiting via `rate-limiter-flexible` + Redis
- Health check at `/api/health` (auth exempt)
- Traffic data endpoints:
  - `/api/trafico/imd` — IMD segments with groupBy (province/road/year/roadType)
  - `/api/estaciones-aforo` — Counting station catalog (GeoJSON output)
  - `/api/trafico/intensidad` — Real-time Madrid sensor intensity (live + hourly profiles)
  - `/api/trafico/distribucion-horaria` — Hourly traffic distribution (sensors + incident proxy)
  - `/api/trenes/estaciones` — Railway station catalog (GeoJSON output)
  - `/api/trenes/rutas` — Railway routes with shape geometry
  - `/api/trenes/alertas` — Active Renfe service alerts

### Typesense Search (`src/lib/typesense.ts`)
- **14 collections** with geo-search: gas_stations, roads, cameras, articles, provinces, cities, ev_chargers, radars, railway_stations, zbe_zones, risk_zones, variable_panels, maritime_stations, traffic_stations
- Multi-collection search via `/api/search?q=query` with Redis caching (60s)
- Daily sync at 05:00 via `TASK=typesense-sync` collector
- Geopoint fields on all location-aware entities (gas stations, cameras, EV chargers, radars, stations, panels, maritime)
- Graceful fallback: search returns empty if Typesense unavailable
- Port :6442 on infrastructure (configured via `TYPESENSE_URL` env var)

### Data Collectors (`services/collector/`)
- Unified dispatcher (`TASK` env var selects collector)
- Valid tasks: `v16`, `incident`, `panel`, `detector`, `intensity`, `weather`, `camera`, `radar`, `charger`, `speedlimit`, `gas-station`, `maritime-fuel`, `insights`, `risk-zones`, `zbe`, `imd`, `andorra`, `portugal-weather`, `portugal-fuel`, `historical-accidents`, `portugal-accidents`, `renfe-gtfs`, `renfe-alerts`, `maritime-forecast`, `sasemar`, `typesense-sync`
- Single Docker image: `services/collector/Dockerfile` — cron schedules in `docker-compose.collectors.yml`
- Runs on hetzner-prod via Coolify (separate app from web)
- IMD data also collected monthly from hetzner-dev cron (`/opt/trafico/imd-import.sh`)
- Data sources: DGT (DATEX II XML), AEMET, SCT, Euskadi, Madrid (informo.madrid.es), Valencia, MINETUR, Ministry ArcGIS REST API, Andorra, Portugal (IPMA, DGEG), Renfe (GTFS + GTFS-RT)

### Database (Prisma)
- Schema with models for: V16 beacons, traffic incidents, weather conditions/alerts, cameras, radars, panels, speed limits, gas stations (terrestrial + maritime), EV chargers, roads, IMD data, traffic counting stations, real-time traffic intensity, hourly traffic profiles, articles/tags, risk zones, ZBE, railway stations/routes/alerts
- Heavy indexing for time-series queries
- Province/community/municipality administrative hierarchy
- Enums: RoadType, Direction, Severity, IncidentType, WeatherType, FuelType, StationType, etc.

### Middleware (`src/middleware.ts`)
- Legacy domain redirects (trafico.logisticsexpress.es, trafico.abemon.es → trafico.live)
- www → apex redirect
- API authentication for `/api/*` routes

## Traffic Data Architecture

### Static IMD Data (annual)
- **Source:** Ministry of Transport ArcGIS REST API (`mapas.fomento.gob.es/arcgis/rest/services/MapaTrafico/Mapa{YEAR}web/MapServer/`)
  - Layer 1: Estaciones (counting stations, point geometry)
  - Layer 3: Temático IMD (road segments, polyline geometry)
  - Years: 2017-2019 via ArcGIS REST API queries
- **Source:** Ministry visor static GeoJSON (`mapatrafico.transportes.gob.es/2022/Visor/datos/GIS/estaciones.js`)
  - Year: 2022 (3,657 stations with full IMD + coordinates)
- **Tables:** `TrafficStation` (14,400+ stations), `TrafficFlow` (14,741 segments)
- **Collector:** `TASK=imd` (Node.js) + Python scripts on hetzner-dev (`/opt/trafico/`)
- **Cron:** Monthly on hetzner-dev (1st at 5am)

### Real-Time Intensity (every 5 min)
- **Source:** Madrid open data XML feed (`informo.madrid.es/informo/tmadrid/pm.xml`)
  - 6,117 measurement points, updated every 5 minutes
  - Fields: intensity (veh/h), occupancy (%), load (%), service level (0-3), saturation capacity
  - Coordinates in UTM Zone 30N (converted to WGS84)
- **Table:** `TrafficIntensity` (rolling 48h window, auto-cleaned)
- **Collector:** `TASK=intensity`
- **Cron:** `*/5 * * * *`

### Hourly Traffic Profiles
- **Source 1:** Running averages from Madrid intensity collector → `HourlyTrafficProfile` table
  - Per-sensor, per-day-of-week, per-hour averages (builds over time)
- **Source 2:** Incident frequency proxy → derived at query time from `TrafficIncident` timestamps
- **API:** `/api/trafico/distribucion-horaria` (combines both sources)

### Railway Network (Renfe + ADIF)
- **Source (static):** Renfe GTFS — Cercanías (`ssl.renfe.com/ftransit/`) + AVE/LD (`ssl.renfe.com/gtransit/`)
  - Stations from `stops.txt`, routes from `routes.txt`, line shapes from `shapes.txt` (Cercanías only)
  - CC-BY 4.0, no auth required
- **Source (real-time):** Renfe GTFS-RT — `gtfsrt.renfe.com/alerts.json`, `trip_updates.json`, `trip_updates_LD.json`
  - Service alerts, cancellations, significant delays (>5 min)
  - 20-second cadence, no auth
- **Tables:** `RailwayStation`, `RailwayRoute` (with GeoJSON shapes), `RailwayAlert`
- **Collectors:** `TASK=renfe-gtfs` (weekly), `TASK=renfe-alerts` (every 2 min, realtime tier)
- **APIs:** `/api/trenes/estaciones`, `/api/trenes/rutas`, `/api/trenes/alertas`
- **Page:** `/trenes` — MapLibre map with lines, stations, live alerts, service type filters

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
| `docker-compose.collectors.yml` | All collector service definitions + cron schedules |
| `docker-compose.web.yml` | Web app service definition (separate Coolify deploy) |
| `src/lib/typesense.ts` | Typesense client + 14 collection schemas |
| `services/collector/tasks/typesense-sync/` | Daily Typesense sync (14 collections, geo-search) |
| `src/app/api/search/route.ts` | Multi-collection search API (Cmd+K) |
| `sentry.client.config.ts` | Sentry client init (browser tracing, replays) |
| `sentry.server.config.ts` | Sentry server init (Prisma integration) |
| `services/collector/tasks/imd/` | IMD collector (ArcGIS REST client, UTM→WGS84) |
| `services/collector/tasks/intensity/` | Madrid real-time intensity collector |
| `services/collector/tasks/renfe-gtfs/` | Renfe GTFS static collector (stations, routes, shapes) |
| `services/collector/tasks/renfe-alerts/` | Renfe GTFS-RT alerts collector (real-time) |
| `src/app/trenes/` | Railway network map page |
| `src/app/estaciones-aforo/` | Counting stations map page |
| `src/app/intensidad/` | National IMD overview page |

## Conventions

- **Colors:** Always use `tl-*` / `tl-amber-*` tokens. Never raw hex. Never generic Tailwind colors.
- **Fonts:** Exo 2 headings, DM Sans body, JetBrains Mono for stats/prices. Never Inter/Roboto/Arial/Geist.
- **Numbers:** Display numerically, prices in monospace with 3 decimals, times in 24h format.
- **Data attribution:** Always cite the data source (DGT, AEMET, etc.)
- **CSS:** Tailwind v4 CSS-first — all theme config lives in `globals.css`, not a config file.
- **Rewrites:** `/combustible/*` → `/gasolineras/*`, `/alertas/*` → `/incidencias/*`
- **Redirects:** `/provincias` → `/espana`, `/mapa` → `/`

## Infrastructure

| Component | Config | Notes |
|-----------|--------|-------|
| PostgreSQL + PostGIS | hetzner-dev via PgBouncer | Prisma 7, `@prisma/adapter-pg`, 25-conn pool |
| Redis | :6441 (dedicated) | Cache + rate limiting, ioredis 5.9.2 |
| Typesense | :6442 | 14 collections, daily sync, geo-search |
| Loki | `10.100.0.2:3100` | Docker log driver, batch 400 |
| Sentry/GlitchTip | HTTPS tunnel `/monitoring` | Client 50% replays, server 25% traces, collector 10% |
| Coolify | hetzner-prod | Split: web app + collectors as separate Docker Compose apps |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (via PgBouncer) |
| `REDIS_URL` | Redis connection string (:6441) |
| `TYPESENSE_URL` | Typesense connection string (:6442) |
| `TYPESENSE_API_KEY` | Typesense API key |
| `API_KEYS` | Comma-separated valid API keys |
| `SENTRY_DSN` | Sentry/GlitchTip DSN (server-side) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry/GlitchTip DSN (client-side) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics |
| `NEXT_PUBLIC_BASE_URL` | Canonical URL (https://trafico.live) |
| `AEMET_API_KEY` | AEMET weather API key (collectors) |
| `TASK` | Collector task name (for services) |

## Security

- Full security headers (HSTS, CSP, X-Frame-Options, etc.) in `next.config.ts`
- API auth via same-origin check + x-api-key
- Rate limiting on all API routes (Redis-backed)
- Prisma parameterized queries (no raw SQL)
- Geolocation permission restricted to `self`
