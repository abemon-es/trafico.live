# Data Surface Audit — trafico.live
**Date:** 2026-04-19 | **Auditor:** Expert panel — Data surface agent

Audits the plan's "65K programmatic URLs" claim against actual Prisma models, collector freshness, and entity row counts.

---

## Section 1: Landing Feasibility Matrix — Vertical by Vertical

| Vertical | Template | URLs Claimed | Entity rows today (est.) | Freshness | PT parity? | Thin-content risk |
|---|---|---|---|---|---|---|
| Meteo ES | `/meteo/[slug]` | 2,052 | 202 municipios with 7-day AEMET forecast (`WeatherForecast`), 52 provinces (`Province`), ~900 climate stations (`ClimateStation`) | Forecast 4x/day (`aemet-forecast`), climate daily (`aemet-historical`) | **No** — see below | HIGH for long-tail municipios beyond top-202 |
| Meteo PT | `/meteo/pt/[slug]` | 326 (18 + 308) | 18 district-level IPMA warning areas only (`PortugalWeatherAlert`) — **zero per-municipio forecast rows** | 6h alerts only (`portugal-weather`) | Critical gap | CRITICAL — 308 concelhos have zero data |
| Calidad aire ES | `/calidad-aire/[slug]` | 500 | 565 stations with ICA readings (`AirQualityStation`, `AirQualityReading`); CCAA extensions add Madrid/Cat/Euskadi/Andalucía | Hourly (`air-quality`, `air-quality-ccaa`) | **No** — zero PT AQ data | LOW for top cities; MEDIUM for small municipios |
| Calidad aire PT | `/calidad-aire/pt/[cidade]` | 200 | **Zero rows.** APA collector does not exist. `AirQualityStation.province` only maps ES INE codes. | — | Does not exist | CRITICAL — 0 data, unshippable |
| Ferroviario ES | `/trenes/estacion/[slug]` | 2,154 | 1,506 unique Renfe stations (`RailwayStation`), 1,248 routes (`RailwayRoute`), live fleet 115 trains (`RenfeFleetPosition`) | GTFS-RT 2min (`renfe-alerts`, `renfe-ld-realtime`, `renfe-positions`) | Partial | LOW for major stations; HIGH for secondary stops |
| Ferroviario PT | `/trenes/pt/estacao/[slug]` | 200 | **Zero dedicated rows.** No CP (Comboios de Portugal) GTFS collector. `transit-gtfs` ingests ~20 PT GTFS feeds but CP is not confirmed. | — | Does not exist | CRITICAL — aspirational only |
| Aviación ES+PT | `/aviacion/aeropuertos/[iata]` | 64 | 42 AENA airports (`Airport`), live aircraft (`AircraftPosition`), annual stats (`AirportStatistic`), 103 runways static | 15min OpenSky (`opensky`), daily stats (`aena-stats`) | 18 PT airports seeded? Not confirmed in `Airport` table (only `isAena=true` filter) | LOW for ES top airports; MEDIUM for PT |
| Gasolineras ES | `/gasolineras/[id]` | 12,294 | ~11,000–12,000 ES stations (`GasStation`) with live prices | 3x daily 06/13/20h (`gas-station`) | N/A | LOW — rich per-station data |
| Gasolineras ES ciudad | `/gasolineras/[ciudad]` | 2,000 | Aggregated from `GasStation.municipality` — data exists | 3x daily (derived) | N/A | LOW |
| Combustiveis PT | `/combustiveis/[distrito]` | 18 | ~3,000 PT stations (`PortugalGasStation`) across 18 districts with multi-fuel prices | 3x daily 08/15/22h (`portugal-fuel`) | **Yes — 18 districts fully covered** | LOW for districts; MEDIUM for per-station |
| Marítimo puertos | `/maritimo/puertos/[slug]` | 247 ES+PT | 197 ES ports (`SpanishPort`), ~40 state ports with INSPIRE polygons (`puertos-estado`) | AIS always-on, voyage detector hourly, SASEMAR 15min | Minimal PT port data | MEDIUM — AIS is rich but port-level SEO content thin |
| Tráfico carreteras | `/carreteras/[roadId]` | 1,000 | Roads (`Road`), 14,741 flow segments (`TrafficFlow`), 14,400 stations (`TrafficStation`), incidents 2min | Weekly IMD (`imd`), incidents 2min, cameras daily | **No PT road data** | MEDIUM — IMD data only to 2022 |
| Cámaras | `/camaras/[id]` | 1,200 | ~1,200 DGT cameras (`Camera`) with feed URLs | Daily refresh (`camera`) | No PT | LOW — image + location suffices |
| Radares | `/radares/[id]` | 1,800 | `Radar` table populated weekly (`radar`) | Weekly | No PT | LOW — static infra data sufficient |
| Paneles VMD | `/paneles/[id]` | 700 | `VariablePanel` with live messages | 5min (`panel`) | No PT | LOW — live message + context |
| Aforos | `/estaciones-aforo/[id]` | 14,400 | `TrafficStation` 14,400 rows, `TrafficFlow` 14,741 segments | Weekly for static, monthly for new IMD years | No PT | HIGH — IMD data to 2022 only; thin without trend analysis |
| Transporte público | `/transporte-publico/[operador]/[parada]` | 8,000 | `TransitStop` — 145 ES + ~20 PT GTFS feeds weekly; stop count likely 50K+ but quality varies | Weekly GTFS (`transit-gtfs`), 1min GTFS-RT for EMT/TMB (`transit-realtime`) | Partial PT (via MobilityData catalog) | HIGH for small stops — minimal per-stop content |
| Ciudad mega-hubs | `/ciudad/[slug]` | 300 | Page exists as hub (`/ciudad/page.tsx`), no per-slug `[slug]` template — **template not built** | Cross-vertical aggregation | Limited | HIGH — page is a list, not per-city |
| Provincias | `/provincias/[code]` | 52 | `Province` 52 rows, `LocationStats` with cached aggregates | Static + daily refresh | N/A ES only | LOW for major; MEDIUM for minor |

**Key schema line citations:**
- `WeatherForecast` model: `prisma/schema.prisma:2591` — `stationId` maps to ClimateStation (AEMET), no IPMA equivalent
- `PortugalWeatherAlert` model: `prisma/schema.prisma:236` — 18 IPMA area codes only, no per-municipio forecast
- `PortugalGasStation` model: `prisma/schema.prisma:254` — 18 districts, full price data
- `AirQualityStation` model: `prisma/schema.prisma:2532` — ES only, `province` uses INE codes
- `RailwayStation` model: `prisma/schema.prisma:1656` — `source` field defaults to `"RENFE_GTFS"`, no CP Portugal rows
- `Airport` model: `prisma/schema.prisma:2478` — `isAena` Boolean; PT airports not confirmed populated
- `TransitOperator` model: `prisma/schema.prisma:2241` — `country: "ES" | "PT"` — PT feeds included in weekly sync
- `TrafficStation` model: `prisma/schema.prisma:1002` — 14,400 rows, last year = 2022

---

## Section 2: Thin-Content Risks

**CRITICAL — do not ship without additional data:**

1. `/meteo/pt/[slug]` for 308 concelhos: The `portugal-weather` collector (schema.prisma:236 `PortugalWeatherAlert`) only fetches IPMA area-level warnings for 24 zones (18 districts + islands), stored as alert events — not forecast data. There is no per-municipio IPMA forecast collector. The plan claims "326 PT meteo landings at 1h freshness" but today we have zero per-municipio forecast rows for Portugal. Shipping 308 concelho pages with only district-level alerts = textbook thin content.

2. `/calidad-aire/pt/[cidade]` for 200 PT cities: No APA (Agência Portuguesa do Ambiente) collector exists. The `AirQualityStation` table only has ES data. Zero PT air quality rows. Every PT air quality page would be content-free.

3. `/trenes/pt/estacao/[slug]` for 200 PT stations: No CP (Comboios de Portugal) GTFS collector. The `transit-gtfs` collector ingests PT feeds from MobilityData but CP may not be in that catalog with full stop-time data. `RailwayStation` source defaults to `RENFE_GTFS`. No PT train departure boards possible today.

4. `/estaciones-aforo/[id]` for 14,400 stations: IMD data only through 2022 (`TrafficStation.year`). A station page with a single IMD figure from 2022 and no current readings is thin unless paired with incident history or climate context. These pages need trend charts to survive quality review.

5. `/transporte-publico/[operador]/[parada]` for ~8,000 stops: GTFS stop data is imported but GTFS-RT is limited to EMT Madrid and TMB Barcelona. For all other operators, per-stop pages would show static timetable only — no live arrivals. Pages for Zaragoza, Sevilla, Bilbao stops lack real-time content.

**Need LLM prose to survive quality review:**
- `/meteo/pt/[slug]` for any PT entity beyond 18 districts
- `/municipio/[slug]` for 8,131 ES + 308 PT if the page only shows aggregated stats
- `/carreteras/[roadId]` for minor roads — only IMD data, no prose context
- `/estaciones-aforo/[id]` for secondary/coverage stations (type `COVERAGE` = 2 working days of data per year)
- `/buques/[mmsi]` for individual vessels — AIS positions are rich but vessel entity pages need contextual prose about ship type, routes, and history

**Sufficient data without LLM prose:**
- `/gasolineras/[id]` — price, location, history, schedule: 5+ data points
- `/trenes/estacion/[slug]` for top 300 Renfe stations — live board, route list, delay stats
- `/aviacion/aeropuertos/[iata]` for 46 AENA airports — live positions, pax stats, runways
- `/calidad-aire/[ciudad]` for the 500 ES stations — ICA readings, pollutant breakdown
- `/carreteras/[roadId]` for major nacional/autopista roads — IMD, incidents, cameras, radars

---

## Section 3: Unique Cross-Vertical Moat

The plan claims "nobody crosses meteo + tráfico + trenes + vuelos + combustible + aire". Validation for `/ciudad/madrid`:

| Vertical | Data available for Madrid today | Live? | Source model |
|---|---|---|---|
| Tráfico / incidencias | Yes — DGT incidents, 6,117 Madrid sensors | 2min | `TrafficIntensity`, `TrafficIncident` |
| Combustible | Yes — `GasStation` by `province=28`, price rankings | 3x daily | `GasStation`, `FuelPriceDailyStats` |
| Trenes Cercanías | Yes — C1-C10 live positions, alerts | 2min | `RenfeFleetPosition`, `RailwayAlert` |
| Trenes LD/AVE | Yes — 115 trains GPS + delay | 2min | `RenfeFleetPosition` |
| Aviación MAD | Yes — live aircraft, AENA stats | 15min | `AircraftPosition`, `Airport` |
| Calidad del aire | Yes — 565 national stations, Madrid subset | 1h + 20min CCAA | `AirQualityStation`, `AirQualityReading` |
| Meteo AEMET | Partial — 202 municipios include Madrid | 4x daily forecast | `WeatherForecast`, `WeatherAlert` |
| Marítimo | N/A (Madrid is inland) | — | — |
| Transporte público Metro Madrid | Yes — Metro Madrid GTFS + GTFS-RT EMT | 1min | `TransitVehiclePosition` |
| ZBE Madrid | Yes — `ZBEZone` with polygon | Weekly | `ZBEZone` |
| IMD / Aforos | Yes — 14,400 stations include Madrid province | Weekly | `TrafficStation`, `TrafficFlow` |

**Verdict:** For Madrid, 8+ verticals simultaneously. Cross-vertical moat is **real for Madrid and Barcelona**. For cities outside top ~20, coverage degrades quickly — fuel (full), incidents (full), but AEMET only covers 202 municipios and transit GTFS-RT only covers EMT/TMB.

**What no competitor has:** Cercanías GPS + LD fleet GPS + incident map + fuel prices + air quality + ZBE status, all for one city, in one page, in Spanish. The data is already flowing. The only missing piece is the `/ciudad/[slug]` per-city template (currently `/ciudad/page.tsx` is a city-list hub).

---

## Section 4: Realistic URL Count vs. 65K Claim

| Vertical | Claimed URLs | Realistic today | Blocker |
|---|---|---|---|
| `/meteo/[slug]` ES | 2,052 | **202** | aemet-forecast only covers 202 municipios |
| `/meteo/pt/[slug]` | 326 | **18** | No IPMA per-municipio collector |
| `/calidad-aire/[slug]` ES | 500 | **500** | Ready |
| `/calidad-aire/pt/` | 200 | **0** | No APA collector |
| `/trenes/estacion/[slug]` ES | 2,154 | **1,506** | Ready |
| `/trenes/pt/estacao/[slug]` | 200 | **0** | No CP collector |
| `/aviacion/aeropuertos/[iata]` | 64 | **42** | PT airports uncertain |
| `/gasolineras/[id]` | 12,294 | **~11,000–12,000** | Ready |
| `/gasolineras/[ciudad]` | 2,000 | **~800–1,000** | Long-tail thin |
| `/combustiveis/[distrito]` PT | 18 | **18** | Ready |
| `/combustiveis/[id]` PT | 3,000 | **~3,000** | Ready |
| `/carreteras/[roadId]` | 1,000 | **~500** | Minor roads thin |
| `/radares/[id]` | 1,800 | **1,800** | Ready |
| `/camaras/[id]` | 1,200 | **1,200** | Ready |
| `/paneles/[id]` | 700 | **700** | Ready |
| `/estaciones-aforo/[id]` | 14,400 | **~3,000** non-thin | 11,400 coverage stations too thin |
| `/maritimo/puertos/[slug]` | 247 | **197** ES ports | PT ports minimal |
| `/municipio/[slug]` | 8,439 | **~500** non-thin | Most municipios lack multi-vertical data |
| `/ciudad/[slug]` | 300 | **0** | Template not built |
| `/transporte-publico/[op]/[parada]` | 8,000 | **~2,000** | Only EMT/TMB GTFS-RT |
| `/provincias/[code]` | 52 | **52** | Ready |

**Realistic total: approximately 14,000–16,000 URLs with enough data to avoid thin-content penalties.**

The 65K claim requires: the `/estaciones-aforo/` pages (14,400 alone), the full municipal meteo cascade (8,131 ES + 308 PT), and all 8,000 transit stops — all of which would be thin without LLM-generated prose or additional data sources.

- **Without LLM enrichment: ~15,000 defensible URLs.**
- **With LLM prose on top of real data: potentially 30,000–35,000** (still far from 65K).

---

## Section 5: Top 5 Data Gaps to Close Before Sprint 2

**Gap 1 — IPMA per-municipio forecast collector** (blocks 308 PT meteo landings)
The `portugal-weather` collector only fetches district-level warnings. IPMA provides `https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/{globalIdLocal}.json` for 295 Portuguese localities. A new collector feeding a `PortugalWeatherForecast` model (or reusing `WeatherForecast`) would unlock all 308 PT municipio pages. One-day build.

**Gap 2 — `/ciudad/[slug]` per-city template** (blocks 300 mega-hub URLs)
No `src/app/ciudad/[slug]/page.tsx` exists. The data to populate it exists across 8+ verticals for Madrid/Barcelona. This is the highest-leverage single template — each hub page targets 15M monthly searches. Sprint 2 should include at minimum 20 top-city hubs.

**Gap 3 — APA Portugal air quality collector** (blocks 200 PT air quality pages)
APA publishes air quality data at `https://qualar.apambiente.pt/`. No collector exists. `AirQualityStation` model could be reused with a PT-flag column.

**Gap 4 — CP (Comboios de Portugal) GTFS or equivalent PT rail data** (blocks 200 PT train station pages)
Confirm: does the weekly `transit-gtfs` run import CP stops into `TransitStop`? If yes, the data exists but the page template is missing. If no, a dedicated CP GTFS collector is needed before Sprint 4.

**Gap 5 — AEMET forecast expansion beyond 202 municipios** (limits ES meteo to 202 landing pages)
`municipios.json` has 202 entries. AEMET API supports ~8,131 municipios but rate-limited to 1 req/s (202 already takes ~7 min). For Sprint 2 target of 2,000 top municipios, the collector needs parallelization or multi-cron split, or a bulk endpoint. Without this, `/meteo/[slug]` for Vigo, Huelva, Valladolid (plan's priority quick-wins) returns 404 or falls back to province-level only.

---

**Files audited:**
- `prisma/schema.prisma` — 78 models, 2,795 lines
- `CLAUDE.md` — full stack inventory
- `docker-compose.collectors.yml` — container config
- `services/collector/crontabs/{realtime,frequent,fuel,daily,weekly}`
- `services/collector/tasks/portugal-weather/collector.ts`
- `services/collector/tasks/portugal-fuel/collector.ts`
- `services/collector/tasks/aemet-forecast/collector.ts` + `municipios.json`
- `services/collector/tasks/transit-gtfs/collector.ts`
- `src/app/` — page structure survey
