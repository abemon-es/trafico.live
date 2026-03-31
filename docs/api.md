# API Reference

Base URL: `https://trafico.live/api`

## Authentication

| Method | When |
|--------|------|
| Same-origin | Browser requests from trafico.live — no header needed |
| API key | External requests: `x-api-key: <key>` header |

**Exempt endpoints:** `/api/health`, `/api/cron/*`

**Rate limiting:** Redis-backed, per-IP. Returns `429` with `Retry-After` header when exceeded.

## Endpoints

### Traffic & Incidents

| Endpoint | Method | Description | Key params |
|----------|--------|-------------|------------|
| `/api/incidents` | GET | Active traffic incidents | `road`, `province`, `severity`, `source`, `limit` |
| `/api/incidents/stats` | GET | Incident statistics | `days` (max 90) |
| `/api/incidents/analytics` | GET | Incident analytics breakdown | `days` (max 90), `province` |
| `/api/incidents/timeline` | GET | Incident timeline | `hours` |
| `/api/v16` | GET | Active V16 beacon events | `province`, `limit` |
| `/api/stream` | GET | SSE stream (incidents + V16) | — (Server-Sent Events) |

### Cameras & Panels

| Endpoint | Method | Description | Key params |
|----------|--------|-------------|------------|
| `/api/cameras` | GET | DGT traffic cameras | `province`, `road`, `limit` |
| `/api/panels` | GET | Variable message panels | `province`, `road`, `limit` |
| `/api/radars` | GET | Speed radar locations | `road`, `province`, `limit` |

### Fuel Prices

| Endpoint | Method | Description | Key params |
|----------|--------|-------------|------------|
| `/api/fuel-prices/today` | GET | National + province + community averages | — |
| `/api/fuel-prices/history` | GET | Historical fuel price trends | `days` (max 365), `scope` |
| `/api/gas-stations` | GET | Search gas stations | `lat`, `lon`, `radius`, `fuel`, `province`, `limit` |
| `/api/gas-stations/[id]` | GET | Single station details | — |
| `/api/gas-stations/cheapest` | GET | Cheapest stations | `fuel`, `province`, `limit` |
| `/api/maritime-stations` | GET | Maritime fuel stations | `province`, `limit` |

### Roads & Infrastructure

| Endpoint | Method | Description | Key params |
|----------|--------|-------------|------------|
| `/api/roads/catalog` | GET | Road catalog with filters | `type`, `province`, `search` |
| `/api/roads/[roadId]` | GET | Single road details | — |
| `/api/roads/stats` | GET | Road network statistics | — |
| `/api/roads/geometry` | GET | Road GeoJSON geometries | — |
| `/api/roads/risk` | GET | Road risk analysis | `days` (max 90) |
| `/api/roads/risk-zones` | GET | Risk zone locations | `severity`, `type` |
| `/api/roads/speed-limits` | GET | Speed limit segments | `road` |
| `/api/roads/traffic-flow` | GET | Traffic flow data | — |
| `/api/imd` | GET | Traffic intensity (IMD) | `road`, `province` |
| `/api/estaciones-aforo` | GET | Traffic counting stations | `road`, `province` |

### Weather

| Endpoint | Method | Description | Key params |
|----------|--------|-------------|------------|
| `/api/weather` | GET | Weather conditions by road | `province`, `road` |
| `/api/weather-alerts` | GET | Active AEMET weather alerts | `province`, `severity` |
| `/api/weather/impact` | GET | Weather impact on traffic | `days` (max 90) |

### Geographic

| Endpoint | Method | Description | Key params |
|----------|--------|-------------|------------|
| `/api/espana` | GET | National overview stats | — |
| `/api/comunidad-autonoma/[community]` | GET | Community stats | — |
| `/api/province/stats` | GET | Province statistics | `province`, `days` (max 90) |
| `/api/rankings` | GET | Province/road rankings | `metric`, `days` (max 90) |

### Historical & Statistics

| Endpoint | Method | Description | Key params |
|----------|--------|-------------|------------|
| `/api/stats` | GET | Dashboard statistics | — |
| `/api/dashboard/stats` | GET | Dashboard summary | — |
| `/api/historical` | GET | Historical accident data | `province`, `year` |
| `/api/historical/stats` | GET | Historical accident stats | `province` |
| `/api/historico/daily` | GET | Daily incident history | `days` (max 90), `province` |
| `/api/historico/hourly` | GET | Hourly patterns | `days` (max 90) |
| `/api/historico/roads` | GET | Road incident history | `days` (max 90) |
| `/api/historico/provinces` | GET | Province history | `days` (max 90) |
| `/api/historico/map` | GET | Incident heatmap data | `days` (max 90) |
| `/api/historico/duration` | GET | Incident duration stats | `days` (max 90) |
| `/api/historico/correlation` | GET | Weather-incident correlation | `days` (max 90) |

### Other

| Endpoint | Method | Description | Key params |
|----------|--------|-------------|------------|
| `/api/chargers` | GET | EV charging stations | `lat`, `lon`, `radius`, `province` |
| `/api/zbe` | GET | Low-emission zone data | `city` |
| `/api/vehiculos` | GET | Vehicle fleet / label lookup | `plate` |
| `/api/risk-zones` | GET | Traffic risk zones | `type`, `severity` |
| `/api/price-alerts` | POST | Subscribe to price alerts | `email`, `fuel`, `province`, `threshold` |
| `/api/price-alerts/unsubscribe` | GET | Unsubscribe | `token` |
| `/api/noticias` | GET | News articles | `category`, `tag`, `province`, `limit` |
| `/api/insights` | GET | Redirects to /api/noticias | — |
| `/api/health` | GET | Health check (auth exempt) | — |
| `/api/cron/gas-stations` | GET | Trigger gas station fetch (auth exempt) | — |
| `/api/admin/seed-accidents` | POST | Seed historical accident data | — |

## Common Patterns

### Pagination

Most list endpoints support:
- `limit` — max items (capped server-side, typically 100)
- `offset` — skip N items

### Days Parameter

Historical endpoints accept `days` (default 30, max 90). The server caps to prevent full-table scans.

### Response Format

All endpoints return JSON:

```json
{
  "success": true,
  "data": [...],
  "count": 123
}
```

Error responses:

```json
{
  "error": "Unauthorized",
  "message": "API access requires authentication"
}
```

### SSE Stream

`/api/stream` returns Server-Sent Events for real-time updates:

```
event: v16
data: {"hash":"abc123","snapshot":{...}}

event: incidents
data: {"hash":"def456","snapshot":{...}}
```

Polls every 10 seconds. Connect with `EventSource` or `useTrafficStream()` hook.
