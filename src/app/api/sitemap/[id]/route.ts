import { NextResponse } from "next/server";
import {
  generateSitemapForShard,
  getSitemapShardIds,
  entriesToXml,
} from "@/lib/sitemap-generator";

// Cache sitemap XML for 1 hour — Cloudflare + browsers respect this.
// No ISR dependency: each request runs the DB query if cache is expired.
const CACHE_MAX_AGE = 3600;

const validShardIds = new Set(getSitemapShardIds().map((s) => s.id));

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);

  if (isNaN(id) || !validShardIds.has(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const entries = await generateSitemapForShard(id);
    const xml = entriesToXml(entries);

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_MAX_AGE}`,
      },
    });
  } catch (error) {
    console.error(`[sitemap] Shard ${id} failed:`, error);
    // Return empty sitemap on error — better than 500 for crawlers
    const emptyXml = entriesToXml([]);
    return new NextResponse(emptyXml, {
      headers: {
        "Content-Type": "application/xml",
        // Short cache on errors so it retries soon
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  }
}
