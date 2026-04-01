import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const INDEXNOW_KEY = process.env.INDEXNOW_KEY;

/**
 * POST /api/indexnow — Notify search engines of new/changed URLs.
 * Body: { urls: string[] }
 *
 * Pushes to Bing/Yandex via IndexNow protocol.
 * Call after deploy or content changes.
 */
export async function POST(request: NextRequest) {
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

  // Normalize URLs to full paths
  const fullUrls = urls.map((u) =>
    u.startsWith("http") ? u : `${BASE_URL}${u}`
  );

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
