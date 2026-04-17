import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateRequest } from "./lib/auth";
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

// ---------------------------------------------------------------------------
// Tier detection helpers (S0 — logging/annotation only, no enforcement)
// ---------------------------------------------------------------------------

/**
 * Look up the tier for an API key via the internal Route Handler.
 * Uses an in-memory cache keyed on the SHA-256 hash of the key (60s TTL)
 * to avoid calling the internal route on every request.
 *
 * Falls back to FREE on any error or missing key — never throws.
 */
interface TierCacheEntry {
  tier: ApiTierName;
  ts: number;
}

const tierCache = new Map<string, TierCacheEntry>();
const TIER_CACHE_TTL_MS = 60_000;
const TIER_LOOKUP_TIMEOUT_MS = 500; // stay fast — fallback to FREE if slow

async function lookupTier(
  apiKey: string,
  origin: string
): Promise<{ tier: ApiTierName; source: "key" | "fallback" }> {
  const hash = await hashApiKey(apiKey);

  // In-memory cache check
  const cached = tierCache.get(hash);
  if (cached && Date.now() - cached.ts < TIER_CACHE_TTL_MS) {
    return { tier: cached.tier, source: "key" };
  }

  try {
    // AbortController for timeout guard
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), TIER_LOOKUP_TIMEOUT_MS);

    const url = `${origin}/api/internal/keys/lookup?hash=${encodeURIComponent(hash)}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      headers: { "x-internal": "1" },
      signal: ac.signal,
    });
    clearTimeout(timeout);

    if (res.ok || res.status === 404) {
      const data = (await res.json()) as { tier: ApiTierName; active: boolean };
      const tier: ApiTierName = data?.tier ?? "FREE";
      // Cache even 404/inactive results to prevent hammering DB with bad keys
      tierCache.set(hash, { tier, ts: Date.now() });
      // Evict oversized cache
      if (tierCache.size > 5000) {
        const now = Date.now();
        for (const [k, v] of tierCache.entries()) {
          if (now - v.ts > TIER_CACHE_TTL_MS) tierCache.delete(k);
        }
      }
      return { tier, source: "key" };
    }

    console.warn("[middleware][tier] lookup returned status", res.status);
    return { tier: "FREE", source: "fallback" };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("[middleware][tier] lookup error:", errMsg);
    return { tier: "FREE", source: "fallback" };
  }
}

/**
 * Annotate a response with x-tier and x-tier-source headers.
 * Called only for /api/* paths after auth passes.
 * Never throws — on any failure, sets tier to FREE and source to fallback.
 */
async function annotateTier(
  request: NextRequest,
  response: NextResponse
): Promise<void> {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    response.headers.set("x-tier", "FREE");
    response.headers.set("x-tier-source", "default");
    return;
  }

  try {
    const origin = request.nextUrl.origin;
    const { tier, source } = await lookupTier(apiKey, origin);
    response.headers.set("x-tier", tier);
    response.headers.set("x-tier-source", source);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("[middleware][tier] annotateTier failed:", errMsg);
    response.headers.set("x-tier", "FREE");
    response.headers.set("x-tier-source", "fallback");
  }
}

// ---------------------------------------------------------------------------

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

  // API authentication (only for /api/* routes)
  if (pathname.startsWith("/api/")) {
    const authResponse = authenticateRequest(request);
    if (authResponse) return authResponse;
  }

  /* === S0 T4.1 tier detection (logging only) === */
  // Annotate API requests with x-tier header based on the provided API key.
  // This block is LOGGING ONLY — no enforcement, no rate limiting (those are S2).
  // T4.10 will add enforcement logic after this block in a later sprint.
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    await annotateTier(request, response);
    return response;
  }
  /* === end S0 T4.1 === */

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths including API routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
