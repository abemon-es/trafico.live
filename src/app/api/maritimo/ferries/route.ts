/**
 * Ferry Routes API
 *
 * Returns ferry routes with stops and schedules from GTFS data.
 *
 * GET /api/maritimo/ferries
 *   ?operator=fredolsen|balearia|vizcaya|all  (default: all)
 *   ?format=geojson                           (returns GeoJSON FeatureCollection of stops)
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

// Ferry schedule data changes at most weekly
export const revalidate = 3600;

// Normalize operator slug to DB value
const OPERATOR_SLUG_MAP: Record<string, string> = {
  fredolsen: "Fred. Olsen Express",
  balearia: "Baleària",
  vizcaya: "Transbordador de Vizcaya",
};

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const operatorSlug = searchParams.get("operator") || "all";
    const format = searchParams.get("format");

    // Resolve slug to full operator name
    const operatorFilter =
      operatorSlug !== "all" && OPERATOR_SLUG_MAP[operatorSlug]
        ? OPERATOR_SLUG_MAP[operatorSlug]
        : null;

    const cacheKey = `api:maritimo:ferries:${operatorSlug}:${format ?? "json"}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
      });
    }

    const routes = await prisma.ferryRoute.findMany({
      where: operatorFilter ? { operator: operatorFilter } : undefined,
      include: {
        stops: {
          orderBy: { stopName: "asc" },
        },
        trips: {
          take: 20,
          orderBy: { departsAt: "asc" },
        },
      },
      orderBy: [{ operator: "asc" }, { routeName: "asc" }],
    });

    // GeoJSON format — emit stops as a FeatureCollection
    if (format === "geojson") {
      const features = routes.flatMap((r) =>
        r.stops.map((s) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [Number(s.longitude), Number(s.latitude)],
          },
          properties: {
            stopId: s.stopId,
            stopName: s.stopName,
            routeId: r.routeId,
            routeName: r.routeName,
            operator: r.operator,
            routeColor: r.routeColor,
          },
        }))
      );

      const geojson = { type: "FeatureCollection" as const, features };
      await setInCache(cacheKey, geojson, 3600);
      return NextResponse.json(geojson, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
      });
    }

    const response = {
      success: true,
      count: routes.length,
      routes: routes.map((r) => ({
        id: r.id,
        operator: r.operator,
        routeId: r.routeId,
        routeName: r.routeName,
        routeType: r.routeType,
        routeColor: r.routeColor,
        geometry: r.geometry,
        stops: r.stops.map((s) => ({
          stopId: s.stopId,
          stopName: s.stopName,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
        })),
        trips: r.trips.map((t) => ({
          tripId: t.tripId,
          headsign: t.headsign,
          departsAt: t.departsAt,
          arrivesAt: t.arrivesAt,
          serviceDay: t.serviceDay,
        })),
      })),
    };

    await setInCache(cacheKey, response, 3600);

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (error) {
    reportApiError(error, "api/maritimo/ferries] Error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch ferry routes", count: 0, routes: [] },
      { status: 500 }
    );
  }
}
