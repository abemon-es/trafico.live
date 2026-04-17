# DR On-Call Checklist — trafico.live

**RPO 24 h | RTO 4 h** — Full runbook: `docs/DR-RUNBOOK.md`

---

## Incident Triggered — First 10 Minutes

- [ ] Declare incident: note exact time (`T0`)
- [ ] Check Grafana → `TraficoBackupStale` alert age
- [ ] Check compute web health: `curl -sf https://trafico.live/api/health | jq .`
- [ ] Check DB reachability from compute:
  ```bash
  docker run --rm postgres:16-alpine psql "$DATABASE_URL" -c "SELECT 1;"
  ```
- [ ] Determine failure scope: DB down? Compute down? Data corruption? Network?

---

## DB Down / primary unreachable

- [ ] SSH to `primary` (10.100.0.3) — needs operator credentials + WireGuard VPN
- [ ] Check Postgres status: `ssh primary systemctl status postgresql`
- [ ] If Postgres crashed: `ssh primary systemctl restart postgresql` — then verify
- [ ] If disk full: `ssh primary df -h` — free space before restarting
- [ ] If host down: proceed to **Full Server Replacement** (DR-RUNBOOK §7C)

---

## Data Corruption (bad migration / accidental delete)

- [ ] STOP collectors immediately (prevent further writes):
  ```bash
  ssh compute docker compose -f /opt/apps/trafico-live/docker-compose.collectors.yml stop
  ```
- [ ] STOP web app:
  ```bash
  ssh compute docker compose -f /opt/trafico/docker-compose.web.yml stop
  ```
- [ ] Single table? → DR-RUNBOOK §7A (table-level rollback)
- [ ] Multiple tables / full rollback? → DR-RUNBOOK §7B (full DB rollback)
- [ ] Restart services after restore and verify health endpoint

---

## Full Server Replacement (primary hardware gone)

- [ ] Provision new Hetzner box (CX41+ minimum, Debian 12)
- [ ] Follow DR-RUNBOOK §7C step by step
- [ ] Estimated: 2–4 h total (respect RTO=4h)
- [ ] Critical path: download from R2 → restore → PgBouncer config → WireGuard peer update → DNS

---

## Post-Restore Verification

- [ ] `curl -sf https://trafico.live/api/health | jq .` → all green
- [ ] Check collector heartbeats are writing:
  ```bash
  docker run --rm postgres:16-alpine psql "$DATABASE_URL" \
    -c "SELECT task, status, \"lastRunAt\" FROM collector_heartbeats ORDER BY \"lastRunAt\" DESC LIMIT 5;"
  ```
- [ ] Spot-check a live data page (e.g., `/trenes`, `/calidad-aire`)
- [ ] Confirm Prometheus metric updated:
  ```bash
  ssh primary cat /var/lib/node_exporter/textfile_collector/trafico_backup.prom
  ```
- [ ] Run manual backup to reset the 36 h clock:
  ```bash
  ssh primary /opt/trafico/bin/backup-verify.sh
  ```

---

## Contacts / Escalation

| Role | Action |
|------|--------|
| Operator (primary SSH) | Required for Scenarios B, C, D |
| Cloudflare dashboard | R2 bucket status, DNS records |
| Hetzner Cloud console | Rebuild/snapshot/rescue for primary |

---

## Key Paths Quick Reference

| Item | Path |
|------|------|
| Backup script | `primary:/opt/trafico/bin/backup-verify.sh` |
| Restore-test script | `hetzner-dev:/opt/trafico/bin/backup-restore-test.sh` |
| Local dumps | `primary:/var/backups/trafico/` |
| R2 bucket | `r2:trafico-backups/daily/` |
| Backup log | `primary:/var/log/trafico-backup.log` |
| Prom textfile | `primary:/var/lib/node_exporter/textfile_collector/trafico_backup.prom` |
| Web compose | `compute:/opt/trafico/docker-compose.web.yml` |
| Collectors compose | `compute:/opt/apps/trafico-live/docker-compose.collectors.yml` |
