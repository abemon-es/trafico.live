/**
 * Geo-Search API — GET /api/search/nearby?lat=40.4&lng=-3.7&radius=5&collections=gas_stations,ev_chargers
 *
 * Searches geo-enabled Typesense collections for entities within a radius (km).
 * Returns results sorted by distance from the given coordinates.
 */

import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";
import { reportApiError } from "@/lib/api-error";
import { getOrCompute } from "@/lib/redis";
import { typesenseClient } from "@/lib/typesense";

const GEO_COLLECTIONS = [
  "gas_stations", "cameras", "ev_chargers", "radars",
  "railway_stations", "variable_panels", "maritime_stations",
  "traffic_stations", "risk_zones", "cities",
] as const;

type GeoCollection = (typeof GEO_COLLECTIONS)[number];

interface NearbyResult {
  id: string;
  collection: string;
  name: string;
  subtitle: string | null;
  distance_km: number;
  lat: number;
  lng: number;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const params = request.nextUrl.searchParams;
  const lat = parseFloat(params.get("lat") ?? "");
  const lng = parseFloat(params.get("lng") ?? "");
  const radius = Math.min(parseFloat(params.get("radius") ?? "10"), 100); // max 100km
  const limit = Math.min(parseInt(params.get("limit") ?? "20", 10), 100);
  const requestedCollections = params.get("collections")?.split(",").filter(
    (c): c is GeoCollection => GEO_COLLECTIONS.includes(c as GeoCollection)
  ) ?? [...GEO_COLLECTIONS];

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "Valid lat and lng parameters required" },
      { status: 400 }
    );
  }

  const cacheKey = `nearby:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}:${limit}:${requestedCollections.join(",")}`;

  const data = await getOrCompute(cacheKey, 120, async () => {
    return performNearbySearch(lat, lng, radius, limit, requestedCollections);
  });

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=120, s-maxage=120" },
  });
}

async function performNearbySearch(
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number,
  collections: GeoCollection[]
): Promise<{ results: NearbyResult[]; total: number }> {
  if (!typesenseClient) return { results: [], total: 0 };

  try {
    const radiusM = radiusKm * 1000;
    const perCollection = Math.max(5, Math.ceil(limit / collections.length));

    const searchRequests = {
      searches: collections.map((collection) => ({
        collection,
        q: "*",
        query_by: "name" as const,
        filter_by: `location:(${lat}, ${lng}, ${radiusM} m)`,
        sort_by: `location(${lat}, ${lng}):asc`,
        per_page: perCollection,
      })),
    };

    const response = await typesenseClient.multiSearch.perform(searchRequests, {});
    const results: NearbyResult[] = [];

    const searchResults = (response as { results: Array<{ hits?: Array<{ document: Record<string, unknown>; geo_distance_meters?: { location: number } }> }> }).results;

    for (let i = 0; i < searchResults.length; i++) {
      const collResult = searchResults[i];
      const collection = collections[i];

      if (collResult.hits) {
        for (const hit of collResult.hits) {
          const doc = hit.document;
          const distM = hit.geo_distance_meters?.location ?? 0;
          const loc = doc.location as [number, number] | undefined;

          results.push({
            id: doc.id as string,
            collection,
            name: (doc.name as string) || (doc.stationCode as string) || "",
            subtitle: (doc.provinceName as string) || (doc.port as string) || null,
            distance_km: Math.round(distM / 100) / 10,
            lat: loc?.[0] ?? lat,
            lng: loc?.[1] ?? lng,
          });
        }
      }
    }

    results.sort((a, b) => a.distance_km - b.distance_km);
    const trimmed = results.slice(0, limit);

    return { results: trimmed, total: trimmed.length };
  } catch (error) {
    reportApiError(error, "nearby-search", { lat, lng });
    return { results: [], total: 0 };
  }
}
