import { NextRequest, NextResponse } from "next/server";
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { checkRateLimit, getRateLimitHeaders, getRateLimitType } from "./rate-limit";
import { redis, getFromCache, setInCache } from "./redis";
import { prisma } from "./db";
import { API_TIERS, type ApiTierName } from "./api-tiers";

/**
 * Cached API key → tier lookup result
 */
interface ApiKeyTierCache {
  id: string;
  tier: ApiTierName;
  perMinute: number;
  perDay: number;
}

/**
 * Per-tier rate limiter instances (keyed by tier name + limit type)
 */
const tierLimiters: Map<string, RateLimiterRedis | RateLimiterMemory> = new Map();

function getTierLimiter(tier: ApiTierName): RateLimiterRedis | RateLimiterMemory {
  const key = `tier:${tier}`;
  if (tierLimiters.has(key)) return tierLimiters.get(key)!;

  const config = API_TIERS[tier];
  const limiter = redis
    ? new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: `ratelimit:tier:${tier}`,
        points: config.rateLimitPerMinute,
        duration: 60,
        blockDuration: 60,
      })
    : new RateLimiterMemory({
        keyPrefix: `ratelimit:tier:${tier}`,
        points: config.rateLimitPerMinute,
        duration: 60,
        blockDuration: 60,
      });

  tierLimiters.set(key, limiter);
  return limiter;
}

/**
 * Look up an API key's tier, using a 60-second Redis cache to avoid DB hits
 * on every request. Returns null if the key is not found or inactive.
 *
 * Uses the denormalized rateLimitPerMinute/rateLimitPerDay fields on ApiKey
 * so per-key overrides (e.g. enterprise custom limits) are respected.
 */
async function getApiKeyTier(apiKey: string): Promise<ApiKeyTierCache | null> {
  const cacheKey = `apikey:${apiKey}`;

  // 1. Try cache
  const cached = await getFromCache<ApiKeyTierCache>(cacheKey);
  if (cached) return cached;

  // 2. DB lookup
  try {
    const record = await prisma.apiKey.findFirst({
      where: { key: apiKey, isActive: true },
      select: { id: true, tier: true, rateLimitPerMinute: true, rateLimitPerDay: true },
    });

    if (!record) return null;

    const tier = (record.tier as ApiTierName) ?? "FREE";
    const result: ApiKeyTierCache = {
      id: record.id,
      tier,
      perMinute: record.rateLimitPerMinute,
      perDay: record.rateLimitPerDay,
    };

    await setInCache(cacheKey, result, 60);
    return result;
  } catch {
    // DB unavailable — fail open, treat as unknown
    return null;
  }
}

/**
 * Increment API usage counter (fire-and-forget, never blocks the request).
 * Uses upsert to increment the daily count for this key+endpoint.
 */
function trackApiUsage(keyId: string, endpoint: string): void {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  prisma.apiUsage
    .upsert({
      where: { keyId_endpoint_date: { keyId, endpoint, date: today } },
      update: { requestCount: { increment: 1 } },
      create: { keyId, endpoint, date: today, requestCount: 1 },
    })
    .catch(() => {
      // Silently ignore — usage tracking must never affect request latency
    });
}

/**
 * Extract client IP from request headers
 * Works with Cloudflare, Railway, and other proxies
 */
export function getClientIP(request: NextRequest): string {
  // Cloudflare is authoritative when in use — trust cf-connecting-ip first
  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-client-ip") || "unknown";
}

// Endpoints that skip rate limiting
const RATE_LIMIT_EXEMPT = [
  "/api/health",
  "/api/sitemap",
];

/**
 * Apply rate limiting to an API request.
 *
 * If an x-api-key header is present, look up the key's tier and enforce
 * tier-specific per-minute limits (keyed by the API key string).
 * If no API key is present, fall back to IP-based limits.
 *
 * Returns null if the request is allowed, or a 429 NextResponse if limited.
 */
export async function applyRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;

  // Skip rate limiting for exempt endpoints
  if (RATE_LIMIT_EXEMPT.some((p) => pathname.startsWith(p))) {
    return null;
  }

  // --- Tier-based rate limiting for authenticated API key requests ---
  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader) {
    const tierInfo = await getApiKeyTier(apiKeyHeader);
    if (tierInfo) {
      const limiter = getTierLimiter(tierInfo.tier);
      try {
        await limiter.consume(apiKeyHeader);
        // Fire-and-forget usage tracking (keyed by ApiKey.id + endpoint)
        trackApiUsage(tierInfo.id, pathname);
        return null; // allowed
      } catch (error) {
        if (error instanceof RateLimiterRes) {
          const retryAfter = Math.ceil(error.msBeforeNext / 1000);
          return NextResponse.json(
            {
              error: "Too Many Requests",
              message: `Rate limit exceeded for your ${tierInfo.tier} tier (${tierInfo.perMinute} req/min). Please wait ${retryAfter} seconds.`,
              tier: tierInfo.tier,
            },
            {
              status: 429,
              headers: {
                "Retry-After": String(retryAfter),
                "X-RateLimit-Limit": String(tierInfo.perMinute),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": String(retryAfter),
                "X-RateLimit-Tier": tierInfo.tier,
              },
            }
          );
        }
        // Limiter error — fail open, fall through to IP-based check
      }
    }
    // Unknown/invalid API key — fall through to IP-based limits
  }

  // --- IP-based rate limiting (unauthenticated / same-origin requests) ---
  const clientIP = getClientIP(request);
  const limitType = getRateLimitType(pathname);

  const result = await checkRateLimit(clientIP, limitType);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: `Rate limit exceeded. Please wait ${result.retryAfter} seconds.`,
      },
      {
        status: 429,
        headers: getRateLimitHeaders(result),
      }
    );
  }

  // Return null to indicate request is allowed
  // The rate limit headers will be added by the route handler
  return null;
}

/**
 * Add rate limit headers to a successful response
 */
export async function withRateLimitHeaders(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const clientIP = getClientIP(request);
  const pathname = request.nextUrl.pathname;
  const limitType = getRateLimitType(pathname);

  // Get current rate limit status (without consuming another point)
  // Note: This is a simplified version - ideally we'd get this from the initial check
  const headers = {
    "X-RateLimit-Policy": limitType,
  };

  // Add headers to response
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Allowed origins for CORS
 */
const ALLOWED_ORIGINS = [
  "https://trafico.live",
  "http://localhost:3000",
  "http://localhost:3001",
];

/**
 * Get CORS origin header based on request origin
 */
export function getCORSOrigin(requestOrigin: string | null): string {
  if (!requestOrigin) return ALLOWED_ORIGINS[0];
  if (ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin;
  // Allow subdomains of allowed origins
  const isAllowedSubdomain = ALLOWED_ORIGINS.some((allowed) => {
    const domain = allowed.replace(/^https?:\/\//, "");
    return requestOrigin.endsWith(`.${domain}`) || requestOrigin.endsWith(`://${domain}`);
  });
  if (isAllowedSubdomain) return requestOrigin;
  return ALLOWED_ORIGINS[0];
}

/**
 * CORS headers for API responses
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://trafico.live",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

/**
 * Add security headers to API response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  return response;
}

/**
 * Handle OPTIONS request for CORS preflight
 */
export function handleCORSPreflight(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
