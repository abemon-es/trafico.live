# Tile Server Metrics — Audit 2026-04-17

## Summary

Both Martin tile server and nginx tile server are now instrumented for Prometheus scraping.

## Martin Metrics (`job_name: martin-tile`)

**Endpoint:** `http://10.100.0.2:3089/_/metrics`
**Config change:** `services/martin/config.yaml` — added `observability.metrics` block

Metrics enabled by Martin v0.15 at `/_/metrics`:

- `martin_requests_total` — tile request count (labels: `source`, `format`, `zoom`)
- `martin_request_duration_seconds` — tile generation latency histogram
- `martin_db_pool_connections` — active PostGIS pool connections (pool_size=4)
- `martin_db_pool_idle` — idle PostGIS pool connections
- `martin_db_query_duration_seconds` — SQL tile function execution time
- `martin_cache_hits_total` / `martin_cache_misses_total` — tile cache efficiency
- `martin_tile_size_bytes` — generated tile size histogram
- Custom labels added: `service=martin-tile`, `env=prod`

Port mapping: `127.0.0.1:3089:3000` (host:container) — Prometheus reaches via `10.100.0.2:3089`

## nginx Metrics (`job_name: nginx-tile`)

**Endpoint:** `http://10.100.0.2:9113/metrics` (nginx-prometheus-exporter sidecar)
**Config change:** `services/tiles/nginx.conf` — added `/nginx_status` location
**Compose change:** `services/tiles/docker-compose.yml` — added `nginx-exporter` service

Metrics exposed by `nginx/nginx-prometheus-exporter` (from `stub_status`):

- `nginx_connections_active` — currently active connections
- `nginx_connections_accepted_total` — total accepted connections
- `nginx_connections_handled_total` — total handled connections
- `nginx_connections_reading` — connections reading request
- `nginx_connections_waiting` — keep-alive connections waiting
- `nginx_connections_writing` — connections writing response
- `nginx_http_requests_total` — total requests served

Port mapping: `127.0.0.1:9113:9113` (host:container) — Prometheus reaches via `10.100.0.2:9113`

## Recommended Dashboard Panels (PromQL)

### 1. Tile Request Rate (per zoom level)
```promql
sum by (zoom) (rate(martin_requests_total{job="martin-tile"}[5m]))
```

### 2. Tile Generation P95 Latency
```promql
histogram_quantile(0.95,
  sum by (le, source) (
    rate(martin_request_duration_seconds_bucket{job="martin-tile"}[5m])
  )
)
```

### 3. nginx Cache Hit Ratio (HIT vs MISS via X-Cache-Status)
Requires nginx `$upstream_cache_status` logging. Proxy metric via access log exporter,
or use the upstream cache statistics from nginx-exporter request counts:
```promql
rate(nginx_connections_handled_total{job="nginx-tile"}[5m])
```

### 4. Active Connections (nginx)
```promql
nginx_connections_active{job="nginx-tile"}
```

### 5. nginx Bytes Served (requests/s)
```promql
rate(nginx_http_requests_total{job="nginx-tile"}[5m])
```

### 6. Martin PostGIS Pool Saturation
```promql
martin_db_pool_connections{job="martin-tile"} / 4
```
(pool_size=4 in martin config; alert if > 0.8)

### 7. `up{}` Verification
```promql
up{job=~"martin-tile|nginx-tile"}
```
Should return 2 series with `value=1` once deployed.

## Files Changed

| File | Change |
|------|--------|
| `services/martin/config.yaml` | Added `observability.metrics` block |
| `services/tiles/nginx.conf` | Added `/nginx_status` location (allow 10.0.0.0/8) |
| `services/tiles/docker-compose.yml` | Added Martin port `3089:3000`, added `nginx-exporter` service |

## Prometheus Changes (observability repo)

| File | Change |
|------|--------|
| `prometheus/prometheus.yml` | Added `martin-tile` and `nginx-tile` scrape jobs |

## Deploy Commands

```bash
# Tile server (rebuild martin + add nginx-exporter)
ssh compute 'cd /opt/trafico/tiles && docker compose up -d --build'

# Prometheus (reload scrape config)
ssh compute 'cd /opt/server-exit/prod/observability && docker compose restart prometheus'

# Verify
ssh compute 'curl -s "http://10.100.0.2:9090/api/v1/query?query=up{job=~\"martin-tile|nginx-tile\"}"'
```
