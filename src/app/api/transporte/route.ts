/**
 * Public Transit API
 *
 * Returns transit operators, routes, and stops for Spanish public transit.
 * Data sourced from MobilityData GTFS feeds (updated weekly by transit-gtfs collector).
 *
 * GET /api/transporte
 *   ?mode=metro|bus|tram|rail|funicular|all  (default: all)
 *   ?city=Madrid                             (filter by city name)
 *   ?province=28                             (filter by province code)
 *   ?include=operators|routes|stops          (comma-separated, default: operators)
 *   ?format=json|geojson                     (default: json)
 *   ?limit=100                               (default 100, max 500)
 *
 * Examples:
 *   /api/transporte                              → all operators (JSON)
 *   /api/transporte?mode=metro                   → metro operators only
 *   /api/transporte?include=routes&format=geojson → route geometries as FeatureCollection
 *   /api/transporte?include=stops&format=geojson  → stop locations as FeatureCollection
 *
 * Cache: 1 hour (schedule data changes weekly)
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";
import { Prisma } from "@prisma/client";

export const revalidate = 3600;

const CACHE_TTL = 3600; // 1 hour
const VALID_MODES = new Set(["metro", "bus", "tram", "rail", "funicular"]);
const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    const mode = searchParams.get("mode") || "all";
    const city = searchParams.get("city");
    const province = searchParams.get("province");
    const includeParam = searchParams.get("include") || "operators";
    const format = searchParams.get("format") || "json";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), MAX_LIMIT);

    const includeSet = new Set(includeParam.split(",").map((s) => s.trim()));

    const cacheKey = `api:transporte:${mode}:${city || ""}:${province || ""}:${includeParam}:${format}:${limit}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}` },
      });
    }

    // ── Build operator filter ──
    const operatorWhere: Prisma.TransitOperatorWhereInput = {};
    if (mode !== "all" && VALID_MODES.has(mode)) {
      operatorWhere.mode = mode;
    }
    if (city) {
      operatorWhere.city = { contains: city, mode: "insensitive" };
    }
    if (province) {
      operatorWhere.province = province;
    }

    // ── Operators only (default) ──
    if (!includeSet.has("routes") && !includeSet.has("stops")) {
      const operators = await prisma.transitOperator.findMany({
        where: operatorWhere,
        orderBy: [{ mode: "asc" }, { name: "asc" }],
        take: limit,
        select: {
          id: true,
          mdbId: true,
          name: true,
          city: true,
          province: true,
          mode: true,
          hasRealtime: true,
          updatedAt: true,
          _count: { select: { routes: true, stops: true } },
        },
      });

      // Compute aggregate stats for the header strip
      const mapped = operators.map((op) => ({
        mdbId: op.mdbId,
        name: op.name,
        city: op.city,
        province: op.province,
        mode: op.mode,
        hasRealtime: op.hasRealtime,
        routeCount: op._count.routes,
        stopCount: op._count.stops,
        updatedAt: op.updatedAt,
      }));

      const metroLines = mapped.filter((o) => o.mode === "metro").reduce((s, o) => s + o.routeCount, 0);
      const busLines = mapped.filter((o) => o.mode === "bus").reduce((s, o) => s + o.routeCount, 0);
      const totalStops = mapped.reduce((s, o) => s + o.stopCount, 0);
      const cities = new Set(mapped.map((o) => o.city));

      const response = {
        success: true,
        count: operators.length,
        stats: {
          totalOperators: operators.length,
          metroLines,
          busLines,
          totalStops,
          citiesCovered: cities.size,
        },
        operators: mapped,
      };

      await setInCache(cacheKey, response, CACHE_TTL);
      return NextResponse.json(response, {
        headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}` },
      });
    }

    // ── Fetch operators with related data ──
    const operators = await prisma.transitOperator.findMany({
      where: operatorWhere,
      orderBy: [{ mode: "asc" }, { name: "asc" }],
      take: limit,
      include: {
        routes: includeSet.has("routes")
          ? { orderBy: { routeId: "asc" } }
          : false,
        stops: includeSet.has("stops")
          ? { orderBy: { stopName: "asc" }, take: 500 }
          : false,
      },
    });

    // ── GeoJSON: route geometries ──
    if (format === "geojson" && includeSet.has("routes")) {
      const features = operators.flatMap((op) =>
        ("routes" in op ? op.routes : [])
          .filter((r) => r.geometry != null)
          .map((r) => ({
            type: "Feature" as const,
            geometry: r.geometry as object,
            properties: {
              routeId: r.routeId,
              shortName: r.shortName,
              longName: r.longName,
              routeType: r.routeType,
              routeColor: r.routeColor ? `#${r.routeColor}` : null,
              operatorName: op.name,
              mdbId: op.mdbId,
              mode: op.mode,
            },
          }))
      );

      const geojson = { type: "FeatureCollection" as const, features };
      await setInCache(cacheKey, geojson, CACHE_TTL);
      return NextResponse.json(geojson, {
        headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}` },
      });
    }

    // ── GeoJSON: stop locations ──
    if (format === "geojson" && includeSet.has("stops")) {
      const features = operators.flatMap((op) =>
        ("stops" in op ? op.stops : []).map((s) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [Number(s.longitude), Number(s.latitude)],
          },
          properties: {
            stopId: s.stopId,
            stopName: s.stopName,
            locationType: s.locationType,
            parentId: s.parentId,
            operatorName: op.name,
            mdbId: op.mdbId,
            mode: op.mode,
          },
        }))
      );

      const geojson = { type: "FeatureCollection" as const, features };
      await setInCache(cacheKey, geojson, CACHE_TTL);
      return NextResponse.json(geojson, {
        headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}` },
      });
    }

    // ── JSON: operators + routes + stops ──
    const response = {
      success: true,
      count: operators.length,
      operators: operators.map((op) => ({
        mdbId: op.mdbId,
        name: op.name,
        city: op.city,
        province: op.province,
        mode: op.mode,
        hasRealtime: op.hasRealtime,
        updatedAt: op.updatedAt,
        ...("routes" in op && {
          routes: op.routes.map((r) => ({
            routeId: r.routeId,
            shortName: r.shortName,
            longName: r.longName,
            routeType: r.routeType,
            routeColor: r.routeColor ? `#${r.routeColor}` : null,
            hasGeometry: r.geometry != null,
          })),
        }),
        ...("stops" in op && {
          stops: op.stops.map((s) => ({
            stopId: s.stopId,
            stopName: s.stopName,
            latitude: Number(s.latitude),
            longitude: Number(s.longitude),
            locationType: s.locationType,
            parentId: s.parentId,
          })),
        }),
      })),
    };

    await setInCache(cacheKey, response, CACHE_TTL);
    return NextResponse.json(response, {
      headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}` },
    });
  } catch (error) {
    reportApiError(error, "api/transporte] Transit data error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch transit data", count: 0, operators: [] },
      { status: 500 }
    );
  }
}
