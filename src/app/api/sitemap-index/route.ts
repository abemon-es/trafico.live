import { NextResponse } from "next/server";
import { getActiveShardIds, getSitemapShardIds } from "@/lib/sitemap-generator";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export async function GET() {
  // Prefer DB-backed shard discovery (excludes empty shards). Fall back to
  // the static upper-bound list if anything in the count pipeline throws,
  // so the index is never served empty.
  let shards: { id: number }[];
  try {
    shards = await getActiveShardIds();
  } catch {
    shards = getSitemapShardIds();
  }
  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${shards.map((s) => `<sitemap><loc>${BASE_URL}/sitemap/${s.id}.xml</loc><lastmod>${now}</lastmod></sitemap>`).join("\n")}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
