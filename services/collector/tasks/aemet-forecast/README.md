# aemet-forecast collector

Fetches AEMET 7-day daily municipal weather forecasts for ~200 representative Spanish municipios.

## Source

**AEMET OpenData** — https://opendata.aemet.es/opendata/api  
License: CC-BY 4.0  
Auth: API key via `AEMET_API_KEY` environment variable (same key used by `aemet-historical`)

## API pattern

AEMET uses a mandatory two-step fetch:

1. `GET /prediccion/especifica/municipio/diaria/{municipio_code}?api_key=KEY`  
   Returns `{ datos: "https://opendata.aemet.es/opendata/sh/..." }`

2. `GET {datos URL}` — returns the actual forecast JSON array

Both steps count toward rate limits.

## Cadence

Every 6h (cron entry managed by team3-3.1 in `docker-compose.collectors.yml`).  
AEMET refreshes municipal daily forecasts approximately 4×/day.

## Throttling

- AEMET free tier: ~50 req/min sustained (official), ~1 req/s observed safe limit  
- Collector enforces **1100ms sleep** between each step-1 request  
- Each municipio = 2 HTTP requests (step-1 + step-2 datos URL)  
- 202 municipios × 2 requests × 1.1s ≈ **~7 min** total runtime  
- Hard constraint: must finish in < 15 min

## 429 handling

- On 429 at step-1: retry once after 5s backoff  
- On 429 at step-2: retry once after 10s backoff  
- If still 429 after retry: skip municipio and continue

## Municipios scope (S0)

202 municipios covering:
- All 50 provincial capitals
- Top-50 most populated cities
- At least 1 per autonomous community (including Ceuta, Melilla, Canarias, Baleares)
- Major coastal/tourist destinations

Full list: `municipios.json`

## Database target

Table: `WeatherForecast` (Prisma model `weatherForecast`)  
Unique key: `(stationId, validAt)` where `stationId` = INE municipio code  
Horizon: days 0..6 (horizonHours = 0, 24, 48, 72, 96, 120, 144)

## Logging

Structured JSON lines to stdout, parseable by Loki:
```json
{"level":"info","task":"aemet-forecast","municipio":"28079","name":"Madrid","status":"ok","rows":7,"duration_ms":1240,"ts":"2026-04-17T06:00:01Z"}
```

## API endpoint

`GET /api/meteo/forecast?municipio=28079` — see `src/app/api/meteo/forecast/route.ts`
