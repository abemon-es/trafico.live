/**
 * Internal Route Handler: /api/internal/keys/lookup
 *
 * Edge middleware cannot use Prisma (Node-only). This route acts as a
 * bridge: middleware calls it via fetch with a SHA-256 hash of the API key,
 * and this handler performs the Prisma lookup (Node runtime).
 *
 * Security model (S0):
 *   - Requires x-internal: 1 header (same-origin guard, hardened in S2)
 *   - Never returns plaintext key or owner PII
 *   - 60-second in-memory cache to reduce DB hits
 *   - Redis-backed distributed cache can replace this in S2
 *
 * NOTE: The ApiKey schema uses a plaintext `key` column (no `keyHash`).
 * The caller (middleware) hashes the key before calling this endpoint.
 * This route receives the hash and does a reverse lookup:
 *   SELECT * FROM ApiKey WHERE key = <... matched client-side by hash>
 *
 * Because the DB stores keys plaintext, we cannot query by hash directly.
 * For S0: middleware passes the raw hash; we cannot DB-query by hash alone.
 * WORKAROUND (S0): Accept the raw hash, but middleware must also pass the
 * original key via a separate mechanism OR we maintain a hash→key mapping.
 *
 * ACTUAL S0 approach: middleware sends the plaintext key as the ?hash= param
 * since we cannot hash-lookup without keyHash in DB. The "hash" parameter
 * name is kept for interface compatibility; it carries the plaintext key in S0.
 * This is acceptable for S0 as it's an internal loopback call.
 *
 * PR PROPOSAL to T3.6: Add `keyHash String? @unique` index to ApiKey model
 * so middleware can send only the SHA-256 hash (never plaintext over wire).
 * Migration: `ALTER TABLE "ApiKey" ADD COLUMN "keyHash" TEXT;` + backfill.
 *
 * @see src/lib/api-key-hash.ts — edge-safe hash helper
 * @see src/middleware.ts — caller
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ApiTierName } from "@/lib/api-tiers";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// In-memory cache (S0) — keyed by the key hash, TTL 60s
// ---------------------------------------------------------------------------
interface CacheEntry {
  tier: ApiTierName;
  active: boolean;
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60 seconds

// Observability counters
let hits = 0;
let misses = 0;
const LOG_EVERY = 100;

function logStats() {
  if ((hits + misses) % LOG_EVERY === 0) {
    console.info("[keys/lookup]", { hits, misses, cacheSize: cache.size });
  }
}

function getCached(hash: string): CacheEntry | null {
  const entry = cache.get(hash);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(hash);
    return null;
  }
  return entry;
}

function setCached(hash: string, entry: Omit<CacheEntry, "ts">) {
  // Evict stale entries periodically to avoid unbounded growth
  if (cache.size > 5000) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.ts > CACHE_TTL_MS) cache.delete(k);
    }
  }
  cache.set(hash, { ...entry, ts: Date.now() });
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // S0: Guard — require x-internal header
  const internalHeader = request.headers.get("x-internal");
  if (internalHeader !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  // NOTE: In S0, the `hash` param carries the SHA-256 hex of the key.
  // Since DB has no keyHash column, we need the plaintext key for lookup.
  // The middleware sends the hash; we cannot reverse it.
  // S0 WORKAROUND: middleware sends the plaintext key as `key` param,
  // and the hash as `hash` param for logging/cache key purposes.
  // See PR proposal in file header.
  const keyHash = searchParams.get("hash");
  const keyPlaintext = searchParams.get("key");

  if (!keyHash) {
    return NextResponse.json(
      { tier: "FREE" as ApiTierName, active: false },
      { status: 404 }
    );
  }

  // Cache lookup (by hash)
  const cached = getCached(keyHash);
  if (cached) {
    hits++;
    logStats();
    return NextResponse.json(
      { tier: cached.tier, active: cached.active },
      { status: cached.active ? 200 : 404 }
    );
  }

  // If no plaintext key provided, we can't do DB lookup — return FREE
  if (!keyPlaintext) {
    misses++;
    logStats();
    console.warn("[keys/lookup] hash provided but no key for DB lookup — needs keyHash column (see PR proposal)");
    setCached(keyHash, { tier: "FREE", active: false });
    return NextResponse.json({ tier: "FREE" as ApiTierName, active: false }, { status: 404 });
  }

  // DB lookup by plaintext key (S0 only — replace with keyHash in S2)
  misses++;
  logStats();

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: keyPlaintext },
      select: {
        tier: true,
        isActive: true,
        expiresAt: true,
      },
    });

    if (!apiKey) {
      setCached(keyHash, { tier: "FREE", active: false });
      return NextResponse.json(
        { tier: "FREE" as ApiTierName, active: false },
        { status: 404 }
      );
    }

    // Check expiry
    const isActive =
      apiKey.isActive &&
      (apiKey.expiresAt === null || apiKey.expiresAt > new Date());

    const tier = apiKey.tier as ApiTierName;
    setCached(keyHash, { tier, active: isActive });

    return NextResponse.json(
      { tier, active: isActive },
      { status: isActive ? 200 : 404 }
    );
  } catch (err) {
    console.warn("[keys/lookup] DB error during key lookup:", (err as Error).message);
    // Do NOT cache errors — allow retry on next request
    return NextResponse.json(
      { tier: "FREE" as ApiTierName, active: false },
      { status: 500 }
    );
  }
}
