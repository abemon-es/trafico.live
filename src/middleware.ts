import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateRequest } from "./lib/auth";

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

  // API authentication (only for /api/* routes)
  if (pathname.startsWith("/api/")) {
    const authResponse = authenticateRequest(request);
    if (authResponse) return authResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths including API routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
