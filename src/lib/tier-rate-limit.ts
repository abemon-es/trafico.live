/**
 * Tier-aware Redis rate limiter
 *
 * Provides per-tier, per-bucket (minute / day) sliding window rate limiting
 * using `rate-limiter-flexible` backed by Redis.
 *
 * Key schema: `rl:{TIER}:{bucket}:{identifierHash}`
 *  - TIER        : FREE | PRO | ENTERPRISE
 *  - bucket      : minute | day
 *  - identifierHash : SHA-256 hex of the API key (never plaintext)
 *
 * Fail-open policy:
 *  - Redis unavailable → falls back to RateLimiterMemory
 *  - Any unexpected error → allows the request and returns remaining: -1
 *    (better to serve than 500 the entire API)
 */

import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { redis } from "@/lib/redis";
import { API_TIERS, type ApiTierName } from "@/lib/api-tiers";

// ── Types ────────────────────────────────────────────────────────────────────

export type RateLimitBucket = "minute" | "day";

export interface TierRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

// ── Limiter cache ─────────────────────────────────────────────────────────────

const LIMITER_CACHE = new Map<string, RateLimiterRedis | RateLimiterMemory>();

function getLimiterCacheKey(tier: ApiTierName, bucket: RateLimitBucket): string {
  return `${tier}:${bucket}`;
}

/**
 * Build (or retrieve cached) rate limiter for a tier × bucket combination.
 * ENTERPRISE has `rateLimitPerDay === Number.MAX_SAFE_INTEGER` — treated as unlimited.
 */
function getLimiter(
  tier: ApiTierName,
  bucket: RateLimitBucket,
): RateLimiterRedis | RateLimiterMemory {
  const cacheKey = getLimiterCacheKey(tier, bucket);
  const cached = LIMITER_CACHE.get(cacheKey);
  if (cached) return cached;

  const config = API_TIERS[tier];
  const points =
    bucket === "minute" ? config.rateLimitPerMinute : config.rateLimitPerDay;

  // ENTERPRISE unlimited: use a very high cap instead of MAX_SAFE_INTEGER
  // (rate-limiter-flexible stores points in Redis as a number; MAX_SAFE_INTEGER
  //  is safe for JS but we normalise to 10M to keep Redis storage sane)
  const effectivePoints = points >= Number.MAX_SAFE_INTEGER ? 10_000_000 : points;
  const duration = bucket === "minute" ? 60 : 86_400; // seconds

  const keyPrefix = `rl:${tier}:${bucket}`;

  let limiter: RateLimiterRedis | RateLimiterMemory;

  if (redis) {
    limiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix,
      points: effectivePoints,
      duration,
      // No blockDuration — we respond with 429 and Retry-After ourselves.
      blockDuration: 0,
    });
  } else {
    console.warn(`[tier-rate-limit] Redis unavailable — using in-memory limiter for ${tier}:${bucket}`);
    limiter = new RateLimiterMemory({
      keyPrefix,
      points: effectivePoints,
      duration,
      blockDuration: 0,
    });
  }

  LIMITER_CACHE.set(cacheKey, limiter);
  return limiter;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check (and consume 1 point from) the rate limit for an identifier.
 *
 * @param tier        - Resolved API tier
 * @param identifier  - SHA-256 hex hash of the API key (never log/store plaintext)
 * @param bucket      - "minute" or "day" window
 */
export async function checkTierRateLimit({
  tier,
  identifier,
  bucket,
}: {
  tier: ApiTierName;
  identifier: string;
  bucket: RateLimitBucket;
}): Promise<TierRateLimitResult> {
  // ENTERPRISE shortcut — always allow, skip Redis round-trip
  if (tier === "ENTERPRISE") {
    return {
      allowed: true,
      remaining: Number.MAX_SAFE_INTEGER,
      resetAt: new Date(Date.now() + (bucket === "minute" ? 60_000 : 86_400_000)),
    };
  }

  const limiter = getLimiter(tier, bucket);
  // Key: rl:{TIER}:{bucket}:{identifierHash}
  // The keyPrefix already contains tier+bucket; we append the hash.
  const key = identifier;

  try {
    const res = await limiter.consume(key);
    const msUntilReset = res.msBeforeNext ?? 0;
    return {
      allowed: true,
      remaining: res.remainingPoints ?? 0,
      resetAt: new Date(Date.now() + msUntilReset),
    };
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      // Limit exceeded — this is the normal "blocked" path, not an error
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + err.msBeforeNext),
      };
    }

    // Unexpected error (Redis down mid-request, etc.) → fail open
    console.warn(
      `[tier-rate-limit] Unexpected error for tier=${tier} bucket=${bucket}, failing open:`,
      err instanceof Error ? err.message : err,
    );
    return {
      allowed: true,
      remaining: -1,
      resetAt: new Date(Date.now() + (bucket === "minute" ? 60_000 : 86_400_000)),
    };
  }
}
