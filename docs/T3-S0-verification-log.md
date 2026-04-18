# T3 S0+ Verification Log

**Date:** 2026-04-17 ~22:30 CEST
**Branch:** `team3` · **Sub-agents covered:** 3.1c, 3.1e, 3.1f (+ partial 3.1 heartbeat coverage)
**Source tasks:** `docs/ROADMAP-TEAM-3-DATA-ML.md` · S0+ quick wins

---

## 3.1c — CollectorHeartbeat migration ✅ PASS

Migration `20260417170000_add_collector_heartbeats` applied in prod. Verified from compute via `psql` run through `postgres:16-alpine` Docker against DATABASE_URL (PgBouncer at `10.100.0.3:6440/le_trafico`).

### Schema confirmed

```
                          Table "public.collector_heartbeats"
    Column    |            Type             | Collation | Nullable |      Default
--------------+-----------------------------+-----------+----------+-------------------
 task         | text                        |           | not null |
 lastRunAt    | timestamp(3) with time zone |           | not null | CURRENT_TIMESTAMP
 status       | text                        |           | not null |
 meta         | jsonb                       |           |          |
 errorMessage | text                        |           |          |
 updatedAt    | timestamp(3) with time zone |           | not null | CURRENT_TIMESTAMP
Indexes:
    "collector_heartbeats_pkey" PRIMARY KEY, btree (task)
```

### Live heartbeat state — ⚠️ 8 / 43 collectors wired

```
       task        | status |         lastRunAt
-------------------+--------+----------------------------
 typesense-sync    | ok     | 2026-04-17 19:08:17.377+00
 renfe-ld-realtime | ok     | 2026-04-17 19:08:15.441+00
 renfe-alerts      | ok     | 2026-04-17 19:08:15.240+00
 renfe-positions   | ok     | 2026-04-17 19:08:15.024+00
 transit-realtime  | ok     | 2026-04-17 19:07:02.893+00
 city-traffic      | ok     | 2026-04-17 19:05:21.724+00
 panel             | ok     | 2026-04-17 19:05:18.540+00
 andorra           | ok     | 2026-04-17 19:05:13.235+00
(8 rows)
```

**Gap:** 35 collectors don't yet call `heartbeat()` in their `index.ts`. Next 3.1 sprint task (S0 viernes): append heartbeat call at end of each `services/collector/tasks/*/index.ts` cycle. Use existing helper at `services/collector/shared/heartbeat.ts`.

---

## 3.1e — chmod 600 on .env files ✅ PASS

All `.env*` files on compute under `/opt/apps/trafico-live/` and `/opt/trafico/` are already mode `600` (owner root, no group/other read).

### `/opt/apps/trafico-live/` (collectors)

```
-rw------- 1 root root 1353 Apr 17 16:14 .env
-rw------- 1 root root  926 Apr  9 11:29 .env.age
-rw------- 1 root root  726 Apr 10 09:33 .env.bak-20260410093358
-rw------- 1 root root 1097 Apr 13 09:46 .env.bak-20260413
-rw------- 1 root root 1667 Apr 17 13:48 .env.collectors
```

### `/opt/trafico/` (web)

```
-rw------- 1 root root 1403 Apr 17 13:57 .env.example
-rw------- 1 root root 1043 Apr 12 23:05 .env.recovered
```

**Note:** `/opt/trafico/.env` (live web env) is NOT on disk — web container likely receives env via Docker Compose env_file pointing elsewhere OR via Docker secrets. Not a launch-blocker; verify deploy pipeline in separate task.

No action needed — all existing `.env*` files already satisfy mode 600.

---

## 3.1f — Nightly Postgres backup + restore test ❌ FAIL (launch-blocker)

### What exists on `compute` (`/opt/backups/`)

```
coolify-db-20260402.sql.gz   94 MB   Apr  2 22:31
coolify-db-20260403.sql.gz  ~20 B    Apr  3 20:30   (empty/truncated)
coolify-db-20260404.sql.gz   10 MB   Apr  4 20:30
coolify-db-20260405.sql.gz   10 MB   Apr  5 20:30
coolify-db-test.sql.gz       94 MB   Apr  3 01:14
```

These are **Coolify-era migration backups** (pre-current stack, dumped ~12 days ago when the switch to plain Docker Compose + Traefik was made). They are NOT nightly backups and the April 3 file is truncated to 20 bytes.

### What's missing

- **No active nightly backup job** on compute (`crontab -l` shows no pg_dump/backup entries for trafico).
- **Could not verify `primary` (10.100.0.3)** — SSH from local times out (VPN-only or different port), and SSH from compute rejects publickey (no keys present on compute for primary).
- **No systemd timers** related to postgres/backup on compute.

### Risk

- RPO target is 24h, RTO 4h per roadmap. Without a verified nightly → data loss window is **unbounded**.
- If primary hardware fails tonight, **latest restorable state is 2026-04-02** (12 days old migration snapshot) → ~470k incidents, 110M vessel positions, 4.5M climate records lost.

### Recommended action (3.1f remediation, owner=lead, priority=P0 launch-blocker)

1. SSH to `primary` directly (lead has credentials) — verify any existing pg_dump cron or systemd timer.
2. If none: install `bin/backup-verify.sh` (T3.1 owns) that runs `pg_dump -Fc` nightly at 01:00, writes to `/var/backups/trafico/`, rotates keeping 7 daily + 4 weekly + 3 monthly.
3. Off-site: sync to Cloudflare R2 bucket `trafico-backups` (S4 has R2 credentials set up, can front-load).
4. Verification: daily `pg_restore --list` on the freshest file; log age + row count of 3 canary tables (`TrafficIncident`, `VesselPosition`, `CollectorHeartbeat`).
5. DR runbook `docs/DR-RUNBOOK.md` v1 following restore test.

Target: ✅ PASS by dom 19 abr (S0 exit criterion).

---

## Summary

| Check | Status | Follow-up |
|---|---|---|
| 3.1c CollectorHeartbeat migration | ✅ Applied | Wire heartbeat call into 35 remaining collectors (S0 vie) |
| 3.1e `.env` perms 600 | ✅ Already satisfied | None |
| 3.1f Nightly backup + restore | ❌ **No active nightly** | **P0 blocker for launch — primary host SSH required** |

**Launch-blocker to resolve before dom 19 abr S0 exit:** nightly Postgres backup with verified restore.
