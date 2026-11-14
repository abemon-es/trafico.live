/**
 * A least-recently-used map with a byte budget, for the ISR cache handler
 * (./isr-cache-handler.mjs). Plain JS: the production server loads it as is,
 * with no build step.
 *
 * It implements the part of Next's own LRU that FileSystemCache uses on its
 * memory store (get, set, has, remove, size, currentSize), plus an eviction
 * callback. A Map keeps insertion order, so re-inserting a key on every hit
 * makes the first key the least recently used one.
 */

/** Fixed cost per entry: the Map slot, the entry object, headers, meta. */
export const ENTRY_OVERHEAD_BYTES = 512;

/**
 * Bytes a value occupies. Strings count 2 bytes per character, the most V8
 * may use for one, so the budget is an upper bound on what the cache holds
 * rather than an estimate that can be exceeded.
 */
function bytesOf(value) {
  if (value == null) return 0;
  if (typeof value === "string") return value.length * 2;
  if (typeof value.byteLength === "number") return value.byteLength;
  return 0;
}

function jsonBytes(value) {
  if (value == null) return 0;
  try {
    return (JSON.stringify(value)?.length ?? 0) * 2;
  } catch {
    return 0;
  }
}

/**
 * Size of one memory-cache entry as FileSystemCache stores it:
 * `{ value, lastModified, cacheControl }`, where `value` is a cached page,
 * route response, fetch result, redirect or null (a cached notFound).
 */
export function entrySize(entry, key) {
  let size = ENTRY_OVERHEAD_BYTES + bytesOf(key);
  const value = entry?.value;
  if (!value) return size;
  switch (value.kind) {
    case "APP_PAGE":
      size += bytesOf(value.html) + bytesOf(value.rscData) + bytesOf(value.postponed) + jsonBytes(value.headers);
      if (value.segmentData) {
        for (const [segmentPath, buffer] of value.segmentData) size += bytesOf(segmentPath) + bytesOf(buffer);
      }
      return size;
    case "APP_ROUTE":
      return size + bytesOf(value.body) + jsonBytes(value.headers);
    case "PAGES":
      return size + bytesOf(value.html) + jsonBytes(value.pageData) + jsonBytes(value.headers);
    case "FETCH":
      return size + bytesOf(value.data?.body) + jsonBytes(value.data?.headers) + bytesOf(value.data?.url);
    default:
      return size + jsonBytes(value);
  }
}

export class ByteLru {
  /**
   * @param {object} options
   * @param {number} options.maxBytes budget; entries are evicted, oldest
   *   access first, until the total is back under it
   * @param {(value: unknown, key: string) => number} [options.sizeOf]
   * @param {(key: string, size: number) => void} [options.onEvict] called for
   *   each entry dropped to make room (not for replacements or removals)
   * @param {(key: string, size: number) => void} [options.onOversize] called
   *   when one entry alone is larger than the budget and is not stored
   */
  constructor({ maxBytes, sizeOf = entrySize, onEvict, onOversize }) {
    if (!Number.isFinite(maxBytes) || maxBytes <= 0) throw new Error(`ByteLru: maxBytes must be > 0, got ${maxBytes}`);
    this.maxBytes = maxBytes;
    this.sizeOf = sizeOf;
    this.onEvict = onEvict;
    this.onOversize = onOversize;
    this.entries = new Map();
    this.totalBytes = 0;
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  has(key) {
    return this.entries.has(key);
  }

  /**
   * Stores `value` as the most recently used entry. Returns false, and keeps
   * nothing under `key`, when the value alone exceeds the budget: an older
   * value left in place would be served as if it were the current one.
   */
  set(key, value) {
    const size = this.sizeOf(value, key);
    if (!(size > 0)) throw new Error(`ByteLru: size must be > 0, got ${size} for ${key}`);
    this.remove(key);
    if (size > this.maxBytes) {
      this.onOversize?.(key, size);
      return false;
    }
    this.entries.set(key, { value, size });
    this.totalBytes += size;
    while (this.totalBytes > this.maxBytes) {
      const [oldestKey, oldest] = this.entries.entries().next().value;
      this.entries.delete(oldestKey);
      this.totalBytes -= oldest.size;
      this.onEvict?.(oldestKey, oldest.size);
    }
    return true;
  }

  remove(key) {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.entries.delete(key);
    this.totalBytes -= entry.size;
  }

  get size() {
    return this.entries.size;
  }

  get currentSize() {
    return this.totalBytes;
  }
}
