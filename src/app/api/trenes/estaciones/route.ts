import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma, RailwayServiceType } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";

export const revalidate = 3600;

/**
 * GET /api/trenes/estaciones
 *
 * Railway stations catalog from Renfe GTFS data.
 *
 * Query Parameters:
 *   - serviceType: CERCANIAS, AVE, LARGA_DISTANCIA, MEDIA_DISTANCIA, FEVE, RODALIES
 *   - province: INE 2-digit code
 *   - search: Name search (partial match)
 *   - parentOnly: "true" to return only parent stations (location_type=1)
 *   - limit: Max records (default 500, max 3000)
 *   - offset: Pagination offset
 *   - format: "geojson" for GeoJSON FeatureCollection
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const serviceType = searchParams.get("serviceType");
    const province = searchParams.get("province");
    const search = searchParams.get("search");
    const parentOnly = searchParams.get("parentOnly") === "true";
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const format = searchParams.get("format");

    const limit = Math.min(parseInt(limitParam || "500", 10), 3000);
    const offset = parseInt(offsetParam || "0", 10);

    const where: Prisma.RailwayStationWhereInput = {};

    if (serviceType && Object.values(RailwayServiceType).includes(serviceType as RailwayServiceType)) {
      where.serviceTypes = { has: serviceType as RailwayServiceType };
    }
    if (province) where.province = province;
    if (search) where.name = { contains: search, mode: "insensitive" };
    if (parentOnly) where.locationType = 1;

    // Exclude null-island
    where.NOT = { latitude: 0 };

    const [stations, totalCount] = await Promise.all([
      prisma.railwayStation.findMany({
        where,
        orderBy: [{ name: "asc" }],
        take: limit,
        skip: offset,
      }),
      prisma.railwayStation.count({ where }),
    ]);

    if (format === "geojson") {
      return NextResponse.json({
        type: "FeatureCollection",
        features: stations.map((s) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [Number(s.longitude), Number(s.latitude)],
          },
          properties: {
            id: s.id,
            stopId: s.stopId,
            code: s.code,
            name: s.name,
            slug: s.slug,
            serviceTypes: s.serviceTypes,
            network: s.network,
            province: s.province,
            provinceName: s.provinceName,
            communityName: s.communityName,
            municipality: s.municipality,
            locationType: s.locationType,
            wheelchair: s.wheelchair,
          },
        })),
      });
    }

    const serviceStats = await prisma.railwayStation.groupBy({
      by: ["serviceTypes"],
      where,
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        stations: stations.map((s) => ({
          id: s.id,
          stopId: s.stopId,
          code: s.code,
          name: s.name,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          serviceTypes: s.serviceTypes,
          province: s.province,
          provinceName: s.provinceName,
          municipality: s.municipality,
          locationType: s.locationType,
          parentId: s.parentId,
          wheelchair: s.wheelchair,
        })),
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + stations.length < totalCount,
        },
        stats: {
          totalStations: totalCount,
        },
      },
    });
  } catch (error) {
    reportApiError(error, "Railway stations API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch railway stations" },
      { status: 500 }
    );
  }
}
