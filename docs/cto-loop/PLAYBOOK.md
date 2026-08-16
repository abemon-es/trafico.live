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

Learned the hard way; assume these unless re-verified.

- Collector containers use the **`json-file`** log driver, not Loki, despite
  what `CLAUDE.md` claims. Collector logs are only on the host via `docker logs`.
  Loki has the web app and `trafico-*` infra only.
- Collectors run as a **separate compose stack** at `/opt/apps/trafico-live` on
  `compute` and are **deployed manually** — the webhook only redeploys the web
  app to `/opt/trafico`. A collector fix that is only pushed to git has not
  shipped.
- The web app auto-deploys from `main` via `deploy.abemon.es`.
- `psql` is available on `compute`; the DB is reachable by sourcing
  `/opt/apps/trafico-live/.env` there. There is no local `.env` on the Mac.
- macOS has no `timeout`; use `curl --max-time` / `ssh -o ConnectTimeout`.
- In jq, `.x // null` **swallows `false`** — a broken boolean becomes "unknown".
  Test with `has("ok")` instead. This bug briefly hid the SEO pipeline outage.
