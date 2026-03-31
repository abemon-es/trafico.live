# trafico.live

Real-time Spanish traffic intelligence platform. Aggregates data from DGT, AEMET, SCT, Euskadi, Madrid, Valencia, and fuel price APIs into a unified dashboard with 75+ SEO pages.

**URL:** https://trafico.live
**Managed by:** Certus SPV, SLU
**Developed by:** [Abemon](https://abemon.es)
**Brand:** `~/Desarrollos/.claude-brands/trafico-live.md`
**Deployed on:** Coolify (hetzner-prod) | DB on hetzner-dev via PgBouncer
**Email:** Cloudflare Email Routing → catch-all to operator

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
- App Router with 80+ pages (heavy SEO: city traffic, gas stations, cameras, radares, incidents, EV charging, roads, provinces, ZBE, blog, seasonal, IMD, counting stations)
- Components organized in: `ads`, `cameras`, `charts`, `gas-stations`, `home`, `incidents`, `layout`, `map`, `search`, `seo`, `stats`, `ui`, `v16`
- All pages Spanish-language
- Key traffic data pages:
  - `/estaciones-aforo` — MapLibre map with 14,400+ counting stations, color-coded by IMD
  - `/intensidad` — National IMD overview with province comparison, year evolution, road rankings

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

### Data Collectors (`services/collector/`)
- Unified dispatcher (`TASK` env var selects collector)
- Valid tasks: `v16`, `incident`, `panel`, `detector`, `intensity`, `weather`, `camera`, `radar`, `charger`, `speedlimit`, `gas-station`, `maritime-fuel`, `insights`, `risk-zones`, `zbe`, `imd`, `andorra`, `portugal-weather`, `portugal-fuel`, `historical-accidents`, `portugal-accidents`
- Single Docker image: `services/collector/Dockerfile` — cron schedules in `docker-compose.collectors.yml`
- Runs on hetzner-prod via Coolify scheduled tasks
- IMD data also collected monthly from hetzner-dev cron (`/opt/trafico/imd-import.sh`)
- Data sources: DGT (DATEX II XML), AEMET, SCT, Euskadi, Madrid (informo.madrid.es), Valencia, MINETUR, Ministry ArcGIS REST API, Andorra, Portugal (IPMA, DGEG)

### Database (Prisma)
- Schema with models for: V16 beacons, traffic incidents, weather conditions/alerts, cameras, radars, panels, speed limits, gas stations (terrestrial + maritime), EV chargers, roads, IMD data, traffic counting stations, real-time traffic intensity, hourly traffic profiles, articles/tags, risk zones, ZBE
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
| `services/collector/tasks/imd/` | IMD collector (ArcGIS REST client, UTM→WGS84) |
| `services/collector/tasks/intensity/` | Madrid real-time intensity collector |
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
