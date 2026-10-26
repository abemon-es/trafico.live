/**
 * Post-deploy IndexNow: only new or changed URLs, never the whole site.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:indexnow
 */

import assert from "node:assert/strict";
import { MAX_URLS_PER_REQUEST, chunk, dedupe, parseSitemapIndex, parseUrlset, record, selectChanged } from "../bin/notify-indexnow.mjs";

type Entry = { loc: string; lastmod: string | null };

function main() {
  // Index and urlset parsing.
  const index = `<sitemapindex><sitemap><loc>https://trafico.live/sitemap/0.xml</loc></sitemap>
    <sitemap><loc> https://trafico.live/sitemap/priority.xml </loc></sitemap></sitemapindex>`;
  assert.deepEqual(parseSitemapIndex(index), ["https://trafico.live/sitemap/0.xml", "https://trafico.live/sitemap/priority.xml"]);
  assert.deepEqual(parseSitemapIndex("<urlset></urlset>"), []);
  const urlset = `<urlset><url><loc>https://trafico.live/a</loc><lastmod>2026-10-24T10:00:00.000Z</lastmod></url>
    <url><loc>https://trafico.live/b</loc><changefreq>daily</changefreq></url></urlset>`;
  assert.deepEqual(parseUrlset(urlset), [
    { loc: "https://trafico.live/a", lastmod: "2026-10-24T10:00:00.000Z" },
    { loc: "https://trafico.live/b", lastmod: null },
  ]);

  // A URL listed twice keeps its latest lastmod.
  const d: Entry[] = dedupe([
    { loc: "https://trafico.live/a", lastmod: "2026-10-01" },
    { loc: "https://trafico.live/a", lastmod: "2026-10-20" },
  ]);
  assert.deepEqual(d, [{ loc: "https://trafico.live/a", lastmod: "2026-10-20" }]);

  // Only new or moved URLs, newest first; unchanged ones (with or without lastmod) are skipped.
  const state = { urls: { "https://trafico.live/a": "2026-10-20", "https://trafico.live/b": "", "https://trafico.live/c": "2026-10-01" } };
  const entries: Entry[] = [
    { loc: "https://trafico.live/a", lastmod: "2026-10-20" },
    { loc: "https://trafico.live/b", lastmod: null },
    { loc: "https://trafico.live/c", lastmod: "2026-10-25" },
    { loc: "https://trafico.live/new", lastmod: "2026-10-24" },
    { loc: "https://trafico.live/new-no-lastmod", lastmod: null },
  ];
  assert.deepEqual(selectChanged(entries, state).map((e: Entry) => e.loc), [
    "https://trafico.live/c",
    "https://trafico.live/new",
    "https://trafico.live/new-no-lastmod",
  ]);
  assert.deepEqual(selectChanged(entries, state, 1).map((e: Entry) => e.loc), ["https://trafico.live/c"], "capped per run");
  assert.deepEqual(selectChanged(entries, record(state, entries, new Date())), [], "nothing new after recording");

  // Recording keeps earlier URLs and stamps the run.
  const now = new Date("2026-10-25T12:00:00Z");
  const next = record(state, [{ loc: "https://trafico.live/new", lastmod: "2026-10-24" }], now);
  assert.equal(next.urls["https://trafico.live/a"], "2026-10-20");
  assert.equal(next.urls["https://trafico.live/new"], "2026-10-24");
  assert.equal(next.updatedAt, now.toISOString());

  // Requests never exceed the protocol limit.
  const many = Array.from({ length: MAX_URLS_PER_REQUEST + 1 }, (_, i) => i);
  assert.deepEqual(chunk(many).map((b: number[]) => b.length), [MAX_URLS_PER_REQUEST, 1]);
  assert.throws(() => chunk(many, MAX_URLS_PER_REQUEST + 1));

  console.log("notify-indexnow: OK");
}

main();
