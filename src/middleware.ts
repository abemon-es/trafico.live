import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateRequest } from "./lib/auth";
// S0 launch: T4.1c tier enforcement disabled in middleware — uses
// rate-limiter-flexible which is not Edge-runtime compatible. Enforcement
// will move to Node API route handlers in S1. See src/lib/tier-enforcement.ts.

const CANONICAL_DOMAIN = "trafico.live";
const CANONICAL_ORIGIN = "https://trafico.live";
const LEGACY_DOMAINS = [
  "trafico.abemon.es",
];

// In-memory slug resolution cache (lives for the lifetime of the edge worker)
const slugCache = new Map<string, string | null>();

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

      // Fire-and-forget to Node-runtime API so Prisma can persist the visit.
      // We do NOT await — the bot visit log must never delay the actual response.
      // Skip /api/* paths to avoid noise from internal API calls.
      if (!pathname.startsWith("/api/")) {
        const rawIp =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "";
        // Store only first two octets (e.g. "1.2") — no PII
        const ipPrefix = rawIp.includes(".")
          ? rawIp.split(".").slice(0, 2).join(".")
          : rawIp.includes(":")
          ? rawIp.split(":").slice(0, 2).join(":")
          : null;

        const internalSecret =
          process.env.BOT_VISIT_SECRET || "trafico-internal-bot-visit-v1";
        const origin = request.nextUrl.origin;

        fetch(`${origin}/api/internal/bot-visit`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({
            bot: botName,
            path: pathname,
            statusCode: 200,
            ip: ipPrefix,
            country: country === "?" ? null : country,
            userAgent: userAgent.slice(0, 500),
          }),
        }).catch(() => {
          // Swallow all errors — observability must not affect production traffic
        });
      }
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
