import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateRequest } from "./lib/auth";
import { PROVINCE_SLUG_TO_COMMUNITY_SLUG } from "./lib/geo/province-slugs";
// S0 launch: T4.1c tier enforcement disabled in middleware — uses
// rate-limiter-flexible which is not Edge-runtime compatible. Enforcement
// will move to Node API route handlers in S1. See src/lib/tier-enforcement.ts.

const CANONICAL_DOMAIN = "trafico.live";
const CANONICAL_ORIGIN = "https://trafico.live";
const LEGACY_DOMAINS = [
  "trafico.abemon.es",
];

// In-memory slug → /espana path cache (lives for the lifetime of the edge
// worker). Only resolved paths are stored, and at most SLUG_CACHE_MAX: there
// are ~8,150 real slugs, and unknown ones are never cached, so random slugs
// cannot grow it. Insertion order makes the first key the oldest.
const SLUG_CACHE_MAX = 10_000;
const slugCache = new Map<string, string>();

// AI / LLM / search-engine crawler fingerprints. Match against the User-Agent
// string and log to stdout so Loki ingests one structured line per AI crawl.
// Order matters: earlier patterns win (label precedence). Patterns are
// lowercased ASCII substring matches — case-insensitive comparison done
// against the lowercased UA below.
const AI_BOT_FINGERPRINTS: Array<{ name: string; needle: string }> = [
  { name: "GPTBot", needle: "gptbot" },
  { name: "ChatGPT-User", needle: "chatgpt-user" },
  { name: "OAI-SearchBot", needle: "oai-searchbot" },
  { name: "ClaudeBot", needle: "claudebot" },
  { name: "Claude-Web", needle: "claude-web" },
  { name: "Anthropic-AI", needle: "anthropic-ai" },
  { name: "PerplexityBot", needle: "perplexitybot" },
  { name: "Perplexity-User", needle: "perplexity-user" },
  { name: "Google-Extended", needle: "google-extended" },
  { name: "GoogleOther", needle: "googleother" },
  { name: "Applebot-Extended", needle: "applebot-extended" },
  { name: "Applebot", needle: "applebot" },
  { name: "Bytespider", needle: "bytespider" },
  { name: "CCBot", needle: "ccbot" },
  { name: "DuckAssistBot", needle: "duckassistbot" },
  { name: "MistralAI-User", needle: "mistralai-user" },
  { name: "cohere-ai", needle: "cohere-ai" },
  { name: "Diffbot", needle: "diffbot" },
];

function detectAiBot(userAgent: string): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  for (const { name, needle } of AI_BOT_FINGERPRINTS) {
    if (ua.includes(needle)) return name;
  }
  return null;
}


// Province slug → community slug: the footer's "Provincias" row links
// /espana/<province>, but that segment resolves community slugs — and an
// in-page redirect proved unreliable under ISR (the cached soft-404 kept being
// served). Middleware is cache-proof. The map lives in lib/geo so the
// sitemaps list the same canonical URLs.
const PROVINCE_TO_COMMUNITY = PROVINCE_SLUG_TO_COMMUNITY_SLUG;

/**
 * Resolve a municipality or city slug to its full /espana/... path.
 * Uses the internal API to avoid direct Prisma imports in middleware (edge runtime).
 */
// The resolver is called on this same server, not through the public URL: the
// edge allows 5 r/s per IP and everything leaving compute shares one IP, so a
// crawl of /municipio/* would have rate-limited its own redirects.
const INTERNAL_ORIGIN = process.env.INTERNAL_ORIGIN || `http://127.0.0.1:${process.env.PORT || 3000}`;

async function resolveSlugToGeoPath(slug: string): Promise<string | null> {
  const cached = slugCache.get(slug);
  if (cached !== undefined) return cached;

  // Any failure (unknown slug, timeout, 5xx) means "no redirect": the request
  // falls through to the page exactly as before, and nothing is cached.
  try {
    const res = await fetch(
      `${INTERNAL_ORIGIN}/api/geo/resolve?slug=${encodeURIComponent(slug)}`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { path?: unknown };
    if (typeof data?.path !== "string" || !data.path.startsWith("/espana/")) return null;
    if (slugCache.size >= SLUG_CACHE_MAX) {
      const oldest = slugCache.keys().next().value;
      if (oldest !== undefined) slugCache.delete(oldest);
    }
    slugCache.set(slug, data.path);
    return data.path;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.replace(/:\d+$/, "") || "";
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  // Pages answer GET/HEAD only. The site has no Server Actions, so any other
  // method on a page is a probe; it used to reach Next's action handler and
  // come back as a 500 ("Server Reference ID did not match", scanner POSTs to
  // / on 2026-10-19 05:50Z). /api/* keeps its own methods, and /monitoring is
  // the Sentry tunnel (browser POSTs).
  const method = request.method;
  if (
    method !== "GET" &&
    method !== "HEAD" &&
    method !== "OPTIONS" &&
    !pathname.startsWith("/api/") &&
    pathname !== "/monitoring"
  ) {
    return new NextResponse(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  // AI/LLM crawler observability — emit one structured line per visit so we
  // can see what bots are reading on the site (Loki dashboards). Skip static
  // asset paths to keep the signal-to-noise high.
  const userAgent = request.headers.get("user-agent") ?? "";
  const isAssetPath =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname === "/favicon.ico" ||
    /\.(png|jpe?g|webp|gif|svg|css|js|ico|map|woff2?|ttf)$/i.test(pathname);
  if (!isAssetPath) {
    const botName = detectAiBot(userAgent);
    if (botName) {
      const country =
        request.headers.get("cf-ipcountry") ||
        request.headers.get("x-vercel-ip-country") ||
        "?";
      console.log(
        JSON.stringify({
          evt: "ai_bot_visit",
          bot: botName,
          path: pathname,
          host: hostname,
          country,
          referer: request.headers.get("referer") ?? null,
          ua: userAgent.slice(0, 200),
        })
      );
      // This Loki line is the only record. The per-visit write to
      // /api/internal/bot-visit was removed on 2026-10-19: it never stored a
      // row (our own API auth returned 401 to it) and was attack surface.
    }
  }

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

  // /espana/<province-slug> → canonical /espana/<community>/<province>
  const provSlugMatch = pathname.match(/^\/espana\/([^/]+)$/);
  if (provSlugMatch) {
    const community = PROVINCE_TO_COMMUNITY[provSlugMatch[1]];
    if (community && community !== provSlugMatch[1]) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/espana/${community}/${provSlugMatch[1]}${search}`,
        301
      );
    }
  }

  // -----------------------------------------------------------------------
  // Geographic slug resolution: /ciudad/:slug and /municipio/:slug → /espana/...
  // -----------------------------------------------------------------------
  const cityMatch = pathname.match(/^\/(ciudad|municipio)\/([^/]+)$/);
  if (cityMatch) {
    const slug = cityMatch[2];
    const origin = request.nextUrl.origin;
    const geoPath = await resolveSlugToGeoPath(slug);
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
    const geoPath = await resolveSlugToGeoPath(`_province:${code}`);
    if (geoPath) {
      return NextResponse.redirect(`${origin}${geoPath}${search}`, 301);
    }
  }

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
