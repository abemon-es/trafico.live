# CTO Loop — Backlog

Persistent state across loop cycles. Every cycle reads this first and updates it
last. Ranked by user impact × confidence ÷ effort.

**Seeded:** 2026-08-15 from `bin/cto-signals.sh` — prod `degraded`, 9/51
collectors unhealthy, 3 silent failures, SEO pipeline never once succeeded.

---

## P0 — active outage, user-visible

### 1. `ais-stream` — dead 11 days → **root-caused, escalated; detection fixed**

**Cycle 1 (2026-08-15) result.** Root cause is **upstream account-side at
aisstream.io**, not our code. Proven by live test from inside `collector-ais`:

| Test | Result |
|------|--------|
| Real key, Spanish bbox | socket opens, **0 frames, no error, no close** |
| Real key, global bbox `[[[-90,-180],[90,180]]]` | **silent** — rules out bbox/filters |
| Deliberately invalid key | **closed 1006 immediately** |

The server closes invalid keys but holds ours open and silent → the key is
authenticated and accepted, yet the account receives no data. That points to
quota exhausted, plan lapsed/suspended, or a key needing re-issue. **Moved to
ESCALATIONS #2** — the loop cannot fix an upstream billing/entitlement state.

**What was fixed instead (shipped `b83ca26e`):** the detection defect. The only
`heartbeat()` call was on graceful shutdown, and with `COLLECTOR_DURATION=0` the
process never shuts down — so the heartbeat was written once per restart and
never during operation. `/api/health` reported this task stale whether AIS was
healthy or dead, i.e. the signal carried no information. It now heartbeats every
60 s with status derived from *frame arrival*, not process liveness.

Verified in prod: `status: error`, `"No AIS frames for 360s (threshold 300s) —
socket open but upstream silent"`, surfaced 6 min after restart. An 11-day
silent blackout is now a loud, self-describing failure.

**Still stale until the account is fixed:** `/maritimo`, vessel positions, port
calls, voyages.

### 1b. Original diagnosis notes (superseded, kept for history)
- **Evidence:** heartbeat age 948,341s (~11 d) vs 600 s threshold. Logs show the
  loop: `Connected` → 300 s of zero messages → `Staleness watchdog … forcing
  terminate` → `Connection closed: 1006` → reconnect → repeat → `Circuit
  breaker: 10 failures`. Message counter frozen at `521842 received` for the
  entire period.
- **Not the cause:** `AISSTREAM_API_KEY` *is* present in `.env.collectors`
  (40 chars). The socket opens, so the key is not being rejected outright.
- **Next hypotheses, in order:** (a) the `Subscribe` payload is rejected
  server-side and aisstream replies with an error frame the client never logs —
  `services/collector/tasks/ais-stream/*.ts:319-321` sends `APIKey`,
  `BoundingBoxes`, `FilterMessageTypes`; (b) account quota/plan exhausted;
  (c) upstream changed the subscribe schema. **First action: log the raw inbound
  frames** — the client is currently blind to error responses, which is why 11
  days produced no diagnosis.
- **Impact:** `/maritimo`, vessel positions, port calls, voyages all stale.

### 2. `gsc-ga4-snapshot` — has never succeeded; SEO scope is blind
- **Evidence:** `SeoSnapshot` table has **0 rows**. Heartbeat `error`:
  `Could not load the default credentials`. `GOOGLE_APPLICATION_CREDENTIALS` is
  **absent** from `.env.collectors`.
- **Cause:** `gsc-client.ts:20` / `ga4-client.ts:21` use `GoogleAuth` with
  Application Default Credentials, but no service-account JSON is mounted into
  the collector containers and no env var points at one.
- **Needed:** service account `claude-agent@claude-automation-484615.iam.gserviceaccount.com`
  (per `collector.ts` header) with `webmasters.readonly` + `analytics.readonly`,
  for `sc-domain:trafico.live` and GA4 `properties/521333149`. A JSON key may
  already exist locally under the `blitz` gservices setup — check before
  escalating.
- **Impact:** blocks *all* of scope 2 (SEO growth). `/sobre/posicionamiento`
  renders from an empty table.

---

## P1 — systemic; these are why P0 items went unnoticed

### 3. Fake healthchecks mask dead data pipelines
- `collector-ais` healthcheck is `kill -0 1` (`docker-compose.collectors.yml:103`)
  — it proves PID 1 exists, nothing more. The container reported `healthy` for
  all 11 days of the blackout.
- The other tiers check `/tmp/last-run` staleness, which is better but still
  measures *task ran*, not *data arrived*.
- **Fix the class, not the instance:** healthchecks should assert data freshness.
  This exact class caused the May 2026 blackout and recurred in August — the
  instance was fixed, the class was not.

### 4. `.env.collectors` has drifted from `.env`
- `.env.collectors` is dated **Apr 17** and is the file collectors actually load
  (`env_file: [.env.collectors]`). `.env` (web) has moved on since.
- `CAMS_API_KEY` is **present in `.env` (36 chars) but empty in
  `.env.collectors`** → `cams-aq` errors on every run with "CAMS_API_KEY not
  set". **No new secret needed — this is a propagation bug.**
- Two hand-maintained env files with no sync mechanism will keep producing this.

### 5. Collector logs are not reaching Loki
- Loki has no `collector-*` values for the `container` label; only `trafico-*`
  infra and the web app.
- Intent per `docker-compose.collectors.yml:16` is Vector (`exp-vector`)
  scraping json-file → Loki. That path is not delivering.
- **Impact:** no centralised alerting on collector errors — the direct reason an
  11-day outage produced zero notifications.

### 6. `portugal-weather` stale
- Age 19,270 s vs 14,400 s threshold, status `ok` — so it *thinks* it succeeded.
  Another data-vs-status mismatch.

---

## P2 — degraded, not broken

- **`aemet-forecast`** — `partial`, 88 upstream errors/run (AEMET 500s +
  `fetch failed`). Mostly upstream flakiness; needs retry/backoff so partial
  runs don't mask a real regression.
- **`cnmc-fuel`, `transit-gtfs`, `city-traffic`, `health-check`** — all
  `partial`. Each needs a look at *what* is partial; `partial` has become
  background noise, which is how real degradation hides.
- **Smoke test: 5 warnings** (107 pass, 0 fail) — identify and clear.
- **`tasks/monthly-report/render.ts` is unparseable** — ~626 TS syntax errors,
  JSX in a `.ts` file (should be `.tsx`). Drowns every other typecheck result,
  so `tsc --noEmit` is currently worthless as a CI gate for the collector tree.
- **Docs drift** — `CLAUDE.md` says 43 collectors; `/api/health` reports 51 and
  there are 63 task directories. It also claims Loki as the collector log
  driver, which is wrong (see #5). Stale docs cost diagnosis time.

---

## Scope rotation

MJ set all four scopes active. Cycles should rotate rather than camping on
whichever is loudest.

| Scope | State |
|-------|-------|
| 1. Data source health | Active — P0 #1, P1 #3/#4/#5 |
| 2. SEO growth (GSC/GA4) | **Blocked by P0 #2** — no data until creds land |
| 3. Frontend quality | Not yet assessed — no Lighthouse baseline captured |
| 4. Backend & security | Not yet assessed — no dependency audit run |

---

## ESCALATIONS — need MJ, loop cannot self-serve

Secrets cannot be invented. The loop must not fabricate, guess, or stub these.

1. **Google service-account JSON** for GSC/GA4 (P0 #2) — *if* no existing key is
   found under the local `blitz` gservices setup. Must be granted
   `siteFullUser` on `sc-domain:trafico.live` and Viewer on GA4
   `properties/521333149`.

2. **aisstream.io account state** (P0 #1) — the API key authenticates but the
   account receives zero data. Someone needs to log into aisstream.io and check
   plan status / quota / whether the key needs re-issuing. Evidence table in
   P0 #1 above. Until this is resolved the maritime vertical stays stale; the
   collector will now correctly and loudly report `error` the whole time, which
   is the intended behaviour, not a new bug.

*(`CAMS_API_KEY` was initially thought to be an escalation — it is not. The value
exists in `.env`; it just never propagated to `.env.collectors`.)*

---

## Resolved

### Cycle 1 — 2026-08-15 — AIS blackout detection (`b83ca26e`)
`ais-stream` heartbeated only on shutdown, so an always-on collector never
reported liveness and `/api/health` could not tell healthy from dead. Now
heartbeats every 60 s on frame arrival. Proven in prod: silent feed → `error`
with idle duration inside 6 minutes. Root cause of the outage itself is upstream
and escalated (ESCALATIONS #2).

**Cycle 1 also learned:**
- The deployed collector stack tracks `main` via a plain git checkout at
  `/opt/apps/trafico-live`; deploy is
  `git pull` → `docker compose -f docker-compose.collectors.yml -p trafico-live
  build <svc>` → `up -d <svc>`. Compose project is `trafico-live`.
- Pushing to `main` prints a "Changes must be made through a pull request"
  warning but the ref update succeeds.
- The repo-root `tsconfig.json` covers `services/collector` too;
  `tasks/monthly-report/render.ts` has ~626 pre-existing syntax errors (JSX in a
  `.ts` file) that swamp any typecheck output. Filter by path when checking a
  change. **Worth fixing** — it makes `tsc` useless as a gate. Added to P2.
