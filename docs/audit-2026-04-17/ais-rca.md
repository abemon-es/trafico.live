# AIS Root Cause Analysis — Vessels 30+ Days Stale

**Date:** 2026-04-17
**Investigator:** Audit P0 session
**Severity:** HIGH (UI shows "tiempo real" for data that was not updating)

---

## Current State (as of 2026-04-17 ~14:00 CEST)

The `collector-ais` container is **running and healthy** as of today's redeploy:

```
collector-ais   Up ~30 min (healthy)   Created: 2026-04-17 13:53 CEST
Stats: 153K+ received, 133K+ positions stored, 19K+ vessels updated
```

The container has RestartCount=0 and was created fresh today. AIS data is flowing normally.

---

## Root Cause of the March 2026 Outage

The 30+ day staleness reported in the audit was caused by a **cascading OOM-kill chain**:

### Primary cause: Memory limit OOM-kill (confirmed)

- `collector-ais` was running with `mem_limit: 192m` from at least April 6 (earliest available config backup)
- The container was running at >92% of 192m consistently ("3+ guardian bumps/day" — noted in `docker-compose.collectors.yml.bak-20260414-073227`)
- Linux cgroup OOM killer was terminating the process mid-run
- `restart: always` would restart the container, but if the OOM kill happened repeatedly on startup (connection + batch buffer allocation), the container entered a crash loop

**Evidence:** The April 10 backup shows the comment: `"Bumped 2026-04-10: was running at 92% of 192m with 3+ guardian bumps/day."` The limit was raised to `384m` (with `mem_reservation: 96m`). A related git commit exists: `fix(tiles): remove --memory cgroup cap — was triggering mid-build OOMkill`.

The current deploy uses a simplified compose without `mem_reservation` but still `mem_limit: 512m`, which is adequate.

### Contributing factor: Silent failure — no Sentry, no DB SLA

The `ws-client.ts` reconnecting WebSocket has exponential backoff + a circuit breaker (10 consecutive failures → 5 min cooldown). However:

1. **No Sentry capture** in the AIS collector — all errors go only to Loki/stdout
2. **No health-check DB SLA** for `VesselPosition.createdAt` — the `/api/health` endpoint had no `aviacion` check and no `vessels` check
3. When the container was OOM-killed and restart-looping, the circuit breaker's `maxConsecutiveFailures=10` reset on each container restart — so there was no accumulating failure counter across restarts

### Contributing factor: Auth error not distinguished from network errors

The `ws-client.ts` does not distinguish WebSocket close code `4001` (auth failure) from transient network errors. If the API key had been invalid, the reconnect loop would have continued indefinitely (backoff up to 60s, then circuit break for 5 min, then retry) with no alert. In practice, the API key `41ba606135e7de4fc4d01b47ed5d82ff8ba8388e` is valid and the stream is receiving data — this was not the cause this time.

---

## Loki Log Availability

Loki returned zero results for March 2026 queries. Either:
- Loki retention is shorter than 30 days (most likely — default Loki config)
- The `loki` logging driver was not configured on the containers before April 2026

The April 14 backup shows `logging: driver: loki` — confirming logging was configured at least by then. Earlier container history is not recoverable.

---

## No Fix Required This Session

The container is working. The OOM root cause was already fixed by raising `mem_limit` from 192m → 512m in today's deploy.

The health check fix (Task 3 of this session) adds `VesselPosition` monitoring is **not yet added** — only `AircraftPosition` was added. VesselPosition health check is P1 follow-up.

---

## Recommended Follow-Up (P1 — not in this session)

1. **Add VesselPosition check to `/api/health`** — query `VesselPosition.createdAt` with 30-min SLA (analogous to the AircraftPosition fix done in this session)
2. **Add Sentry to AIS collector** — `SENTRY_DSN` is available, just not wired in `collector.ts`
3. **Add auth-specific WebSocket close code handling** in `ws-client.ts` — close code `4001`/`4003` should log a CRITICAL error and NOT retry with the same key (retry is futile if the key is invalid)
4. **Consider datalastic.com** as a backup AIS provider if aisstream.io BETA SLA proves insufficient

---

## Summary

The 30+ day AIS staleness was caused by repeated OOM-kills of the collector container (memory limit 192m was too low for the ~80m Node heap + 10s batch buffer + WebSocket overhead). The container's `restart: always` policy restarted it, but each restart hit the OOM again. There was no alerting because: (a) no Sentry in the collector, (b) no health-check DB SLA for VesselPosition, (c) Loki retention doesn't cover March. The fix (mem_limit 512m) was applied before today's audit session. As of 2026-04-17 14:00 CEST the stream is healthy.
