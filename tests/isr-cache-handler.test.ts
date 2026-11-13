/**
 * ISR cache handler (cache-handler/): Next's FileSystemCache in memory under
 * a byte budget, because Next 16.4 writes .next/server/route-cache/ with no
 * eviction and the container has no volume (42.6 GB on 13-11-2026).
 *   1. ByteLru: the budget holds, the least recently used entry goes first, a
 *      hit refreshes an entry, a replacement isn't an eviction, an entry larger
 *      than the budget is not stored and drops the older value under its key;
 *   2. entry sizes count html, RSC, segments and fetch bodies;
 *   3. ISR_CACHE_MAX_MB: default 256, a bad or tiny value falls back to it;
 *   4. the eviction log writes at most one line per interval;
 *   5. against the installed Next: the handler is FileSystemCache with its
 *      memory store swapped, writes nothing to disk, evicts beyond the budget,
 *      still serves the build's prerendered copy, honours revalidateTag (in the
 *      tag manifest the server runtime reads), and keeps the 2 MB fetch limit;
 *   6. the Dockerfile ships the handler and points NEXT_CACHE_HANDLER_PATH at
 *      it, and the runtime image still has no next.config.ts to override it.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:isr-cache
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ByteLru, ENTRY_OVERHEAD_BYTES, entrySize } from "../cache-handler/byte-lru.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const MB = 1024 * 1024;

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? listFiles(join(dir, d.name)) : d.isFile() ? [join(dir, d.name)] : [],
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The handler as these tests drive it. Its inferred type is Next's internal
// one, whose context unions want enum members, not the string kinds used here.
type CachedEntry = {
  lastModified: number;
  cacheControl?: unknown;
  value: { html?: string; rscData?: Buffer; segmentData?: Map<string, Buffer>; data?: { body?: string } } | null;
} | null;
interface Cache {
  get(key: string, ctx: object): Promise<CachedEntry>;
  set(key: string, data: unknown, ctx: object): Promise<void>;
  revalidateTag(tag: string, durations?: { expire?: number }): Promise<void>;
}
// Cache entries here hold megabytes: compare them with assert.ok, never
// assert.equal/deepEqual, whose failure diff of such a value runs out of memory.

function byteLru() {
  const evicted: Array<[string, number]> = [];
  const oversize: string[] = [];
  const lru = new ByteLru({
    maxBytes: 30,
    sizeOf: (value: unknown) => Number(value),
    onEvict: (key: string, size: number) => evicted.push([key, size]),
    onOversize: (key: string) => oversize.push(key),
  });
  assert.equal(lru.set("a", 10), true);
  lru.set("b", 10);
  lru.set("c", 10);
  assert.equal(lru.currentSize, 30, "exactly at the budget: nothing goes");
  assert.deepEqual([...evicted], []);
  assert.equal(lru.get("a"), 10, "a hit returns the value…");
  lru.set("d", 10);
  assert.deepEqual([...evicted], [["b", 10]], "…and makes a the most recent, so b, the least recently used, goes");
  assert.equal(lru.has("b"), false);
  assert.deepEqual([...lru.entries.keys()], ["c", "a", "d"]);
  lru.set("c", 5);
  assert.equal(lru.currentSize, 25, "a replacement swaps the size");
  assert.deepEqual([...evicted], [["b", 10]], "and is not an eviction");
  lru.set("e", 20);
  assert.deepEqual(evicted.map(([k]) => k), ["b", "a", "d"], "room is made oldest first, as many as needed");
  assert.ok(lru.currentSize <= 30);
  assert.equal(lru.set("e", 31), false, "an entry larger than the budget is not stored");
  assert.deepEqual(oversize, ["e"]);
  assert.equal(lru.has("e"), false, "and the older value under that key is not left to be served");
  assert.equal(lru.currentSize, 5);
  lru.remove("c");
  assert.equal(lru.size, 0);
  assert.equal(lru.currentSize, 0);
  assert.throws(() => new ByteLru({ maxBytes: 0 }), /maxBytes/);
  assert.throws(() => lru.set("z", 0), /size must be > 0/);
}

function sizes() {
  const key = "/route-cache/APP_PAGE/h/$/p";
  const page = {
    value: {
      kind: "APP_PAGE",
      html: "abc",
      rscData: Buffer.alloc(10),
      postponed: undefined,
      headers: {},
      segmentData: new Map([["/_tree", Buffer.alloc(5)]]),
    },
  };
  assert.equal(entrySize(page, key), ENTRY_OVERHEAD_BYTES + key.length * 2 + 3 * 2 + 10 + 4 + "/_tree".length * 2 + 5);
  const fetchEntry = { value: { kind: "FETCH", data: { headers: {}, body: "x".repeat(100), url: "u" }, revalidate: 60 } };
  assert.equal(entrySize(fetchEntry, "k"), ENTRY_OVERHEAD_BYTES + 2 + 200 + 4 + 2);
  assert.equal(entrySize({ value: null }, "k"), ENTRY_OVERHEAD_BYTES + 2, "a cached notFound (null) still costs its overhead");
}

async function config() {
  const { maxBytesFromEnv, pathOfKey, createEvictionReporter } = await import("../cache-handler/isr-cache-handler.mjs");
  const warnings: unknown[] = [];
  const warn = (w: unknown) => warnings.push(w);
  assert.equal(maxBytesFromEnv({}, warn), 256 * MB, "default 256 MB");
  assert.equal(maxBytesFromEnv({ ISR_CACHE_MAX_MB: "512" }, warn), 512 * MB);
  assert.equal(maxBytesFromEnv({ ISR_CACHE_MAX_MB: "16" }, warn), 16 * MB);
  assert.equal(warnings.length, 0);
  for (const bad of ["0", "-1", "8", "lots"]) {
    assert.equal(maxBytesFromEnv({ ISR_CACHE_MAX_MB: bad }, warn), 256 * MB, `${bad} falls back to the default`);
  }
  assert.equal(warnings.length, 4, "each fallback says so");

  assert.equal(pathOfKey("/route-cache/APP_PAGE/abc123/$/maritimo/buques/1"), "/maritimo/buques/1");
  assert.equal(pathOfKey("0f3a9c"), "fetch");

  let t = 1_000_000;
  const lines: Array<Record<string, unknown>> = [];
  const store = { size: 7, currentSize: 3 * MB, maxBytes: 4 * MB };
  const onEvict = createEvictionReporter({ intervalMs: 60_000, lru: () => store, now: () => t, log: (l: Record<string, unknown>) => lines.push(l) });
  for (let i = 0; i < 100; i++) {
    t += 500;
    onEvict(`/route-cache/APP_PAGE/h/$/p${i}`, MB);
  }
  assert.equal(lines.length, 0, "100 evictions within 50 s: no line yet");
  t = 1_000_000 + 60_000;
  onEvict("/route-cache/APP_PAGE/h/$/last", MB);
  assert.equal(lines.length, 1, "the first eviction past the interval writes one summary");
  assert.deepEqual(lines[0], { evt: "isr_cache_evict", evicted: 101, evictedMB: 101, windowS: 60, entries: 7, usedMB: 3, maxMB: 4, lastEvicted: "/last" });
  t += 1_000;
  onEvict("/route-cache/APP_PAGE/h/$/again", MB);
  assert.equal(lines.length, 1, "and the counter restarts: at most one line per interval");
}

async function againstNext() {
  process.env.ISR_CACHE_MAX_MB = "16";
  process.env.ISR_CACHE_LOG_INTERVAL_S = "0.001";
  const logged: string[] = [];
  const realLog = console.log;
  console.log = (...args: unknown[]) => {
    logged.push(args.map(String).join(" "));
  };
  // FileSystemCache keeps the data cache in <serverDistDir>/../cache: one temp root holds both.
  const base = mkdtempSync(join(tmpdir(), "isr-cache-"));
  const serverDistDir = join(base, "server");
  mkdirSync(serverDistDir);
  try {
    const Handler = (await import("../cache-handler/isr-cache-handler.mjs")).default as unknown as new (ctx: object) => Cache;
    const FileSystemCache = require("next/dist/server/lib/incremental-cache/file-system-cache").default;
    const { nodeFs } = require("next/dist/server/lib/node-fs-methods");
    const { getRouteCacheKey } = require("next/dist/server/lib/route-cache-key");
    const tagsManifest = require("next/dist/server/lib/incremental-cache/tags-manifest.external");

    const make = () =>
      new Handler({ fs: nodeFs, serverDistDir, flushToDisk: true, maxMemoryCacheSize: 50 * MB, revalidatedTags: [], dev: false, _requestHeaders: {} });
    const handler = make();
    make(); // IncrementalCache builds one per request: they share the store
    assert.ok(handler instanceof FileSystemCache, "it is Next's FileSystemCache");
    const store = FileSystemCache.memoryCache;
    // By name, not instanceof: tsx may load byte-lru.mjs twice (once for this
    // file, once for the handler's own import).
    assert.equal(store?.constructor?.name, "ByteLru", "with the bounded store as its memory cache");
    assert.equal(store.maxBytes, 16 * MB, "sized from ISR_CACHE_MAX_MB");
    assert.equal(logged.filter((l) => l.includes('"isr_cache_init"')).length, 1, "one init line per process, not per request");

    const owner = { kind: "APP_PAGE", sourceRoute: "/maritimo/buques/[slug]/page" };
    const keyOf = (path: string) => getRouteCacheKey(path, owner);
    assert.equal(keyOf("/maritimo/buques/1"), `/route-cache/APP_PAGE/${createHash("sha256").update(owner.sourceRoute).digest("hex")}/$/maritimo/buques/1`);
    const pageCtx = { kind: "APP_PAGE", isFallback: false, isRoutePPREnabled: false };
    const page = (html: string, headers: Record<string, string> = {}) => ({
      kind: "APP_PAGE",
      html,
      rscData: Buffer.alloc(64 * 1024),
      headers,
      status: 200,
      postponed: undefined,
      segmentData: new Map([["/_tree", Buffer.alloc(1024)]]),
    });
    const setCtx = { cacheControl: { revalidate: 300, expire: undefined }, isFallback: false, isRoutePPREnabled: false };

    // A regenerated page is served from memory, with its lifetime.
    await handler.set(keyOf("/maritimo/buques/1"), page("<html>1</html>"), setCtx);
    const hit = await handler.get(keyOf("/maritimo/buques/1"), pageCtx);
    assert.equal(hit?.value?.html, "<html>1</html>");
    assert.equal(hit?.value?.rscData?.byteLength, 64 * 1024);
    assert.equal(hit?.value?.segmentData?.get("/_tree")?.byteLength, 1024);
    assert.deepEqual(hit?.cacheControl, { revalidate: 300, expire: undefined });

    // ~2.1 MB each against a 16 MB budget: the oldest go, nothing reaches disk.
    await sleep(2); // past the 1 ms log interval set above
    for (let i = 0; i < 12; i++) await handler.set(keyOf(`/maritimo/buques/big-${i}`), page("x".repeat(MB)), setCtx);
    assert.ok(store.currentSize <= 16 * MB, `under the budget (${store.currentSize} bytes)`);
    assert.ok((await handler.get(keyOf("/maritimo/buques/1"), pageCtx)) === null, "the least recently used page was evicted: a miss");
    assert.ok((await handler.get(keyOf("/maritimo/buques/big-0"), pageCtx)) === null, "and the next oldest");
    assert.ok(await handler.get(keyOf("/maritimo/buques/big-11"), pageCtx), "the newest is still there");
    assert.deepEqual(listFiles(base), [], "nothing was written to disk");
    const evictLines = logged.filter((l) => l.includes('"isr_cache_evict"')).map((l) => JSON.parse(l));
    assert.ok(evictLines.length >= 1, "evictions are logged");
    assert.match(evictLines[0].lastEvicted, /^\/maritimo\/buques\//, "with the public path of the last one evicted");

    // revalidatePath/revalidateTag: an expired tag makes the entry a miss…
    const tagged = keyOf("/maritimo/buques/tagged");
    await handler.set(tagged, page("<html>t</html>", { "x-next-cache-tags": "_N_T_/maritimo/buques/tagged" }), setCtx);
    assert.ok(await handler.get(tagged, pageCtx));
    await sleep(5);
    await handler.revalidateTag("_N_T_/maritimo/buques/tagged");
    assert.ok((await handler.get(tagged, pageCtx)) === null, "revalidated: the next request renders it again");
    // …and a stale-marked tag lands in the manifest the server runtime reads.
    const stale = keyOf("/maritimo/buques/stale");
    await handler.set(stale, page("<html>s</html>", { "x-next-cache-tags": "stale-tag" }), setCtx);
    const before = await handler.get(stale, pageCtx);
    assert.ok(before, "the stale-tag entry is cached");
    await sleep(5);
    await handler.revalidateTag("stale-tag", { expire: 3600 });
    assert.equal(tagsManifest.areTagsStale(["stale-tag"], before.lastModified), true, "IncrementalCache will see it stale and revalidate");
    const runtime = readFileSync(join(ROOT, "node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js"), "utf8");
    assert.ok(
      runtime.includes("next/dist/server/lib/incremental-cache/tags-manifest.external.js"),
      "the prebundled page runtime shares this tag manifest module (if a Next upgrade changes that, revalidateTag from the handler would be lost)",
    );

    // A page prerendered by the build is still served from .next/server/app,
    // and not copied into route-cache/ (FileSystemCache would, with disk on).
    const seedOwner = { kind: "APP_PAGE", sourceRoute: "/camaras/[city]/page" };
    const seedKey = getRouteCacheKey("/camaras/madrid", seedOwner);
    mkdirSync(join(serverDistDir, "app/camaras"), { recursive: true });
    writeFileSync(join(serverDistDir, "app/camaras/madrid.html"), "<html>build</html>");
    writeFileSync(join(serverDistDir, "app/camaras/madrid.rsc"), "rsc");
    writeFileSync(
      join(serverDistDir, "app/camaras/madrid.meta"),
      JSON.stringify({ status: 200, headers: {}, routeCache: { key: seedKey, isFallback: false, owner: seedOwner } }),
    );
    const seed = await handler.get(seedKey, pageCtx);
    assert.equal(seed?.value?.html, "<html>build</html>", "the build's copy is served");
    assert.ok(!listFiles(serverDistDir).some((f) => f.includes("route-cache")), "and nothing is promoted to disk");
    assert.ok(store.has(seedKey), "it is kept in memory instead");

    // The data cache keeps the stock 2 MB limit per item.
    const fetchCtx = { kind: "FETCH", tags: [], softTags: [], fetchIdx: 0, fetchUrl: "https://example.test/x" };
    const fetched = (body: string) => ({ kind: "FETCH", data: { headers: {}, body, url: "https://example.test/x", status: 200 }, revalidate: 300 });
    const setFetch = { fetchCache: true, tags: [], fetchIdx: 0, fetchUrl: "https://example.test/x" };
    await handler.set("fetch-small", fetched("ok"), setFetch);
    assert.equal((await handler.get("fetch-small", fetchCtx))?.value?.data?.body, "ok");
    await handler.set("fetch-big", fetched("x".repeat(3 * MB)), setFetch);
    assert.ok((await handler.get("fetch-big", fetchCtx)) === null, "over 2 MB: not cached");
    assert.deepEqual(listFiles(base).filter((f) => !f.includes(join("server", "app", "camaras"))), [], "still nothing written");
  } finally {
    console.log = realLog;
    rmSync(base, { recursive: true, force: true });
  }
}

function dockerfile() {
  const df = readFileSync(join(ROOT, "Dockerfile"), "utf8");
  const runtime = df.slice(df.indexOf("AS runtime"));
  assert.ok(runtime.includes("COPY --from=builder /app/cache-handler ./cache-handler"), "the runtime image ships the handler");
  assert.ok(runtime.includes("ENV NEXT_CACHE_HANDLER_PATH=/app/cache-handler/isr-cache-handler.mjs"), "and Next's default config is pointed at it");
  assert.ok(!/COPY[^\n]*next\.config/.test(runtime), "no next.config in the runtime image: its config is Next's defaults, so the env var is what applies");
  const builder = df.slice(0, df.indexOf("AS runtime"));
  assert.ok(!builder.includes("NEXT_CACHE_HANDLER_PATH"), "the build keeps the stock handler");
}

// A cache call that never settles must fail the test, not hang it (or, with
// nothing else pending, let the process exit 0 without the ok line).
const watchdog = setTimeout(() => {
  console.error("isr-cache-handler: timed out after 120 s (a cache get/set never settled)");
  process.exit(1);
}, 120_000);

async function main() {
  byteLru();
  sizes();
  await config();
  await againstNext();
  dockerfile();
  clearTimeout(watchdog);
  console.log("isr-cache-handler: ok (byte budget, LRU order, one log line per interval, FileSystemCache semantics in memory, build copies served, nothing on disk)");
}

main().catch((err) => {
  clearTimeout(watchdog);
  console.error(err);
  process.exit(1);
});
