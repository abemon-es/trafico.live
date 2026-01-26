import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { redis } from "./redis";

// Rate limit configurations
const RATE_LIMITS = {
  // Standard API requests: 100 requests per minute per IP
  api: {
    points: 100,
    duration: 60, // seconds
    blockDuration: 60, // block for 1 minute if exceeded
  },
  // Stricter limit for expensive endpoints (search, aggregations)
  expensive: {
    points: 30,
    duration: 60,
    blockDuration: 120,
  },
  // Very strict for potential abuse vectors
  strict: {
    points: 10,
    duration: 60,
    blockDuration: 300, // 5 minute block
  },
} as const;

type RateLimitType = keyof typeof RATE_LIMITS;

// Create rate limiters - use Redis if available, fallback to memory
const rateLimiters: Record<RateLimitType, RateLimiterRedis | RateLimiterMemory> = {} as Record<
  RateLimitType,
  RateLimiterRedis | RateLimiterMemory
>;

function createRateLimiter(type: RateLimitType): RateLimiterRedis | RateLimiterMemory {
  const config = RATE_LIMITS[type];

  if (redis) {
    return new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `ratelimit:${type}`,
      points: config.points,
      duration: config.duration,
      blockDuration: config.blockDuration,
    });
  }

  // Fallback to in-memory rate limiter (less reliable but works without Redis)
  console.warn(`[RateLimit] Using in-memory rate limiter for ${type} (Redis unavailable)`);
  return new RateLimiterMemory({
    keyPrefix: `ratelimit:${type}`,
    points: config.points,
    duration: config.duration,
    blockDuration: config.blockDuration,
  });
}

// Initialize rate limiters
for (const type of Object.keys(RATE_LIMITS) as RateLimitType[]) {
  rateLimiters[type] = createRateLimiter(type);
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // seconds until reset
  retryAfter?: number; // seconds to wait if blocked
}

/**
 * Check rate limit for a given key (usually IP address)
 */
export async function checkRateLimit(
  key: string,
  type: RateLimitType = "api"
): Promise<RateLimitResult> {
  const limiter = rateLimiters[type];
  const config = RATE_LIMITS[type];

  try {
    const result = await limiter.consume(key);
    return {
      success: true,
      limit: config.points,
      remaining: result.remainingPoints,
      reset: Math.ceil(result.msBeforeNext / 1000),
    };
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      return {
        success: false,
        limit: config.points,
        remaining: 0,
        reset: Math.ceil(error.msBeforeNext / 1000),
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
      };
    }
    // On error, allow the request (fail open)
    console.error("[RateLimit] Error checking rate limit:", error);
    return {
      success: true,
      limit: config.points,
      remaining: config.points,
      reset: 0,
    };
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };

  if (result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Determine rate limit type based on endpoint
 */
export function getRateLimitType(pathname: string): RateLimitType {
  // Expensive endpoints - aggregations, search, statistics
  const expensivePatterns = [
    "/api/roads/catalog",
    "/api/stats",
    "/api/rankings",
    "/api/historico",
    "/api/espana",
  ];

  // Strict endpoints - could be abused
  const strictPatterns = [
    "/api/gas-stations/cheapest",
  ];

  if (strictPatterns.some((p) => pathname.startsWith(p))) {
    return "strict";
  }

  if (expensivePatterns.some((p) => pathname.startsWith(p))) {
    return "expensive";
  }

  return "api";
}

export { RATE_LIMITS };
