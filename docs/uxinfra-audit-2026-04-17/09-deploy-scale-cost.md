# 09 — Deploy, Scale, Cost & Disaster Recovery Audit

_Audited: 2026-04-17 | Live server state confirmed via SSH to `compute` (168.119.34.248)_

---

## 1. Deployment Pipeline — Current State

### Flow

```
git push origin main
  → GitHub webhook (HMAC-SHA256)
  → deploy.abemon.es (almir/webhook container)
  → /opt/deployer/scripts/deploy-generic.sh
  → git pull /opt/apps/trafico-live
  → docker build (deploy.sh: DOCKER_BUILDKIT=1, --memory 4096m)
  → docker rm -f trafico-live
  → docker run -d (Traefik labels, healthcheck)
  → 15s sleep + health poll → success/fail + Pushover notification
  → Grafana deploy annotation injected
```

### Pipeline state

| Property | Value |
|----------|-------|
| Trigger | GitHub push-to-main webhook |
| Webhook auth | HMAC-SHA256 (GitHub IP whitelist) |
| Build location | On `compute` server (not in CI) |
| Build command | `DOCKER_BUILDKIT=1 docker build --memory 4096m` |
| Deployment strategy | `docker rm -f` old container → `docker run` new (hard cutover) |
| Health check | `fetch('/api/health')` → 200 required |
| Post-deploy smoke | Present but 0/0 tests pass (placeholder, no real assertions) |
| Notifications | Pushover (success normal, failure high-priority) |
| Rate limiter | 60s cooldown per app (protects against push storms) |
| Coolify | Decommissioned 2026-04 — current path is native Docker + webhook deployer |

### Downtime per deploy

The `docker rm -f` + `docker run` sequence creates a hard gap. From deploy log timings:

| Step | Duration |
|------|----------|
| `npm install` + `prisma generate` + `next build` | ~72s |
| Docker layer export / image write | ~8s |
| Container stop → start gap | **~5–15s hard downtime** |
| Health start period | 30s (container up, app may still be initialising) |
| Total wall time | **~160–165s** (~2.7 min) |

There is **no blue-green or rolling restart**. Every deploy causes ~5–15s of HTTP 502 from Traefik.

### Rollback

```bash
ssh compute '/opt/deployer/scripts/rollback.sh trafico-live'
```

- Previous image is tagged `trafico-web:rollback` by deployer before each build.
- Rollback re-tags `:rollback` → `:latest` and runs `docker compose up -d`.
- **Only one rollback depth** — no versioned tag history.
- Verified live: only `trafico-web:latest` image exists; `:rollback` tag is created fresh per deploy.

### Environments

| Environment | State |
|-------------|-------|
| Production | `trafico.live` — automatic on push to `main` |
| Staging | Defined in deploy-system.md (`staging.trafico.live`), not confirmed active |
| Preview | PR-based via `{branch}-trafico.preview.abemon.es`, 72h TTL |
| Dev/local | `npm run dev` locally — no shared dev server |

---

## 2. Build Time Analysis

| Phase | Duration |
|-------|----------|
| `npm install --include=dev` (from git clone, no layer cache hit) | ~30s |
| `prisma generate` | ~5s |
| `next build` (RSC, 150+ pages, `--max-old-space-size=4096`) | ~72s |
| Multi-stage COPY to runtime image | ~25s |
| Layer export + image write | ~8s |
| **Total build** | **~140–145s** |
| Container start + health wait | ~20s |
| **Total pipeline wall time** | **~160–165s** |

**Docker image size:** 2.03 GB (measured live). No registry push — images live directly on `compute`. This means every rollback or redeploy requires the full build on the server.

**Build memory:** Capped at 4096m via `--memory 4096m` flag. Node.js also gets `--max-old-space-size=4096`. Risk: build competes with live containers during deploy.

---

## 3. Secrets Management

| Secret store | Location | Access |
|-------------|----------|--------|
| Runtime env | `/opt/apps/trafico-live/.env` (plaintext, root:root 644) | Root on compute |
| Collector env | `/opt/apps/trafico-live/.env.collectors` (root:root 600) | Root on compute |
| Age-encrypted backup | `/opt/apps/trafico-live/.env.age` (in Git) | age key in Keychain |
| Webhook secrets | `/opt/deployer/.env` | Root on compute |
| Backup encryption key | `/opt/cifex/secrets/backup-encryption-key.txt` + macOS Keychain + email | 3 locations |

**Rotation procedure:** Manual — update `/opt/apps/trafico-live/.env`, restart container. No automated rotation.

**Risk:** `.env` file is world-readable (`-rw-r--r-- root root`). Should be `600`.

**No secrets in Git** — confirmed; `.env` is gitignored. Age-encrypted `.env.age` in repo is safe.

---

## 4. Cost Structure (Monthly Estimate)

| Component | Cost | Notes |
|-----------|------|-------|
| Hetzner `compute` (AX102, EPYC 7502P 64c, 256GB, 2×1.92TB RAID1) | €212 | Shared with cifex, blitz, monitoring, 10+ other apps |
| Hetzner `primary` (Xeon W-2295 18c, 256GB — PG/Redis/Typesense) | €220 | Shared with cifex, apps-postgres, timescaledb |
| Hetzner `bmc-vault` (Xeon W-2295 18c, 256GB — isolated BMC tenant) | €240 | Not trafico.live — allocated to BMC |
| 3× IPv4 | €6 | |
| Cloudflare (DNS, CDN, Email Routing) | ~€0 | Free tier confirmed (no paid plan seen) |
| AEMET API | €0 | Public, no-cost |
| OpenSky Network | €0 | Anonymous, rate-limited |
| aisstream.io | ~$20–50 | Paid (AISSTREAM_API_KEY present; currently degraded since Mar 2026) |
| GlitchTip (self-hosted) | €0 | On compute |
| GitHub | €0 | Public + free org |
| Stripe | % of revenue | 2.9%+€0.30 per transaction (API premium tiers) |
| **trafico.live share of infra** | **~€160–180/mo** | Estimate: 40–45% of compute + 30% of primary |

**Total estimated run cost: €180–230/mo** (excluding Stripe fees and any future Cloudflare paid tier upgrade).

---

## 5. Scaling Bottlenecks

### Database connection ceiling

| Layer | Limit | Notes |
|-------|-------|-------|
| PgBouncer (transaction mode) | 25 pool connections | CLAUDE.md confirms "25-conn pool" |
| PostgreSQL `trafico-postgres` | ~100 max_connections (4GB shared) | Estimated from 4GB allocation |
| Effective req/s ceiling | ~200–400 req/s | At 5ms avg query latency with 25 connections |

PgBouncer transaction pooling is the primary bottleneck. 25 pool connections @ 5ms avg = 5,000 queries/s theoretical; but Next.js RSC pages often fire 3–8 queries, so real req/s ceiling is ~600–1,600 page requests/s before queuing begins.

### Current live resource usage (measured)

| Container | CPU | Memory |
|-----------|-----|--------|
| `trafico-live` (web) | 13.6% of 64 cores | 488 MB / 4 GB limit |
| `collector-realtime` | 0.85% | 269 MB / 3 GB limit |
| `collector-ais` | 4.58% | 207 MB / 512 MB limit (40% used) |
| `trafico-osrm` | 0.00% | 1.59 GB / 4 GB limit |
| `compute` load average | 11.14 / 11.48 / 12.05 | 81 GB / 251 GB RAM used |

### Bandwidth ceiling

Cloudflare CDN fronts all traffic (60s `s-maxage` for most pages, 300s for static-ish). CDN absorbs repeated page loads. API routes and dynamic data bypass cache. Hetzner AX102 has 1 Gbps port — not a bottleneck at current scale.

### CPU saturation during build

During a deploy, `next build` runs directly on `compute` with 4GB RAM cap. At 11–12 average load already, a build can push load to 15–20. Collectors continue running during build. Risk: slow builds under load, collector missed windows.

### Disk I/O

`/opt` on `/dev/mapper/vg0-data`: 179 GB used / 1.3 TB (16%). Healthy. PMTiles planet build (documented 254 GB temp) would need careful scheduling.

---

## 6. Capacity Planning

### At 10K DAU (~70 req/s peak, 3x headroom)

| Component | Status |
|-----------|--------|
| Web container (488 MB / 4 GB, 13.6% CPU) | Comfortable — 5–8x headroom |
| PgBouncer 25-conn pool | Comfortable — ~200 concurrent DB queries before queuing |
| Redis rate limiter | Comfortable |
| Cloudflare CDN | Absorbs static-ish pages |
| Collector containers | Unaffected |
| **Verdict** | **Handles 10K DAU without changes** |

### At 100K DAU (~700 req/s peak)

| Component | Risk |
|-----------|------|
| PgBouncer pool (25 conn) | **First to break** — queue depth spikes on slow API routes |
| Web container memory | May need 2–3 replicas or 8 GB limit |
| `compute` CPU (64 cores, load ~12 idle) | 100K adds ~50–100 req/s load — manageable but tight with collectors |
| Redis (single instance :6441) | Needs replication or Dragonfly upgrade |
| Typesense search | 26 collections on shared :6442 — may need dedicated node |
| Single web container = SPOF | Zero redundancy — one crash = full outage |
| **Verdict** | **PgBouncer pool size and single replica are blockers at 100K DAU** |

---

## 7. Disaster Recovery

### Backup inventory (trafico-specific)

| Data | Method | Frequency | Offsite |
|------|--------|-----------|---------|
| `trafico-postgres` (PostGIS) | pg_dump via PgBackWeb | Hourly (inferred from platform policy) | Daily to Cloudflare R2 (30d) |
| Redis :6441 (trafico cache) | RDB hourly | Hourly | Daily R2 |
| Typesense collections (26) | Daily snapshot | Daily | Daily R2 |
| `.env` / `.env.collectors` | age-encrypted in Git + R2 secrets backup | On change | Git + R2 |
| Docker images | On compute only — no registry | Per deploy | **No offsite** |

### Recovery scenarios

| Scenario | RPO | RTO | Notes |
|----------|-----|-----|-------|
| Single container crash | 0 | <30s | `restart: unless-stopped` auto-recovers |
| Bad deploy | 0 | ~3 min | `rollback.sh trafico-live` (1-depth only) |
| `compute` server failure | 0 (data on `primary`) | ~1–2h | Provision new compute, bootstrap.sh, DNS update |
| `primary` server failure (PG) | ~1h (last hourly backup) | ~2–4h | Restore from R2, rebuild Typesense or restore snapshot |
| Both servers simultaneous | Up to 1h data loss | 4–8h | R2 backups are the last resort |
| Cloudflare R2 corruption | Up to 30d | — | Verify encrypted bundle integrity |

### Failover

**There is no automatic failover.** Both the web app and the database live on separate Hetzner dedicated servers with no standby replica or read replica. Recovery requires manual provisioning.

**Hetzner DC outage:** Both `compute` and `primary` are in the same Hetzner location (Falkenstein, DE). A datacenter-level failure would take down both simultaneously. No cross-DC DR plan exists.

---

## 8. CI/CD Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| No automated tests in pipeline | High | `npm test` not called during deploy; smoke test runs 0/0 assertions |
| No lint / type-check in pipeline | Medium | `npm run build` catches type errors (TypeScript strict), but no explicit `tsc --noEmit` pre-build |
| Build runs on production server | Medium | Competes with live traffic for CPU/RAM; no isolated build environment |
| No container registry | Medium | Images only on `compute`; rollback is 1-depth only; no image history |
| No blue-green deployment | High | Every deploy = 5–15s downtime |
| Feature flags | None | All changes are live immediately; no gradual rollout capability |
| Staging environment | Unclear | Defined in docs but not confirmed active for trafico.live |
| No dependency audit in CI | Medium | `npm audit` shows 12 high, 10 moderate vulnerabilities (0 critical) |

---

## 9. Security Audit (Brief)

### Firewall & network

| Layer | Status |
|-------|--------|
| ufw default deny incoming | Active |
| DOCKER-USER iptables chain | Blocks direct Docker port exposure |
| Only 80/443/SSH/WireGuard public | Confirmed via `ufw status` |
| Internal services (cAdvisor, node-exporter, Beszel) | WireGuard-only |
| Traefik dashboard blocked | Confirmed (`8080/tcp DENY eth0`) |
| Tang server (clevis/LUKS) | 7500/tcp from bmc-vault only |

### TLS

- Traefik v3.6 with Let's Encrypt HTTP-01 (production) and DNS-01 Cloudflare (wildcard previews/staging)
- HSTS `max-age=31536000; includeSubDomains; preload`
- Certs auto-renewed by Traefik

### Application security

| Check | Status |
|-------|--------|
| Security headers (HSTS, CSP, X-Frame, nosniff) | Configured in `next.config.ts` |
| CSP `unsafe-inline` + `unsafe-eval` on `script-src` | Present (weakens CSP — Sentry tunnel requires it) |
| API auth (same-origin + `x-api-key`) | Implemented in `src/lib/auth.ts` |
| Rate limiting (Redis-backed) | Active on all API routes |
| Prisma parameterized queries | Confirmed — no raw SQL |
| `.env` file permissions | `rw-r--r-- root root` — **should be 600** |
| CrowdSec | Running (healthy, 8 days uptime) |
| npm audit | 12 high, 10 moderate, 0 critical vulnerabilities |
| SSH hardening | Not audited in this pass |

---

## 10. Top-10 Risks + Mitigations

| # | Risk | Severity | Mitigation |
|---|------|----------|-----------|
| 1 | **Single web container — no redundancy** | Critical | Add a second `trafico-live` replica behind Traefik; enables zero-downtime rolling deploy |
| 2 | **No blue-green deploy — 5–15s downtime per push** | High | Implement blue-green with Traefik weighted routing or add `--stop-timeout` + health gate |
| 3 | **PgBouncer 25-conn pool caps at ~600 req/s** | High | Increase to 50–100 connections; monitor with `pgbouncer stats` dashboard |
| 4 | **No cross-DC failover — both servers in same Hetzner DC** | High | Add Hetzner Falkenstein2 or Helsinki node as cold standby; async Postgres replication |
| 5 | **1-depth rollback only — no image history** | High | Push images to a private registry (GHCR or Hetzner Registry) with version tags |
| 6 | **`.env` file world-readable on server** | Medium | `chmod 600 /opt/apps/trafico-live/.env` immediately |
| 7 | **Build on production server — CPU/RAM competition** | Medium | Move builds to GitHub Actions + GHCR push; deploy pulls image |
| 8 | **12 high npm vulnerabilities unresolved** | Medium | Run `npm audit fix`; review remaining manually; add `npm audit` to deploy gate |
| 9 | **AIS collector degraded since Mar 2026** | Medium | Awaiting vendor response (aisstream.io); implement fallback to Vesseltracker or OpenCPN |
| 10 | **Smoke test runs 0/0 assertions** | Low | Add at minimum: `GET /`, `GET /api/health`, one data API endpoint — fail deploy on non-200 |

---

## Summary

| Dimension | Score / Value |
|-----------|--------------|
| Deploy maturity | **4/10** — automated pipeline exists but no blue-green, no image registry, 1-depth rollback, builds on prod |
| Monthly cost estimate | **€180–230/mo** (trafico.live share of infrastructure) |
| Biggest SPOF | Single `trafico-live` container — one crash = full outage with 2–3 min MTTR |
| Biggest scaling bottleneck | PgBouncer 25-connection pool — first to saturate at ~100K DAU |
| DR readiness | **5/10** — hourly DB backups + R2 offsite are solid; no standby replica, no cross-DC, 1–4h RTO |
| **Top 3 to fix pre-launch** | (1) Add second web replica for zero-downtime deploys · (2) `chmod 600 .env` · (3) Raise PgBouncer pool to 50 connections |
