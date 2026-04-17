# trafico.live Monitoring

Grafana dashboard and alert rules for the trafico.live application stack.

## Directory Layout

```
monitoring/
├── README.md                         # This file
├── grafana-dashboards/
│   └── trafico-live.json             # Application overview dashboard (11 panels)
└── alert-rules/
    └── trafico-live.yml              # Grafana-managed alert rules (7 rules)
```

## Provisioning

### Grafana Dashboards

Dashboards are file-provisioned. Copy (or symlink) the JSON file to the Grafana provisioning directory on compute:

```bash
# On compute — assumes obs stack at /opt/obs (adjust path as needed)
cp monitoring/grafana-dashboards/trafico-live.json \
   /opt/obs/provisioning/dashboards/trafico-live.json

# Grafana picks up changes within 30s (default poll interval).
# Force reload without restart:
curl -X POST http://admin:${GF_PASSWORD}@localhost:3000/api/admin/provisioning/dashboards/reload
```

The dashboard uses two input datasources resolved at provision time:
- `DS_PROMETHEUS` — the Prometheus datasource (already scraped: `postgres-trafico`, `redis-trafico`, `pgbouncer-trafico`, `traefik`, `beyla`, `blackbox-http`)
- `DS_LOKI` — the Loki datasource (Docker log driver shipping from web + collector containers)

If your Grafana uses named datasources "Prometheus" and "Loki", the `__inputs` block in the JSON resolves automatically. If names differ, update `__inputs[].label` or use Grafana's import UI substitution.

### Alert Rules

Alert rules use Grafana-managed alerting (YAML provisioning format, `apiVersion: 1`). Deploy to:

```bash
cp monitoring/alert-rules/trafico-live.yml \
   /opt/obs/provisioning/alerting/trafico-live.yml

# Reload alerting rules:
curl -X POST http://admin:${GF_PASSWORD}@localhost:3000/api/admin/provisioning/alerting/reload
```

Rules are placed in the folder `trafico.live` (auto-created by provisioning). Alert routing uses the existing Pushover contact points defined in the global alertmanager config:
- `severity: critical` → `pushover-critical` (emergency priority, retry 60s/expire 30min)
- `severity: warning` → `pushover-warning` (normal priority)

## Dashboard Panels (11 panels)

| # | Panel | Type | Data Source | Notes |
|---|-------|------|-------------|-------|
| 1 | Collector Heartbeat Age | Table | Prometheus | Requires heartbeat exporter — see below |
| 2 | Stale Collectors | Stat | Prometheus | Count of tasks where age > 2× threshold |
| 3 | AIS Throughput | Time series | Loki | Parses "stored N positions" from collector-ais logs |
| 4 | API 5xx Error Rate | Time series | Prometheus | `traefik_service_requests_total{code=~"5.."}` |
| 5 | API P95 Latency | Time series | Prometheus | Beyla `http_server_request_duration_seconds` + Traefik fallback |
| 6 | PgBouncer Active Conns | Stat | Prometheus | `pgbouncer_pools_server_active_connections{database="le_trafico"}` |
| 7 | PgBouncer Waiting Clients | Stat | Prometheus | `pgbouncer_pools_client_waiting_connections` |
| 8 | DB Connection Pool (trend) | Time series | Prometheus | active + waiting over time |
| 9 | Redis Ops/sec | Stat | Prometheus | `rate(redis_commands_processed_total[1m])` |
| 10 | Redis Cache Hit Ratio | Stat | Prometheus | hits / (hits+misses) |
| 11 | Edge Cache Hit Ratio | Stat | Loki | CF-Cache-Status HIT from Traefik access logs |
| 12 | /api/health Probe Status | Stat | Prometheus | `probe_success` from blackbox exporter |
| 13 | /api/health HTTP Status | Stat | Prometheus | `probe_http_status_code` |
| 14 | Data Freshness Reference | Text | — | Links to /api/health + heartbeat exporter docs |

**Time default:** last 1 hour | **Refresh:** 30s | **UID:** `trafico-live-overview`

## Alert Rules (7 rules)

| Rule | Condition | For | Severity | Status |
|------|-----------|-----|----------|--------|
| `TraficoCollectorHeartbeatStale` | heartbeat age > 2× threshold | 1m | warning | **paused** — needs exporter |
| `TraficoApi5xxSpike` | 5xx rate > 10/min | 2m | critical | active |
| `TraficoApi5xxWarning` | 5xx rate > 3/min | 5m | warning | active |
| `TraficoHealthDegraded` | "degraded" keyword in health probe logs | 3m | warning | active |
| `TraficoHealthDown` | probe_success=0 or HTTP ≥500 | 2m | critical | active |
| `TraficoDbConnectionsHigh` | PgBouncer active > 40 | 5m | warning | active |
| `TraficoRedisMemoryHigh` | Redis memory ratio > 0.8 | 10m | warning | active |

## Metrics That Require Additional Exporters

### Collector Heartbeat Exporter

The `TraficoCollectorHeartbeatStale` alert rule and the first two dashboard panels depend on these Prometheus metrics (not currently exposed):

```
trafico_collector_heartbeat_age_seconds{task, tier, env}
trafico_collector_heartbeat_threshold_seconds{task, tier, env}
```

**To implement (follow-up task):** Add a small textfile collector or sidecar that:
1. Queries the `CollectorHeartbeat` table in Postgres (populated by T3.1β's `/api/health` fix)
2. Writes a Prometheus textfile to `/var/lib/node-exporter/textfile/trafico-heartbeat.prom`
3. Node exporter picks it up via `--collector.textfile.directory`

Expected format:
```
# HELP trafico_collector_heartbeat_age_seconds Seconds since last successful collector run
# TYPE trafico_collector_heartbeat_age_seconds gauge
trafico_collector_heartbeat_age_seconds{task="v16",tier="realtime",env="prod"} 120
trafico_collector_heartbeat_age_seconds{task="opensky",tier="frequent",env="prod"} 900
# HELP trafico_collector_heartbeat_threshold_seconds Expected max age for the task
# TYPE trafico_collector_heartbeat_threshold_seconds gauge
trafico_collector_heartbeat_threshold_seconds{task="v16",tier="realtime",env="prod"} 600
trafico_collector_heartbeat_threshold_seconds{task="opensky",tier="frequent",env="prod"} 900
```

Until deployed, `TraficoCollectorHeartbeatStale` is set `isPaused: true` in the YAML.

### Beyla HTTP Histogram

Panel 5 (API P95 Latency) uses `http_server_request_duration_seconds_bucket{job="beyla"}`.
Beyla is already running (`obs-beyla`, Up 7d, scraping at :9400). Verify the histogram metric name:

```bash
curl -s http://10.100.0.2:9400/metrics | grep http_server_request_duration
```

If the metric name differs (e.g. `http.server.request.duration`), update the panel query accordingly.
The Traefik `traefik_service_request_duration_seconds_bucket` query is provided as a fallback.

### Edge Cache Hit Ratio

Panel 11 parses `CF-Cache-Status: HIT` from `{job="traefik"}` Loki logs. This works only if:
- Traefik access log format includes the `CF-Cache-Status` response header
- Traefik is labeled `job=traefik` in the Loki Docker log driver config

If the label or field is absent, this panel will show `N/A` — not an error.

## Updating Dashboards

1. Edit `monitoring/grafana-dashboards/trafico-live.json` in this repo.
2. Increment the `version` field at the bottom of the JSON.
3. Deploy via `cp` or symlink as shown above (Grafana polls every 30s).
4. Do NOT use Grafana UI "Save" on provisioned dashboards — it won't persist to git.

## Runbooks

### TraficoCollectorHeartbeatStale
- Identify the stale task via dashboard panel or `$labels.task`
- Check container logs: `docker logs collector-<tier> --tail 100 | grep <task>`
- Check if the upstream API is reachable (e.g. OpenSky rate limit, aisstream.io auth)
- Restart container if needed: `docker restart collector-<tier>`

### TraficoApi5xxSpike / TraficoApi5xxWarning
- Check Traefik logs: `docker logs traefik --tail 200 | grep " 5[0-9][0-9] "`
- Check Next.js logs: `docker logs trafico-live --tail 200`
- Check GlitchTip at `errors.abemon.es` for error groupings
- Check DB connections: verify PgBouncer panel is not saturated

### TraficoHealthDegraded
- Visit https://trafico.live/api/health for JSON breakdown
- Identify which collector is stale and by how much
- If borderline (e.g. OpenSky every 15min, checked at 16min): wait one cycle
- If stuck: restart the relevant collector container

### TraficoHealthDown
- Check if web container is running: `docker ps | grep trafico-live`
- Check Traefik: `docker logs traefik --tail 50`
- Check if DB is reachable: `docker exec trafico-live node -e "require('./src/lib/db').default.$queryRaw\`SELECT 1\`"`
- Last resort: `docker restart trafico-live`

### TraficoDbConnectionsHigh
- Check `pgbouncer_pools_client_waiting_connections` — if >0, clients are blocked
- Check slow queries: `SELECT * FROM pg_stat_activity WHERE state='active' AND query_start < now()-interval '5s'`
- If caused by a traffic spike, no action needed — pool will recover
- If caused by a slow query, identify and add index or optimize

### TraficoRedisMemoryHigh
- Check what's consuming memory: `redis-cli -p 6441 INFO memory`
- Check largest keys: `redis-cli -p 6441 --bigkeys`
- If rate-limiter keys are bloating: check TTL configuration in `src/lib/api-utils.ts`
- If near eviction, consider increasing `maxmemory` in Redis config
