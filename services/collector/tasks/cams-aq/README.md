# CAMS Air Quality Forecast Collector

Fetches 5-day air quality forecasts from the Copernicus Atmosphere Monitoring Service (CAMS) for 50 Spanish provincial capital grid points.

## Source

- **Provider:** ECMWF / Copernicus Atmosphere Monitoring Service (CAMS)
- **Primary API:** [CAMS Atmosphere Data Store (ADS)](https://ads.atmosphere.copernicus.eu/api)
  - Dataset: `cams-europe-air-quality-forecasts`
  - Auth: `CAMS_API_KEY` env var (format: `UID:API_KEY` as shown in ADS account)
- **Public fallback:** CAMS Regional AQ API (`api.raqsys.atmosphere.copernicus.eu`) — no auth required
- **Last-resort fallback:** Latest MITECO station readings (persistence forecast for the province)

## Authentication

Register at https://ads.atmosphere.copernicus.eu/ and set:

```env
CAMS_API_KEY=<UID>:<API-KEY>
```

If `CAMS_API_KEY` is absent, the collector emits a heartbeat `"error"` with `skip_reason: "no CAMS_API_KEY"` and exits cleanly (exit code 0 — non-fatal).

## Cadence

Every 12 hours (`0 0,12 * * *`). CAMS Europe forecasts are issued twice daily (00 UTC and 12 UTC runs).

## Grid Points

50 points in `gridpoints.json` — one per Spanish province capital, on the CAMS 0.1° grid. Fields: `lat`, `lon`, `province` (INE 2-digit code), `name`.

## ICA Derivation Rules

Worst-component rule per forecast slot (Spanish RD 102/2011 + EEA CAQI mapping, 6-level scale):

| Pollutant | 1 (Buena) | 2 (Razonable) | 3 (Moderada) | 4 (Mala) | 5 (Muy mala) | 6 (Pésima) |
|-----------|-----------|----------------|--------------|----------|---------------|------------|
| NO2 (µg/m³) | ≤40 | ≤90 | ≤120 | ≤230 | ≤340 | >340 |
| PM10 (µg/m³) | ≤20 | ≤40 | ≤50 | ≤100 | ≤150 | >150 |
| PM2.5 (µg/m³) | ≤10 | ≤20 | ≤25 | ≤50 | ≤75 | >75 |
| O3 (µg/m³) | ≤60 | ≤120 | ≤180 | ≤240 | ≤380 | >380 |

`icaExpected = max(ica_no2, ica_pm10, ica_pm25, ica_o3)`

SO2 is collected but not included in ICA (Spanish legislation uses daily averages, not hourly forecast values).

## Database Model

Upserts into `AQForecast` keyed on `(gridLat, gridLon, validAt)`. Rows older than 7 days are cleaned up on each run.

## API Endpoint

`GET /api/calidad-aire/forecast?lat=40.4&lon=-3.7` — nearest gridpoint
`GET /api/calidad-aire/forecast?province=28` — all gridpoints in province

Redis cache: 30 minutes. Rate-limited. Requires same-origin or `x-api-key`.

## Attribution

> Fuente: Copernicus Atmosphere Monitoring Service (CAMS) / ECMWF. Los datos de previsión de calidad del aire son proporcionados por el CAMS con financiación de la UE.
