# trafico.live

Real-time Spanish multimodal transport intelligence platform. Aggregates data from DGT, AEMET, Renfe, CNMC, MITECO, OpenSky, aisstream.io, MobilityData, INE, MINETUR, SCT, Euskadi, Madrid, Barcelona, Valencia, Zaragoza, Andorra, and Portugal APIs into 150+ pages covering road traffic, railways, maritime, aviation, public transit, air quality, fuel prices, and predictive analytics. 43 data collectors, 121 API endpoints, 78 Prisma models, MCP server for AI assistants, Stripe-powered API premium tiers.

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
| Search | Typesense (26 collections, geo-search, daily sync, optional vector embeddings) |
| Cache | Redis (ioredis) — dedicated instance :6441 |
| Maps | MapLibre GL + self-hosted Protomaps (tiles.trafico.live) |
| Map tiles | PMTiles on nginx (hetzner-prod:8088, Traefik → tiles.trafico.live) |
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
- App Router with 150+ pages (heavy SEO: city traffic, gas stations, cameras, radares, incidents, EV charging, roads, provinces, ZBE, blog, seasonal, IMD, counting stations, maritime, aviation, transit, air quality, statistics)
- Components organized in: `ads`, `analytics`, `brand`, `cameras`, `charts`, `fuel`, `gas-stations`, `home`, `incidents`, `insights`, `layout`, `legal`, `location`, `map`, `providers`, `roads`, `search`, `seo`, `stats`, `ui`, `v16`
- All pages Spanish-language
- Key traffic data pages:
  - `/estaciones-aforo` — MapLibre map with 14,400+ counting stations, color-coded by IMD
  - `/intensidad` — National IMD overview with province comparison, year evolution, road rankings
  - `/trenes` — Hero map with ~115 live trains (GPS), delay analytics overlay, brand punctuality ranking
  - `/trenes/estaciones` — 2,154 station catalog with search, network/province filters
  - `/trenes/lineas` — 14 brands, 1,248 routes with origin→destination, brand cards grid
  - `/trenes/cercanias` — 12 network overview + `/trenes/cercanias/[network]` detail pages (SSG)
- Multimodal transport pages (2026-04):
  - `/maritimo` — Maritime hub: ports, maritime fuel, weather, AIS vessel tracking, ferry routes
  - `/aviacion` — Real-time aircraft positions (OpenSky), 42 AENA airport catalog
  - `/transporte-publico` — 15+ transit operators (metro, bus, tram), GTFS routes and stops
  - `/calidad-aire` — MITECO ICA air quality index, 506 stations, pollutant breakdown by province
  - `/estadisticas-transporte` — Multimodal transport statistics (INE), modal split analysis

### API Routes (`src/app/api/`)
- 121 endpoints for incidents, gas stations, roads, stats, weather, rankings, fuel prices, IMD, counting stations, traffic intensity, hourly profiles, maritime, aviation, transit, billing, climate, mobility, accidents, etc.
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
  - `/api/trenes/flota` — Real-time LD fleet positions (GeoJSON, history mode)
- Data platform endpoints (2026-04):
  - `/api/movilidad` — Province-level O-D mobility flows (Ministerio BigData)
  - `/api/movilidad/corredores` — Top traffic corridors by trip volume
  - `/api/accidentes/microdata` — DGT per-accident records (2019-2023, paginated)
  - `/api/accidentes/hotspots` — Accident black spots clustered by road+km
  - `/api/combustible/historico` — CNMC provincial price history since 2016
  - `/api/combustible/tendencia` — Fuel price trend analysis (7d/30d/90d/1y)
  - `/api/clima/estaciones` — AEMET weather station catalog (GeoJSON)
  - `/api/clima/historico` — Daily climate records with temporal aggregation
- Multimodal transport endpoints (2026-04):
  - `/api/maritimo` — AIS vessel positions (GeoJSON, 48h rolling buffer)
  - `/api/maritimo/ferries` — Ferry routes + stops + schedules (Fred. Olsen, Baleària, Vizcaya)
  - `/api/transporte` — Transit operators/routes/stops (15+ GTFS feeds)
  - `/api/transporte/[operator]` — Single transit operator detail by MobilityData ID
  - `/api/aviacion` — Real-time aircraft positions over Spain (OpenSky, GeoJSON)
  - `/api/aviacion/aeropuertos` — 42 AENA airports catalog + statistics
  - `/api/calidad-aire` — Air quality stations + ICA index (MITECO, 506 stations)
  - `/api/estadisticas` — Transport statistics (INE, CNMC) with groupBy aggregation
  - `/api/estadisticas/modal` — Modal split analysis with period comparison
  - `/api/trafico/ciudades` — City-level traffic sensors (Barcelona, Valencia, Zaragoza)
  - `/api/trafico/obras` — Active roadworks zones (DGT connected cones)
- Billing & API key management:
  - `/api/billing` — Stripe checkout + subscription status
  - `/api/billing/webhook` — Stripe webhook handler
  - `/api/keys` — API key CRUD (FREE/PRO/ENTERPRISE tiers)

### Typesense Search (`src/lib/typesense.ts`)
- **26 collections** with geo-search: gas_stations, roads, cameras, articles, provinces, cities, ev_chargers, radars, railway_stations, railway_routes, railway_alerts, zbe_zones, risk_zones, variable_panels, maritime_stations, traffic_stations, incidents, weather_alerts, tolls, pages, vessels, ferry_routes, transit_stops, transit_routes, airports, portugal_stations
- Multi-collection search via `/api/search?q=query` with Redis caching (60s)
- Daily sync at 05:00 via `TASK=typesense-sync` collector
- Geopoint fields on all location-aware entities (gas stations, cameras, EV chargers, radars, stations, panels, maritime)
- Graceful fallback: search returns empty if Typesense unavailable
- Port :6442 on infrastructure (configured via `TYPESENSE_URL` env var)

### Data Collectors (`services/collector/`)
- Unified dispatcher (`TASK` env var selects collector)
- Valid tasks: `v16`, `incident`, `panel`, `detector`, `intensity`, `weather`, `camera`, `radar`, `charger`, `speedlimit`, `gas-station`, `maritime-fuel`, `insights`, `risk-zones`, `zbe`, `imd`, `andorra`, `portugal-weather`, `portugal-fuel`, `historical-accidents`, `portugal-accidents`, `renfe-gtfs`, `renfe-alerts`, `renfe-ld-realtime`, `maritime-forecast`, `sasemar`, `typesense-sync`, `cnmc-fuel`, `aemet-historical`, `mobility-od`, `accident-microdata`, `ais-stream`, `ferry-gtfs`, `transit-gtfs`, `renfe-positions`, `city-traffic`, `dgt-extras`, `mobilitydata-sync`, `ine-stats`, `opensky`, `aena-stats`, `air-quality`, `air-quality-ccaa`, `ourairports-runways`, `puertos-estado`
- 7 Docker containers in `docker-compose.collectors.yml`: realtime (11 tasks), frequent (3), fuel (3), daily (11), weekly (8), ais (always-on WebSocket), + cron schedules in `services/collector/crontabs/`
- Total ~5.2 GB RAM allocated across containers (1536m realtime, 256m frequent, 512m fuel, 1536m daily, 1024m weekly, 192m ais)
- Runs on hetzner-prod via Coolify (separate app from web)
- IMD data also collected monthly from hetzner-dev cron (`/opt/trafico/imd-import.sh`)
- Data sources: DGT (DATEX II XML + accident microdata XLSX), AEMET (alerts + historical climate + ICA air quality via MITECO), SCT, Euskadi, Madrid (informo.madrid.es), Barcelona (bcn.cat/transit), Valencia (opendatasoft), Zaragoza, MINETUR, CNMC (fuel price history), Ministry ArcGIS REST API + BigData O-D matrices, INE (transport statistics JSON API), MobilityData (126 Spanish GTFS feeds), OpenSky Network (aircraft ADS-B), aisstream.io (AIS vessel tracking WebSocket), Andorra, Portugal (IPMA, DGEG), Renfe (GTFS + GTFS-RT + undocumented LD fleet API)

### Database (Prisma)
- Schema with models for: V16 beacons, traffic incidents, weather conditions/alerts, cameras, radars, panels, speed limits, gas stations (terrestrial + maritime), EV chargers, roads, IMD data, traffic counting stations, real-time traffic intensity, hourly traffic profiles, articles/tags, risk zones, ZBE, railway stations/routes/alerts/fleet positions, mobility O-D flows, accident microdata, CNMC fuel prices, climate stations/records, API keys/usage, vessels/positions (AIS), ferry routes/stops/trips, transit operators/routes/stops (GTFS), city traffic sensors/readings, roadworks zones, GTFS archives, transport statistics, airports/statistics, aircraft positions, air quality stations/readings
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
  - Stations from `stops.txt` (quirky CSV with single-quoted fields), routes, shapes (Cercanías only)
  - 2,154 stations, 1,248 routes, 14 commercial brands, 12 Cercanías networks
  - CC-BY 4.0, no auth required
- **Source (real-time alerts):** Renfe GTFS-RT — `gtfsrt.renfe.com/alerts.json`, `trip_updates.json`, `trip_updates_LD.json`
  - Service alerts, cancellations, significant delays (>5 min), 20s cadence, no auth
- **Source (Cercanías GPS):** Renfe GTFS-RT VehiclePositions — `gtfsrt.renfe.com/vehicle_positions.json`
  - Real GPS coordinates for Cercanías trains, 20s update, CC-BY 4.0, no auth
- **Source (LD fleet):** Renfe undocumented API — `tiempo-real.largorecorrido.renfe.com/renfe-visor/`
  - `flotaLD.json`: GPS positions + delay for ~115 active trains, no auth
  - `trenesConEstacionesLD.json`: full route polylines + stop schedules per train
- **Tables:** `RailwayStation` (slug, network, province), `RailwayRoute` (brand, origin/dest, shapes, stopNames), `RailwayAlert`, `RailwayDelaySnapshot` (2-min fleet snapshots), `RailwayDailyStats` (daily aggregates)
- **Brands:** AVE, AVLO, Alvia, Avant, Euromed, Intercity, MD, Regional, REG.EXP, Proximidad, Trencelta, Cercanías, Rodalies, FEVE
- **Cercanías networks:** Madrid (96), Barcelona (111), Valencia (57), Sevilla (31), Málaga (25), Bilbao (65), Asturias (161), Santander (70), Cádiz (31), Murcia/Alicante (31), Zaragoza (10), San Sebastián (27)
- **Collectors:** `TASK=renfe-gtfs` (weekly, quirky CSV parser), `TASK=renfe-alerts` (every 2 min, also captures delay snapshots from fleet API)
- **APIs:** `/api/trenes/estaciones` (GeoJSON), `/api/trenes/rutas` (with shapes, brand stats), `/api/trenes/alertas`, `/api/trenes/posiciones` (live GPS + route polylines, Redis-cached 15s), `/api/trenes/stats` (delay analytics, brand punctuality)
- **Pages:** `/trenes` (hero map with live trains, overlay stats, brand punctuality), `/trenes/estaciones` (catalog), `/trenes/lineas` (brand cards), `/trenes/cercanias` (12 network overview), `/trenes/cercanias/[network]` (per-network detail)

### Data Platform (2026-04)
- **Mobility O-D:** Province-level daily trip flows from Ministerio de Transportes BigData study (2022+)
  - Collector: `TASK=mobility-od` (one-shot backfill), Table: `MobilityODFlow`
- **Accident Microdata:** Per-accident records from DGT annual XLSX (2019-2023, ~500K records)
  - Collector: `TASK=accident-microdata` (one-shot), Table: `AccidentMicrodata`
- **CNMC Fuel History:** Provincial daily fuel prices with pre-tax (PAI) since 2016
  - Collector: `TASK=cnmc-fuel` (daily 02:00), Table: `CNMCFuelPrice`
- **AEMET Climate:** ~900 weather stations + daily records from 2019 (temp, precip, wind, sun, pressure)
  - Collector: `TASK=aemet-historical` (daily 08:00), Tables: `ClimateStation`, `ClimateRecord`
- **MCP Server:** Exposes 12+ tools via Model Context Protocol (traffic, fuel, railway, weather, search)
  - Implementation: `src/mcp/` (Prisma-backed, stdio transport)
- **API Premium:** Stripe billing with FREE/PRO/ENTERPRISE tiers, API key management
  - Tables: `ApiKey`, `ApiUsage`, Lib: `src/lib/stripe.ts`, `src/lib/api-tiers.ts`

### Multimodal Transport (2026-04)

- **Maritime:** AIS vessel tracking (aisstream.io WebSocket, always-on — currently degraded, auth issues since Mar 2026, email sent to founders) + ferry GTFS + Puertos del Estado WFS (50 state ports with INSPIRE polygons). Tables: `Vessel`, `VesselPosition`, `SpanishPort` (197 ports), `FerryRoute/Stop/Trip`. Collectors: `ais-stream`, `ferry-gtfs`, `puertos-estado` (WFS import). APIs: `/api/maritimo`, `/api/maritimo/ferries`. Page: `/maritimo`
- **Public Transit:** 15+ GTFS operators via MobilityData (Metro Madrid/Barcelona/Bilbao, FGC, Euskotren, EMT, TUSSAM, Ouigo). Tables: `TransitOperator`, `TransitRoute`, `TransitStop`. Collectors: `transit-gtfs`, `renfe-positions`. APIs: `/api/transporte`, `/api/transporte/[operator]`. Page: `/transporte-publico`
- **City Sensors:** Madrid (informo.madrid.es, 6K sensors, */5) + Barcelona (transit DAT + road sections, 527 roads) + Valencia (ODS + ArcGIS REST, */3) + Zaragoza. Tables: `CityTrafficSensor`, `CityTrafficReading`. Collectors: `city-traffic` (5min, all cities), `dgt-extras` (weekly). APIs: `/api/trafico/ciudades`, `/api/trafico/obras`
- **Aviation:** OpenSky aircraft (*/15, anonymous rate-limited) + 46 AENA airports + Eurostat annual pax stats (2019-2025) + OurAirports runway geometry (103 runways, 76 airports, `public/data/runways.json`). Tables: `AircraftPosition`, `Airport`, `AirportStatistic`. Collectors: `opensky` (*/15), `aena-stats` (daily, Eurostat AVIA_PAOA CSV), `ourairports-runways` (weekly, runway ends + heading + length). APIs: `/api/aviacion`, `/api/aviacion/aeropuertos`. Page: `/aviacion`
- **Air Quality:** MITECO ICA via `ica.miteco.es/datos/ica-ultima-hora.csv` (CC-BY 4.0, hourly CSV) + backend API fallback (`backend.ica.miteco.es/sgca/`). 565 stations with ICA 1-6 levels. CCAA extensions: Madrid (20min, `datos.comunidad.madrid`), Cataluña (daily), Euskadi, Andalucía. Tables: `AirQualityStation`, `AirQualityReading` (NO2, PM10, PM2.5, O3, SO2, CO, ICA 1-6). Collectors: `air-quality` (hourly), `air-quality-ccaa` (varies). API: `/api/calidad-aire`. Page: `/calidad-aire`
- **Historical:** MobilityData GTFS archive (126 feeds) + INE transport stats. Tables: `GTFSArchive`, `TransportStatistic`. Collectors: `mobilitydata-sync`, `ine-stats`. APIs: `/api/estadisticas`, `/api/estadisticas/modal`. Page: `/estadisticas-transporte`

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
| `prisma/schema.prisma` | Full data model (78 models, 23 enums, 2,400 lines) |
| `services/collector/index.ts` | Unified collector dispatcher |
| `next.config.ts` | Security headers, rewrites, redirects |
| `src/app/globals.css` | Tailwind v4 config + brand tokens (OKLCH) |
| `src/app/sitemap.ts` | Dynamic sitemap generation |
| `docker-compose.collectors.yml` | All collector service definitions + cron schedules |
| `docker-compose.web.yml` | Web app service definition (separate Coolify deploy) |
| `src/lib/typesense.ts` | Typesense client + 26 collection schemas |
| `services/collector/tasks/typesense-sync/` | Daily Typesense sync (26 collections, geo-search) |
| `src/app/api/search/route.ts` | Multi-collection search API (Cmd+K) |
| `sentry.client.config.ts` | Sentry client init (browser tracing, replays) |
| `sentry.server.config.ts` | Sentry server init (Prisma integration) |
| `services/collector/tasks/imd/` | IMD collector (ArcGIS REST client, UTM→WGS84) |
| `services/collector/tasks/intensity/` | Madrid real-time intensity collector |
| `src/lib/map-tiles.ts` | Vector tile integration: sources, styles, helpers, Protomaps basemap |
| `src/lib/pmtiles-protocol.ts` | Singleton PMTiles protocol registration for MapLibre |
| `src/lib/map-config.ts` | Shared map config (MAP_STYLE_DEFAULT, forceSpanishLabels, presets) |
| `src/lib/map-style.ts` | Branded Protomaps style generator (legacy, see map-tiles.ts) |
| `services/tiles/` | Tile server: nginx + docker-compose + generate-pmtiles.sh |
| `services/martin/` | Martin tile server: config, Dockerfile, SQL tile functions |
| `public/geo/spain-provinces.geojson` | Province boundary polygons |
| `public/geo/territories.geojson` | Portugal/Andorra/Gibraltar boundaries |
| `services/collector/tasks/renfe-gtfs/` | Renfe GTFS static collector (stations, routes, shapes) |
| `services/collector/tasks/renfe-alerts/` | Renfe GTFS-RT alerts collector (real-time) |
| `services/collector/tasks/renfe-ld-realtime/` | Renfe LD fleet GPS collector (every 2 min) |
| `services/collector/tasks/mobility-od/` | Ministerio BigData O-D matrices collector |
| `services/collector/tasks/accident-microdata/` | DGT per-accident XLSX parser |
| `services/collector/tasks/cnmc-fuel/` | CNMC CKAN fuel price history collector |
| `services/collector/tasks/aemet-historical/` | AEMET climate station + daily records collector |
| `src/lib/api-tiers.ts` | FREE/PRO/ENTERPRISE tier definitions |
| `src/lib/stripe.ts` | Stripe client + checkout/webhook helpers |
| `src/mcp/` | MCP server (Prisma-backed, 12+ tools, stdio transport) |
| `src/app/trenes/` | Railway network map page |
| `src/app/estaciones-aforo/` | Counting stations map page |
| `src/app/intensidad/` | National IMD overview page |
| `services/collector/tasks/ais-stream/` | AIS WebSocket vessel tracking (always-on) |
| `services/collector/tasks/ferry-gtfs/` | MobilityData ferry GTFS collector |
| `services/collector/tasks/transit-gtfs/` | 15+ transit GTFS feeds collector |
| `services/collector/tasks/renfe-positions/` | Renfe Cercanías vehicle positions |
| `services/collector/tasks/city-traffic/` | Barcelona/Valencia/Zaragoza sensors |
| `services/collector/tasks/opensky/` | OpenSky aircraft positions collector |
| `services/collector/tasks/air-quality/` | MITECO ICA air quality collector |
| `services/collector/tasks/mobilitydata-sync/` | MobilityData GTFS archive sync |
| `services/collector/tasks/ine-stats/` | INE transport statistics collector |
| `services/collector/shared/ws-client.ts` | Reconnecting WebSocket wrapper (AIS) |
| `services/collector/tasks/puertos-estado/` | Puertos del Estado WFS port catalog |
| `services/collector/tasks/ourairports-runways/` | OurAirports runway geometry import |
| `services/collector/tasks/air-quality-ccaa/` | CCAA regional air quality (Madrid, Cataluña, Euskadi, Andalucía) |
| `services/collector/tasks/aena-stats/` | Eurostat AVIA_PAOA airport passenger stats |
| `public/data/runways.json` | Static runway geometry (76 airports, 103 runways) for 3D map |
| `src/components/location/sections/RailwaySection.tsx` | Province railway stations section |
| `src/components/location/sections/AirQualitySection.tsx` | Province air quality section |
| `src/components/location/sections/AirportsSection.tsx` | Province airports section |
| `src/app/calidad-aire/page.tsx` | Air quality page (565 stations, ICA distribution) |
| `services/collector/shared/gtfs-parser.ts` | GTFS ZIP parser utility |
| `data/airports-spain.json` | 42 AENA airports static catalog |
| `src/app/maritimo/` | Maritime hub page |
| `src/app/aviacion/` | Aviation page (aircraft + airports) |
| `src/app/transporte-publico/` | Public transit operators page |
| `src/app/calidad-aire/` | Air quality ICA page |
| `src/app/estadisticas-transporte/` | Multimodal transport statistics |

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
| Typesense | :6442 | 26 collections, daily sync, geo-search |
| Loki | `10.100.0.2:3100` | Docker log driver, batch 400 |
| Sentry/GlitchTip | HTTPS tunnel `/monitoring` | Client 50% replays, server 25% traces, collector 10% |
| Coolify | hetzner-prod | Split: web app + collectors as separate Docker Compose apps |
| Tile server | tiles.trafico.live:8088 | nginx + Martin, Traefik SSL, 18 PMTiles + 8 dynamic sources |

### Vector Tile Server (`tiles.trafico.live`)

Hybrid architecture: nginx serves static PMTiles files, Martin serves real-time PostGIS layers via MVT.

- **Containers:** `tiles-tiles-1` (nginx:alpine) + `tiles-martin-1` (martin:v0.15.0)
- **Compose:** `services/tiles/docker-compose.yml`
- **Martin config:** `services/martin/config.yaml` (8 PostGIS function sources, pool_size 4)
- **SQL functions:** `services/martin/migrations/` (tile_sensors, tile_incidents, tile_fleet, +5)
- **nginx cache:** 60s TTL + `stale-while-revalidate` on `/dynamic/` (Martin proxy)
- **GIST indexes:** On TrafficIntensity, TrafficIncident, RenfeFleetPosition for spatial queries
- **PMTiles gen:** `services/tiles/generate-pmtiles.sh` + `Dockerfile.generate` (tippecanoe)
- **Crontab:** `/etc/cron.d/trafico-tiles` — monthly all, 3x/day gas, daily cameras+chargers, weekly radars+railway
- **Basemap:** `spain.pmtiles` (2.2GB, z0-14, Iberian Peninsula + Canarias)
- **Data tiles:** 18 static layers (~36MB total), generated from PostGIS via tippecanoe
- **DNS:** `tiles.trafico.live` → A → 168.119.34.248 (Cloudflare DNS-only)

### Map Frontend

Self-hosted Protomaps basemap (light + dark themes, Spanish labels native). Data via vector tiles — no GeoJSON blobs.

- `src/lib/map-tiles.ts` — TILE_SOURCES, LAYER_STYLES, `addTileLayer()`, `getProtomapsStyle()`/`getProtomapsDarkStyle()`
- `src/lib/pmtiles-protocol.ts` — singleton PMTiles protocol registration
- `src/lib/map-config.ts` — `MAP_STYLE_DEFAULT` = Protomaps, `MAP_STYLE_PROTOMAPS_DARK`, CartoDB fallbacks

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
| `AEMET_API_KEY` | AEMET weather + climate API key (collectors) |
| `TASK` | Collector task name (for services) |
| `STRIPE_SECRET_KEY` | Stripe API secret key (billing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret |
| `STRIPE_PRO_PRICE_ID` | Stripe price ID for PRO tier |
| `STRIPE_ENTERPRISE_PRICE_ID` | Stripe price ID for ENTERPRISE tier |
| `AISSTREAM_API_KEY` | aisstream.io API key (maritime AIS WebSocket) |
| `OPENSKY_USERNAME` | OpenSky Network username (optional, higher rate limits) |
| `OPENSKY_PASSWORD` | OpenSky Network password (optional) |
| `ENABLE_VECTOR_SEARCH` | Set to `true` to enable Typesense embedding fields + hybrid search |
| `MOBILITYDATA_REFRESH_TOKEN` | MobilityData API refresh token (optional, for historical snapshots) |
| `COLLECTOR_DURATION` | AIS collector run duration in ms (0 = indefinite) |

## Security

- Full security headers (HSTS, CSP, X-Frame-Options, etc.) in `next.config.ts`
- API auth via same-origin check + x-api-key
- Rate limiting on all API routes (Redis-backed)
- Prisma parameterized queries (no raw SQL)
- Geolocation permission restricted to `self`
