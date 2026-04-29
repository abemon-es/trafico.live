# Disaster Recovery Runbook — trafico.live

**Version:** v1  
**Date:** 2026-04-18  
**RPO:** 24 h | **RTO:** 4 h  
**Owner:** Certus SPV SLU / Abemon  
**Changelog:** See [bottom of this document](#changelog)

---

## 1. Infrastructure Inventory

| Component | Host | Address | Notes |
|-----------|------|---------|-------|
| Database (Postgres 16 + PostGIS) | primary | 10.100.0.3 | PgBouncer :6440 → Postgres :5432 |
| Web app | compute | 168.119.34.248 | Docker Compose, Traefik, `/opt/trafico` |
| Collectors | compute | 168.119.34.248 | Separate Compose stack, `/opt/apps/trafico-live` |
| Redis | primary | 10.100.0.3:6441 | ioredis, cache + rate-limiting |
| Typesense | primary | 10.100.0.3:6442 | 26 collections |
| Tile server | compute | tiles.trafico.live:8088 | nginx + Martin, static PMTiles |
| WireGuard VPN | compute→primary | wg0 | compute has VPN to primary |

### Database: `le_trafico`

| Schema | Roles |
|--------|-------|
| `le_trafico` | `trafico_admin` (DDL), `trafico_app` (DML) |

### Critical Data Assets (approximate size at 2026-04-18)

| Table | Rows | Notes |
|-------|------|-------|
| `vessel_positions` | ~110 M | AIS, rolling 48 h kept in memory; all history in DB |
| `traffic_incidents` | ~750 k | DGT, rolling |
| `collector_heartbeats` | ~43 | Operational health, small |
| `climate_records` | ~4.5 M | AEMET historical |
| `traffic_intensities` | ~6 k sensors × 48 h | Rolling window |
| `renfe_delay_snapshots` | ~2 M | 2-min fleet snapshots |
| `accident_microdata` | ~500 k | DGT 2019-2023 |

---

## 2. RPO / RTO Targets

| Metric | Target | Acceptance Criteria |
|--------|--------|---------------------|
| RPO (Recovery Point Objective) | 24 h | Max data loss = 1 nightly backup interval |
| RTO (Recovery Time Objective) | 4 h | Service fully restored within 4 h of incident declaration |
| Backup age alert threshold | 36 h | Grafana fires `TraficoBackupStale` alert |

---

## 3. Backup Topology

```
primary (10.100.0.3)
  └── pg_dump -Fc -Z6 -j4  [nightly 01:00 UTC]
        └── /var/backups/trafico/YYYYMMDDTHHMM.dump
              ├── Retention: 7 daily + 4 weekly (Sun) + 3 monthly (1st)
              └── rclone → Cloudflare R2: trafico-backups
                    ├── daily/      ← all daily dumps
                    ├── weekly/     ← Sunday copies
                    └── monthly/    ← 1st-of-month copies
```

### Retention Schedule

| Frequency | Copies Kept | Trigger |
|-----------|------------|---------|
| Daily | 7 | Every run |
| Weekly | 4 (~1 month) | Sunday runs |
| Monthly | 3 | 1st of month runs |

**Assumption:** Cloudflare R2 bucket `trafico-backups` is provisioned with R2 credentials configured in rclone on `primary` as remote `r2`. If not yet set up, see Section 8 (Operator Pre-flight).

---

## 4. Backup Cron Installation

[OPERATOR] SSH to `primary` and install the cron entry:

```bash
# 1. Copy the script to primary
scp bin/backup-verify.sh primary:/opt/trafico/bin/backup-verify.sh
ssh primary chmod +x /opt/trafico/bin/backup-verify.sh

# 2. Create backup directory and Prometheus textfile directory
ssh primary mkdir -p /var/backups/trafico
ssh primary mkdir -p /var/lib/node_exporter/textfile_collector

# 3. Install cron (as root or the postgres user, depending on auth setup)
ssh primary crontab -l 2>/dev/null > /tmp/existing-cron || true
echo "0 1 * * * /opt/trafico/bin/backup-verify.sh >> /var/log/trafico-backup.log 2>&1" >> /tmp/existing-cron
ssh primary 'crontab -' < /tmp/existing-cron

# 4. Verify
ssh primary crontab -l | grep backup-verify
```

[OPERATOR] Test a manual run before trusting the cron:

```bash
ssh primary DB_NAME=le_trafico DB_USER=trafico_admin /opt/trafico/bin/backup-verify.sh
```

---

## 5. Verification Cadence

| Frequency | Action | Script |
|-----------|--------|--------|
| Daily (automatic) | pg_restore --list on freshest dump | `bin/backup-verify.sh` (cron, 01:00 UTC) |
| Weekly (Monday 03:00 staging) | Full restore to scratch DB + canary queries | `bin/backup-restore-test.sh` |
| Monthly | Manual review of Grafana `TraficoBackupStale` alert history | Human |

[OPERATOR] Install weekly restore test on hetzner-dev:

```bash
scp bin/backup-restore-test.sh hetzner-dev:/opt/trafico/bin/backup-restore-test.sh
ssh database-primary chmod +x /opt/trafico/bin/backup-restore-test.sh
ssh database-primary 'crontab -l 2>/dev/null; echo "0 3 * * 1 /opt/trafico/bin/backup-restore-test.sh >> /var/log/trafico-restore-test.log 2>&1"' | ssh database-primary crontab -
```

---

## 6. Observability: Prometheus + Grafana

The script writes `/var/lib/node_exporter/textfile_collector/trafico_backup.prom`.  
Node Exporter on `primary` must have `--collector.textfile.directory=/var/lib/node_exporter/textfile_collector` enabled.

### Grafana Alert: `TraficoBackupStale`

Create a Grafana alert rule targeting the Prometheus datasource:

```promql
(time() * 1000 - trafico_backup_last_success_timestamp_ms{method="pg_dump"}) > 129600000
```

(129600000 ms = 36 hours)

- **Severity:** critical  
- **Notification:** PagerDuty / on-call channel  
- **Description:** "trafico.live Postgres backup has not succeeded in >36h — check primary cron and `/var/log/trafico-backup.log`"

[OPERATOR] Verify node_exporter textfile path is enabled:

```bash
ssh primary systemctl cat node_exporter | grep textfile
# If absent, add --collector.textfile.directory to the ExecStart line and restart
```

---

## 7. Restore Procedures

### Scenario A — Table-level Rollback (single table, accidental delete or bad migration)

Use when: a specific table needs to be rolled back without touching other data.

```bash
# [OPERATOR] On primary (or any host that can reach primary's Postgres directly):

# 1. Identify last good dump
ls -lt /var/backups/trafico/*.dump | head -5

# 2. Extract single table from dump into a plain SQL file
DUMP=/var/backups/trafico/YYYYMMDDTHHMM.dump
TABLE=traffic_incidents   # example

pg_restore \
  -h localhost -U trafico_admin \
  -t "$TABLE" \
  --data-only \
  -f /tmp/${TABLE}_restore.sql \
  "$DUMP"

# 3. Review the SQL file before applying
head -50 /tmp/${TABLE}_restore.sql

# 4. Apply (within a transaction for safety)
psql -h localhost -U trafico_admin le_trafico <<SQL
BEGIN;
TRUNCATE TABLE "${TABLE}";
\i /tmp/${TABLE}_restore.sql
-- Verify row count looks correct before committing
SELECT COUNT(*) FROM "${TABLE}";
COMMIT;
SQL

# 5. Clean up
rm /tmp/${TABLE}_restore.sql
```

---

### Scenario B — Full DB Rollback to Previous Night

Use when: data corruption affects multiple tables, or a bad migration needs reverting.

```bash
# [OPERATOR] On primary:

# 1. Stop collectors to prevent writes during restore
ssh compute docker compose -f /opt/apps/trafico-live/docker-compose.collectors.yml stop

# 2. Stop web app to prevent reads against corrupt state
ssh compute docker compose -f /opt/trafico/docker-compose.web.yml stop

# 3. Identify the dump to restore
DUMP=$(ls -1t /var/backups/trafico/*.dump | head -1)
echo "Restoring from: $DUMP"

# 4. Drop and recreate database
psql -h localhost -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='le_trafico';"
psql -h localhost -U postgres -c "DROP DATABASE le_trafico;"
psql -h localhost -U postgres -c "CREATE DATABASE le_trafico OWNER trafico_admin;"
psql -h localhost -U postgres le_trafico -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql -h localhost -U postgres le_trafico -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"

# 5. Restore
pg_restore \
  -h localhost \
  -U trafico_admin \
  -d le_trafico \
  --no-owner \
  --exit-on-error \
  "$DUMP"

# 6. Quick sanity check
psql -h localhost -U trafico_admin le_trafico \
  -c "SELECT COUNT(*) FROM traffic_incidents; SELECT COUNT(*) FROM vessel_positions;"

# 7. Restart services
ssh compute docker compose -f /opt/trafico/docker-compose.web.yml start
ssh compute docker compose -f /opt/apps/trafico-live/docker-compose.collectors.yml start

# 8. Verify health endpoint
curl -sf https://trafico.live/api/health | jq .
```

**Expected downtime:** 30–90 min depending on dump size. Largest table (vessel_positions ~110M rows) dominates restore time.

---

### Scenario C — Full Server Replacement (rebuild primary from R2 onto new Hetzner box)

Use when: `primary` hardware fails completely and cannot be recovered.

**Prerequisites:** New Hetzner CX41+ box provisioned, SSH access, same WireGuard subnet available.

```bash
# [OPERATOR] On new primary:

# 1. Install Postgres 16 + PostGIS
apt-get update && apt-get install -y postgresql-16 postgresql-16-postgis-3 rclone

# 2. Configure WireGuard (restore wg0.conf from secrets manager / 1Password)
[OPERATOR] Restore /etc/wireguard/wg0.conf and bring up wg0

# 3. Configure rclone with R2 credentials
[OPERATOR] Run: rclone config → add remote "r2" (type=s3, provider=Cloudflare)
# Credentials stored in: [SECRETS LOCATION — see Section 9]

# 4. Download latest dump from R2
mkdir -p /var/backups/trafico
LATEST=$(rclone ls r2:trafico-backups/daily/ --include "*.dump" | sort -k2 | tail -1 | awk '{print $2}')
rclone copy "r2:trafico-backups/daily/${LATEST}" /var/backups/trafico/

# 5. Create database + restore (same as Scenario B steps 4-6)
systemctl start postgresql
sudo -u postgres psql -c "CREATE ROLE trafico_admin LOGIN SUPERUSER PASSWORD 'REDACTED';"
sudo -u postgres psql -c "CREATE ROLE trafico_app LOGIN PASSWORD 'REDACTED';"
# [OPERATOR] Set actual passwords from secrets manager

sudo -u postgres createdb -O trafico_admin le_trafico
sudo -u postgres psql le_trafico -c "CREATE EXTENSION IF NOT EXISTS postgis;"

pg_restore \
  -h localhost \
  -U trafico_admin \
  -d le_trafico \
  --no-owner \
  /var/backups/trafico/${LATEST}

# 6. Update PgBouncer config if needed
[OPERATOR] Restore /etc/pgbouncer/pgbouncer.ini from secrets or re-configure

# 7. Update DNS / WireGuard peer on compute to point to new primary IP
[OPERATOR] Update compute's /etc/wireguard/wg0.conf and wg set wg0 peer ... endpoint <new-ip>:51820

# 8. Verify from compute
docker run --rm postgres:16-alpine \
  psql "postgresql://trafico_admin:PASSWORD@10.100.0.3:6440/le_trafico" \
  -c "SELECT COUNT(*) FROM traffic_incidents;"

# 9. Restart collectors + web
ssh compute docker compose -f /opt/trafico/docker-compose.web.yml restart
ssh compute docker compose -f /opt/apps/trafico-live/docker-compose.collectors.yml restart

# 10. Install backup cron (Section 4)
```

**Estimated total time:** 2–4 h (download 15–30 min, restore 60–120 min, config 30–60 min).

---

### Scenario D — Split-Brain Recovery (primary came back after failover)

Use when: primary went offline, a temporary failover was applied (e.g., writes directed to a replica or paused), and primary has now recovered with a stale state.

**Goal:** Reconcile data written to the temporary target during outage with the revived primary.

```bash
# [OPERATOR] Assessment first:

# 1. Determine the exact outage window
#    - Check collector_heartbeats for last known good timestamps
#    - Check application logs on compute for first DB error timestamp

# 2. Dump the current state of primary (may be behind)
pg_dump -h primary_old -U trafico_admin -Fc -Z6 \
  -f /tmp/primary_stale_$(date +%Y%m%d).dump le_trafico

# 3. Dump the failover target (has newer data)
pg_dump -h failover_target -U trafico_admin -Fc -Z6 \
  -f /tmp/failover_$(date +%Y%m%d).dump le_trafico

# 4. For tables with time-based primary keys (vessel_positions, traffic_incidents):
#    Extract rows written AFTER the outage start from the failover target,
#    then INSERT INTO primary (no truncation needed).

OUTAGE_START="2026-04-XX HH:MM:00+00"  # [OPERATOR] fill in actual time

psql -h failover_target -U trafico_admin le_trafico \
  -c "COPY (SELECT * FROM vessel_positions WHERE timestamp > '${OUTAGE_START}') TO STDOUT" \
  | psql -h primary -U trafico_admin le_trafico \
  -c "COPY vessel_positions FROM STDIN"

# Repeat for other time-series tables as appropriate.

# 5. Verify row counts match across both hosts before switching DNS/connections back to primary.

# 6. Point compute back to primary (update DATABASE_URL in .env if it was changed).

# 7. Restart services.
```

**Note:** If no true failover was in place (primary failed and collectors stopped writing), then primary is already the "freshest" state. Simply restore from the nightly dump and accept RPO data loss (max 24 h).

---

## 8. Operator Pre-flight Checklist

Before the backup system is live, [OPERATOR] must complete:

- [ ] SSH to `primary` and verify Postgres user / auth works for `pg_dump`
- [ ] Create `/var/backups/trafico/` with appropriate ownership (`chown postgres:postgres`)
- [ ] Create `/var/lib/node_exporter/textfile_collector/` if node_exporter is installed
- [ ] Configure rclone `r2` remote with Cloudflare R2 credentials (see secrets)
- [ ] Create R2 bucket `trafico-backups` with subdirectories `daily/`, `weekly/`, `monthly/`
- [ ] Copy `bin/backup-verify.sh` to `/opt/trafico/bin/` and `chmod +x`
- [ ] Install cron entry (Section 4)
- [ ] Run one manual backup and confirm R2 upload succeeds
- [ ] Copy `bin/backup-restore-test.sh` to hetzner-dev and install Monday cron
- [ ] Create Grafana alert `TraficoBackupStale` (Section 6)

---

## 9. Secrets Recovery

**Rule: No secrets are stored in this runbook.** All credentials are in the team secrets manager.

| Secret | Location |
|--------|----------|
| Postgres passwords (`trafico_admin`, `trafico_app`) | 1Password / ops vault → "trafico.live DB credentials" |
| R2 Access Key + Secret | 1Password → "Cloudflare R2 trafico-backups" |
| WireGuard `wg0.conf` for primary | 1Password → "primary WireGuard config" |
| PgBouncer config | `/opt/trafico/.env.bak-*` on compute OR 1Password |
| Full `.env` for web + collectors | compute `/opt/trafico/.env` and `/opt/apps/trafico-live/.env` (mode 600) |
| Hetzner API token (for server rebuild) | 1Password → "Hetzner trafico.live" |

---

## 10. Limitations and Known Gaps (as of v1)

| Gap | Risk | Mitigation |
|-----|------|-----------|
| No active nightly backup on primary (pre-runbook state) | P0 launch-blocker | Resolved by installing this runbook's cron |
| SSH from compute to primary not set up | Manual restore requires operator with primary credentials | Document operator SSH key requirement |
| R2 bucket provisioning not confirmed | rclone upload may silently skip | Pre-flight checklist item; script logs WARN on skip |
| `backup-pulse` endpoint (`/api/health/backup-pulse`) not yet implemented | Heartbeat POST silently skipped | Script handles gracefully (HTTP non-2xx = WARN only) |
| No Postgres streaming replication | Any hardware failure = RPO determined by last dump | Streaming replication is post-launch roadmap item |

---

## Changelog

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| v1 | 2026-04-18 | T3.1κ (sub-agent) | Initial draft — DR runbook, backup scripts, restore procedures |
