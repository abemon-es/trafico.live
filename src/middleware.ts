import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateRequest } from "./lib/auth";
import { enforceTier, buildDenyResponse } from "./lib/tier-enforcement";
import { hashApiKey } from "./lib/api-key-hash";
import type { ApiTierName } from "./lib/api-tiers";

const CANONICAL_DOMAIN = "trafico.live";
const CANONICAL_ORIGIN = "https://trafico.live";
const LEGACY_DOMAINS = [
  "trafico.abemon.es",
];

// In-memory slug resolution cache (lives for the lifetime of the edge worker)
const slugCache = new Map<string, string | null>();

/**
 * Resolve a municipality or city slug to its full /espana/... path.
 * Uses the internal API to avoid direct Prisma imports in middleware (edge runtime).
 */
async function resolveSlugToGeoPath(
  slug: string,
  origin: string
): Promise<string | null> {
  const cached = slugCache.get(slug);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(
      `${origin}/api/geo/resolve?slug=${encodeURIComponent(slug)}`,
      { headers: { "x-internal": "1" }, next: { revalidate: 3600 } }
    );
    if (!res.ok) {
      slugCache.set(slug, null);
      return null;
    }
    const data = await res.json();
    if (data?.path) {
      slugCache.set(slug, data.path);
      return data.path;
    }
    slugCache.set(slug, null);
    return null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.replace(/:\d+$/, "") || "";
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  // Redirect legacy domains → trafico.live
  const isLegacy = LEGACY_DOMAINS.some(
    (d) => hostname === d || hostname === `www.${d}`
  );
  if (isLegacy) {
    return NextResponse.redirect(`${CANONICAL_ORIGIN}${pathname}${search}`, 301);
  }

  // Redirect www → apex
  if (hostname === `www.${CANONICAL_DOMAIN}`) {
    return NextResponse.redirect(`${CANONICAL_ORIGIN}${pathname}${search}`, 301);
  }

  // -----------------------------------------------------------------------
  // Geographic slug resolution: /ciudad/:slug and /municipio/:slug → /espana/...
  // -----------------------------------------------------------------------
  const cityMatch = pathname.match(/^\/(ciudad|municipio)\/([^/]+)$/);
  if (cityMatch) {
    const slug = cityMatch[2];
    const origin = request.nextUrl.origin;
    const geoPath = await resolveSlugToGeoPath(slug, origin);
    if (geoPath) {
      return NextResponse.redirect(`${origin}${geoPath}${search}`, 301);
    }
    // If slug not found, let it fall through to the existing page (or 404)
  }

  // /provincias/:code → needs province code → slug resolution
  const provMatch = pathname.match(/^\/provincias\/([^/]+)$/);
  if (provMatch) {
    const code = provMatch[1];
    const origin = request.nextUrl.origin;
    const geoPath = await resolveSlugToGeoPath(`_province:${code}`, origin);
    if (geoPath) {
      return NextResponse.redirect(`${origin}${geoPath}${search}`, 301);
    }
  }

  /* === S0 T4.1 tier detection (logging only) === */
  // Read x-tier header forwarded by upstream (e.g. Traefik plugin or API-key
  // lookup middleware in a future pass). Defaults to FREE for all requests
  // that don't carry a valid tier claim. The header is intentionally
  // untrusted here — enforcement happens in S2 below.
  const rawTier = request.headers.get("x-tier")?.toUpperCase() as ApiTierName | null;
  const VALID_TIERS_SET = new Set<ApiTierName>(["FREE", "PRO", "ENTERPRISE"]);
  const detectedTier: ApiTierName =
    rawTier && VALID_TIERS_SET.has(rawTier) ? rawTier : "FREE";

  if (pathname.startsWith("/api/")) {
    console.debug(`[S0 tier-detect] ${pathname} → ${detectedTier}`);
  }
  /* === end S0 T4.1 === */

  /* === S2 T4.1d tier enforcement (live) === */
  // Paths that bypass tier enforcement (monitoring, auth flows, billing
  // webhooks, internal cross-service calls).
  const TIER_EXEMPT_PREFIXES = [
    "/api/health",
    "/api/auth/",
    "/api/billing/webhook",
    "/api/internal/",
  ];

  const isTierEnforceable =
    pathname.startsWith("/api/") &&
    !TIER_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));

  if (isTierEnforceable) {
    try {
      // Build identifier: hashed API key if present, else IP address.
      const rawApiKey = request.headers.get("x-api-key");
      let identifier: string;
      if (rawApiKey) {
        identifier = `key:${await hashApiKey(rawApiKey)}`;
      } else {
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          (request as NextRequest & { ip?: string }).ip ||
          "unknown";
        identifier = `ip:${ip}`;
      }

      const result = await enforceTier({
        pathname,
        tier: detectedTier,
        identifier,
        internalOrigin: request.nextUrl.origin,
      });

      if (!result.allow) {
        return buildDenyResponse(result.reason!, result.details);
      }

      // Allowed — stash rate-limit headers as x-ratelimit-* request headers so
      // downstream API route handlers can echo them in their own responses.
      // NextResponse.next({ headers }) sets *request* headers visible to route
      // handlers — this is the correct edge-middleware pattern for passing
      // metadata to handlers without short-circuiting the response.
      if (result.rateLimitHeaders && Object.keys(result.rateLimitHeaders).length > 0) {
        // S1 still needs to run after this; we fall through and let the final
        // NextResponse.next() at the end of the function carry the headers.
        // Store them on the request headers for the route handler.
        const requestHeaders = new Headers(request.headers);
        for (const [k, v] of Object.entries(result.rateLimitHeaders)) {
          // Forward as lowercase x- prefixed headers (e.g. x-x-ratelimit-limit).
          // Route handlers can read these and re-emit as response headers.
          requestHeaders.set(k.toLowerCase(), v);
        }
        // If S1 would block the request, we still want that 401, so we cannot
        // return here. Instead, run S1 inline with the augmented headers and
        // return the appropriate response.
        const authResponse = authenticateRequest(request);
        if (authResponse) {
          // Auth denied — return 401 (RL headers are not relevant here).
          return authResponse;
        }
        // Auth passed — return next() with RL headers on the response.
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    } catch (err) {
      // Fail open — never 500 the API due to enforcement bugs.
      console.warn("[S2 tier-enforcement] Unexpected error — fail open:", err);
    }
  }
  /* === end S2 T4.1d === */

  /* === S1 T4.10 auth gate === */
  // API authentication (only for /api/* routes)
  if (pathname.startsWith("/api/")) {
    const authResponse = authenticateRequest(request);
    if (authResponse) return authResponse;
  }
  /* === end S1 T4.10 === */

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths including API routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
