/**
 * ISR cache handler: Next's own FileSystemCache, kept in memory under a byte
 * budget instead of written to disk.
 *
 * Why (13-11-2026): Next 16.4 writes every regenerated page to
 * .next/server/route-cache/<kind>/<sha256 of the route>/$/<path>
 * (next/dist/server/lib/route-cache-key.js) and never evicts. The container
 * has no volume, so it grew the writable layer by ~10 GB a day, to 42.6 GB.
 * The hourly prune on compute only knows .next/server/app, where Next wrote
 * until 16.3, so since #239 (16.4.3, 01-11) it has pruned nothing that grows.
 *
 * What changes and what doesn't:
 * - Every read, write, tag check and staleness rule is FileSystemCache's,
 *   unchanged. The only differences are that nothing is flushed to disk and
 *   that the memory store is a ByteLru with an eviction log.
 * - Pages prerendered by the build are still read from .next/server/app when
 *   they aren't in memory (FileSystemCache's "build seed" path), exactly as
 *   after every deploy today.
 * - An evicted entry is a cache miss: the page is rendered again, or its
 *   build copy is served stale while it regenerates, as ISR does.
 * - Fetch results over 2 MB are not cached, as with the stock handler (Next
 *   lifts that limit for custom handlers; this one keeps it).
 *
 * Loaded by the production server through NEXT_CACHE_HANDLER_PATH (set in
 * the Dockerfile): the runtime image has no next.config.ts, so a
 * `cacheHandler` key there would never reach production.
 *
 * Env:
 *   ISR_CACHE_MAX_MB          memory budget, default 256, minimum 16
 *   ISR_CACHE_LOG_INTERVAL_S  at most one eviction line per interval, default 60
 */

import { createRequire } from "node:module";
import { ByteLru } from "./byte-lru.mjs";

const require = createRequire(import.meta.url);
// The CommonJS build, the same module instance the server runtime uses, so
// the tag manifest that revalidateTag/revalidatePath write is the one it reads.
const FileSystemCache = require("next/dist/server/lib/incremental-cache/file-system-cache").default;

const MB = 1024 * 1024;
export const DEFAULT_MAX_MB = 256;
export const MIN_MAX_MB = 16;
export const DEFAULT_LOG_INTERVAL_S = 60;
const FETCH_ITEM_LIMIT = 2 * MB;

function logLine(fields) {
  console.log(JSON.stringify(fields));
}

/** Budget in bytes from ISR_CACHE_MAX_MB; a bad or too small value falls back to the default, with a warning. */
export function maxBytesFromEnv(env = process.env, warn = logLine) {
  const raw = env.ISR_CACHE_MAX_MB;
  if (raw === undefined || raw.trim() === "") return DEFAULT_MAX_MB * MB;
  const mb = Number(raw);
  if (!Number.isFinite(mb) || mb < MIN_MAX_MB) {
    warn({ evt: "isr_cache_config", warning: `ISR_CACHE_MAX_MB=${raw} ignored (minimum ${MIN_MAX_MB}); using ${DEFAULT_MAX_MB}` });
    return DEFAULT_MAX_MB * MB;
  }
  return Math.floor(mb * MB);
}

function logIntervalMsFromEnv(env = process.env) {
  const seconds = Number(env.ISR_CACHE_LOG_INTERVAL_S);
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_LOG_INTERVAL_S) * 1000;
}

/** The public path of a response-cache key, or "fetch" for a data-cache key. */
export function pathOfKey(key) {
  const marker = key.indexOf("/$/");
  return marker === -1 ? "fetch" : key.slice(marker + 2);
}

/**
 * Eviction reporter: counts evictions and writes at most one summary line per
 * interval, when an eviction lands after the interval has passed.
 */
export function createEvictionReporter({ intervalMs, lru, now = Date.now, log = logLine }) {
  let windowStart = now();
  let evicted = 0;
  let evictedBytes = 0;
  let lastPath = null;
  return function onEvict(key, size) {
    evicted += 1;
    evictedBytes += size;
    lastPath = pathOfKey(key);
    const t = now();
    if (t - windowStart < intervalMs) return;
    log({
      evt: "isr_cache_evict",
      evicted,
      evictedMB: +(evictedBytes / MB).toFixed(1),
      windowS: Math.round((t - windowStart) / 1000),
      entries: lru().size,
      usedMB: +(lru().currentSize / MB).toFixed(1),
      maxMB: +(lru().maxBytes / MB).toFixed(1),
      lastEvicted: lastPath,
    });
    windowStart = t;
    evicted = 0;
    evictedBytes = 0;
  };
}

let memory = null;

/** The process-wide memory store, created on first use (IncrementalCache builds a handler per request). */
export function sharedMemoryStore(env = process.env) {
  if (memory) return memory;
  const maxBytes = maxBytesFromEnv(env);
  const store = new ByteLru({
    maxBytes,
    onEvict: createEvictionReporter({ intervalMs: logIntervalMsFromEnv(env), lru: () => store }),
    onOversize: (key, size) =>
      logLine({ evt: "isr_cache_oversize", path: pathOfKey(key), sizeMB: +(size / MB).toFixed(1), maxMB: +(maxBytes / MB).toFixed(1) }),
  });
  memory = store;
  logLine({ evt: "isr_cache_init", handler: "bounded-memory", maxMB: +(maxBytes / MB).toFixed(1), flushToDisk: false });
  return memory;
}

export default class BoundedMemoryCacheHandler extends FileSystemCache {
  constructor(ctx) {
    const store = sharedMemoryStore();
    // FileSystemCache keeps its memory store in a static field and only
    // creates one when none is set, so this one is used for every instance.
    FileSystemCache.memoryCache = store;
    super({ ...ctx, flushToDisk: false, maxMemoryCacheSize: store.maxBytes });
  }

  async set(key, data, ctx) {
    if (data?.kind === "FETCH" && JSON.stringify(data).length > FETCH_ITEM_LIMIT) return;
    return super.set(key, data, ctx);
  }
}
