/**
 * Tier-based chat rate limiter for the trafico.live assistant.
 *
 * Limits:
 *   FREE       → 10 conversations/day
 *   PRO        → 100 conversations/day
 *   ENTERPRISE → 1000 conversations/day
 *
 * Uses Redis with in-memory fallback.
 */

import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { redis } from "./redis";
import type { ApiTierName } from "./api-tiers";

// ─── Tier limits ──────────────────────────────────────────────────────────────

const CHAT_LIMITS: Record<ApiTierName, number> = {
  FREE: 10,
  PRO: 100,
  ENTERPRISE: 1000,
};

// TTL = 24h so points reset daily
const DURATION_SECONDS = 24 * 60 * 60;

// ─── Rate limiter instances (lazy, per-tier) ───────────────────────────────────

const limiters = new Map<ApiTierName, RateLimiterRedis | RateLimiterMemory>();

function getLimiter(tier: ApiTierName): RateLimiterRedis | RateLimiterMemory {
  if (limiters.has(tier)) return limiters.get(tier)!;

  const points = CHAT_LIMITS[tier];

  const limiter = redis
    ? new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: `chat:rl:${tier}`,
        points,
        duration: DURATION_SECONDS,
        blockDuration: 0, // Don't block, just reject
      })
    : new RateLimiterMemory({
        keyPrefix: `chat:rl:${tier}`,
        points,
        duration: DURATION_SECONDS,
        blockDuration: 0,
      });

  limiters.set(tier, limiter);
  return limiter;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ChatRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Check (and consume) one chat request from the tier daily quota.
 * The `identifier` is typically an IP address or hashed user ID.
 */
export async function checkChatRateLimit(params: {
  identifier: string;
  tier: ApiTierName;
}): Promise<ChatRateLimitResult> {
  const { identifier, tier } = params;
  const limit = CHAT_LIMITS[tier];
  const limiter = getLimiter(tier);

  // Rate limit key = tier:identifier so different tiers don't share quotas
  const key = `${tier}:${identifier}`;

  try {
    const result = await limiter.consume(key, 1);
    const resetAt = new Date(Date.now() + result.msBeforeNext);

    return {
      allowed: true,
      limit,
      remaining: result.remainingPoints,
      resetAt,
    };
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      const resetAt = new Date(Date.now() + err.msBeforeNext);
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt,
      };
    }

    // On unexpected error — fail open so users aren't blocked by Redis issues
    console.error("[ChatRateLimit] Unexpected error:", err);
    return {
      allowed: true,
      limit,
      remaining: 1,
      resetAt: new Date(Date.now() + DURATION_SECONDS * 1000),
    };
  }
}

/**
 * Peek at the current state without consuming a point.
 * Useful for UI status display.
 */
export async function getChatRateLimitStatus(params: {
  identifier: string;
  tier: ApiTierName;
}): Promise<ChatRateLimitResult> {
  const { identifier, tier } = params;
  const limit = CHAT_LIMITS[tier];
  const limiter = getLimiter(tier);
  const key = `${tier}:${identifier}`;

  try {
    const result = await limiter.get(key);
    if (!result) {
      // No record = quota not started yet
      return {
        allowed: true,
        limit,
        remaining: limit,
        resetAt: new Date(Date.now() + DURATION_SECONDS * 1000),
      };
    }

    const remaining = result.remainingPoints;
    const resetAt = new Date(Date.now() + result.msBeforeNext);

    return {
      allowed: remaining > 0,
      limit,
      remaining,
      resetAt,
    };
  } catch {
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt: new Date(Date.now() + DURATION_SECONDS * 1000),
    };
  }
}

export { CHAT_LIMITS };
