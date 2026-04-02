/**
 * Suggest API — GET /api/search/suggest?q=query&limit=8
 *
 * Lightweight autocomplete endpoint. Searches pages, provinces, and cities only.
 * Returns titles and hrefs — no highlights, no subtitles.
 * Cached 30s in Redis.
 */

import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";
import { typesenseClient } from "@/lib/typesense";

interface Suggestion {
  title: string;
  href: string;
  collection: string;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "8", 10), 20);

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] }, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
    });
  }

  const cacheKey = `suggest:${q}:${limit}`;
  const data = await getOrCompute(cacheKey, 30, () => performSuggest(q, limit));

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
  });
}

const SUGGEST_CONFIGS = [
  { collection: "pages", queryBy: "title,keywords", hrefField: "href" },
  { collection: "provinces", queryBy: "name", hrefFn: (doc: Record<string, unknown>) => `/espana/${doc.slug}` },
  { collection: "cities", queryBy: "name", hrefFn: (doc: Record<string, unknown>) => `/ciudad/${doc.slug}` },
] as const;

async function performSuggest(
  query: string,
  limit: number
): Promise<{ suggestions: Suggestion[] }> {
  if (!typesenseClient) return { suggestions: [] };

  try {
    const perColl = Math.max(3, Math.ceil(limit / SUGGEST_CONFIGS.length));

    const response = await typesenseClient.multiSearch.perform({
      searches: SUGGEST_CONFIGS.map((c) => ({
        collection: c.collection,
        q: query,
        query_by: c.queryBy,
        per_page: perColl,
        num_typos: 1,
        prefix: true,
        include_fields: "title,name,slug,href",
      })),
    }, {});

    const suggestions: Suggestion[] = [];
    const results = (response as { results: Array<{ hits?: Array<{ document: Record<string, unknown> }> }> }).results;

    for (let i = 0; i < results.length; i++) {
      const config = SUGGEST_CONFIGS[i];
      if (!results[i].hits) continue;
      for (const hit of results[i].hits!) {
        const doc = hit.document;
        suggestions.push({
          title: (doc.title as string) || (doc.name as string) || "",
          href: "hrefField" in config
            ? (doc[config.hrefField] as string)
            : config.hrefFn(doc),
          collection: config.collection,
        });
      }
    }

    return { suggestions: suggestions.slice(0, limit) };
  } catch {
    return { suggestions: [] };
  }
}
