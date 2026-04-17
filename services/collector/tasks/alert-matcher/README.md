# alert-matcher collector task

Runs every 5 minutes. Matches active `UserAlert` rows against new events
(TrafficIncident, RailwayAlert, AircraftPosition) and dispatches notifications.

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Entry point — loaded by dispatcher as `TASK=alert-matcher` |
| `match-road.ts` | Road incident matcher (TrafficIncident query) |
| `match-train.ts` | Train alert + delay matcher (RailwayAlert + RenfeFleetPosition) |
| `match-flight.ts` | Flight position matcher (AircraftPosition query) |
| `notify.ts` | Multi-channel notification dispatcher (PUSH / EMAIL / TELEGRAM) |

Pure matching functions live in `src/lib/alert-matcher.ts` (shared, testable).

## TASK registration

**Do not modify `services/collector/index.ts` directly** — open a PR to add:

```ts
// In VALID_TASKS array, under "// Real-time (every 2-5 min)":
"alert-matcher",
```

And add to the crontab dispatcher import block (no changes needed — `index.ts`
pattern handles the import automatically via `import(./tasks/${TASK}/collector.js)`).

**Note:** This task exports `run()` from `index.ts` directly (not `collector.ts`)
because the dispatcher uses `import(\`./tasks/${TASK}/collector.js\`)`. Either
rename `index.ts` → `collector.ts`, or add a thin `collector.ts` re-export:

```ts
// services/collector/tasks/alert-matcher/collector.ts
export { run } from "./index.js";
```

## Cron schedule

Add to `services/collector/crontabs/realtime`:

```
# User alert matcher — cross-references UserAlert with new events (every 5 min)
*/5 * * * * TASK=alert-matcher npx tsx index.ts 2>&1
```
