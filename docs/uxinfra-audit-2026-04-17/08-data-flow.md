# Data Flow Audit — trafico.live
**Date:** 2026-04-17  **Author:** automated audit via Claude Code

---

## Summary Table (30 Domains)

Legend: OK = fully working · STALE = data older than threshold · EMPTY = 0 rows · 404 = endpoint missing · NOUI = no UI page consuming the data · CSR = client-side rendered (WebFetch shows loading shell, not a real empty state)

| # | Domain | Collector | Crontab | DB Table | Rows | Latest | API Endpoint | API Status | UI Page | UI Renders? | Break? |
|---|--------|-----------|---------|----------|------|--------|-------------|------------|---------|-------------|--------|
| 1 | Traffic incidents | `incident` | */2 | TrafficIncident | 752,601 | 2026-04-17 | `/api/incidents` | 200, data | `/incidencias` | CSR (SWR) | **OK** |
| 2 | V16 beacons | `v16` | */2 | V16BeaconEvent | 1,042 | 2026-04-17 | `/api/v16` | 200, 22 active | `/mapa` (layer) | CSR map | **OK** |
| 3 | Traffic cameras | `camera` | 0 4 daily | Camera | 1,917 | 2026-04-17 | `/api/cameras` | 200, data | `/camaras` | CSR (SWR) | **OK** |
| 4 | Radars | `radar` | 0 3 Sun | Radar | 737 | 2026-04-12 | `/api/radars` | 200, 737 | `/radares` | SSR (Prisma, 737 rendered) | **OK** |
| 5 | Variable panels | `panel` | */5 | VariablePanel | 2,463 | 2026-04-17 | `/api/panels` | 200, data | `/mapa` (layer) | CSR map | **OK** |
| 6 | Gas stations | `gas-station` | 0 6,13,20 | GasStation | 12,319 | 2026-04-17 | `/api/gas-stations` | 200, data | `/gasolineras` | SSR — 11,797 stations rendered | **OK** |
| 7 | Gas price history | `gas-station` | 0 6,13,20 | GasStationPriceHistory | 189,566 | 2026-04-17 | `/api/gas-stations/[id]/history` | 200, data | per-station detail | SSR | **OK** |
| 8 | EV chargers | `charger` | 0 6 daily | EVCharger | 12,075 | 2026-04-17 | `/api/chargers` | 200, 12,075 | `/carga-ev` | CSR (SWR) — shows count | **OK** |
| 9 | Madrid sensors | `intensity` | */5 | TrafficIntensity | 2,361,847 | 2026-04-17 | `/api/trafico/intensidad` | 200, 200 sensors | `/intensidad` | CSR (SWR) | **OK** |
| 10 | IMD stations | `imd` | 0 7 Sun | TrafficStation | 14,436 | — (no ts col) | `/api/estaciones-aforo` | 200, data | `/estaciones-aforo` | CSR (SWR) | **OK** |
| 11 | IMD flows | `imd` | 0 7 Sun | TrafficFlow | 14,741 | year: 2019 | `/api/trafico/imd` | 200, data | `/intensidad` | CSR | **STALE — data ends 2019** |
| 12 | Weather alerts | `weather` | 0 * (hourly) | WeatherAlert | 18,932 | 2026-04-17 | `/api/weather` | 200, 3,040 active | home strip + `/alertas-meteo` | SSR | **OK** |
| 13 | Railway stations | `renfe-gtfs` | 0 5 Sun | RailwayStation | 1,504 | 2026-04-17 | `/api/trenes/estaciones` | 200, data | `/trenes/estaciones` | CSR (SWR) | **OK** |
| 14 | Railway routes | `renfe-gtfs` | 0 5 Sun | RailwayRoute | 912 | 2026-04-17 | `/api/trenes/rutas` | 200, data | `/trenes/lineas` | CSR (SWR) | **OK** |
| 15 | Railway alerts | `renfe-alerts` | */2 | RailwayAlert | 23,798 | 2026-04-17 | `/api/trenes/alertas` | 200, data | `/trenes` ticker | CSR (SWR) | **OK** |
| 16 | Railway live fleet | `renfe-ld-realtime` + `renfe-positions` | */2 | RenfeFleetPosition | 281,900 | 2026-04-17 | `/api/trenes/posiciones` | 200, ~115 trains | `/trenes` map | CSR (SWR) | **OK** |
| 17 | Vessels | `ais-stream` | always-on | Vessel / VesselPosition | 69,988 / 114M | 2026-04-17 | `/api/maritimo` | 200, GeoJSON vessels | `/maritimo` | CSR (partial — voyages empty) | **OK (AIS flowing)** |
| 18 | Ports | `puertos-estado` | weekly | SpanishPort | 181 | 2026-04-03 | `/api/maritimo/ports` | 200, 147 ports | `/maritimo/puertos` | SSR (Prisma) | **OK** (note: CLAUDE.md names endpoint `/api/maritimo/puertos` — actual path is `/api/maritimo/ports`) |
| 19 | Aircraft positions | `opensky` | */15 | AircraftPosition | 816 | 2026-04-17 | `/api/aviacion` | 200, 379 aircraft | `/aviacion` | SSR + CSR — 379 rendered | **OK** |
| 20 | Airports | `aena-stats` | 30 4 daily | Airport | 46 | — (no ts col) | `/api/aviacion/aeropuertos` | 200, 46 airports | `/aviacion/aeropuertos` | **404 — page missing** | **NOUI: /aviacion/aeropuertos has no index page.tsx** |
| 21 | Transit operators | `transit-gtfs` | 0 6 Sun | TransitOperator | 160 | 2026-04-17 | `/api/transporte` | 200, data | `/transporte-publico` | CSR (SWR) | **OK** |
| 22 | Transit routes | `transit-gtfs` | 0 6 Sun | TransitRoute | 23,688 | 2026-04-17 | `/api/transporte/[op]` | 200, data | `/transporte-publico/[op]` | CSR (SWR) | **OK** |
| 23 | Transit stops | `transit-gtfs` | 0 6 Sun | TransitStop | 225,599 | 2026-04-17 | — no dedicated endpoint | — | — | **NOUI: stops not exposed as standalone API/page** |
| 24 | Air quality stations | `air-quality` | 0 * (hourly) | AirQualityStation | 758 | 2026-04-03 | `/api/calidad-aire` | 200, data | `/calidad-aire` | SSR | **STALE — stations 14d stale (expected hourly)** |
| 25 | Air quality readings | `air-quality` | 0 * (hourly) | AirQualityReading | 2,505 | 2026-04-03 | `/api/calidad-aire` (latestReading join) | 200, data from join | `/calidad-aire` | SSR (via station join) | **STALE — 0 new readings since 2026-04-03** |
| 26 | Climate stations | `aemet-historical` | 0 8 daily | ClimateStation | 947 | — (no ts col) | `/api/clima/estaciones` | 200, GeoJSON | — (no page) | **NOUI: no dedicated page** | **ORPHAN** |
| 27 | Climate records | `aemet-historical` | 0 8 daily | ClimateRecord | 4,467,756 | 2026-04-12 | `/api/clima/historico` | 200, data | — (no page) | **NOUI: no dedicated page** | **ORPHAN** |
| 28 | Accident microdata | `accident-microdata` | commented-out | AccidentMicrodata | 466,123 | 2026-04-03 (importedAt) | `/api/accidentes/microdata` | 200, data | `/puntos-negros` (partial — hotspots rendered via `/api/accidentes/hotspots`) | SSR | **OK (collector one-shot, data static 2019-2023)** |
| 29 | Mobility O-D | `mobility-od` | one-shot only | MobilityODFlow | 20,722 | 2024-01-07 | `/api/movilidad` | **EMPTY when using default date** | `/estadisticas-transporte` (corredores section) | **EMPTY — API defaults to yesterday, data ends 2024-01-07** | **STALE + API LOGIC BUG** |
| 30 | SASEMAR emergencies | `sasemar` | */15 (frequent) | MaritimeEmergency | 2,140 | imported 2026-04-17 | `/api/maritimo/emergencies` | **200 but empty: `{"emergencies":[],"count":0}`** | `/maritimo/seguridad` | Page says "en proceso de importación" | **API LOGIC BUG — 30-day window excludes all historical data (latest occurredAt = 2023-03-20)** |

---

## Broken Chains — Detail

### B1. Air Quality — STALE (Domains 24, 25)

**Severity:** HIGH — A core page (`/calidad-aire`) shows 14-day-old readings.

- `air-quality` collector is scheduled at `0 * * * *` (hourly) in the realtime crontab
- DB: `AirQualityStation.updatedAt` = 2026-04-03, `AirQualityReading.createdAt` MAX = 2026-04-03, **0 readings after 2026-04-10**
- All containers were restarted at ~16:34 on 2026-04-17 — collector was recently redeployed; next hourly run is pending
- The page at `/calidad-aire` shows SSR station data with timestamps like "3/4, 14:30" (April 3) — stale to users
- The CCAA subcolector (`air-quality-ccaa`) is in the daily crontab but runs `0 8 * * *` as `aemet-historical`, not `air-quality-ccaa` — check if `air-quality-ccaa` has its own crontab entry
- **Root cause:** Likely the MITECO source URL changed or returns errors silently; collector may have stopped writing after a source API change on ~April 3

**Fix:** Check `air-quality` collector logs after the next hourly run. If still failing, debug MITECO endpoint `ica.miteco.es/datos/ica-ultima-hora.csv` directly.

---

### B2. Mobility O-D Corredores — STALE + API Bug (Domain 29)

**Severity:** HIGH — `/estadisticas-transporte` corredores section always empty in production.

- `MobilityODFlow` has 20,722 rows but MAX date is `2024-01-07` (initial one-shot backfill only)
- `/api/movilidad/corredores` defaults to `yesterday` (2026-04-16) — no data exists for any recent date
- `/api/movilidad` also requires explicit `from`/`to` params matching the 2024 data range
- The `mobility-od` collector is a one-shot backfill with **no recurring schedule** in any crontab
- The `/estadisticas-transporte` page's "Top corredores" section calls `/api/movilidad/corredores?limit=10&exclude_self=true` — always returns `{"data":[]}`

**Fix:** Either (a) add `mobility-od` to a monthly/quarterly crontab, OR (b) make `/api/movilidad/corredores` fall back to the latest available date when `yesterday` has no data.

---

### B3. SASEMAR Emergencies — API Filter Bug (Domain 30)

**Severity:** MEDIUM — `MaritimeEmergency` table has 2,140 historical records but API always returns empty.

- `sasemar` collector runs `*/15` (every 15 min) and shows `importedAt: 2026-04-17` — collector IS running and upserting
- But `occurredAt` for all records is historical (2019-2023), max `2023-03-20`
- `/api/maritimo/emergencies` applies `WHERE occurredAt >= NOW() - 30 days` — this **permanently excludes all data**
- The `/maritimo/seguridad` page correctly shows "en proceso de importación" — but the data IS imported; the filter is wrong

**Fix:** Remove or make configurable the 30-day filter for this historical dataset. Possible: add `?historical=true` param or default to no time filter for `MaritimeEmergency`.

---

### B4. Airport Catalog — Missing UI Page (Domain 20)

**Severity:** MEDIUM — `/aviacion/aeropuertos` returns 404.

- `Airport` table: 46 rows, `AirportStatistic` table: 2,811 rows (stats through 2025-01)
- `/api/aviacion/aeropuertos` returns 200 with 46 airports
- **No `page.tsx` exists at `/src/app/aviacion/aeropuertos/`** — only `/aeropuertos/[iata]/page.tsx` exists
- CLAUDE.md references `/aviacion/aeropuertos` as a page but it was never created

**Fix:** Create `/src/app/aviacion/aeropuertos/page.tsx` listing the 46 airports, linking to per-airport detail pages.

---

### B5. IMD Flows — Stale Year (Domain 11)

**Severity:** LOW-MEDIUM — `TrafficFlow` data ends at year 2019.

- 14,741 flow segments exist but MAX year is 2019
- The `imd` collector runs weekly (Sunday 07:00) and should import 2022 data (visor static GeoJSON)
- The ArcGIS REST API covers 2017-2019; the 2022 visor GeoJSON is a separate source
- `/api/trafico/imd` returns data but only for years ≤ 2019 — 2022 segments are absent

**Fix:** Verify `imd` collector successfully processes the 2022 visor GeoJSON source. Check weekly logs after next Sunday run.

---

### B6. Climate Data — Orphan (Domains 26, 27)

**Severity:** LOW — Data exists, API works, no UI page consumes it.

- `ClimateStation`: 947 rows, `ClimateRecord`: 4,467,756 rows (latest: 2026-04-12)
- `/api/clima/estaciones` and `/api/clima/historico` both return valid data (200, populated)
- **No dedicated page** in `src/app/` uses these endpoints
- Climate data is referenced in CLAUDE.md but no route exists for `/clima` or similar

**Fix:** Create a `/clima` page or integrate climate station data into the province detail pages (`/provincia/[slug]`).

---

### B7. Transit Stops — No API Exposure (Domain 23)

**Severity:** LOW — 225,599 transit stops in DB with no standalone API endpoint or page.

- Stops are used within `/api/transporte/[op]` responses as embedded data
- No `/api/transporte/stops` or map layer exposing stop geometry
- Stop density map would be a natural companion to the transit operators page

**Fix:** This is a feature gap, not a break. Low priority.

---

## Cross-Cutting Issues

### CollectorHeartbeat Table Missing
Every collector run throws `P2021: Table 'public.collector_heartbeats' does not exist` after running typesense-sync. This is non-blocking (heartbeat is best-effort) but noisy and may mask real errors.

**Fix:** Run `npm run db:migrate` or `prisma migrate deploy` to create the missing `CollectorHeartbeat` table.

### npm Notice Noise
Every collector run outputs 4 lines of `npm notice New major version of npm available! 10.9.7 -> 11.12.1`. Adds ~40 log lines per cron cycle. Fix: update npm in the collector Dockerfile.

### AirportStatistic — 2025 Data Gap
Latest `AirportStatistic.periodStart` = 2025-01-01 (Eurostat AVIA_PAOA lags ~6 months). Expected. Low priority.

---

## Prioritized Fix List

| Priority | Domain | Break Type | Fix |
|----------|--------|------------|-----|
| 1 | Air quality readings (24-25) | Silent data drought (14d stale) | Debug `air-quality` collector; check MITECO CSV source |
| 2 | Mobility O-D corredores (29) | Stale data + API logic bug | Add date fallback in `/api/movilidad/corredores` OR re-schedule collector |
| 3 | SASEMAR emergencies (30) | API logic bug | Remove 30-day `occurredAt` filter; add `?historical=true` or remove filter |
| 4 | Airport catalog page (20) | Missing UI | Create `/src/app/aviacion/aeropuertos/page.tsx` |
| 5 | CollectorHeartbeat table | DB migration missing | `prisma migrate deploy` in prod |
| 6 | IMD flows year (11) | Stale data | Verify 2022 visor GeoJSON import in `imd` collector |
| 7 | Climate data — orphan (26-27) | NOUI | Create `/clima` route or integrate into province pages |

---

## Summary

- **Fully working:** 22 of 30 domains (73%)
- **Broken chains:** 8 of 30 (27%)
  - 2 × Stale data (air quality readings, IMD flows)
  - 2 × API logic bug that returns empty despite data existing (SASEMAR 30-day filter, mobility O-D date default)
  - 2 × Orphan data (climate stations/records — data + API work but no UI)
  - 1 × Missing UI page (airports catalog)
  - 1 × No API exposure (transit stops)
- **Where breaks concentrate:** API layer (2 logic bugs) and UI layer (2 missing/no pages) — collector and DB layers are mostly healthy
- **Top 5 for launch readiness:** Air quality staleness, Mobility O-D corredores empty, SASEMAR filter bug, airports 404 page, CollectorHeartbeat migration
