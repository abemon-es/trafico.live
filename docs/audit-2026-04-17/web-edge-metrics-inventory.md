# Web & Edge metrics — what's actually available (2026-04-17)

## Available NOW (can build panels today)

| Metric | Source | Example query | Latency window |
|--------|--------|---------------|----------------|
| Request rate by HTTP status | Prometheus (Traefik) | `sum by (code) (rate(traefik_service_requests_total{exported_service="trafico-live-svc@file"}[5m]))` | 15s scrape |
| P50/P95/P99 response time | Prometheus (Traefik) | `histogram_quantile(0.95, sum by (le) (rate(traefik_service_request_duration_seconds_bucket{exported_service="trafico-live-svc@file"}[5m])))` | 15s scrape |
| Error rate (5xx / total) | Prometheus (Traefik) | `sum(rate(traefik_service_requests_total{exported_service="trafico-live-svc@file",code=~"5.."}[5m])) / sum(rate(traefik_service_requests_total{exported_service="trafico-live-svc@file"}[5m]))` | 15s scrape |
| 404 rate (crawl waste / SEO regressions) | Prometheus (Traefik) | `rate(traefik_service_requests_total{exported_service="trafico-live-svc@file",code="404"}[5m])` | 15s scrape |
| Homepage probe latency | Prometheus (blackbox-trafico) | `probe_duration_seconds{job="blackbox-trafico"}` | 1m probe |
| API health probe latency | Prometheus (blackbox-trafico-health) | `probe_duration_seconds{instance="https://trafico.live/api/health"}` | 1m probe |
| SSL cert expiry (days) | Prometheus (blackbox-ssl) | `(probe_ssl_earliest_cert_expiry{instance="https://trafico.live"} - time()) / 86400` | 1m probe |
| Downstream bytes/s (bandwidth) | Prometheus (Traefik) | `rate(traefik_service_responses_bytes_total{exported_service="trafico-live-svc@file"}[5m])` | 15s scrape |
| Top slow/error paths (raw log) | Loki (Traefik JSON) | `{service="traefik"} \|= "trafico.live" \| json \| DownstreamStatus >= 500` | ~5s ingest |
| Container memory (trafico-live) | Prometheus (cAdvisor) | `container_memory_usage_bytes{name="trafico-live"}` | 15s scrape |
| Redis memory & connections | Prometheus (redis-trafico) | `redis_memory_used_bytes{job="redis-trafico"}`, `redis_connected_clients{job="redis-trafico"}` | 15s scrape |
| PgBouncer pool saturation | Prometheus (pgbouncer-trafico) | `pgbouncer_pools_client_waiting_connections{job="pgbouncer-trafico"}` | 15s scrape |

**Note on Loki/Traefik log queries:** Traefik ships structured JSON access logs with two-level nesting. The outer envelope is the Loki/Vector JSON wrapper; the `message` field contains the Traefik access log JSON. In Grafana, use `| json | line_format "{{.message}}" | json` to unpack `RequestPath`, `DownstreamStatus`, `Duration` (nanoseconds), `ClientHost`, `GzipRatio`. Filtering by `RequestHost="trafico.live"` works at the outer level with `|= "trafico.live"`.

---

## Available with config tweaks (~30 min each)

| Metric | Source | What needs to change |
|--------|--------|----------------------|
| Per-path request/latency breakdown | Prometheus (Traefik) | Enable `addRoutersLabels: true` + `accessLog.fields.names.RequestPath: keep` in `traefik.yml` — currently Traefik Prometheus metrics lack path labels (by design); Loki LogQL metrics (`sum by (RequestPath)`) is the alternative with zero config change |
| nginx stub_status for tile server | Prometheus (nginx-exporter) | Add `location /nginx_status { stub_status; allow 127.0.0.1; deny all; }` to `tiles-tiles-1` nginx config + add nginx-exporter sidecar to `services/tiles/docker-compose.yml` and a scrape job in Prometheus |
| trafico-live container CPU rate | Prometheus (cAdvisor) | Already scraped — just add `rate(container_cpu_usage_seconds_total{name="trafico-live"}[5m])`. No config change needed |
| trafico-live → PgBouncer query duration | Prometheus (pgbouncer-trafico) | Already available: `pgbouncer_stats_totals_queries_duration_seconds_total`. Just add panel |
| Tile hit rate (cache vs origin) | Prometheus (nginx-exporter) | Same as nginx stub_status above; currently no tile-specific cache-hit metric exists |

---

## NOT available (would require new infra)

| Metric | Why missing | Estimate to enable |
|--------|-------------|--------------------|
| Cloudflare edge metrics (cache hit ratio, edge latency, threats) | No Logpush configured, no CF API integration in stack | 2–4h: set up CF Logpush → S3/R2 + Alloy ingestion to Loki, or use CF Analytics API + Prometheus remote write via cf-exporter |
| Next.js app-level metrics (route render time, RSC time, slow API routes) | No `prom-client` in `node_modules`; `/api/metrics` returns 404 | 2–4h: add `prom-client` + custom `/api/metrics` endpoint, scrape from Prometheus. `@opentelemetry` is present — could also use OTLP → Tempo for traces |
| Martin tile server metrics | Martin v0.15 exposes `/metrics` endpoint but returns "does not exist" — likely needs config flag `metrics: true` in `services/martin/config.yaml` | 15 min: add `metrics: {enabled: true, port: 3001}` to martin config + Prometheus scrape job |
| Real-time request count by page category (SEO insight) | Traefik metrics have no path; Loki has paths but LogQL metric queries on nested JSON are slow at scale | 1–2h: parse Traefik logs with Vector/Alloy into structured streams with `RequestPath` as a label, then query with Prometheus-style counters |
| AIS WebSocket connection health | No exporter; collector only logs to Loki stderr | 30 min: add heartbeat counter to `collector-ais` + expose on a `/metrics` HTTP endpoint |

---

## Recommended Web & Edge dashboard panels (max 8)

### Panel 1 — Request Rate by Status Class
- **Datasource:** Prometheus
- **Query:** `sum by (code) (rate(traefik_service_requests_total{exported_service="trafico-live-svc@file"}[5m]))`
- **Type:** timeseries (stacked, colour-coded 2xx/3xx/4xx/5xx)
- **Why:** Single glance confirmation the site is serving traffic and shows redirect/error spikes immediately after deploys.

### Panel 2 — P95 Response Time
- **Datasource:** Prometheus
- **Query:** `histogram_quantile(0.95, sum by (le) (rate(traefik_service_request_duration_seconds_bucket{exported_service="trafico-live-svc@file",code="200",method="GET"}[5m])))`
- **Type:** timeseries
- **Why:** Detects Next.js cold starts, slow SSR, or database saturation before users notice.

### Panel 3 — Error Rate (5xx %)
- **Datasource:** Prometheus
- **Query:** `100 * sum(rate(traefik_service_requests_total{exported_service="trafico-live-svc@file",code=~"5.."}[5m])) / sum(rate(traefik_service_requests_total{exported_service="trafico-live-svc@file"}[5m]))`
- **Type:** stat (threshold: green <0.5%, yellow <2%, red ≥2%)
- **Why:** Single KPI for on-call triage; 502s spike when Next.js crashes or restarts.

### Panel 4 — 404 Rate (SEO / crawl health)
- **Datasource:** Prometheus
- **Query:** `rate(traefik_service_requests_total{exported_service="trafico-live-svc@file",code="404"}[5m])`
- **Type:** timeseries
- **Why:** trafico.live has 150+ pages and frequent URL pattern changes; a spike in 404s signals a broken redirect or sitemap regression.

### Panel 5 — Endpoint Probe Latency (homepage + /api/health + tiles)
- **Datasource:** Prometheus
- **Queries:**
  - `probe_duration_seconds{job="blackbox-trafico"}` (homepage)
  - `probe_duration_seconds{instance="https://trafico.live/api/health"}` (API health)
  - `probe_duration_seconds{instance="https://tiles.trafico.live/health"}` (tile server)
- **Type:** timeseries (3 series)
- **Why:** Catches CDN/network degradation independently from Traefik-internal latency.

### Panel 6 — SSL Certificate Expiry
- **Datasource:** Prometheus
- **Query:** `(probe_ssl_earliest_cert_expiry{instance="https://trafico.live"} - time()) / 86400`
- **Type:** stat (threshold: red <14d, yellow <30d, green ≥30d)
- **Why:** Let's Encrypt auto-renews but cert-resolver failures go silent; cert expires 2026-06-22 (~65 days from now).

### Panel 7 — PgBouncer: Waiting Clients & Query Duration
- **Datasource:** Prometheus
- **Queries:**
  - `pgbouncer_pools_client_waiting_connections{job="pgbouncer-trafico"}`
  - `rate(pgbouncer_stats_totals_queries_duration_seconds_total{job="pgbouncer-trafico"}[5m])`
- **Type:** timeseries (dual-axis)
- **Why:** With 78 Prisma models and real-time collectors writing every 5 min, pool saturation is the most likely performance bottleneck not visible from the web layer.

### Panel 8 — Recent 5xx Requests (log table)
- **Datasource:** Loki
- **Query:** `{service="traefik"} |= "trafico.live" |= "\"DownstreamStatus\":5"`
- **Type:** logs panel (show `RequestPath`, `DownstreamStatus`, `Duration`, `ClientHost`)
- **Why:** Gives the on-call engineer the exact failing URLs without a separate log search; complements Panel 3's numeric rate.

---

## Key findings summary

- **Traefik Prometheus metrics are the primary source** — already scraped at `10.100.0.2:8082`, label `exported_service="trafico-live-svc@file"`. Full histogram + counters available. No gaps here.
- **Loki has Traefik access logs** with full per-request detail (`RequestPath`, `Duration`, status codes) but requires double-JSON parse in LogQL (`|= "trafico.live" | json`-on-outer-wrap + secondary parse). Suitable for log panels, slow for high-cardinality metric queries.
- **No Next.js application metrics** — the app has `@opentelemetry` installed but no metrics endpoint wired. This is the biggest gap for understanding per-route performance.
- **Martin tile server `/metrics` is broken** (returns "does not exist") — a one-line config fix.
- **nginx tile server has no stub_status** — needs a location block addition.
- **Cloudflare has zero observability integration** — all edge/CDN metrics (cache ratio, threat protection, geographic distribution) are invisible from the current stack.
- **cAdvisor already scrapes all trafico containers** — memory, CPU, network for `trafico-live`, `trafico-postgres`, `trafico-typesense`, etc. are all queryable today.
