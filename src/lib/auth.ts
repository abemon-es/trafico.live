import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "trafico.live",
  "trafico.logisticsexpress.es",
  "localhost:3000",
  "localhost:3001",
];

// Endpoints that bypass auth (monitoring, health checks)
const AUTH_EXEMPT = ["/api/health", "/api/cron/", "/api/sitemap"];

/**
 * Check if request is same-origin (browser on same domain)
 */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || "";

  // No origin header = same-origin request from browser
  if (!origin) return true;

  // Check if origin matches host
  try {
    const originHost = new URL(origin).host;
    return originHost === host || ALLOWED_HOSTS.includes(originHost);
  } catch {
    return false;
  }
}

/**
 * Validate API key from header
 */
function hasValidApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return false;

  const validKeys = process.env.API_KEYS?.split(",").map((k) => k.trim()) || [];
  return validKeys.includes(apiKey);
}

/**
 * Check if endpoint is exempt from auth
 */
function isExempt(pathname: string): boolean {
  return AUTH_EXEMPT.some((p) => pathname.startsWith(p));
}

/**
 * Authenticate API request
 * Returns null if allowed, or 401 response if blocked
 */
export function authenticateRequest(
  request: NextRequest
): NextResponse | null {
  const pathname = request.nextUrl.pathname;

  // Skip auth for exempt endpoints
  if (isExempt(pathname)) return null;

  // Allow same-origin OR valid API key
  if (isSameOrigin(request) || hasValidApiKey(request)) {
    return null;
  }

  return NextResponse.json(
    { error: "Unauthorized", message: "API access requires authentication" },
    { status: 401 }
  );
}
