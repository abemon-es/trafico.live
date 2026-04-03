import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const INDEXNOW_KEY = process.env.INDEXNOW_KEY;

/**
 * POST /api/indexnow — Notify search engines of new/changed URLs.
 * Body: { urls: string[] }
 *
 * Requires x-api-key header or ?key= query param.
 * Pushes to Bing/Yandex via IndexNow protocol.
 * Call after deploy or content changes.
 */
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key") || request.nextUrl.searchParams.get("key");
  const validKeys = process.env.API_KEYS?.split(",").map((k) => k.trim()) || [];
  if (!apiKey || !validKeys.includes(apiKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!INDEXNOW_KEY) {
    return NextResponse.json(
      { error: "INDEXNOW_KEY not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const urls: string[] = body.urls;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json(
      { error: "urls array is required" },
      { status: 400 }
    );
  }

  // Normalize URLs to full paths and validate they belong to our domain
  const fullUrls = urls
    .map((u) => (u.startsWith("http") ? u : `${BASE_URL}${u}`))
    .filter((u) => u.startsWith(BASE_URL));

  if (fullUrls.length === 0) {
    return NextResponse.json(
      { error: "No valid URLs — all submitted URLs must belong to this domain" },
      { status: 400 }
    );
  }

  const payload = {
    host: new URL(BASE_URL).hostname,
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: fullUrls.slice(0, 10000), // IndexNow limit
  };

  const results = await Promise.allSettled([
    fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    fetch("https://www.bing.com/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  ]);

  return NextResponse.json({
    submitted: fullUrls.length,
    engines: results.map((r, i) => ({
      engine: i === 0 ? "indexnow.org" : "bing",
      status: r.status === "fulfilled" ? r.value.status : "failed",
    })),
  });
}
