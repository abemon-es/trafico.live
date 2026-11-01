/**
 * /paneles says «Sin mensaje activo» only while the DGT messages feed is live.
 * Measured on 2026-11-01: the DGT messages feed had answered 200 with
 * publicationTime 2026-10-30T19:42+01:00 and no messages for two days, the
 * panel run was `partial` («frozen upstream»), and the page told visitors
 * that none of the 2,515 panels showed anything.
 *
 *   1. live only with a fresh run whose feed was published at most 30 min
 *      before it (the collector's rule); no heartbeat, no publication time,
 *      a stale run or an old publication → not live;
 *   2. the collector and the web use the same 30 min limit;
 *   3. the page reads the helper and, when not live, hides the counts and the
 *      «incidencias activas» alert and says «Mensaje no disponible».
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:panel-feed
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PANEL_MESSAGES_MAX_AGE_MS, panelMessagesFeed } from "../src/lib/panel-messages-feed";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const now = Date.parse("2026-11-01T18:40:00Z");
const run = new Date("2026-11-01T18:35:27Z");
const min = 60 * 1000;

// 1. Live / not live.
assert.equal(
  panelMessagesFeed({ messagesPublishedAt: new Date(run.getTime() - 4 * min).toISOString() }, run, now).live,
  true,
  "fresh run, feed published 4 min before it → live"
);
const frozen = panelMessagesFeed({ messagesPublishedAt: "2026-10-30T18:42:59.000Z" }, run, now);
assert.equal(frozen.live, false, "feed published two days before the run → not live");
assert.equal(frozen.publishedAt?.toISOString(), "2026-10-30T18:42:59.000Z", "publication time is kept for the notice");
assert.equal(panelMessagesFeed(null, null, now).live, false, "no heartbeat → not live");
assert.equal(panelMessagesFeed({}, run, now).live, false, "no publication time → not live");
assert.equal(panelMessagesFeed({ messagesPublishedAt: "nope" }, run, now).publishedAt, null, "bad date → null");
assert.equal(
  panelMessagesFeed(
    { messagesPublishedAt: new Date(run.getTime() - min).toISOString() },
    run,
    run.getTime() + 16 * min
  ).live,
  false,
  "run older than the 900 s threshold → not live"
);
assert.equal(
  panelMessagesFeed({ messagesPublishedAt: new Date(run.getTime() - 31 * min).toISOString() }, run, now).live,
  false,
  "published 31 min before the run → not live"
);

// 2. Same limit as the collector.
assert.equal(PANEL_MESSAGES_MAX_AGE_MS, 30 * min);
assert.match(
  read("services/collector/tasks/panel/collector.ts"),
  /const MESSAGES_MAX_AGE_MS = 30 \* 60 \* 1000;/,
  "collector limit changed: update PANEL_MESSAGES_MAX_AGE_MS too"
);

// 3. The page uses it.
const page = read("src/app/paneles/page.tsx");
assert.match(page, /panelMessagesFeed\(/, "page reads the panel heartbeat through the helper");
assert.match(page, /messagesLive && withMessageCount > 0/, "«incidencias activas» alert only while live");
assert.match(page, /messagesLive \? "Sin mensaje activo" : "Mensaje no disponible"/, "per-panel label");
assert.match(page, /La DGT no publica los mensajes de los paneles desde el/, "notice names the date");

console.log("panel-messages-feed: ok");
