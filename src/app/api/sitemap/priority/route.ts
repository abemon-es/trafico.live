import { reportApiError } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { entriesToXml, generatePrioritySitemap } from "@/lib/sitemap-generator";

// Served at /sitemap/priority.xml (rewrite in next.config.ts). Same caching as
// the numbered shards: 1 hour, no ISR dependency.
const CACHE_MAX_AGE = 3600;

export async function GET() {
  try {
    const xml = entriesToXml(await generatePrioritySitemap());
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_MAX_AGE}`,
      },
    });
  } catch (error) {
    reportApiError(error, "api/sitemap/priority");
    // An empty sitemap with a short cache beats a 500 for crawlers.
    return new NextResponse(entriesToXml([]), {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  }
}
