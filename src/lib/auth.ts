import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";

const ALLOWED_HOSTS = [
  "trafico.live",
  "trafico.logisticsexpress.es",
  "localhost:3000",
  "localhost:3001",
];

// Endpoints that bypass auth (monitoring, health checks, public datasets)
const AUTH_EXEMPT = ["/api/health", "/api/cron/", "/api/sitemap", "/api/sobre/citaciones-ia", "/api/newsletter/subscribe"];

/**
 * Check if a request is genuinely same-origin.
 *
 * IMPORTANT — security history:
 * The previous implementation returned `true` whenever the `Origin` header
 * was missing, on the (wrong) assumption that "no Origin = browser same-origin
 * request". That assumption is false: browsers omit `Origin` on plain
 * navigations and same-origin GETs, but so do `curl`, `wget`, `python
 * requests`, and every scripted client on the planet. The net effect was
 * that every API endpoint guarded by the same-origin check was de facto
 * unauthenticated from the network.
 *
 * New rule: a missing `Origin` header is treated as NOT same-origin. The
 * trade-off is that some legacy server-rendered fetches inside this app
 * may break if they rely on the implicit same-origin bypass — those need
 * to either set an explicit `x-api-key` header or be moved behind the
 * `x-internal-*` allowlist.
 */
function isSameOrigin(request: NextRequest): boolean {
  // Origin header is the strongest signal — present on cross-origin requests
  // and on all non-GET requests. Browsers (Chrome/Edge) omit it on same-origin
  // GET fetches, so we fall back to Referer when Origin is absent.
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const candidate = origin || referer;
  if (!candidate) return false;

  const host = request.headers.get("host") || "";
  try {
    const candidateHost = new URL(candidate).host;
    return candidateHost === host || ALLOWED_HOSTS.includes(candidateHost);
  } catch {
    return false;
  }
}

/**
 * Constant-time string comparison via SHA-256 hashing so the buffers are
 * always equal length regardless of input. Use for any secret comparison
 * (API keys, admin secrets, internal-API tokens) to avoid leaking the
 * correct value via timing oracle attacks.
 */
export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Validate API key from header. Constant-time compare against each allowed
 * key (small N — typically <10 entries in API_KEYS).
 */
function hasValidApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return false;

  const validKeys =
    process.env.API_KEYS?.split(",")
      .map((k) => k.trim())
      .filter(Boolean) ?? [];
  return validKeys.some((k) => safeCompare(k, apiKey));
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
