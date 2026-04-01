import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitHeaders, getRateLimitType } from "./rate-limit";

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
 * Apply rate limiting to an API request
 * Returns null if allowed, or a 429 response if rate limited
 */
export async function applyRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;

  // Skip rate limiting for exempt endpoints
  if (RATE_LIMIT_EXEMPT.some((p) => pathname.startsWith(p))) {
    return null;
  }

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
