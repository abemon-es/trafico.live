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

// Typesense validates query_by even for q="*", so each collection needs a
// field it actually has: radars, traffic_stations and risk_zones have no
// `name`. Also how each one is labelled in the results.
const GEO_FIELDS: Record<GeoCollection, {
  queryBy: string;
  name: (d: Record<string, unknown>) => string;
  subtitle: (d: Record<string, unknown>) => string | null;
}> = {
  gas_stations: { queryBy: "name", name: (d) => str(d.name), subtitle: (d) => str(d.provinceName) || null },
  cameras: { queryBy: "name", name: (d) => str(d.name), subtitle: (d) => str(d.provinceName) || null },
  ev_chargers: { queryBy: "name", name: (d) => str(d.name), subtitle: (d) => str(d.provinceName) || null },
  radars: {
    queryBy: "roadNumber",
    name: (d) => `Radar ${str(d.roadNumber)}${d.kmPoint != null ? ` km ${d.kmPoint}` : ""}`.trim(),
    subtitle: (d) => str(d.provinceName) || null,
  },
  railway_stations: { queryBy: "name", name: (d) => str(d.name), subtitle: (d) => str(d.provinceName) || null },
  variable_panels: { queryBy: "name", name: (d) => str(d.name), subtitle: (d) => str(d.provinceName) || null },
  maritime_stations: { queryBy: "name", name: (d) => str(d.name), subtitle: (d) => str(d.port) || null },
  traffic_stations: {
    queryBy: "stationCode",
    name: (d) => `Estación de aforo ${str(d.stationCode)}`,
    subtitle: (d) => [str(d.roadNumber), str(d.provinceName)].filter(Boolean).join(" · ") || null,
  },
  risk_zones: {
    queryBy: "road",
    name: (d) => `Zona de riesgo ${str(d.road)}`,
    subtitle: (d) => [str(d.description), str(d.province)].filter(Boolean).join(" · ") || null,
  },
  cities: { queryBy: "name", name: (d) => str(d.name), subtitle: (d) => str(d.provinceName) || null },
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

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
  const radiusParam = parseFloat(params.get("radius") ?? "10");
  const radius = radiusParam > 0 ? Math.min(radiusParam, 100) : 10; // km, max 100
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
    const perCollection = Math.max(5, Math.ceil(limit / collections.length));

    // Typesense geo radius units are `km` or `mi` only. The previous `${m} m`
    // made every collection fail with "Unit must be either `km` or `mi`", so
    // this route returned an empty list for every query.
    const searchRequests = {
      searches: collections.map((collection) => ({
        collection,
        q: "*",
        query_by: GEO_FIELDS[collection].queryBy,
        filter_by: `location:(${lat}, ${lng}, ${radiusKm} km)`,
        sort_by: `location(${lat}, ${lng}):asc`,
        per_page: perCollection,
      })),
    };

    const response = await typesenseClient.multiSearch.perform(searchRequests, {});
    const results: NearbyResult[] = [];

    const searchResults = (response as { results: Array<{ error?: string; hits?: Array<{ document: Record<string, unknown>; geo_distance_meters?: { location: number } }> }> }).results;

    for (let i = 0; i < searchResults.length; i++) {
      const collResult = searchResults[i];
      const collection = collections[i];

      // multi_search reports a failed search inside the response instead of
      // throwing; log it so a broken collection is not just an empty one.
      if (collResult.error) {
        console.error(`[nearby-search] ${collection}: ${collResult.error}`);
        continue;
      }

      if (collResult.hits) {
        for (const hit of collResult.hits) {
          const doc = hit.document;
          const distM = hit.geo_distance_meters?.location ?? 0;
          const loc = doc.location as [number, number] | undefined;

          results.push({
            id: doc.id as string,
            collection,
            name: GEO_FIELDS[collection].name(doc),
            subtitle: GEO_FIELDS[collection].subtitle(doc),
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
