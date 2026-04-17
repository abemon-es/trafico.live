# Traefik per-route LogQL queries (2026-04-17)

## Log structure

Logs arrive from the `traefik` Docker container via the Loki Docker log driver. Each Loki entry is a JSON envelope (`service="traefik"`). The actual Traefik access log lives inside the `message` field as an escaped JSON string — two parse steps are required in every query.

**Outer envelope (Loki line):**
```json
{
  "container_name": "traefik",
  "host": "***",
  "image": "traefik:v3.6",
  "level": "info",
  "message": "<inner JSON>",
  "source_type": "docker_logs",
  "stream": "stdout"
}
```

**Inner access log (the `.message` field, redacted):**
```json
{
  "ClientHost": "1.2.3.4",
  "DownstreamContentSize": 7197,
  "DownstreamStatus": 200,
  "Duration": 48321000,
  "OriginDuration": 48200000,
  "Overhead": 121000,
  "RequestHost": "trafico.live",
  "RequestMethod": "GET",
  "RequestPath": "/gasolineras/terrestres/10918",
  "RequestProtocol": "HTTP/2.0",
  "RetryAttempts": 0,
  "RouterName": "trafico-live@docker",
  "ServiceName": "trafico-live@docker",
  "StartUTC": "2026-04-17T17:29:18Z",
  "TLSVersion": "1.3",
  "entryPointName": "https"
}
```

---

## Field reference

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `RequestPath` | string | `"/api/health"` | URL path only, no query string |
| `DownstreamStatus` | int | `200` | Final HTTP status returned to client |
| `Duration` | int | `48321000` | Total request duration in **nanoseconds** (÷ 1e9 for seconds) |
| `DownstreamContentSize` | int | `7197` | Response body bytes sent to client |
| `RequestMethod` | string | `"GET"` | HTTP verb |
| `ClientHost` | string | `"172.68.242.25"` | Client IP (Cloudflare proxy IP in practice) |
| `ServiceName` | string | `"trafico-live@docker"` | Traefik backend service label |
| `RouterName` | string | `"trafico-live@docker"` | Traefik router that matched the request |
| `RequestHost` | string | `"trafico.live"` | Virtual host (use with `|= "trafico.live"` pre-filter) |
| `OriginDuration` | int | `48200000` | Backend-only time (ns); `Overhead = Duration - OriginDuration` |
| `RetryAttempts` | int | `0` | Number of retries before success |

> **Parse pattern for every query:**
> `| json | line_format "{{.message}}" | json`
>
> The first `| json` extracts the outer envelope fields (including `message`). The `line_format` replaces the log line with just the inner JSON. The second `| json` then parses the Traefik fields.

> **Series limit:** Loki is configured with a 500-series ceiling per query. Queries with `[range] > 1h` or cardinality-boosting patterns (full path, 24h window) hit this limit. Use `[1h]` windows or the `label_format` regex trick (Panel 6) to stay under it.

---

## Recommended panels (7)

### Panel 1 — Top 10 slowest routes (p95, last 30 min)

- **Datasource:** Loki
- **Type:** Table (sort by Value desc)
- **Refresh:** On demand / 5 min minimum

```logql
quantile_over_time(0.95,
  {service="traefik"} |= "trafico.live"
  | json
  | line_format "{{.message}}"
  | json
  | unwrap Duration [30m]
) by (RequestPath)
```

Divide the raw value by `1e9` in Grafana (Field Override → Unit: `ns` or custom transform) to display seconds. Use a 30 min range to stay under the 500-series limit. Sort the table by value descending to surface the worst offenders. Identifies slow page routes that need SSR optimisation or ISR.

---

### Panel 2 — Top 10 routes by 5xx count (last 1 h)

- **Datasource:** Loki
- **Type:** Table (sort by Value desc)
- **Refresh:** 5 min

```logql
sum by (RequestPath) (
  count_over_time(
    {service="traefik"} |= "trafico.live"
    | json
    | line_format "{{.message}}"
    | json
    | DownstreamStatus >= 500
    [1h]
  )
)
```

Use a single `[1h]` range with `step=1h` in Grafana for an instant snapshot. Sort the table in the panel. The current top offenders are `/` (17 hits) and `/api/stream` (5), `/api/roads/live-speed` (4) — confirming `/maritimo/puertos/*` SSR failures and two broken streaming endpoints.

---

### Panel 3 — Top 10 routes by 4xx count (last 1 h)

- **Datasource:** Loki
- **Type:** Table (sort by Value desc)
- **Refresh:** 5 min

```logql
sum by (RequestPath) (
  count_over_time(
    {service="traefik"} |= "trafico.live"
    | json
    | line_format "{{.message}}"
    | json
    | DownstreamStatus >= 400
    | DownstreamStatus < 500
    [1h]
  )
)
```

The 4xx stream is heavily polluted by scanner noise (`.php` probes, `/xmlrpc.php`, `/.vscode/sftp.json`). Filtering `RequestPath !~ ".+\\.php$"` in a second stage isolates real 404s on legitimate routes. The panel is useful for catching routes that were removed or renamed without a redirect.

---

### Panel 4 — Request rate by HTTP method (timeseries)

- **Datasource:** Loki
- **Type:** Timeseries
- **Refresh:** 1 min

```logql
sum by (RequestMethod) (
  rate(
    {service="traefik"} |= "trafico.live"
    | json
    | line_format "{{.message}}"
    | json
    [5m]
  )
)
```

Verified methods in production: `GET` (dominant), `HEAD` (uptime monitors + Cloudflare health checks), `POST` (rare — scanner probes at `/xmlrpc.php`). A spike in `POST` outside of expected `/api/billing/webhook` is an anomaly signal. Use `step=1m` for a live view.

---

### Panel 5 — p95 latency timeseries for /api/* routes

- **Datasource:** Loki
- **Type:** Timeseries
- **Refresh:** 2 min

```logql
quantile_over_time(0.95,
  {service="traefik"} |= "trafico.live" |= "/api/"
  | json
  | line_format "{{.message}}"
  | json
  | RequestPath =~ ".*/api/.*"
  | unwrap Duration [5m]
) by (RequestPath)
```

The `|= "/api/"` pre-filter runs at the chunk level (cheap); the `RequestPath =~ ".*/api/.*"` label filter runs post-parse and confirms the match. Active API routes in logs: `/api/stream` (p95 ≈ 19 s — broken SSE endpoint), `/api/roads/live-speed` (p95 ≈ 3.2 s), `/api/stats`, `/api/incidents`. Use `step=5m` and set the panel time range to last 6 hours.

---

### Panel 6 — Bytes served per route group (top 10, last 1 h)

- **Datasource:** Loki
- **Type:** Bar chart (sort by Value desc)
- **Refresh:** 5 min

```logql
sum by (RequestPath) (
  sum_over_time(
    {service="traefik"} |= "trafico.live"
    | json
    | line_format "{{.message}}"
    | json
    | label_format RequestPath="{{ regexReplaceAll `^(/[^/]+/[^/]+).*` .RequestPath `${1}` }}"
    | unwrap DownstreamContentSize [1h]
  )
)
```

The `label_format` regex collapses `/gasolineras/terrestres/10918` → `/gasolineras/terrestres`, reducing cardinality from 400+ to ~250 series. Top bandwidth consumers (1 h sample): `/radares/provincia` (94 KB), `/gasolineras/precios` (54 KB), `/gasolineras/baratas` (50 KB), `/estadisticas/accidentes` (40 KB). Use bytes unit in Grafana field config.

---

### Panel 7 — Live tail: slow requests (Duration > 2 s)

- **Datasource:** Loki
- **Type:** Logs
- **Refresh:** Real-time (live tail mode in Grafana)

```logql
{service="traefik"} |= "trafico.live"
| json
| line_format "{{.message}}"
| json
| Duration > 2000000000
```

Returns log lines as-is (stream query, not metric). No series limit applies. In Grafana Logs panel, set "Prettify JSON" on. Use `line_format` at the end if you want to project only key fields:

```logql
{service="traefik"} |= "trafico.live"
| json
| line_format "{{.message}}"
| json
| Duration > 2000000000
| line_format "{{.RequestMethod}} {{.RequestPath}} → {{.DownstreamStatus}} ({{.Duration}}ns)"
```

Real examples from production: `/espana/galicia/pontevedra/maritimo` → 30.3 s (SSR timeout), `/api/stream` → 2.2 s (502), `/api/roads/live-speed` → 3.8 s (502).

---

## Performance notes

LogQL on double-nested JSON is expensive because:
1. Every chunk must be decompressed and every line parsed twice (outer `| json`, then inner `| json` after `line_format`).
2. `quantile_over_time` + `unwrap` requires holding all raw values in memory for the range window.
3. High-cardinality `by (RequestPath)` labels generate many series.

For panels refreshing more frequently than 5 min, consider one of:

**Option A — Loki recording rules** (no infrastructure change): define a `metric_queries` block in the Loki ruler config that pre-computes `sum by (RequestPath) (count_over_time(...))` every 1 min and writes it to a ruler storage. Panels then query the pre-computed metric instead of raw logs.

**Option B — Vector pipeline** (better long-term): add a Vector transform between the Docker log driver and Loki that parses the inner JSON at ingestion time and promotes `RequestPath`, `DownstreamStatus`, `Duration`, `DownstreamContentSize`, `RequestMethod` to proper Loki structured metadata labels. This collapses the double `| json` into a single label selector and removes the `line_format` step entirely — reducing query cost by ~60–70%.

---

## Estimated panel cost (per query execution)

| Panel | Cost | Safe refresh |
|-------|------|-------------|
| Top 10 slowest p95 | High — `unwrap` + `quantile` scans all values | 5 min minimum |
| Top 10 routes by 5xx | Medium — `count_over_time` with filter | 2 min |
| Top 10 routes by 4xx | Medium — same as 5xx | 2 min |
| Rate by HTTP method | Low — `rate()` on small cardinality | 1 min |
| p95 /api/* timeseries | Low — pre-filtered by `|= "/api/"`, few series | 1 min |
| Bytes per route group | Medium — `sum_over_time` + `unwrap`, regex label | 5 min |
| Live tail slow requests | Cheap — streaming, no aggregation | Real-time |
