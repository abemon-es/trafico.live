import prisma from "@/lib/db";

type RedirectEntry = {
  destination: string;
  permanent: boolean;
};

let cache: Map<string, RedirectEntry> | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load all redirects into memory. Called on first request and every 5 minutes.
 * With ~hundreds of redirects this is negligible memory.
 */
async function loadCache(): Promise<Map<string, RedirectEntry>> {
  const rows = await prisma.redirect.findMany({
    select: { source: true, destination: true, permanent: true },
  });
  const map = new Map<string, RedirectEntry>();
  for (const r of rows) {
    map.set(r.source, { destination: r.destination, permanent: r.permanent });
  }
  return map;
}

/**
 * Look up a redirect for the given path.
 * Returns null if no redirect exists.
 */
export async function findRedirect(
  path: string
): Promise<RedirectEntry | null> {
  const now = Date.now();
  if (!cache || now > cacheExpiry) {
    try {
      cache = await loadCache();
      cacheExpiry = now + CACHE_TTL_MS;
    } catch {
      // DB unavailable — use stale cache or return null
      if (!cache) return null;
    }
  }
  return cache.get(path) ?? null;
}

/**
 * Record a hit on a redirect (fire-and-forget, non-blocking).
 */
export function recordHit(source: string): void {
  prisma.redirect
    .update({
      where: { source },
      data: { hits: { increment: 1 }, lastHitAt: new Date() },
    })
    .catch(() => {});
}

/**
 * Invalidate the cache (call after adding/removing redirects).
 */
export function invalidateRedirectCache(): void {
  cache = null;
  cacheExpiry = 0;
}
