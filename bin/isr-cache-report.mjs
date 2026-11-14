#!/usr/bin/env node
/**
 * What the on-disk ISR cache holds, by route: entries, size, and how much of
 * it was written in the last 24 h. Read-only (readdir + lstat).
 *
 * Next 16.4 stores each regenerated response under
 *   .next/server/route-cache/<kind>/<sha256 of the route's page>/$/<path>
 * so the hash is mapped back to its route through app-paths-manifest.json.
 * With cache-handler/ deployed that directory is no longer written; this is
 * for measuring a container that still runs the stock handler.
 *
 * The runtime image doesn't ship bin/, so pipe it in:
 *   docker exec -i trafico-live node --input-type=module - < bin/isr-cache-report.mjs
 *   (ISR_REPORT_TOP=50 via `docker exec -i -e ISR_REPORT_TOP=50 …` for more rows)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const SERVER = process.env.ISR_REPORT_SERVER_DIR || path.join(process.cwd(), ".next/server");
const TOP = Number(process.env.ISR_REPORT_TOP) || 30;
const DAY_AGO = Date.now() - 24 * 3600 * 1000;
const MB = 1024 ** 2;

function routeNames() {
  const names = new Map();
  for (const file of ["app-paths-manifest.json", "pages-manifest.json"]) {
    try {
      for (const page of Object.keys(JSON.parse(fs.readFileSync(path.join(SERVER, file), "utf8")))) {
        names.set(crypto.createHash("sha256").update(page).digest("hex"), page.replace(/\/(page|route)$/, "") || "/");
      }
    } catch {
      // manifest missing: hashes are printed with a sample path instead
    }
  }
  return names;
}

function walk(dir, stats) {
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let items;
    try {
      items = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const item of items) {
      const full = path.join(current, item.name);
      if (item.isDirectory()) {
        stack.push(full);
        continue;
      }
      let st;
      try {
        st = fs.lstatSync(full);
      } catch {
        continue;
      }
      stats.files += 1;
      stats.bytes += st.size;
      const recent = st.mtimeMs >= DAY_AGO;
      if (recent) stats.bytes24h += st.size;
      if (item.name.endsWith(".html") || item.name.endsWith(".body")) {
        stats.entries += 1;
        if (recent) stats.entries24h += 1;
        if (!stats.sample) {
          const marker = full.indexOf(`${path.sep}$${path.sep}`);
          stats.sample = marker === -1 ? full : full.slice(marker + 2).replace(/\.(html|body)$/, "");
        }
      }
    }
  }
  return stats;
}

const mb = (bytes) => Math.round(bytes / MB).toString().padStart(8);
const names = routeNames();
const rows = [];
const cacheRoot = path.join(SERVER, "route-cache");
let kinds = [];
try {
  kinds = fs.readdirSync(cacheRoot);
} catch {
  console.log(`no ${cacheRoot}: nothing cached on disk`);
}
for (const kind of kinds) {
  for (const hash of fs.readdirSync(path.join(cacheRoot, kind))) {
    const stats = walk(path.join(cacheRoot, kind, hash), { files: 0, bytes: 0, bytes24h: 0, entries: 0, entries24h: 0, sample: null });
    rows.push({ kind, route: names.get(hash) || `? ${hash.slice(0, 12)}`, ...stats });
  }
}
rows.sort((a, b) => b.bytes - a.bytes);

const total = rows.reduce((t, r) => ({ files: t.files + r.files, bytes: t.bytes + r.bytes, bytes24h: t.bytes24h + r.bytes24h, entries: t.entries + r.entries, entries24h: t.entries24h + r.entries24h }), { files: 0, bytes: 0, bytes24h: 0, entries: 0, entries24h: 0 });
console.log(`route-cache: ${total.entries} entries, ${total.files} files, ${mb(total.bytes).trim()} MB; last 24 h: ${total.entries24h} entries, ${mb(total.bytes24h).trim()} MB`);
console.log("      MB    MB 24h   entries  entries 24h  kind      route  (sample path)");
for (const r of rows.slice(0, TOP)) {
  console.log(`${mb(r.bytes)}  ${mb(r.bytes24h)}  ${String(r.entries).padStart(8)}  ${String(r.entries24h).padStart(11)}  ${r.kind.padEnd(9)} ${r.route}  (${r.sample || "-"})`);
}
if (rows.length > TOP) console.log(`… ${rows.length - TOP} more routes (ISR_REPORT_TOP=${rows.length})`);

const fetchCache = walk(path.join(SERVER, "..", "cache", "fetch-cache"), { files: 0, bytes: 0, bytes24h: 0, entries: 0, entries24h: 0, sample: null });
console.log(`fetch-cache: ${fetchCache.files} files, ${mb(fetchCache.bytes).trim()} MB (last 24 h ${mb(fetchCache.bytes24h).trim()} MB)`);
