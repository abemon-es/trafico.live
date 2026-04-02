/**
 * Search API — GET /api/search?q=query&limit=20
 *
 * Searches across all Typesense collections using multi_search.
 * Falls back to empty results when Typesense is unavailable.
 * Results are cached in Redis for 60s.
 */

import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";
import { reportApiError } from "@/lib/api-error";
import { getOrCompute } from "@/lib/redis";
import { typesenseClient } from "@/lib/typesense";
import type { SearchResponse, DocumentSchema } from "typesense/lib/Typesense/Documents";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
  title: string;
  subtitle: string | null;
  href: string;
  category: string;
  /** Lucide icon name */
  icon: string;
}

interface SearchAPIResponse {
  results: SearchResult[];
  query: string;
  total: number;
}

// ---------------------------------------------------------------------------
// Collection search config
// ---------------------------------------------------------------------------

interface CollectionSearchConfig {
  collection: string;
  queryBy: string;
  category: string;
  icon: string;
  mapHit: (doc: Record<string, unknown>) => SearchResult;
}

const SEARCH_CONFIGS: CollectionSearchConfig[] = [
  {
    collection: "provinces",
    queryBy: "name,community",
    category: "Provincias",
    icon: "MapPin",
    mapHit: (doc) => ({
      title: doc.name as string,
      subtitle: doc.community as string,
      href: `/espana/${doc.slug}`,
      category: "Provincias",
      icon: "MapPin",
    }),
  },
  {
    collection: "cities",
    queryBy: "name,province",
    category: "Ciudades",
    icon: "Building2",
    mapHit: (doc) => ({
      title: doc.name as string,
      subtitle: (doc.provinceName as string) || (doc.province as string) || null,
      href: `/ciudad/${doc.slug}`,
      category: "Ciudades",
      icon: "Building2",
    }),
  },
  {
    collection: "gas_stations",
    queryBy: "name,locality,provinceName,address",
    category: "Gasolineras",
    icon: "Fuel",
    mapHit: (doc) => ({
      title: doc.name as string,
      subtitle: [doc.locality, doc.provinceName].filter(Boolean).join(", ") || null,
      href: `/gasolineras/terrestres/${doc.id}`,
      category: "Gasolineras",
      icon: "Fuel",
    }),
  },
  {
    collection: "roads",
    queryBy: "roadNumber,name",
    category: "Carreteras",
    icon: "Route",
    mapHit: (doc) => ({
      title: doc.roadNumber as string,
      subtitle: (doc.name as string) || null,
      href: `/carreteras/${encodeURIComponent(doc.roadNumber as string)}`,
      category: "Carreteras",
      icon: "Route",
    }),
  },
  {
    collection: "cameras",
    queryBy: "name,roadNumber,provinceName",
    category: "Camaras",
    icon: "Camera",
    mapHit: (doc) => ({
      title: doc.name as string,
      subtitle: [doc.roadNumber, doc.provinceName].filter(Boolean).join(" - ") || null,
      href: `/camaras${doc.roadNumber ? `?road=${encodeURIComponent(doc.roadNumber as string)}` : ""}`,
      category: "Camaras",
      icon: "Camera",
    }),
  },
  {
    collection: "articles",
    queryBy: "title,summary,tags",
    category: "Noticias",
    icon: "Newspaper",
    mapHit: (doc) => ({
      title: doc.title as string,
      subtitle: (doc.summary as string)?.slice(0, 80) || null,
      href: `/noticias/${doc.slug}`,
      category: "Noticias",
      icon: "Newspaper",
    }),
  },
  {
    collection: "ev_chargers",
    queryBy: "name,city,provinceName,address,operator",
    category: "Cargadores EV",
    icon: "Zap",
    mapHit: (doc) => ({
      title: doc.name as string,
      subtitle: [doc.city, doc.provinceName].filter(Boolean).join(", ") || null,
      href: `/cargadores/${doc.id}`,
      category: "Cargadores EV",
      icon: "Zap",
    }),
  },
  {
    collection: "radars",
    queryBy: "roadNumber,provinceName",
    category: "Radares",
    icon: "Radar",
    mapHit: (doc) => ({
      title: `Radar ${doc.roadNumber as string} km ${doc.kmPoint ?? ""}`,
      subtitle: [doc.type, doc.speedLimit ? `${doc.speedLimit} km/h` : null, doc.provinceName].filter(Boolean).join(" · ") || null,
      href: `/radares?road=${encodeURIComponent(doc.roadNumber as string)}`,
      category: "Radares",
      icon: "Radar",
    }),
  },
  {
    collection: "railway_stations",
    queryBy: "name,provinceName,municipality",
    category: "Estaciones de tren",
    icon: "TrainFront",
    mapHit: (doc) => ({
      title: doc.name as string,
      subtitle: [doc.municipality, doc.provinceName].filter(Boolean).join(", ") || null,
      href: `/trenes/estaciones/${doc.id}`,
      category: "Estaciones de tren",
      icon: "TrainFront",
    }),
  },
  {
    collection: "zbe_zones",
    queryBy: "name,cityName",
    category: "Zonas ZBE",
    icon: "ShieldAlert",
    mapHit: (doc) => ({
      title: doc.name as string,
      subtitle: doc.cityName as string,
      href: `/zbe/${doc.id}`,
      category: "Zonas ZBE",
      icon: "ShieldAlert",
    }),
  },
  {
    collection: "risk_zones",
    queryBy: "road,province,description",
    category: "Zonas de riesgo",
    icon: "AlertTriangle",
    mapHit: (doc) => ({
      title: `${doc.type as string} — ${doc.road as string}`,
      subtitle: [doc.description, doc.province].filter(Boolean).join(" · ") || null,
      href: `/zonas-riesgo?road=${encodeURIComponent(doc.road as string)}`,
      category: "Zonas de riesgo",
      icon: "AlertTriangle",
    }),
  },
  {
    collection: "variable_panels",
    queryBy: "name,roadNumber,provinceName,message",
    category: "Paneles",
    icon: "MonitorDot",
    mapHit: (doc) => ({
      title: (doc.name as string) || `Panel ${doc.roadNumber as string}`,
      subtitle: (doc.message as string)?.slice(0, 80) || (doc.provinceName as string) || null,
      href: `/paneles?road=${encodeURIComponent((doc.roadNumber as string) || "")}`,
      category: "Paneles",
      icon: "MonitorDot",
    }),
  },
  {
    collection: "maritime_stations",
    queryBy: "name,port,locality,provinceName",
    category: "Gasolineras maritimas",
    icon: "Anchor",
    mapHit: (doc) => ({
      title: doc.name as string,
      subtitle: [doc.port, doc.provinceName].filter(Boolean).join(", ") || null,
      href: `/gasolineras/maritimas/${doc.id}`,
      category: "Gasolineras maritimas",
      icon: "Anchor",
    }),
  },
  {
    collection: "traffic_stations",
    queryBy: "stationCode,roadNumber,provinceName",
    category: "Estaciones de aforo",
    icon: "Activity",
    mapHit: (doc) => ({
      title: `${doc.stationCode as string} — ${doc.roadNumber as string}`,
      subtitle: [doc.provinceName, doc.imd ? `IMD: ${(doc.imd as number).toLocaleString("es-ES")}` : null].filter(Boolean).join(" · ") || null,
      href: `/estaciones-aforo?station=${encodeURIComponent(doc.stationCode as string)}`,
      category: "Estaciones de aforo",
      icon: "Activity",
    }),
  },
];

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  if (!query) {
    return NextResponse.json<SearchAPIResponse>(
      { results: [], query: "", total: 0 },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      }
    );
  }

  // Return from cache if available, otherwise compute
  const cacheKey = `search:${query}:${limit}`;

  const data = await getOrCompute<SearchAPIResponse>(cacheKey, 60, async () => {
    return performSearch(query, limit);
  });

  return NextResponse.json<SearchAPIResponse>(data, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}

// ---------------------------------------------------------------------------
// Multi-search
// ---------------------------------------------------------------------------

async function performSearch(
  query: string,
  limit: number
): Promise<SearchAPIResponse> {
  if (!typesenseClient) {
    return { results: [], query, total: 0 };
  }

  try {
    const perCollection = Math.max(3, Math.ceil(limit / SEARCH_CONFIGS.length));

    const searchRequests = {
      searches: SEARCH_CONFIGS.map((config) => ({
        collection: config.collection,
        q: query,
        query_by: config.queryBy,
        per_page: perCollection,
        highlight_full_fields: config.queryBy,
      })),
    };

    const response = await typesenseClient.multiSearch.perform(
      searchRequests,
      {}
    );

    const results: SearchResult[] = [];

    const searchResults = (
      response as { results: SearchResponse<DocumentSchema>[] }
    ).results;

    for (let i = 0; i < searchResults.length; i++) {
      const collectionResult = searchResults[i];
      const config = SEARCH_CONFIGS[i];

      if (collectionResult.hits) {
        for (const hit of collectionResult.hits) {
          results.push(config.mapHit(hit.document));
        }
      }
    }

    // Sort by text relevance (provinces/cities first for short queries)
    // Then trim to requested limit
    const trimmed = results.slice(0, limit);

    return {
      results: trimmed,
      query,
      total: trimmed.length,
    };
  } catch (error) {
    reportApiError(error, "search", { query });
    // Fail gracefully — return empty results
    return { results: [], query, total: 0 };
  }
}
