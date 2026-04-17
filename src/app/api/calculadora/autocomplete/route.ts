/**
 * GET /api/calculadora/autocomplete?q=…&limit=10
 *
 * Returns normalized location suggestions from Typesense collections:
 * cities, railway_stations, airports, maritime_stations, gas_stations
 *
 * Response is Redis-cached for 60s. Falls back to [] if Typesense is down.
 */

import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";
import { typesenseClient } from "@/lib/typesense";
import type { SearchResponse, DocumentSchema } from "typesense/lib/Typesense/Documents";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutocompleteResult {
  id: string;
  label: string;
  kind: "city" | "railway_station" | "airport" | "port" | "gas_station";
  lat: number;
  lon: number;
  province?: string;
  provinceCode?: string;
}

// ---------------------------------------------------------------------------
// Collection configs
// ---------------------------------------------------------------------------

interface AutocompleteCollectionConfig {
  collection: string;
  queryBy: string;
  kind: AutocompleteResult["kind"];
  mapHit: (doc: Record<string, unknown>) => AutocompleteResult | null;
}

/** Parse a Typesense geopoint field — returns [lat, lon] or null */
function parseGeopoint(
  loc: unknown
): [number, number] | null {
  if (Array.isArray(loc) && loc.length === 2) {
    const [a, b] = loc;
    if (typeof a === "number" && typeof b === "number") return [a, b];
  }
  if (typeof loc === "string") {
    const parts = loc.split(",").map((v) => parseFloat(v.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
  }
  return null;
}

const AUTOCOMPLETE_CONFIGS: AutocompleteCollectionConfig[] = [
  {
    collection: "cities",
    queryBy: "name,provinceName",
    kind: "city",
    mapHit: (doc) => {
      const geo = parseGeopoint(doc.location);
      if (!geo) return null;
      return {
        id: `city:${doc.id as string}`,
        label: [doc.name, doc.provinceName].filter(Boolean).join(", "),
        kind: "city",
        lat: geo[0],
        lon: geo[1],
        province: doc.provinceName as string | undefined,
        provinceCode: doc.province as string | undefined,
      };
    },
  },
  {
    collection: "railway_stations",
    queryBy: "name,municipality,provinceName",
    kind: "railway_station",
    mapHit: (doc) => {
      const geo = parseGeopoint(doc.location);
      if (!geo) return null;
      return {
        id: `station:${doc.id as string}`,
        label: [doc.name, doc.municipality, doc.provinceName]
          .filter(Boolean)
          .join(", "),
        kind: "railway_station",
        lat: geo[0],
        lon: geo[1],
        province: doc.provinceName as string | undefined,
        provinceCode: doc.province as string | undefined,
      };
    },
  },
  {
    collection: "airports",
    queryBy: "name,municipalityName,iataCode",
    kind: "airport",
    mapHit: (doc) => {
      const geo = parseGeopoint(doc.location);
      if (!geo) return null;
      const iata = doc.iataCode ? ` (${doc.iataCode})` : "";
      return {
        id: `airport:${doc.id as string}`,
        label: `${doc.name as string}${iata}`,
        kind: "airport",
        lat: geo[0],
        lon: geo[1],
        province: doc.provinceName as string | undefined,
        provinceCode: doc.province as string | undefined,
      };
    },
  },
  {
    collection: "maritime_stations",
    queryBy: "name,port,locality",
    kind: "port",
    mapHit: (doc) => {
      const geo = parseGeopoint(doc.location);
      if (!geo) return null;
      return {
        id: `maritime:${doc.id as string}`,
        label: [doc.name, doc.port, doc.provinceName].filter(Boolean).join(", "),
        kind: "port",
        lat: geo[0],
        lon: geo[1],
        province: doc.provinceName as string | undefined,
        provinceCode: doc.province as string | undefined,
      };
    },
  },
  {
    collection: "gas_stations",
    queryBy: "name,locality,address",
    kind: "gas_station",
    mapHit: (doc) => {
      const geo = parseGeopoint(doc.location);
      if (!geo) return null;
      return {
        id: `gas:${doc.id as string}`,
        label: [doc.name, doc.locality, doc.provinceName].filter(Boolean).join(", "),
        kind: "gas_station",
        lat: geo[0],
        lon: geo[1],
        province: doc.provinceName as string | undefined,
        provinceCode: doc.province as string | undefined,
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const limit = Math.min(parseInt(sp.get("limit") ?? "10", 10), 20);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const cacheKey = `calculadora:autocomplete:${q.toLowerCase()}:${limit}`;

  const results = await getOrCompute<AutocompleteResult[]>(cacheKey, 60, async () => {
    if (!typesenseClient) return [];

    try {
      const perCollection = Math.max(3, Math.ceil(limit / AUTOCOMPLETE_CONFIGS.length));

      const searchRequests = {
        searches: AUTOCOMPLETE_CONFIGS.map((config) => ({
          collection: config.collection,
          q,
          query_by: config.queryBy,
          per_page: perCollection,
          num_typos: 2,
          prefix: true,
          drop_tokens_threshold: 1,
          split_join_tokens: "fallback" as const,
        })),
      };

      const response = await typesenseClient.multiSearch.perform(searchRequests, {});
      const searchResults = (
        response as { results: SearchResponse<DocumentSchema>[] }
      ).results;

      const hits: AutocompleteResult[] = [];
      for (let i = 0; i < searchResults.length; i++) {
        const config = AUTOCOMPLETE_CONFIGS[i];
        const coll = searchResults[i];
        if (!coll.hits) continue;
        for (const hit of coll.hits) {
          const mapped = config.mapHit(hit.document);
          if (mapped) hits.push(mapped);
        }
      }

      // Sort: cities and railway stations first; deduplicate by id
      const seen = new Set<string>();
      const ordered: AutocompleteResult[] = [];
      const PRIORITY: AutocompleteResult["kind"][] = ["city", "railway_station", "airport", "port", "gas_station"];
      for (const kind of PRIORITY) {
        for (const h of hits) {
          if (h.kind === kind && !seen.has(h.id)) {
            seen.add(h.id);
            ordered.push(h);
          }
        }
      }

      return ordered.slice(0, limit);
    } catch (err) {
      console.error("[calculadora/autocomplete] Typesense error:", err);
      return [];
    }
  });

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } }
  );
}
