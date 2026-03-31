import { NextResponse } from "next/server";
import { generateSitemaps } from "@/app/sitemap";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 3600;

export async function GET() {
  const shards = await generateSitemaps();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${shards.map((s) => `<sitemap><loc>${BASE_URL}/sitemap/${s.id}.xml</loc></sitemap>`).join("\n")}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
