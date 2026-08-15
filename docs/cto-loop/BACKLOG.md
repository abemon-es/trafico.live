# CTO Loop — Backlog

Persistent state across loop cycles. Every cycle reads this first and updates it
last. Ranked by user impact × confidence ÷ effort.

**Seeded:** 2026-08-15 from `bin/cto-signals.sh` — prod `degraded`, 9/51
collectors unhealthy, 3 silent failures, SEO pipeline never once succeeded.

---

## P0 — active outage, user-visible

### 1. `ais-stream` — dead 11 days, entire maritime vertical stale
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

*(`CAMS_API_KEY` was initially thought to be an escalation — it is not. The value
exists in `.env`; it just never propagated to `.env.collectors`.)*

---

## Resolved

*(empty — first cycle pending)*
