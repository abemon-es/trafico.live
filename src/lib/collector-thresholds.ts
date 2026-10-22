/**
 * Per-task staleness thresholds and the tasks kept out of the collector list,
 * shared by /api/health and the public /status page (src/lib/heartbeat.ts) so
 * both judge a task the same way. Moved here from the health route on
 * 2026-10-22, when /status still graded every task on a fixed 10/30 min from
 * its last run and showed 37 of 59 collectors «down», daily tasks included.
 */

// Per-task staleness thresholds in seconds.
// Rule: threshold = max(2 × source cadence, 5 min buffer).
// Aligned with services/collector/crontabs/<tier> so a healthy cycle never
// reports stale=true, but a single missed run does — the 24h _default was
// hiding silent failures for a full day (this is the pattern that hid the
// 15-day AIS blackout in May 2026).
export const STALE_THRESHOLDS: Record<string, number> = {
  // realtime — collector-realtime (every 1-5 min cron lines)
  "incident": 600,             // */2 → 10 min
  "v16": 900,                  // */5 → 15 min (post-iter-2 cadence)
  "panel": 900,                // */5
  "detector": 900,             // */5
  "intensity": 900,            // */5 (Madrid sensors)
  "city-traffic": 900,         // */5 (Barcelona/Valencia/Zaragoza)
  "andorra": 900,              // */5
  "renfe-alerts": 600,         // */2
  "renfe-ld-realtime": 600,    // */2
  "renfe-positions": 600,      // */2
  "transit-realtime": 300,     // every 1 min cron with 2 internal passes
  "transit-rt-madrid": 300,    // every 1 min
  "transit-rt-tmb": 300,       // every 1 min
  "transit-rt-valencia": 300,  // every 1 min
  "opensky": 900,              // */4
  "air-quality": 4500,         // hourly @ :00
  "eumetsat-radar": 1800,      // */15
  "alert-matcher": 900,        // */5
  "social-broadcast": 1800,    // */5 but tolerant
  "health-check": 2100,        // */30 + 5 min grace (1800 equalled the period)
  // continuous (collector-ais — always-on WebSocket)
  "refresh-vessel-latest": 300, // every 1 min (vessel_latest for the vessels map)
  "ais-stream": 600,           // watchdog kicks at 5min idle (post-iter-3),
                               // so 10min covers reconnect cycle
  // frequent (collector-frequent)
  "weather": 4500,             // hourly @ :00 (AEMET)
  "maritime-forecast": 25200,  // every 6h (4×/day)
  "voyage-detector": 5400,     // hourly + 30 min grace (was 7200 = 2x, blind
                               // to a single missed run — see PLAYBOOK)
  "flight-detector": 5400,     // hourly @ :20 + 30 min grace (was 2x)
  "train-service-detector": 5400, // hourly @ :35 + 30 min grace (was 2x)
  "portugal-weather": 25200,   // every 6h — was defaulting to 4h and so
                               // reported stale for 2 of every 6 hours
  // fuel (collector-fuel)
  "gas-station": 39600,        // 3x/day at 06/13/20 — max gap 10h + 1h grace.
                               // 36000 equalled the gap exactly: age peaks just
                               // under it, so any run slower than the previous
                               // one tipped it stale. Knife-edge, not a buffer.
  "content-fingerprints-gas": 39600, // last step of each gas-station run (sitemap lastmod)
  "maritime-fuel": 39600,      // 3x/day at 07/14/21 — max gap 10h + 1h grace
  "portugal-fuel": 39600,      // 3x/day at 08/15/22 — max gap 10h + 1h grace
  // daily (collector-daily)
  "daily-stats": 90000,        // 00:30 daily
  "content-fingerprints": 90000, // 04:50 daily (sitemap lastmod)
  "ine-stats": 691200,         // weekly Sunday 03:30 (post-iter-2)
  "camera": 96000,             // 04:00 daily
  "aena-stats": 2764800,       // monthly 1st 04:30 (post-iter-2) → 32d
  "typesense-sync": 90000,     // 05:00 daily
  "gsc-ga4-snapshot": 90000,   // 06:00 daily — was defaulting to 4h and so
                               // reported stale for 20 of every 24 hours
  "charger": 96000,            // 06:00 daily
  "aemet-historical": 90000,   // 08:00 daily
  "aemet-forecast": 25200,     // every 6h (00/06/12/18 staggered → 4×/day)
  "cams-aq": 50400,            // every 12h (06:30/18:30)
  "insights": 90000,           // 22:30 daily
  "cleanup-realtime": 90000,   // 23:00 daily
  // weekly (collector-weekly — Sundays)
  "cnmc-fuel": 691200,         // Sunday 02:00 → 8d
  "mobilitydata-sync": 691200, // Sunday 02:30
  "radar": 691200,             // Sunday 03:00
  "speedlimit": 691200,        // Sunday 03:30
  "risk-zones": 691200,        // Sunday 04:00
  "zbe": 691200,               // Sunday 04:30
  "renfe-gtfs": 691200,        // Sunday 05:00
  "ferry-gtfs": 691200,        // Sunday 05:30
  "transit-gtfs": 691200,      // Sunday 06:00
  "dgt-extras": 691200,        // Sunday 06:30 (probes empty endpoints — heartbeats anyway)
  "imd": 691200,               // Sunday 07:00
  "historical-accidents": 2764800, // monthly 1st 06:15 (crontabs/weekly) → 32d
  // default for any unlisted task — purposefully tight so new collectors
  // surface in /api/health within hours, not days
  "_default": 14400,
};

// Tasks that should be hidden from the health response entirely.
// Currently disabled by design — including them would always show stale=true.
/**
 * Tasks deliberately kept out of the collector list, each with its reason.
 *
 * This used to be a bare Set. Hiding a task by name is the most dangerous shape
 * a detector config can take: it REMOVES signal, and it does so silently, so
 * nobody auditing the fleet can tell the task exists at all. Reviewing this on
 * 2026-08-24 I found `sasemar` last ran 117 days ago with a frozen `ok`, spent
 * ten minutes believing a live collector had been dead since April, and only
 * then found the crontab note saying it is a deliberately retired one-shot.
 * The suppression was right; its silence was not.
 *
 * So the reasons live here and ship in the response as `excludedTasks`. A
 * future cycle (or the infra sentinel) can now see what is being suppressed and
 * decide whether it still should be, instead of never learning it exists.
 * Generalised from the same failure elsewhere in the estate: a whitelist guard
 * that ran every 2 minutes for four months protecting an IP that had changed —
 * ask a detector WHAT it acts on, not merely whether it runs.
 */
export const HIDDEN_TASKS: Record<string, string> = {
  sasemar:
    "one-shot historical import (SASEMAR 2019-2024 archive, 2,140 rows); cron intentionally disabled, would otherwise report stale forever",
  "test-heartbeat-debug":
    "debug artefact from 2026-04-18, never a real collector",
  "social-broadcast":
    "disabled 2026-08-29 (crontabs/realtime) — no destination configured: Telegram, Bluesky and X credentials are all absent. Re-enable the cron line and delete this entry once they exist",
  "transit-rt-madrid":
    "disabled 2026-10-19 (crontabs/realtime) — EMT_MADRID_CLIENT_ID/PASS_KEY never provisioned; it reported ok every minute while storing nothing. Escalated to MJ; re-enable the cron line and delete this entry once the keys exist",
  "transit-rt-tmb":
    "disabled 2026-10-19 (crontabs/realtime) — TMB_APP_ID/APP_KEY never provisioned; it reported ok every minute while storing nothing. Escalated to MJ; re-enable the cron line and delete this entry once the keys exist",
};
