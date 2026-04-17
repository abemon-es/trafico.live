# Stack Inventory — trafico.live
_Audit date: 2026-04-17 | Server: hetzner-prod (168.119.34.248)_

---

## 1. Hosting / Compute

| Property | Value |
|----------|-------|
| Server | Hetzner (168.119.34.248) |
| CPU | AMD EPYC 7502P 32-Core / 64 vCPUs |
| RAM | 256 GB total · 81 GB used · 169 GB available |
| Swap | 15 GB (2.7 GB used) |
| Root disk | 118 GB LVM (15 GB used, 13%) |
| Data disk | 1.3 TB LVM `/dev/mapper/vg0-data` (179 GB used, 16%) |
| Tile data | `/opt/trafico/tiles/tiles/` → 79 GB (includes 75 GB planet PMTiles) |
| OSRM data | `/opt/trafico/tiles/build/` → 94 GB (iberia.osm.pbf + OSRM graph) |
| Trafico app dir | `/opt/trafico/` → 174 GB total |
| Public IP | 168.119.34.248 |
| IPv6 | 2a01:4f8:242:2107::2 |
| Internal network | 10.100.0.2 (Docker bridge host alias) |
| DNS / CDN | Cloudflare (DNS-only for `tiles.trafico.live`; proxied for `trafico.live`) |
| Reverse proxy | Traefik (container `traefik`, ports 80/443/UDP 443) |
| SSL | Traefik auto-ACME via Cloudflare |
| Backup | No automated backup observed on hetzner-prod; DB is on separate hetzner-dev (`10.100.0.3`) |
| Orchestration | Coolify (manages Traefik, Compose apps, deploy webhooks) |

---

## 2. Container Inventory — trafico.live scope

_Live state from `docker ps` on 2026-04-17._

### Web Application

| Container | Status | Image | RAM limit | RAM used | Port |
|-----------|--------|-------|-----------|----------|------|
| `trafico-live` | Up 12 min (healthy) | `trafico-web:latest` (2.03 GB) | 4 GB | 407 MB | 3000 (internal) |

### Data Collectors (7 containers)

| Container | Status | Tier | RAM limit | RAM used | Notes |
|-----------|--------|------|-----------|----------|-------|
| `collector-realtime` | Up 8 min (healthy) | realtime | 3 GB | 1.74 GB | 11 tasks, */1–*/5 crons |
| `collector-frequent` | Up 19 min (healthy) | frequent | 256 MB | 6.75 MB | 3 tasks |
| `collector-fuel` | Up 19 min (healthy) | fuel | 512 MB | 9.1 MB | 3 tasks (CNMC) |
| `collector-daily` | Up 19 min (healthy) | daily | 1.5 GB | 11.3 MB | 11 tasks |
| `collector-weekly` | Up 19 min (healthy) | weekly | 2 GB | 6.9 MB | 8 tasks |
| `collector-ais` | Up 19 min (healthy) | always-on WS | 512 MB | 205 MB | aisstream.io WebSocket |

### Tile Server (2 containers)

| Container | Status | Image | RAM limit | RAM used | Port |
|-----------|--------|-------|-----------|----------|------|
| `tiles-tiles-1` | Up 4 h (healthy) | `tiles-tiles` (nginx:alpine) | 384 MB | 55.9 MB | 127.0.0.1:8088→80 |
| `tiles-martin-1` | Up 4 h (healthy) | `tiles-martin` (martin:v0.15.0) | 256 MB | 36.2 MB | 3000 (internal) |

### Routing

| Container | Status | Image | RAM limit | RAM used | Port |
|-----------|--------|-------|-----------|----------|------|
| `trafico-osrm` | Up 10 d | `osrm-backend:latest` | 4 GB | 1.59 GB | 127.0.0.1:8002→5000 |

**Total trafico.live RAM allocation: ~12 GB across 10 containers**

---

## 3. Service Inventory

### Next.js Web — `trafico-live`
- Next.js 16.2.2, React 19.2.3, Node.js 24.15.0
- Port 3000, routed via Traefik on `web` Docker network (IP: 10.0.3.38)
- Health check: `GET /api/health` every 30s
- Loki log driver → 10.100.0.2:3100

### PostgreSQL + PostGIS
- **Location:** hetzner-dev (`10.100.0.3`) — separate server from hetzner-prod
- Monitored by Prometheus postgres_exporter on `10.100.0.3:9189` (trafico DB)
- Prisma 7.3.0 with `@prisma/adapter-pg`, 78 models

### PgBouncer
- Container: `cifex-pgbouncer-local` (shared with cifex project, on cifex-compute network)
- Image: `edoburu/pgbouncer:latest`
- Config: `pool_mode=transaction`, `default_pool_size=20`, `max_client_conn=400`
- Port: 5432 (internal to cifex-compute network, 10.0.4.112)

### Redis — dedicated instance `:6441`
- Container: `glitchtip-redis` (shared with GlitchTip)
- Image: `redis:7-alpine`, version **7.4.8**
- Port: 6379 internal, exposed on :6441 to host

### Typesense — `:6442`
- Container: `cifex-typesense`
- Image: `typesense/typesense:27.1`
- 26 collections, geo-search, daily sync at 05:00
- Data volume: `/opt/typesense/data` on 1.3 TB data disk (179 GB used total)

### Nginx Tile Server — `tiles.trafico.live`
- Container: `tiles-tiles-1` (nginx:alpine)
- Serves 21 static PMTiles files from `/opt/trafico/tiles/tiles/` (79 GB)
- Key tiles: `spain.pmtiles` (2.2 GB), `trafico-iberia.pmtiles` (1.5 GB), `trafico-planet.pmtiles` (75 GB)
- Proxies `/dynamic/` to Martin (60s TTL + stale-while-revalidate)
- Traefik routes `tiles.trafico.live` → host:8088 via file provider

### Martin Dynamic Tile Server
- Container: `tiles-martin-1` (martin:v0.15.0)
- 9 PostGIS function sources: `tile_sensors`, `tile_incidents`, `tile_roadworks`, `tile_city_sensors`, `tile_fleet`, `tile_aircraft`, `tile_vessels`, `tile_transit_vehicles`, `tile_emergencies`
- DB pool: 4 connections
- Port 3000 (internal to tiles_default network)

### OSRM Routing — `trafico-osrm`
- Image: `ghcr.io/project-osrm/osrm-backend:latest`
- Data: `/opt/trafico/tiles/build/iberia.osrm.*` (Iberian Peninsula graph)
- Port: 127.0.0.1:8002→5000
- RAM: 1.59 GB / 4 GB limit

### Cloudflare
- DNS + CDN proxy for `trafico.live` (HTTP/2, WAF, DDoS)
- DNS-only (orange-cloud off) for `tiles.trafico.live` (direct to 168.119.34.248)
- Cloudflare Email Routing: catch-all → operator

### Collectors (7 Docker containers)
All built from `services/collector/Dockerfile.cron`, on `web` Docker network, logging via Loki.
- **realtime**: DGT alerts, Madrid sensors, Renfe GPS, AIS summary, OpenSky, city sensors (*/1–*/5)
- **frequent**: weather alerts, gas stations, incidents (*/10–*/30)
- **fuel**: CNMC prices, maritime fuel, MINETUR (daily 02:00+)
- **daily**: AEMET climate, air quality, AENA stats, ferry GTFS, transit GTFS, MobilityData sync, INE stats, IMD update, airport runways
- **weekly**: Renfe static GTFS, full IMD import, dgt-extras, mobility O-D batch
- **ais**: always-on WebSocket to aisstream.io (restart:always)

---

## 4. External Services

| Service | Purpose | Tier |
|---------|---------|------|
| Cloudflare | DNS, CDN, WAF, Email Routing | Free/Pro |
| GitHub (abemon-es org) | Source control, no Actions for this repo | Free |
| aisstream.io | AIS vessel WebSocket feed | Paid API (degraded since Mar 2026) |
| OpenSky Network | ADS-B aircraft positions | Free (anon rate-limited) |
| AEMET | Weather alerts + climate API | Free (API key) |
| MobilityData | 126 GTFS feeds archive | Free (refresh token) |
| Stripe | API billing, PRO/ENTERPRISE tiers | Paid (per-transaction) |
| GlitchTip (self-hosted) | Error tracking (Sentry-compatible) | Self-hosted |
| Google Analytics | Web analytics | Free |
| Coolify (self-hosted) | Container orchestration, deploy webhooks | Self-hosted |
| Renfe APIs | GTFS static + GTFS-RT + undocumented LD fleet | Free (no auth) |
| DGT | DATEX II XML, accident microdata XLSX | Free |
| CNMC | Fuel price CKAN API | Free |
| Ministerio Transportes | ArcGIS REST, BigData O-D matrices | Free |
| INE | Transport statistics JSON API | Free |
| Puertos del Estado | WFS port catalog | Free |

**Image registry:** Local Docker builds on hetzner-prod (no external registry observed).

---

## 5. Versions

| Component | Version |
|-----------|---------|
| Node.js | 24.15.0 |
| Next.js | 16.2.2 |
| React | 19.2.3 |
| Prisma | 7.3.0 |
| PostgreSQL+PostGIS | hetzner-dev (version from Prometheus exporter, not directly queried) |
| Redis | 7.4.8 (redis:7-alpine) |
| Typesense | 27.1 |
| Martin tile server | 0.15.0 |
| OSRM | latest (ghcr.io, pinned at pull time) |
| Traefik | custom build (346bc28a43a5, ~v3.x) |
| Tailwind CSS | v4 (CSS-first, no config file) |
| Loki | 3.5.12 |
| Prometheus | 2.54.1 |
| Grafana | 11.6.0 |
| GlitchTip | 6.1.5 (self-hosted) |
| Vector (log pipeline) | 0.41.1-alpine (restarting — degraded) |

---

## 6. Architecture Diagram

```
                          ┌─────────────────────────────────────────────────────┐
                          │                   INTERNET                          │
                          └──────────────────────┬──────────────────────────────┘
                                                 │
                          ┌──────────────────────▼──────────────────────────────┐
                          │              CLOUDFLARE                             │
                          │   CDN + WAF + DDoS (trafico.live proxied)          │
                          │   DNS-only for tiles.trafico.live                  │
                          └──────────────────────┬──────────────────────────────┘
                                                 │ HTTPS
                          ┌──────────────────────▼──────────────────────────────┐
                          │         HETZNER PROD  168.119.34.248               │
                          │                                                     │
                          │  ┌─────────────────────────────────────────────┐   │
                          │  │   TRAEFIK  (:80/:443)                       │   │
                          │  │   Auto-ACME SSL · HTTP→HTTPS redirect       │   │
                          │  └──────┬──────────────────┬────────────────┬──┘   │
                          │         │ trafico.live       │ tiles.trafico  │other │
                          │  ┌──────▼──────┐  ┌─────────▼──────────┐    │      │
                          │  │trafico-live │  │ tiles-tiles-1       │    │      │
                          │  │ Next.js 16  │  │ nginx:alpine        │    │      │
                          │  │ Node 24     │  │ 79 GB PMTiles       │    │      │
                          │  │ :3000       │  │ :8088               │    │      │
                          │  └──────┬──────┘  └────────┬────────────┘    │      │
                          │         │                   │ /dynamic/       │      │
                          │         │ Prisma 7          │ 60s cache       │      │
                          │         │ @prisma/adapter-pg│  ┌─────────────▼──┐   │
                          │         │                   │  │ tiles-martin-1  │   │
                          │         │                   │  │ martin v0.15.0  │   │
                          │         │                   │  │ 9 tile functions│   │
                          │         │                   │  └────────┬────────┘   │
                          │         │                               │             │
                          │         │  ┌────────────────────────────┘             │
                          │         │  │   Prisma (pool_size: 4)                  │
                          │         │  │                                          │
                          │  ┌──────▼──▼──────────────────────────┐             │
                          │  │         SHARED SERVICES            │             │
                          │  │  Redis :6441  (cache, rate limits) │             │
                          │  │  Typesense :6442  (26 collections) │             │
                          │  │  OSRM :8002  (routing, Iberia)     │             │
                          │  └────────────────────────────────────┘             │
                          │                                                     │
                          │  ┌──────────────────────────────────────────────┐  │
                          │  │   DATA COLLECTORS  (7 containers)            │  │
                          │  │                                               │  │
                          │  │  collector-realtime  → DGT/Renfe/OpenSky...  │  │
                          │  │  collector-frequent  → weather/incidents...   │  │
                          │  │  collector-fuel      → CNMC fuel prices       │  │
                          │  │  collector-daily     → AEMET/AENA/GTFS...    │  │
                          │  │  collector-weekly    → Renfe GTFS/IMD/OD...  │  │
                          │  │  collector-ais       → aisstream.io WS        │  │
                          │  └─────────────────────┬────────────────────────┘  │
                          │                        │ writes                     │
                          └────────────────────────┼────────────────────────────┘
                                                   │ TCP (PgBouncer)
                          ┌────────────────────────▼────────────────────────────┐
                          │         HETZNER DEV  10.100.0.3 (separate server)  │
                          │                                                     │
                          │  PostgreSQL + PostGIS  (78 models, 2400-line schema)│
                          │  PgBouncer  (transaction mode, pool=20, max=400)    │
                          │  Prometheus exporters (:9187–:9190)                │
                          └─────────────────────────────────────────────────────┘

OBSERVABILITY (hetzner-prod):
  obs-prometheus ← node-exporter, cadvisor, traefik, postgres exporters
  obs-grafana    ← dashboards (prometheus + loki datasources)
  obs-loki       ← log aggregation (all containers log via loki driver)
  obs-tempo      ← distributed tracing (:4317 OTLP)
  obs-beyla      ← eBPF auto-instrumentation (host network mode)
  obs-cadvisor   ← container metrics
  glitchtip-web  ← error tracking (Sentry-compatible, self-hosted)
  obs-blackbox   ← uptime probes
  obs-uptime-kuma← uptime dashboard
```

---

## 7. Single Points of Failure

| Component | Failure Impact | Mitigation |
|-----------|---------------|------------|
| **Cloudflare** | trafico.live unreachable (DNS fails for proxied traffic) | None — DNS depends on CF |
| **Traefik container** | All HTTP/HTTPS traffic broken for all apps on server | No hot-standby; restart fast but manual |
| **trafico-live container** | Web down (tile server and OSRM remain up) | `restart: unless-stopped`; Coolify deploy webhooks |
| **PostgreSQL on hetzner-dev** | All dynamic data broken (121 API endpoints return errors) | Separate server is partial isolation; no read replica |
| **PgBouncer** | Connection pool exhaustion → DB queries time out | `max_client_conn=400` is generous but single instance |
| **Redis :6441** | Rate limiting disabled (API open), all SWR/server caches miss | No Redis cluster/replica; `glitchtip-redis` is shared |
| **Typesense :6442** | Search returns empty (graceful fallback coded); Cmd+K broken | Single instance, no replication |
| **collector-realtime container** | Live trains, road sensors, aircraft positions stale (5–15 min lag) | `restart: unless-stopped` recovers automatically |
| **collector-ais container** | Live vessel positions frozen (AIS stream disconnected) | Already degraded since Mar 2026 (auth issues) |
| **aisstream.io API (external)** | Live vessel tracking permanently broken | No fallback; email sent to founders, unresolved |
| **Renfe LD undocumented API** | ~115 live LD trains disappear from map | No fallback; Cercanías GPS unaffected (separate GTFS-RT) |
| **tiles.trafico.live / nginx** | Map tiles 404; all map pages show blank basemap | `restart: unless-stopped`; fast container restart |
| **OSRM container** | Route planning broken; no routing fallback | 4 GB RAM used; restart recovers graph from disk |
| **hetzner-prod server** | Everything down (web + tiles + collectors + observability) | No hot standby; cold recovery from Coolify re-deploy |
| **exp-vector container** | Log pipeline broken (container in restart loop) | Currently degraded; logs still reach Loki via driver directly |
