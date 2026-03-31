/**
 * Google News Sitemap
 *
 * Serves articles published in the last 48 hours for Google News/Discover.
 * Only includes content types eligible for News: reports, alerts, analyses.
 *
 * Google News requirements:
 * - Articles must be < 48 hours old
 * - Must include <news:publication>, <news:publication_date>, <news:title>
 * - Site must publish consistently (1-2 articles/day minimum)
 *
 * @see https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const revalidate = 300; // 5 min

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Categories eligible for Google News
const NEWS_CATEGORIES = [
  "DAILY_REPORT",
  "WEEKLY_REPORT",
  "MONTHLY_REPORT",
  "PRICE_ALERT",
  "INCIDENT_DIGEST",
  "WEATHER_ALERT",
  "FUEL_TREND",
  "ANNUAL_REPORT",
  "NEWS",
  "ANALYSIS",
];

export async function GET() {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 48);

  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: cutoff },
      category: { in: NEWS_CATEGORIES as never[] },
    },
    select: {
      slug: true,
      title: true,
      publishedAt: true,
      tags: { include: { tag: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 1000,
  });

  const urls = articles
    .map((article) => {
      const keywords = article.tags
        .map((at) => at.tag.name)
        .slice(0, 5)
        .join(", ");

      return `  <url>
    <loc>${BASE_URL}/noticias/${escapeXml(article.slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>trafico.live</news:name>
        <news:language>es</news:language>
      </news:publication>
      <news:publication_date>${article.publishedAt.toISOString()}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>${keywords ? `\n      <news:keywords>${escapeXml(keywords)}</news:keywords>` : ""}
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
