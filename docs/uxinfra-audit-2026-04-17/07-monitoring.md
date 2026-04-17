# Monitoring & Observability Audit — trafico.live
**Date:** 2026-04-17 | **Auditor:** Claude (sub3) | **Source:** live SSH + codebase

---

## 1. What Monitoring Exists Today

| Component | Status | Notes |
|-----------|--------|-------|
| **Loki** | Running (`obs-loki`, Up 5h healthy) | 9.2 GB stored, 90-day retention, tsdb v13 |
| **Prometheus** | Running (`obs-prometheus`, Up 1h healthy) | 30-day TSDB, 20 GB cap, 15s scrape |
| **Grafana** | Running (`obs-grafana`, Up 2h healthy) | 11.6.0, 32 dashboards provisioned |
| **Uptime Kuma** | Running (`obs-uptime-kuma`, Up 58m healthy) | 32 monitors including trafico.live |
| **cAdvisor** | Running (`obs-cadvisor`, Up 1m healthy) | All containers on compute |
| **Node Exporter** | Running (`obs-node-exporter`, Up 2m) | Compute + primary + bmc-vault |
| **Blackbox Exporter** | Running (`obs-blackbox`, Up 29s) | HTTP probes every 60s |
| **Vector** | Running (`exp-vector`, Up 26s healthy) | Log collector → Loki |
| **Beyla (eBPF)** | Running (`obs-beyla`, Up 7d) | Auto-instrumentation, scraping at :9400 |
| **Tempo** | Running (`obs-tempo`, Up 4d healthy) | Distributed tracing backend |
| **GlitchTip** | Running (`glitchtip-web`, Up 21h) | Sentry-compatible error tracker |
| **Sentry SDK** | Configured (3 configs) | client/server/edge, GlitchTip DSN |
| **`/api/health`** | Active | DB + Redis + 7 collector staleness checks |

All Prometheus targets are `up=1` as of audit time. `trafico.live` probe: `probe_success=1`, latency `~103ms`.

---

## 2. Logging Coverage

### Docker Log Driver (per compose)

| Stack | Log Driver | Retention |
|-------|-----------|-----------|
| `docker-compose.web.yml` (production) | `loki` driver → `10.100.0.2:3100` | Local fallback: 50m/5 files |
| `docker-compose.collectors.yml` (production) | `loki` driver → `10.100.0.2:3100` | Local fallback: 10m/3 files |
| `docker-compose.coolify.yml` (legacy/dev) | `json-file` | 10m/3 files — **no Loki** |
| `services/tiles/docker-compose.yml` | Default (Docker `local`) | 10m/3 files |
| Observability stack containers | `local` driver | 10m/3 files |

The production web and collector containers ship logs to Loki via the Docker Loki log driver. Vector additionally scrapes all Docker containers via `/var/run/docker.sock` and enriches + ships to Loki with stable `service`/`project`/`app` labels.

### Log Format & Structure

Vector's `parse_json` transform extracts structured fields (`level`, `message`, `worker`, `duration_ms`, `task`, `error`) when the log line is valid JSON. Plain-text logs land as raw `message` strings. Next.js app logs are plain text (not JSON). Collector task logs are plain text (`[task-name] ...` prefix). No structured JSON logging is enforced at the application level.

### Loki Retention

Retention configured at **90 days** in `limits_config.retention_period`. Compactor runs every 10 minutes with retention enforcement enabled. Current store: 9.2 GB on filesystem (NVMe RAID-1).

### Search Capability

Loki is fully queryable from Grafana Explore. Labels: `server`, `source`, `service`, `project`, `app`. The `application-logs.json` and `web-applications.json` dashboards provide pre-built log panels. Alert rules (`log-fatal-panic`, `log-oomkilled`, `log-connection-refused`) query Loki via Grafana alerting.

---

## 3. Error Tracking (Sentry / GlitchTip)

| Config | Setting |
|--------|---------|
| Client (`sentry.client.config.ts`) | `tracesSampleRate: 0.25` prod, `replaysOnErrorSampleRate: 0.5`, INP enabled |
| Server (`sentry.server.config.ts`) | `tracesSampleRate: 0.25` prod, Prisma integration enabled |
| Edge (`sentry.edge.config.ts`) | `tracesSampleRate: 0.25` prod |
| Collector | `SENTRY_DSN` injected via env (both compose files) |

**GlitchTip** (`glitchtip-web`, Up 21h) runs on compute and serves as the self-hosted Sentry-compatible backend at `errors.abemon.es`. The `glitchtip-worker` is present but listed without a healthy status in `docker ps`.

**Gaps:**
- No evidence of release tagging in deploy pipeline (no `SENTRY_RELEASE` env var in either compose file).
- Source maps: not confirmed — `next.config.ts` would need `sentry` plugin config with `widenClientFileUpload` to upload.
- Client ignores `ResizeObserver`, `Load failed`, `Failed to fetch`, `NetworkError`, `AbortError`, `ChunkLoadError` — reasonable, but `Failed to fetch` silencing could hide real API failures in some browsers.
- `glitchtip-worker` lacks a Docker healthcheck definition in the visible compose stack.

---

## 4. Metrics Collection

### Prometheus Scrape Targets (all `up=1`)

| Job | Target | Interval |
|-----|--------|----------|
| `prometheus` | `10.100.0.2:9090` | 15s |
| `node-compute` | `10.100.0.2:9100` | 15s |
| `cadvisor-compute` | `10.100.0.2:9101` | 30s |
| `traefik` | `10.100.0.2:8082` | 15s |
| `node-primary` | `10.100.0.3:9100` | 15s |
| `cadvisor-primary` | `10.100.0.3:9101` | 30s |
| `postgres-trafico` | `10.100.0.3:9189` | 30s |
| `redis-trafico` | `10.100.0.3:9125` | 30s |
| `pgbouncer-trafico` | `10.100.0.3:9130` | 30s |
| `blackbox-http` | `https://trafico.live` (+ 14 others) | 60s |
| `blackbox-ssl` | `https://trafico.live` (+ 4 others) | 3600s |
| `beyla` | `10.100.0.2:9400` | 15s |
| `tempo` | `127.0.0.1:3200` | 30s |

### Custom Metrics

- **No custom application-level metrics** — trafico.live web app does not expose a `/metrics` endpoint.
- **No collector heartbeat metrics** — staleness is checked only via the `/api/health` DB query (7 tables) and the healthcheck.sh file-mtime method inside each container.
- Beyla provides zero-instrumentation HTTP span metrics (via eBPF), which feed into Tempo and Prometheus.
- Container-level CPU/memory/network visible via cAdvisor. Current trafico-live memory: ~479 MB (well under 4 GB limit). Collectors: 6–204 MB each.

---

## 5. Alerting

### Channels

| Channel | Receiver | Severity |
|---------|----------|----------|
| **Pushover** (emergency priority, `retry=60s/expire=30min`) | `pushover-critical` | critical |
| **Pushover** (normal priority) | `pushover-warning` | warning |
| **Email** (`mj@abemon.es`) | `email-digest` | all (fallback) |

Policy: critical fires after `group_wait=30s`, repeats every 4h. Warnings after 2 min, repeat every 24h. Default route emails everything grouped by `alertname+server`.

### Alert Rules (Grafana-managed, provisioned)

| Rule File | Alert Names |
|-----------|-------------|
| `rules.yml` | Service Down, Disk Space Critical/Warning, RAM Critical, CPU High, High Error Rate, PgBouncer Saturated, Redis Memory High |
| `rules-availability.yml` | Site Unreachable (3m), Slow Response >3s (5m), SSL Expiring <14d |
| `rules-infra-watchdog.yml` | PG Primary Down, Replication Lag >5min, WAL Slot Bloat, Zero Inbound Traffic, Container FS Bloat, Docker Disk High, AIDE Integrity Violation/Stale, Security alerts |
| `rules-monitoring-gaps.yml` | Container Unhealthy (10min), Container Restart Rate >3/15min, DB Primary Unreachable, WAL Archive Stale, Backup Stale, Disk Fill Prediction, WireGuard Peer Down/High Latency |
| `rules-ops-gaps.yml` | Database Server Unreachable, Container Count Drop >40%, VPN Targets Down, Real 5xx Spike >10/min, FATAL/panic in logs, OOMKilled, Connection Refused Flood |
| `rules-hardening.yml` | OOM Kill, Memory Below 5GB, Swap >60%, Schedule Manager Error |
| `rules-network.yml` | (network flow rules) |
| `rules-tracing.yml` | (tracing-derived) |
| `rules-llm.yml` | (BMC LLM) |
| Prometheus `rules-deploy-health.yml` | Cifex fleet rules (not trafico-specific) |

**Current state:** 0 firing alerts at time of audit. trafico.live `/api/health` returns `degraded` (aviation collector stale — OpenSky `*/15` last ran at 14:15, >30 min threshold — borderline/likely recovering).

---

## 6. Dashboards

All dashboards are file-provisioned under `/etc/grafana/provisioning/dashboards/` (32 JSON files).

| Dashboard | trafico.live Coverage |
|-----------|----------------------|
| `applications.json` | trafico.live row: request rate, P95 latency, collector fleet CPU/mem/running count, error feed |
| `web-applications.json` | Per-service: request rate, 5xx rate, avg response time, logs panel |
| `slo-availability.json` | Uptime per site including trafico.live |
| `infrastructure.json` / `infrastructure-v2.json` | Host-level: CPU, RAM, disk, network for compute |
| `postgresql-deep-dive.json` | Covers `postgres-trafico` (job label) |
| `redis-deep-dive.json` | Covers `redis-trafico` |
| `data-services.json` / `data-services-v2.json` | PgBouncer + exporters |
| `container-resources.json` | Per-container CPU/memory including all collectors |
| `unified-overview.json` | Cross-project overview |

**What is NOT visualized for trafico.live specifically:**
- Collector-level success/failure rate (only running/stopped via cAdvisor container count)
- Individual task durations (e.g. how long does `renfe-gtfs` take weekly?)
- API endpoint latency breakdown (p95 per route) beyond Traefik aggregate
- Typesense query latency / indexing lag
- AIS stream throughput / backpressure (`collector-ais` prints stats to stdout but no Prometheus metric)
- Data freshness per table (only via `/api/health` for 7 tables; other 71 models unmonitored)

---

## 7. Health Check Coverage

### `/api/health` (trafico.live)

Checks: DB (`SELECT 1` + latency), Redis (`PING` + latency), 7 collector staleness probes via DB `findFirst` queries.

| Collector | Stale Threshold | Status (audit time) |
|-----------|----------------|---------------------|
| v16 | 10 min | OK (last: 2m ago) |
| incidents | 10 min | OK (last: 2m ago) |
| gasStations | 10 hr | OK (last: 3h ago) |
| intensity | 15 min | OK (last: 1m ago) |
| weather | 8 hr | OK (last: 2h ago) |
| panels | 15 min | OK (last: 1m ago) |
| aviacion | 30 min | **STALE** (last: 41m ago) |

Overall status: `degraded` (HTTP 200, not 503 — only DB down triggers 503).

**Unmonitored by `/api/health`:** ferry routes, transit operators, air quality, maritime vessels, Renfe fleet, Typesense sync, IMD, CNMC fuel history, climate records — 36 of 43 collectors have no staleness check in the health endpoint.

### Uptime Kuma

Single monitor: `trafico.live /api/health` (type: `keyword`, active: yes). Watches for keyword match. **No separate monitors** for:
- `tiles.trafico.live` (tile server availability)
- API endpoints (e.g. `/api/trenes/posiciones`, `/api/maritimo`)
- Any collector-level liveness

### Docker Healthchecks

| Container | Method |
|-----------|--------|
| `trafico-live` (web) | `node -e fetch('/api/health')` — interval 30s, retries 5 |
| `collector-realtime/frequent/fuel/daily/weekly` | `healthcheck.sh` (file mtime staleness) |
| `collector-ais` | `kill -0 1` (process alive check only) |
| `tiles-tiles-1` | `wget /health` — interval 30s |
| `tiles-martin-1` | `wget :3000/health` — interval 30s |

---

## 8. Gaps and Recommendations

| # | Gap | Impact | Fix |
|---|-----|--------|-----|
| 1 | **No trafico-specific Grafana dashboard** | Blind to per-route API latency, collector task durations, Typesense health | Create `trafico-live.json` with: collector success rate (Loki), API p95 by route (Beyla/Traefik), AIS throughput, data freshness for top 10 tables |
| 2 | **`/api/health` covers only 7 of 43 collectors** | 36 collectors (transit, air quality, ferry, AIS stats, Renfe, climate, IMD) are invisible to uptime checks | Extend health check OR add Prometheus textfile metrics (collector last-run timestamps) |
| 3 | **No alerting rule for `/api/health` degraded state** | Aviation stale for 41+ min, no alert fired | Add Grafana alert: `probe_http_status_code{instance="trafico.live/api/health"} != 200 OR keyword "degraded"` |
| 4 | **No Sentry release tagging** | Errors not linked to deploys; impossible to correlate a spike to a specific version | Inject `SENTRY_RELEASE=$(git rev-parse --short HEAD)` into web container at build time |
| 5 | **No custom application metrics** | API request rates only via Traefik (no per-route breakdown), no DB query time per endpoint, no cache hit/miss ratio | Add `prom-client` to Next.js, expose `/api/metrics` (auth-gated), instrument key routes |
| 6 | **AIS collector health is process-alive only** | WebSocket reconnects silently, throughput drops invisible | Expose AIS stats (received/stored/pending) as Prometheus metrics; alert on `ais_positions_stored_total` rate drop |
| 7 | **Loki log format is unstructured for web/collectors** | Cannot filter by log level, cannot count errors per task | Add JSON log output to Next.js (via `pino` or structured console) and prefix collector logs with parseable JSON |
| 8 | **No Uptime Kuma monitors for tiles.trafico.live or key API routes** | Tile server outage invisible until users report map blank | Add: `tiles.trafico.live`, `/api/trenes/posiciones`, `/api/maritimo`, `/api/aviacion` |

---

## Summary

**Monitoring maturity: 6/10**

The infra layer (Prometheus, Loki, Grafana, Alerting, Tempo) is mature and comprehensive — host metrics, DB exporters, blackbox probes, log shipping, and alert routing via Pushover are all working. The gap is entirely at the **application layer**: no custom metrics, no trafico-specific dashboard, 36 of 43 collectors invisible to health checks, and no alert when the health endpoint returns `degraded`.

**Biggest blind spot:** A silent collector failure (e.g. OpenSky, AIS auth, Renfe LD API) for any of the 36 unmonitored tasks goes undetected until a user notices stale data — there is no alert path from "table last updated 2h ago" to Pushover.

**Top-3 gaps to fix:**
1. Extend `/api/health` or add Prometheus textfile exporter covering all 43 collector last-run timestamps, then add a Grafana alert rule for staleness.
2. Add a `trafico-live.json` Grafana dashboard (collector fleet health, API error rate by route, AIS throughput, data freshness).
3. Add Sentry release tagging (`SENTRY_RELEASE` env var at deploy) to correlate error spikes to code changes.

**Recommended alerting channel:** Pushover is already configured and working (critical + warning policies active). No change needed for the channel — the problem is missing alert rules, not missing delivery.
