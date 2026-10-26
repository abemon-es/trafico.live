import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";

const ALLOWED_HOSTS = [
  "trafico.live",
  "trafico.logisticsexpress.es",
  "localhost:3000",
  "localhost:3001",
];

// Endpoints that bypass auth (monitoring, health checks, public datasets)
const AUTH_EXEMPT = ["/api/health", "/api/cron/", "/api/sitemap", "/api/newsletter/subscribe"];

// Exempt for GET only, exact path. /api/geo/resolve is the middleware's
// slug → /espana/... lookup for the /provincias/<code> and /municipio/<slug>
// redirects. Its fetch carries no Origin or API key, so this gate answered
// 401 and those redirects never ran (both served duplicate pages until
// 2026-10-19). It is read-only and returns only {path} (or 404), a mapping
// that is already public through the sitemaps.
const AUTH_EXEMPT_GET = ["/api/geo/resolve"];

// The digest's confirm and unsubscribe links are opened from a mail client
// (no Origin, a foreign Referer or none) and the one-click unsubscribe is a
// POST from the mail provider's servers, so this gate answered 401 to every
// one of them. Each request carries the subscriber's unguessable token, and
// the route acts only on the row that token names.
const AUTH_EXEMPT_EXACT = ["/api/digest/confirm", "/api/digest/unsubscribe"];

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
function isExempt(pathname: string, method: string): boolean {
  return (
    AUTH_EXEMPT.some((p) => pathname.startsWith(p)) ||
    AUTH_EXEMPT_EXACT.includes(pathname) ||
    (method === "GET" && AUTH_EXEMPT_GET.includes(pathname))
  );
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
  if (isExempt(pathname, request.method)) return null;

  // Allow same-origin OR valid API key
  if (isSameOrigin(request) || hasValidApiKey(request)) {
    return null;
  }

  return NextResponse.json(
    { error: "Unauthorized", message: "API access requires authentication" },
    { status: 401 }
  );
}
