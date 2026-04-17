# Tile Server Metrics — Audit 2026-04-17

## Summary

**nginx metrics: OPERATIONAL** — `up{job="nginx-tile"} = 1` confirmed.

**Martin metrics: BLOCKED** — `ghcr.io/maplibre/martin:v0.15.0` (2025-01-27) does not
support `/_/metrics`. The feature was added in `martin-v1.0.0` (2025-11-19). Config
changes and port mapping are in place; only the Dockerfile base image upgrade is needed.

## nginx Metrics (`job_name: nginx-tile`) — LIVE

**Endpoint:** `http://10.100.0.2:9113/metrics`
**Config change:** `services/tiles/nginx.conf` — added `/nginx_status` location
**Compose change:** `services/tiles/docker-compose.yml` — added `nginx-exporter` service

Location block added:
```nginx
location /nginx_status {
    stub_status;
    allow 10.0.0.0/8;
    allow 127.0.0.1;
    deny all;
}
```

Sidecar service added:
```yaml
nginx-exporter:
  image: nginx/nginx-prometheus-exporter:latest
  container_name: tiles-nginx-exporter
  command: ["--nginx.scrape-uri=http://tiles/nginx_status"]
  ports:
    - "10.100.0.2:9113:9113"
```

Metrics now available:
- `nginx_connections_active` — currently active connections
- `nginx_connections_accepted` — total accepted connections (counter)
- `nginx_connections_handled` — total handled connections (counter)
- `nginx_connections_reading` — connections reading request
- `nginx_connections_waiting` — keep-alive connections waiting
- `nginx_connections_writing` — connections writing response
- `nginx_http_requests_total` — total requests served

## Martin Metrics (`job_name: martin-tile`) — BLOCKED

**Endpoint when unblocked:** `http://10.100.0.2:3089/_/metrics`
**Config change:** `services/martin/config.yaml` — added `observability.metrics` block

```yaml
observability:
  metrics:
    add_labels:
      service: martin-tile
      env: prod
```

Port mapping added to compose:
```yaml
ports:
  - "10.100.0.2:3089:3000"
```

**Blocker:** Martin v0.15.0 silently ignores the `observability` config key and returns
HTTP 404 for `/_/metrics`. Metrics support was introduced in `martin-v1.0.0` (2025-11-19).
Current Prometheus scrape target shows `up=0` with error "server returned HTTP status 404".

**Upgrade path:**
```dockerfile
# services/martin/Dockerfile — change this line:
FROM ghcr.io/maplibre/martin:v0.15.0
# to:
FROM ghcr.io/maplibre/martin:v1.5.0
```
Then: `ssh compute 'cd /opt/trafico/tiles && docker compose up -d --build martin'`

Review [martin-v1.0.0 release notes](https://github.com/maplibre/martin/releases/tag/martin-v1.0.0)
before upgrading (configuration schema may have changed).

## Recommended Dashboard Panels (PromQL)

### 1. Tile Request Rate (per source, post-upgrade)
```promql
sum by (source) (rate(martin_requests_total{job="martin-tile"}[5m]))
```

### 2. Tile Generation P95 Latency (post-upgrade)
```promql
histogram_quantile(0.95,
  sum by (le, source) (
    rate(martin_request_duration_seconds_bucket{job="martin-tile"}[5m])
  )
)
```

### 3. nginx Request Rate (tiles/s)
```promql
rate(nginx_http_requests_total{job="nginx-tile"}[5m])
```

### 4. Active Connections (nginx)
```promql
nginx_connections_active{job="nginx-tile"}
```

### 5. nginx Connection Accept Rate (health proxy)
```promql
rate(nginx_connections_accepted{job="nginx-tile"}[5m])
```

### 6. Martin PostGIS Pool Saturation (post-upgrade)
```promql
martin_db_pool_connections{job="martin-tile"} / 4
```
(pool_size=4; alert threshold 0.8)

### 7. Tile Server Health (both jobs)
```promql
up{job=~"martin-tile|nginx-tile"}
```

## Prometheus Scrape Jobs Added

```yaml
- job_name: martin-tile
  scrape_interval: 30s
  scrape_timeout: 10s
  metrics_path: /_/metrics
  static_configs:
    - targets: ["10.100.0.2:3089"]
      labels:
        server: compute
        service: martin-tile

- job_name: nginx-tile
  scrape_interval: 30s
  scrape_timeout: 10s
  static_configs:
    - targets: ["10.100.0.2:9113"]
      labels:
        server: compute
        service: nginx-tile
```

## Files Changed

| File | Change |
|------|--------|
| `services/martin/config.yaml` | Added `observability.metrics` block |
| `services/tiles/nginx.conf` | Added `/nginx_status` stub_status location |
| `services/tiles/docker-compose.yml` | Martin port 3089:3000, nginx-exporter service |
| `~/Desarrollos/observability/prometheus/prometheus.yml` | Added martin-tile + nginx-tile jobs |
| `~/Desarrollos/server/prod/tiles/docker-compose.yml` | Mirror of compose changes |
| `~/Desarrollos/server/prod/trafico/tiles/docker-compose.yml` | Mirror of compose changes |

## Verification (2026-04-17)

```
up{job="nginx-tile",instance="10.100.0.2:9113"} = 1   ← PASSING
up{job="martin-tile",instance="10.100.0.2:3089"} = 0   ← BLOCKED (v0.15.0)
```

Note: Ports bound to `10.100.0.2` (WireGuard VPN interface) so Prometheus
(host networking) can reach them. `127.0.0.1` binding would be unreachable.
