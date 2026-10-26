#!/usr/bin/env node
/**
 * Post-deploy IndexNow notification (Bing and the engines that share IndexNow).
 *
 * Reads the sitemap index, compares every <loc>/<lastmod> with what the last
 * run recorded, and submits only URLs that are new or whose lastmod moved, in
 * requests of at most 10,000 URLs. Nothing new: no call at all.
 *
 * State lives in a JSON file outside the container (the web image does not
 * survive a deploy, and it does not ship bin/). The first run with no state
 * file only records the current sitemap and submits nothing; otherwise it would
 * send the whole site (tens of thousands of URLs) on the first deploy.
 *
 * Zero dependencies (Node 18+ fetch), so the deployer can run it from the repo
 * checkout with any node image.
 *
 * Usage:
 *   node bin/notify-indexnow.mjs --state /path/indexnow-state.json
 *   node bin/notify-indexnow.mjs --state … --dry-run      # select and print only
 *   node bin/notify-indexnow.mjs --all --sitemap https://trafico.live/sitemap/priority.xml
 *       # one-off: submit every URL of that sitemap; state is neither read nor written
 *
 * Env:
 *   INDEXNOW_KEY         required (without it: skip, exit 0)
 *   INDEXNOW_STATE_FILE  state path when --state is not given
 *   NEXT_PUBLIC_BASE_URL site (default https://trafico.live)
 */
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

/** IndexNow protocol limit per request, also used as the cap per run. */
export const MAX_URLS_PER_REQUEST = 10_000;

const ENDPOINTS = ["https://api.indexnow.org/indexnow", "https://www.bing.com/indexnow"];

// ---------------------------------------------------------------------------
// Pure helpers (tests/notify-indexnow.test.ts)
// ---------------------------------------------------------------------------

/** Child sitemap locations of a <sitemapindex>, or [] for a plain <urlset>. */
export function parseSitemapIndex(xml) {
  return [...xml.matchAll(/<sitemap>\s*<loc>(.*?)<\/loc>/gs)].map((m) => m[1].trim());
}

/** <url> entries of a <urlset>: { loc, lastmod|null }. */
export function parseUrlset(xml) {
  const out = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = m[1].match(/<loc>\s*(.*?)\s*<\/loc>/s)?.[1];
    if (!loc) continue;
    const lastmod = m[1].match(/<lastmod>\s*(.*?)\s*<\/lastmod>/s)?.[1] ?? null;
    out.push({ loc: loc.trim(), lastmod: lastmod ? lastmod.trim() : null });
  }
  return out;
}

/** One entry per URL; when a URL is listed twice, the latest lastmod wins. */
export function dedupe(entries) {
  const by = new Map();
  for (const e of entries) {
    const prev = by.get(e.loc);
    if (!prev || (e.lastmod ?? "") > (prev.lastmod ?? "")) by.set(e.loc, e);
  }
  return [...by.values()];
}

/**
 * URLs not in the state or whose lastmod differs from the one recorded,
 * most recently changed first, at most `max`. The rest wait for the next run.
 */
export function selectChanged(entries, state, max = MAX_URLS_PER_REQUEST) {
  const seen = state.urls ?? {};
  return entries
    .filter((e) => !(e.loc in seen) || seen[e.loc] !== (e.lastmod ?? ""))
    .sort((a, b) => (b.lastmod ?? "").localeCompare(a.lastmod ?? ""))
    .slice(0, max);
}

/** The state after recording `entries` (a seed, or the batches accepted). */
export function record(state, entries, now) {
  const urls = { ...(state.urls ?? {}) };
  for (const e of entries) urls[e.loc] = e.lastmod ?? "";
  return { urls, updatedAt: now.toISOString() };
}

export function chunk(arr, size = MAX_URLS_PER_REQUEST) {
  if (size > MAX_URLS_PER_REQUEST) throw new Error(`IndexNow accepts at most ${MAX_URLS_PER_REQUEST} URLs per request`);
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

async function collectEntries(sitemapUrl, seen = new Set()) {
  if (seen.has(sitemapUrl)) return [];
  seen.add(sitemapUrl);
  const res = await fetch(sitemapUrl, { redirect: "follow", signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${sitemapUrl}: HTTP ${res.status}`);
  const xml = await res.text();
  const children = parseSitemapIndex(xml);
  if (children.length === 0) return parseUrlset(xml);
  const all = [];
  // One child at a time against our own origin.
  for (const child of children) {
    try {
      all.push(...(await collectEntries(child, seen)));
    } catch (err) {
      // A child that fails must not cancel the rest, but its URLs stay
      // unrecorded, so the next run sees them as new.
      console.warn(`[indexnow] ${err.message}`);
    }
  }
  return all;
}

function readState(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeState(file, state) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(state));
  renameSync(tmp, file);
}

async function submit(endpoint, site, key, urls) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(site).hostname, key, keyLocation: `${site}/${key}.txt`, urlList: urls }),
    signal: AbortSignal.timeout(60_000),
  });
  return { status: res.status, ok: res.ok || res.status === 202 };
}

/** Submits every batch to every endpoint; returns the batches at least one endpoint accepted. */
async function submitAll(site, key, selected) {
  const batches = chunk(selected);
  const accepted = new Set();
  for (const endpoint of ENDPOINTS) {
    const name = new URL(endpoint).hostname;
    let sent = 0;
    for (const [i, batch] of batches.entries()) {
      try {
        const r = await submit(endpoint, site, key, batch.map((e) => e.loc));
        if (r.ok) {
          sent += batch.length;
          accepted.add(i);
        } else {
          console.warn(`[indexnow] ${name}: HTTP ${r.status}`);
        }
      } catch (err) {
        console.warn(`[indexnow] ${name}: ${err.message}`);
      }
    }
    console.log(`[indexnow] ${name}: ${sent} URLs in ${batches.length} request(s)`);
  }
  return [...accepted].flatMap((i) => batches[i]);
}

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main() {
  const argv = process.argv;
  const dryRun = argv.includes("--dry-run");
  const all = argv.includes("--all");
  const site = (arg(argv, "--site") || process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live").replace(/\/$/, "");
  const sitemap = arg(argv, "--sitemap") || `${site}/sitemap.xml`;
  const stateFile = arg(argv, "--state") || process.env.INDEXNOW_STATE_FILE || "";
  const key = process.env.INDEXNOW_KEY;

  if (!key && !dryRun) {
    console.log("[indexnow] INDEXNOW_KEY not set, skipping");
    return;
  }
  if (!all && !stateFile) {
    console.log("[indexnow] no state file (--state or INDEXNOW_STATE_FILE), skipping");
    return;
  }

  const entries = dedupe(await collectEntries(sitemap));
  console.log(`[indexnow] ${sitemap}: ${entries.length} URLs`);

  if (all) {
    const selected = entries.slice(0, MAX_URLS_PER_REQUEST);
    if (dryRun || selected.length === 0) return console.log(`[indexnow] --all: ${selected.length} URLs${dryRun ? " (dry run)" : ""}`);
    const accepted = await submitAll(site, key, selected);
    return console.log(`[indexnow] --all: ${accepted.length} of ${selected.length} accepted`);
  }

  if (!existsSync(stateFile)) {
    if (!dryRun) writeState(stateFile, record({}, entries, new Date()));
    return console.log(`[indexnow] first run: recorded ${entries.length} URLs, submitted none`);
  }

  const state = readState(stateFile);
  const selected = selectChanged(entries, state);
  console.log(`[indexnow] ${selected.length} new or changed since ${state.updatedAt ?? "?"}`);
  if (dryRun) {
    for (const e of selected.slice(0, 20)) console.log(`  ${e.lastmod ?? "-"}  ${e.loc}`);
    return;
  }
  if (selected.length === 0) return;

  const accepted = await submitAll(site, key, selected);
  writeState(stateFile, record(state, accepted, new Date()));
  console.log(`[indexnow] recorded ${accepted.length} accepted URLs`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    // Never fail the deploy over IndexNow.
    console.error(`[indexnow] ${err.message}`);
  });
}
