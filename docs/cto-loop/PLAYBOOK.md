# CTO Loop — Operating Playbook

The contract for one iteration of the autonomous 24/7 improvement loop on
trafico.live. Read this at the start of every cycle. It exists so that each
cycle is *evidence-first, one-change, verified, and recorded* — instead of a
fresh guess every time.

**Authority (set by MJ, 2026-08-15):** full autonomy, including commits to
`main`, unattended production deploys via the `deploy.abemon.es` webhook, and
direct server-side fixes on `compute`. This deliberately supersedes the standing
"confirm production deploys" guardrail *for this loop only*.

---

## The cycle

### 1. Sense — always start from evidence

```bash
bin/cto-signals.sh --pretty     # human triage view
bin/cto-signals.sh > /tmp/sig.json   # full JSON when you need detail
```

One command covers: prod `/api/health` (51 collector heartbeats with per-task
staleness thresholds), the 112-check smoke test, container state on `compute`,
Loki error volume, recent `docker logs` errors across all 6 collector
containers, GSC/GA4 snapshot freshness, and git/deploy state.

Never open a cycle by guessing what might be wrong. Run the probe.

### 2. Triage — rank, don't sweep

Read `BACKLOG.md`. Reconcile it with the fresh signals:
- New problems → add, ranked.
- Problems that no longer reproduce → move to Resolved with the evidence.
- Problems that reappeared → escalate rank and record the recurrence count. A
  recurring fix is a wrong fix; treat the *third* recurrence as a design defect,
  not a bug.

Rank by **user impact × confidence ÷ effort**. Tie-break toward whatever is
silently wrong, because silent failures compound (see below).

### 3. Act — exactly one item per cycle

One change per cycle, so that when something breaks the blame is unambiguous.
Finish it end to end rather than starting three things.

If the item needs a secret you cannot invent (an API key, a service-account
credential), **do not fabricate, guess, or stub it**. Move it to `ESCALATIONS`
in `BACKLOG.md` with the exact value needed and where it goes, then pick the
next item. Spinning on an unobtainable secret wastes the whole cycle.

### 4. Verify — prove it, don't assume it

- Collector fix → re-run the task, then confirm the heartbeat actually advanced.
- Web change → `npm run lint` + `npx tsc --noEmit` locally. Never a full
  production build on the Mac; the deploy gate builds every push.
- After any web deploy → `bin/smoke-test.sh`. On failure, roll back first and
  diagnose second.

A fix is not done because the code looks right. It is done when the signal that
detected the problem has flipped green.

### 5. Ship — once per cycle, not once per edit

**Batch the cycle's commits and push once.** Every push to `main` triggers a
full rebuild (~12 min) plus a `docker rm -f` / `docker run` swap that is not
zero-downtime. On 2026-08-16 this loop pushed roughly ten times in a day: ten
rebuilds, ten brief origin gaps that the infra monitoring flagged as incidents,
a deploy queue several builds deep, and enough layer churn to contribute to a
`HostDiskWarning` (-57 GB in 24 h on `/var/lib/docker`).

Commit freely while working; push at the end of the cycle.

**Deploy notification protocol (agreed with the infra session, 2026-08-17):**
notify CTO before *risky* deploys only — changes to the build system
(Dockerfile, deploy.sh, the package.json build script), the container swap,
anything touching PgBouncer/DB at build time, or anything that alters what its
probes see structurally (moving/renaming /api/health, Traefik routing or
hostname changes, the swap healthcheck). CTO's addition, accepted 2026-08-17. Routine app deploys need no
notice; they are zero-downtime and its monitoring confirms zero errors. This
replaces an earlier per-deploy promise that was not being kept.

**End-of-batch hygiene:** after a night of chained builds, reclaim build cache
(`docker builder prune --keep-storage 25GB`) — tonight's chain grew it to
88 GB before pruning back to 53 GB. The shared docker-prune.sh only clears
cache older than 24 h, so same-day churn is ours to clean.

Conventional commits (`fix:`/`feat:`/`refactor:`). No AI attribution anywhere in
commits, PRs, or any public-visible text. Push, then confirm the deploy landed
and the app came back healthy.

### 6. Record

Update `BACKLOG.md`: what changed, the evidence it worked, and what the next
cycle should pick up. The next cycle starts from a compacted context — an
unrecorded finding is a lost finding.

---

## Standing rules

**Silent failure is the primary enemy.** The most expensive incidents here were
never loud. `collector-ais` reported `healthy` to Docker for 11 days while
receiving zero messages, because its healthcheck is `kill -0 1` — that only
proves PID 1 is alive, not that data is flowing. The May 2026 blackout was the
same class, and it recurred in August because the *class* was never fixed, only
the instance.

So: whenever you fix a stalled data source, also ask whether the detector should
have caught it. Prefer fixing the detector. `bin/cto-signals.sh` flags this
pattern as `[SILENT]` — stale data while Docker reports everything fine.

**Data volume ≠ data health.** A collector can write rows and still be wrong:
stale upstream, partial coverage, silently truncated. `partial` status deserves
investigation, not tolerance.

**Never** commit secrets, weaken auth, disable a healthcheck to make a signal go
green, widen a staleness threshold to silence an alert, `DROP`/`DELETE` without
`WHERE`, or touch `.env*` in git. Raising a threshold to stop an alert is how
the blackout stayed invisible — fix the cause.

## Work bottom-up, not by rotation

**Superseded on 2026-08-16 by MJ: "all of this needs to be fixed first and from
the bottom up."** The earlier instruction to rotate across four scopes each
cycle is withdrawn. Rotation produced a real failure: an SEO fix was shipped on
top of a build that could not reach the database, so it deployed empty. Work the
layers in order, and do not spend cycles on a higher layer while a lower one is
known broken.

**L0 — Build, deploy and observability.** The ground everything stands on. A
defect here silently corrupts every layer above it and is invisible in code
review. Examples found: `next build` running without `DATABASE_URL`; deploys
that are not zero-downtime; collector logs never reaching Loki; `.env` and
`.env.collectors` drifting apart.

**L1 — Data integrity.** Collectors actually producing correct, fresh data, and
failing loudly when they cannot. No point ranking pages whose numbers are wrong.

**L2 — Correct rendering.** The app truthfully presenting L1 data: no empty
prerenders, no client-only content where a crawler or a user without JS needs it.

**L3 — Discovery and growth.** SEO, indexation, rankings, conversion. Only
meaningful once L0–L2 hold, because this layer's whole job is to send people to
pages that must already be correct.

Within a layer, rank by user impact × confidence ÷ effort. Escalate anything
that blocks a lower layer above anything in a higher one. When a higher-layer
symptom is really a lower-layer cause — the empty station directory was an L0
build defect wearing an L3 costume — fix the layer where the cause lives.

---

## Known infrastructure facts

### Migrations do NOT auto-apply (as of 2026-08-18)
`MIGRATE_DATABASE_URL` points at `trafico_app`, which has no DDL rights, so
`prisma migrate deploy` fails with 42501 at every container start and logs
`[migrate] Skipped` — the app then serves against a schema that does not match
the code, and the failed row **blocks every later migration**. Until MJ
provisions a DDL role (BACKLOG ESCALATIONS #00), a new migration needs:

1. `scp` the SQL to `database-primary`, `docker cp` into `trafico-postgres`,
   apply with `psql -U trafico_admin -d le_trafico -f ...`
2. `GRANT SELECT, INSERT, UPDATE, DELETE ON "<Table>" TO trafico_app;`
3. `docker exec trafico-live sh -c 'DATABASE_URL=$MIGRATE_DATABASE_URL npx prisma migrate resolve --applied <migration_name>'`
4. **Verify** — `select migration_name from _prisma_migrations where finished_at is null and rolled_back_at is null;` must come back empty.

Step 4 is not optional. Skipping it on 2026-08-18 left a migration blocking the
queue for nine hours; the infra session found it, not this loop.

### A crashed task now reports `error`, not a stale `ok` (fixed 2026-08-21)
Until `d27e3aad` the dispatcher caught a thrown task, logged it, sent it to
Sentry and exited 1 — **without writing a heartbeat**. The row kept its last
SUCCESSFUL status, so `/api/health` reported `ok` while the task had been
crashing for days; only the staleness threshold eventually exposed it, hours
(daily tasks) later and wearing the costume of a miscalibrated threshold. The
infra sentinel read exactly that way on 2026-08-21 and proposed widening the
threshold, which would have buried a real failure for two more days.

Consequence when triaging: a dead collector should now appear as `error` fast.
If you see a task go `stale` while still claiming `ok`, that is a NEW instance
of this class, not a threshold issue — find what swallowed the failure.

**Corollary — do not widen a threshold to explain a stale task.** For a daily
task, `threshold ≈ 25 h` is correct (age resets each run, peaks at 24 h, 1 h of
grace). It is not "1.04× and therefore tight"; it is a working detector.

### A new collector MUST declare its staleness threshold
`STALE_THRESHOLDS` in `src/app/api/health/route.ts` falls back to 4h. Any task
slower than that reports stale permanently while running perfectly — on
2026-08-18 seven tasks were in that state, including both detectors added the
same week, and the infra session reasonably read them as failures.

**The rule here used to read `threshold = 2 × cadence`. That is wrong for
periodic tasks and it was corrected on 2026-08-21** (refinement from the infra
sentinel, after this loop showed it a real failure it had read as a tight
threshold). Why: a strictly periodic task's heartbeat age sawtooths from 0 up
to ~1× its period during *healthy* operation. Setting the threshold at 2× means
the alert only fires after **two consecutive failures** — for a daily task, two
days with no data.

Use instead:

- **Period + grace (10–25%)** whenever one missed run means real data loss —
  everything hourly and slower. A daily task belongs at ~25 h, not 48 h. A
  weekly one at ~8 d, not 14 d.
- **A multiple (2–5×) only for high-frequency tasks (≤15 min)**, where a single
  missed tick is jitter, costs nothing, and alerting on it is pure noise. This
  is deliberate tolerance; do not "fix" `incident` at 5× down to 1.1×.
- **Never set the threshold equal to the period.** The heartbeat is written when
  the run *finishes*, so age peaks slightly above the nominal gap and the
  detector flaps whenever a run is slower than the one before it. Four tasks
  were sitting on that knife edge (`gas-station`, `maritime-fuel`,
  `portugal-fuel`, `health-check`) until the same-day audit.

Corollary, learned the hard way in the same cycle: **a tight ratio is rigour,
not miscalibration.** `aemet-historical` at 1.04× was read as "suspiciously
tight" when it was the only detector doing its job. Never widen a threshold to
explain away a stale task — find out why the run did not happen.

The response sets `thresholdUndeclared` on anything that had to fall back, so
check it after adding a collector. Noise that never means anything is how a real
blackout gets ignored — that is exactly how the 15-day AIS outage stayed
invisible.

### Every push to main recreates the collector stack — batch them
`deploy-trafico-collectors.sh` does `git reset --hard origin/main` +
`docker compose up -d` on **any** commit, including docs-only ones. Six
containers get recreated and whatever they were running dies mid-flight.
On 2026-08-18 four pushes in six minutes recreated the stack four times and
killed the 09:00 AEMET cycle — the very run that was going to verify the
previous night's fix, whose logs went with it.

So: one push per cycle, at the end, with the doc update included. If a cycle
genuinely needs an intermediate push, expect the stack to bounce and do not
schedule verification against a long-running collector immediately after.

Corollary for evidence: a deploy-log check is only valid for the moment it ran.
Re-check it before concluding anything about restarts that happened *after* it —
reporting a stale read as current evidence is how this loop spent a morning
hunting an actor that was itself.

### Restarting trafico-live outside a deploy causes a public outage
The container gets a new IP on the `web` network and the edge-cache keeps the
old one: the homepage stays 200 from cache while everything dynamic returns 502
until someone reloads the edge-cache. Two incidents on 2026-08-18 (~20 min,
~8 min). If you restart it outside `deploy.sh`, tell the CTO session or run
`docker exec edge-cache nginx -s reload` immediately (zero-downtime). The
`bin/cto-signals.sh` probe raises `routing_fault` for exactly this shape
(origin healthy, public not 200).

**2026-08-20: the serial restarter was found** — the platform's
`container-layer-watchdog.sh` (hourly at :00) auto-restarts any container whose
writable layer exceeds 4 GB, and had restarted trafico-live **24 times** (each
one an edge 502 until nginx reload; `docker restart` doesn't even reclaim the
layer, so the remedy only caused the outage). Our `revalidate=300` rollout grew
the ISR cache at ~600 MB/h, tripping it daily. Fix on our side: the ISR prune
cron (`/etc/cron.d/compute-trafico-isr-prune`, canonical copy in the server
repo `cluster/scripts/cron.d/`) now runs **hourly at :30 with `-mmin +120`**
(anything older than 2 h is stale at revalidate=300 — loss-free), keeping the
layer ~1–2 GB, far from the tripwire. If the layer ever nears 4 GB again,
investigate what new route family is writing — do not widen the watchdog
threshold.

### The container healthcheck is honest — don't "fix" it for routing faults
It fetches `/api/health`, which runs `SELECT 1`, pings Redis and aggregates all
51 heartbeats, returning 503 when the DB is down. During a routing fault it
correctly reports healthy, because the container *is* healthy. Making it assert
its own public reachability would turn unrelated CDN incidents into container
restarts — which is what caused the first outage of 2026-08-18.


Learned the hard way; assume these unless re-verified.

- Collector containers use the **`json-file`** log driver, not Loki, despite
  what `CLAUDE.md` claims. Collector logs are only on the host via `docker logs`.
  Loki has the web app and `trafico-*` infra only.
- Collectors run as a **separate compose stack** at `/opt/apps/trafico-live`
  on `compute` — and, contrary to what this playbook and the repo CLAUDE.md
  said for two days, they DO auto-deploy: a `trafico-collectors` webhook job
  pulls, builds and `up -d`s on every push. **Do not deploy collectors manually
  after a push** — the manual pass races the webhook's compose reconcile, and
  that race is what produced the hash-prefixed container names and the zombie
  that blocked the queue on 2026-08-17. Manual deploys are for emergencies
  only, never overlapping a push; afterwards verify
  /var/log/deploys/trafico-collectors.log goes SUCCESS on the next push.
- The web app auto-deploys from `main` via `deploy.abemon.es`.
- `psql` is available on `compute`; the DB is reachable by sourcing
  `/opt/apps/trafico-live/.env` there. There is no local `.env` on the Mac.
- macOS has no `timeout`; use `curl --max-time` / `ssh -o ConnectTimeout`.
- **Never verify a before/after with a relative time window.** `docker logs
  --since 10m` measured minutes *before* a restart and re-labelled them as
  post-fix failures (2026-08-17, compounded by reading CEST as UTC — the
  container clock is UTC, the shell prompt is CEST). Anchor to the event:
  `--since 2026-08-17T07:04:00Z`, absolute, in Z.
- In jq, `.x // null` **swallows `false`** — a broken boolean becomes "unknown".
  Test with `has("ok")` instead. This bug briefly hid the SEO pipeline outage.
