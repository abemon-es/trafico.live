# trafico.live — Platform Audit
**Date:** 2026-04-07 | **Version:** Post Phase 1-4 SEO Expansion

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Database records** | 10,962,165 |
| **Prisma models** | 77 |
| **Frontend pages** | 194 route files → ~42,000+ indexable URLs |
| **API endpoints** | 141 |
| **Data collectors** | 49 tasks across 6 Docker containers + 1 WebSocket |
| **Typesense collections** | 26 (geo-enabled search) |
| **Data sources** | 25+ government/open-data APIs |
| **Tile layers** | 2 containers (nginx static + Martin dynamic) |

---

## 1. DATABASE — All Tables by Size

### Tier 1: Million+ records (time-series core)

| Table | Records | Description | Source | Freshness |
|-------|---------|-------------|--------|-----------|
| ClimateRecord | 3,646,800 | Daily weather (temp, precip, wind, sun) | AEMET | Daily 08:00 |
| TrafficIntensity | 2,730,017 | Madrid 6K sensors (veh/h, occupancy) | informo.madrid.es | */5 min |
| TrafficReading | 2,541,156 | IMD counting station readings | Ministerio Transportes | Monthly |
| TrafficIncident | 602,817 | DGT+regional incidents | DGT DATEX II | */2 min |
| AccidentMicrodata | 466,123 | Per-accident records 2019-2023 | DGT XLSX | One-shot |
| HourlyTrafficProfile | 295,103 | Per-sensor hourly averages | Derived from intensity | Running avg |

### Tier 2: 10K-200K records

| Table | Records | Description | Source |
|-------|---------|-------------|--------|
| CNMCFuelPrice | 194,395 | Provincial daily fuel prices since 2016 | CNMC CKAN |
| TransitStop | 114,998 | GTFS transit stops (87 operators) | MobilityData |
| RenfeFleetPosition | 95,117 | Live train GPS (rolling 48h) | Renfe LD API |
| GasStationPriceHistory | 58,963 | Daily fuel station price snapshots | MINETUR |
| CityTrafficReading | 36,890 | Barcelona/Valencia/Zaragoza sensors | Municipal APIs |
| MobilityODFlow | 20,722 | Province O-D daily trip flows | Ministerio BigData |
| TrafficFlow | 14,758 | IMD road segments | Ministerio ArcGIS |
| TransitRoute | 14,506 | GTFS transit routes | MobilityData |
| TrafficStation | 14,436 | IMD counting stations | Ministerio ArcGIS |
| GasStation | 12,294 | Fuel station catalog | MINETUR |
| EVCharger | 12,067 | EV charging points | MINETUR |

### Tier 3: 1K-10K records

| Table | Records | Description | Source |
|-------|---------|-------------|--------|
| WeatherAlert | 9,478 | AEMET weather alerts | AEMET CAP |
| FerryTrip | 7,959 | Ferry schedules | MobilityData GTFS |
| TrafficDetector | 7,259 | Madrid sensors catalog | informo.madrid.es |
| TransportStatistic | 5,417 | INE 25-year modal stats | INE API |
| V16BeaconEvent | 4,062 | Real-time V16 beacons | DGT |
| RailwayAlert | 3,711 | Renfe service alerts | Renfe GTFS-RT |
| Municipality | 3,459 | Spanish municipalities | INE |
| AirportStatistic | 2,811 | Airport passenger data 1993-2025 | Eurostat AVIA_PAOA |
| AirQualityReading | 2,505 | Hourly pollutant readings | MITECO ICA |
| VariablePanel | 2,463 | DGT variable message signs | DGT DATEX II |
| MaritimeEmergency | 2,093 | SASEMAR rescue operations | SASEMAR ArcGIS |
| Camera | 1,917 | DGT traffic cameras | DGT DATEX II |
| AircraftPosition | 1,659 | Aircraft over Spain (rolling) | OpenSky ADS-B |
| PortugalGasStation | 1,584 | Portugal fuel stations | DGEG |
| RailwayStation | 1,504 | Renfe/ADIF stations | Renfe GTFS |
| HourlyStats | 1,431 | Hourly aggregated KPIs | Derived |
| RailwayDelaySnapshot | 1,328 | 2-min fleet punctuality | Renfe LD API |
| RailwayRoute | 1,248 | Train routes (14 brands) | Renfe GTFS |
| CityTrafficSensor | 1,054 | City sensor catalog | Municipal APIs |

### Tier 4: <1K records (reference + catalog)

| Table | Records | Description |
|-------|---------|-------------|
| ClimateStation | 947 | AEMET weather stations |
| AirQualityStation | 758 | MITECO monitoring stations |
| Radar | 737 | Speed cameras |
| Vessel | 643 | AIS-tracked vessels |
| Road | 361 | Road catalog |
| RoadworksZone | 356 | Active roadworks |
| FerryStop | 231 | Ferry terminals |
| SpeedLimit | 230 | Speed limit segments |
| SpanishPort | 181 | Spanish ports (Puertos del Estado) |
| Article | 161 | Blog/news/insights |
| MaritimeStation | 149 | Maritime fuel stations |
| TransitOperator | 87 | GTFS transit operators |
| ZBEZone | 64 | Low-emission zones |
| DailyStats | 62 | Daily aggregated KPIs |
| FerryRoute | 53 | Ferry routes |
| Province | 52 | Spanish provinces |
| Airport | 46 | AENA + other airports |
| Community | 19 | Autonomous communities |
| TollRoad | 17 | Toll road catalog |

---

## 2. DATA COLLECTORS — 49 Tasks, 6 Containers

### Container: `collector-realtime` (1536MB)
Every 2-5 minutes. Peak ~11 concurrent processes.

| Task | Schedule | Source | Records/run |
|------|----------|--------|-------------|
| incident | */2 min | DGT DATEX II + SCT + Euskadi + Madrid + Barcelona + Valencia + Zaragoza | ~100-500 |
| v16 | */2 min | DGT DATEX II | ~10-50 |
| panel | */5 min | DGT DATEX II | ~200 |
| detector | */5 min | DGT DATEX II | ~7K |
| intensity | */5 min | informo.madrid.es XML | ~6K measurements |
| city-traffic | */5 min | Barcelona/Valencia/Zaragoza APIs | ~1K readings |
| andorra | */5 min | Mobilitat Andorra | ~10-30 |
| renfe-alerts | */2 min | Renfe GTFS-RT | ~10-50 alerts |
| renfe-ld-realtime | */2 min | Renfe LD fleet API | ~115 positions |
| renfe-positions | */2 min | Renfe GTFS-RT VehiclePositions | ~50-100 |
| opensky | */15 min | OpenSky Network ADS-B | ~200-1K aircraft |
| air-quality | Hourly | MITECO ICA CSV | ~500 readings |
| health-check | */30 min | Internal SLA check | — |

### Container: `collector-frequent` (256MB)
Hourly/6-hourly.

| Task | Schedule | Source |
|------|----------|--------|
| weather | Hourly | AEMET CAP alerts |
| maritime-forecast | */6h | AEMET maritime zones |
| portugal-weather | */6h | IPMA Portugal |

### Container: `collector-fuel` (512MB)
3x daily.

| Task | Schedule | Source |
|------|----------|--------|
| gas-station | 06/13/20h | MINETUR |
| maritime-fuel | 07/14/21h | MINETUR maritime |
| portugal-fuel | 08/15/22h | DGEG Portugal |

### Container: `collector-daily` (1536MB)
Daily, staggered.

| Task | Schedule | Source |
|------|----------|--------|
| daily-stats | 00:30 | Internal aggregation |
| cnmc-fuel | 02:00 | CNMC CKAN fuel history |
| mobilitydata-sync | 02:30 | MobilityData catalog |
| ine-stats | 03:30 | INE API |
| camera | 04:00 | DGT DATEX II |
| aena-stats | 04:30 | Eurostat AVIA_PAOA CSV |
| typesense-sync | 05:00 | Internal → Typesense |
| charger | 06:00 | MINETUR |
| aemet-historical | 08:00 | AEMET OpenData |
| insights | 22:30 | Internal article gen |
| air-quality-ccaa | varies | Madrid/Cataluña/Euskadi/Andalucía |

### Container: `collector-weekly` (1024MB)
Sunday mornings.

| Task | Schedule | Source |
|------|----------|--------|
| radar | Sun 03:00 | DGT DATEX II |
| speedlimit | Sun 03:30 | DGT DATEX II |
| risk-zones | Sun 04:00 | DGT ArcGIS |
| zbe | Sun 04:30 | DGT |
| renfe-gtfs | Sun 05:00 | Renfe GTFS static |
| ferry-gtfs | Sun 05:30 | MobilityData GTFS |
| transit-gtfs | Sun 06:00 | MobilityData (145 feeds) |
| dgt-extras | Sun 06:30 | DGT NAP roadworks |

### Container: `collector-ais` (192MB)
Always-on WebSocket.

| Task | Mode | Source |
|------|------|--------|
| ais-stream | Persistent WebSocket | aisstream.io (7 bboxes, global) |
| voyage-detector | Derived | Vessel proximity to ports |

### One-shot / manual tasks (not scheduled):
- accident-microdata — DGT XLSX 2019-2023
- imd — Ministerio ArcGIS REST
- mobility-od — Ministerio BigData
- puertos-estado — WFS port catalog
- ourairports-runways — OurAirports CSV
- historical-accidents — DGT historical

---

## 3. DATA SOURCES — 25+ APIs

| # | Source | Data | Auth | Protocol |
|---|--------|------|------|----------|
| 1 | **DGT** (DATEX II) | Incidents, cameras, radars, panels, speed limits, V16 | None | XML |
| 2 | **DGT** (NAP) | Roadworks, connected cones | None | XML |
| 3 | **DGT** (XLSX) | Accident microdata 2019-2023 | None | XLSX download |
| 4 | **AEMET** | Weather alerts, climate records, stations | API key | REST JSON |
| 5 | **MITECO** | Air quality ICA (565 stations) | None | CSV hourly |
| 6 | **MINETUR** | Gas stations, EV chargers, maritime fuel | None | REST JSON |
| 7 | **CNMC** | Fuel price history (since 2016) | None | CKAN CSV |
| 8 | **Ministerio Transportes** | IMD, counting stations | None | ArcGIS REST |
| 9 | **Ministerio Transportes** | Mobility O-D flows | None | CSV |
| 10 | **INE** | Transport statistics (25 years) | None | JSON API |
| 11 | **Eurostat** | Airport passenger data (AVIA_PAOA) | None | CSV bulk |
| 12 | **Renfe** | GTFS static (stations, routes) | None | CSV (CC-BY 4.0) |
| 13 | **Renfe** | GTFS-RT (alerts, delays, positions) | None | Protobuf |
| 14 | **Renfe** | LD fleet GPS (undocumented) | None | JSON |
| 15 | **informo.madrid.es** | Madrid 6K traffic sensors | None | XML |
| 16 | **Barcelona OpenData** | Traffic sections, transit | None | REST JSON |
| 17 | **Valencia OpenData** | Traffic sensors | None | ArcGIS REST |
| 18 | **Zaragoza OpenData** | Traffic sensors | None | REST JSON |
| 19 | **MobilityData** | 145 GTFS feeds (transit, ferries) | Optional token | CDN |
| 20 | **OpenSky Network** | Aircraft ADS-B positions | Optional auth | REST JSON |
| 21 | **aisstream.io** | AIS vessel tracking (global) | API key | WebSocket |
| 22 | **Puertos del Estado** | Spanish port catalog (WFS) | None | WFS GML |
| 23 | **OurAirports** | Runway geometry | None | CSV |
| 24 | **IPMA Portugal** | Weather alerts | None | REST JSON |
| 25 | **DGEG Portugal** | Fuel stations | None | REST JSON |
| 26 | **Mobilitat Andorra** | Cameras, incidents | None | REST JSON |
| 27 | **SASEMAR** | Maritime emergencies | None | ArcGIS REST |
| 28 | **Madrid Comunidad** | Air quality (20min) | None | JSON |
| 29 | **Cataluña XVPCA** | Air quality (daily) | None | CSV |
| 30 | **Euskadi CAPV** | Air quality (hourly) | None | JSON |
| 31 | **Andalucía SIVA** | Air quality (hourly) | None | CSV |
| 32 | **SCT Catalunya** | Traffic incidents | None | REST JSON |
| 33 | **Euskadi traffic** | Traffic incidents | None | REST JSON |

---

## 4. FRONTEND PAGES — 194 Routes → ~42,000+ URLs

### By Vertical

| Vertical | Static Routes | Dynamic/ISR Pages | Total Est. |
|----------|--------------|-------------------|-----------|
| **Home + Map** | 2 | — | 2 |
| **Traffic (incidents, panels, atascos)** | 12 | ~50 (city-specific) | ~62 |
| **Roads (carreteras, radares, cameras)** | 25 | ~500 (per road, radar, camera) | ~525 |
| **Fuel (gasolineras, precios, EV)** | 23 | ~12,500 (per station, charger) | ~12,523 |
| **Maritime (puertos, buques, zonas, ferries)** | 12 | ~30,300 (vessels ISR) | ~30,312 |
| **Aviation (aeropuertos)** | 2 | ~46 (per airport) | ~48 |
| **Railways (estaciones, líneas, cercanías)** | 8 | ~1,100 (stations + routes) | ~1,108 |
| **Transit (transporte público)** | 2 | ~87 (per operator) | ~89 |
| **Air Quality (estaciones, provincias)** | 3 | ~808 (stations + provinces) | ~811 |
| **Climate (estaciones, provincias)** | 3 | ~997 (stations + provinces) | ~1,000 |
| **Geographic (provincias, municipios, CCAA)** | 13 | ~8,200 (municipalities) | ~8,213 |
| **Province × Vertical sub-pages** | 6 | ~312 (52 prov × 6 verticals) | ~312 |
| **Intelligence (correlations, niche)** | 8 | ~100 (per road) | ~108 |
| **Predictions (fuel, trains)** | 2 | — | 2 |
| **Pulse dashboards** | 2 | ~52 (per province) | ~54 |
| **Corridors** | 2 | ~12 | ~14 |
| **Guides** | 9 | — | 9 |
| **Tolls (peajes)** | 6 | ~30 | ~36 |
| **Reports (informes, diario)** | 6 | ~365 (daily) | ~371 |
| **Analysis (estadísticas, accidentes)** | 6 | ~52 (per province) | ~58 |
| **Blog / News / Insights** | 6 | ~161 (per article) | ~167 |
| **Seasonal events** | 2 | — | 2 |
| **Exploration** | 6 | ~50 | ~56 |
| **Professional** | 5 | — | 5 |
| **Legal / About** | 5 | — | 5 |
| **Portugal / Andorra** | 3 | ~10 | ~13 |
| **Tools (calculadora, etc.)** | 3 | — | 3 |
| **TOTAL** | **~194** | **~55,500+** | **~55,700+** |

### New Pages (Phase 1-4 SEO Expansion)

| Phase | Page Types | Est. New Pages |
|-------|-----------|---------------|
| Phase 1 | Airport, station, line, ferry, port enhancement, corridor | ~1,450 |
| Phase 2 | Pulse, weather×accidents, road intel, fuel predictor, train delays, trip calc | ~260 |
| Phase 3 | Vessels, vessel types/flags, coastal zones, air quality, transit operators | ~31,000 |
| Phase 4 | Province×vertical, guides, climate stations, niche safety | ~1,320 |
| **Total new** | **22 page types** | **~34,000** |

---

## 5. API ENDPOINTS — 141 Routes

### Real-time data (12)
`/api/incidents`, `/api/v16`, `/api/panels`, `/api/cameras`, `/api/weather`, `/api/weather-alerts`, `/api/trafico/intensidad`, `/api/trafico/ciudades`, `/api/trafico/obras`, `/api/stream`, `/api/trenes/posiciones`, `/api/trenes/flota`

### Traffic analysis (15)
`/api/trafico/imd`, `/api/trafico/distribucion-horaria`, `/api/trafico/prediccion`, `/api/estaciones-aforo`, `/api/historico/*` (7 sub-routes), `/api/incidents/analytics`, `/api/incidents/stats`, `/api/incidents/timeline`

### Fuel & energy (14)
`/api/gas-stations` + 5 sub-routes, `/api/fuel-prices/*` (2), `/api/combustible/*` (2), `/api/maritime-stations` + 2 sub-routes, `/api/chargers`

### Railway (8)
`/api/trenes/estaciones`, `/api/trenes/rutas`, `/api/trenes/alertas`, `/api/trenes/stats`, `/api/trenes/estacion/[slug]`, `/api/trenes/linea/[slug]`

### Maritime (12)
`/api/maritimo` (main), `/api/maritimo/buques/[mmsi]`, `/api/maritimo/buques/tipo/[category]`, `/api/maritimo/ferries`, `/api/maritimo/ferry/[slug]`, `/api/maritimo/ports`, `/api/maritimo/ports/stats`, `/api/maritimo/puertos/[slug]/buques`, `/api/maritimo/zonas/[zone]`, `/api/maritimo/weather`, `/api/maritimo/emergencies`, `/api/maritimo/stats`

### Aviation (3)
`/api/aviacion`, `/api/aviacion/aeropuertos`, `/api/aviacion/aeropuertos/[iata]`

### Intelligence & predictions (8)
`/api/inteligencia/clima-accidentes`, `/api/inteligencia/carretera/[roadId]`, `/api/inteligencia/coste-viaje`, `/api/prediccion/combustible`, `/api/prediccion/trenes`, `/api/prediccion/congestion`, `/api/prediccion/riesgo`, `/api/pulso/[provincia]`

### Data platform (12)
`/api/accidentes/microdata`, `/api/accidentes/hotspots`, `/api/movilidad`, `/api/movilidad/corredores`, `/api/estadisticas`, `/api/estadisticas/modal`, `/api/calidad-aire`, `/api/calidad-aire/estacion/[id]`, `/api/clima/estaciones`, `/api/clima/estacion/[id]`, `/api/clima/historico`, `/api/transporte`, `/api/transporte/[operator]`

### Geographic (12)
`/api/espana`, `/api/comunidad-autonoma/*` (3), `/api/province/stats`, `/api/roads/*` (10), `/api/corredores/[slug]`

### Search (4)
`/api/search`, `/api/search/nearby`, `/api/search/resolve-location`, `/api/search/suggest`

### Billing & keys (4)
`/api/billing`, `/api/billing/webhook`, `/api/keys`, `/api/price-alerts` + unsubscribe

### Admin & system (12)
`/api/health`, `/api/redirects`, `/api/sitemap-index`, `/api/sitemap/[id]`, `/api/indexnow`, `/api/stats`, `/api/dashboard/stats`, `/api/cron/*` (2), `/api/digest/*` (3), `/api/rankings`

### External (5)
`/api/portugal/*` (3), `/api/andorra/*` (2)

---

## 6. SEARCH — 26 Typesense Collections

All with geo-search capability where location data exists.

| # | Collection | Geo | Records (approx) |
|---|-----------|-----|---------|
| 1 | pages | No | ~200 |
| 2 | incidents | Yes | ~5K active |
| 3 | weather_alerts | No | ~100 active |
| 4 | gas_stations | Yes | ~12K |
| 5 | roads | No | ~360 |
| 6 | cameras | Yes | ~1.9K |
| 7 | articles | No | ~160 |
| 8 | provinces | No | 52 |
| 9 | cities | Yes | ~3.5K |
| 10 | ev_chargers | Yes | ~12K |
| 11 | radars | Yes | ~737 |
| 12 | railway_stations | Yes | ~1.5K |
| 13 | railway_routes | No | ~1.2K |
| 14 | railway_alerts | No | ~100 active |
| 15 | zbe_zones | Yes | ~64 |
| 16 | risk_zones | Yes | ~28 |
| 17 | variable_panels | Yes | ~2.5K |
| 18 | maritime_stations | Yes | ~149 |
| 19 | portugal_stations | Yes | ~1.6K |
| 20 | traffic_stations | Yes | ~14K |
| 21 | toll_roads | No | ~17 |
| 22 | vessels | Yes | ~643 |
| 23 | ferry_routes | No | ~53 |
| 24 | transit_stops | Yes | ~115K |
| 25 | transit_routes | No | ~14.5K |
| 26 | airports | Yes | ~46 |

---

## 7. INFRASTRUCTURE

| Component | Location | Config |
|-----------|----------|--------|
| **Web app** | Coolify on hetzner-prod | Next.js 16, Docker |
| **Collectors** | Coolify on hetzner-prod | 6 containers + AIS WebSocket |
| **PostgreSQL + PostGIS** | hetzner-dev via PgBouncer | :6440, 25-conn pool |
| **Redis** | hetzner-dev | :6441 (cache + rate limiting) |
| **Typesense** | hetzner-dev | :6442 (26 collections) |
| **Tile server (nginx)** | hetzner-prod | tiles.trafico.live, PMTiles + Martin |
| **Martin (vector tiles)** | hetzner-prod | PostGIS dynamic sources |
| **Loki** | hetzner-dev | Docker log driver |
| **Sentry/GlitchTip** | hetzner-prod | Client + server + collector |
| **Cloudflare** | DNS + proxy | tiles.trafico.live proxied |

### Deploy
- `main` → production (Coolify webhook on push)
- `deploy.sh` — manual webhook fallback
- Split deployment: web app + collectors as separate Coolify apps

---

## 8. NAVIGATION STRUCTURE

### Header Mega Menu (6 panels)
1. **Tráfico** — En directo, Incidencias, Cámaras
2. **Carreteras** — Por tipo, Infraestructura, Peajes, Datos
3. **Combustible** — Precios, Gasolineras, Eléctricos, Portugal, Marítimo
4. **Marítimo** — Puertos y navegación, Buques y tráfico, Meteorología y seguridad
5. **Explorar** — España, Portugal y Andorra, Transporte multimodal, Inteligencia, Ciudades
6. **Profesional** — Flotas, Herramientas, API y datos

### Footer (6 columns matching mega menu + city strip + legal)

---

## 9. KNOWN DATA GAPS

| Gap | Impact | Fix Required |
|-----|--------|-------------|
| AccidentMicrodata vehicle booleans all false | Motorcycle/truck/cyclist pages show fallback banner | Update DGT XLSX parser to map vehicle type columns |
| VesselPosition only 2 records | AIS collector running but data pruned aggressively | Check AIS collector retention policy |
| AEMET backfill gaps (2002-2004, 2013-2014) | Climate pages missing these years | Backfill containers running |
| Madrid Comunidad air quality station mapping | ~20 stations missing | Low priority |
| Airport passenger stats show "no data" on cached pages | ISR cache | Revalidates automatically |

---

## 10. WHAT'S NOT BUILT YET

| Feature | Effort | Impact |
|---------|--------|--------|
| Auto-generated weekly reports | Medium | High (recurring content) |
| Affiliate integrations (Trainline, Repsol, DirectFerries) | Low | Revenue |
| API premium activation (Stripe) | Low | Revenue |
| MCP server npm publish | Low | Distribution |
| Individual vessel pages at full scale (30K+ ISR) | Done (code exists) | Depends on AIS data volume |
| EMT Madrid bus GPS | Needs API key | Additional transit data |
| FGC Catalunya GTFS-RT | Needs registration | Additional transit data |
