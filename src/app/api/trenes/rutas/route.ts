import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma, RailwayServiceType } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";

export const revalidate = 3600;

/**
 * GET /api/trenes/rutas
 *
 * Railway routes catalog from Renfe GTFS data with optional shape geometry.
 *
 * Query Parameters:
 *   - serviceType: CERCANIAS, AVE, LARGA_DISTANCIA, MEDIA_DISTANCIA, FEVE, RODALIES
 *   - network: Cercanías network name (Madrid, Barcelona, Valencia, etc.)
 *   - search: Route name search (partial match)
 *   - withShapes: "true" to include GeoJSON shapes (default: false, they're large)
 *   - limit: Max records (default 100, max 500)
 *   - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const serviceType = searchParams.get("serviceType");
    const network = searchParams.get("network");
    const search = searchParams.get("search");
    const withShapes = searchParams.get("withShapes") === "true";
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const limit = Math.min(parseInt(limitParam || "100", 10), 500);
    const offset = parseInt(offsetParam || "0", 10);

    const where: Prisma.RailwayRouteWhereInput = {};

    if (serviceType && Object.values(RailwayServiceType).includes(serviceType as RailwayServiceType)) {
      where.serviceType = serviceType as RailwayServiceType;
    }
    if (network) where.network = { equals: network, mode: "insensitive" };
    if (search) {
      where.OR = [
        { shortName: { contains: search, mode: "insensitive" } },
        { longName: { contains: search, mode: "insensitive" } },
      ];
    }

    const select: Prisma.RailwayRouteSelect = {
      id: true,
      routeId: true,
      agencyId: true,
      shortName: true,
      longName: true,
      serviceType: true,
      color: true,
      textColor: true,
      network: true,
      stopIds: true,
      shapeGeoJSON: withShapes,
    };

    const [routes, totalCount] = await Promise.all([
      prisma.railwayRoute.findMany({
        where,
        select,
        orderBy: [{ serviceType: "asc" }, { shortName: "asc" }],
        take: limit,
        skip: offset,
      }),
      prisma.railwayRoute.count({ where }),
    ]);

    // Service type distribution
    const serviceStats = await prisma.railwayRoute.groupBy({
      by: ["serviceType"],
      where,
      _count: { id: true },
    });

    // Network distribution (for Cercanías)
    const networkStats = await prisma.railwayRoute.groupBy({
      by: ["network"],
      where: { ...where, network: { not: null } },
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        routes,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + routes.length < totalCount,
        },
        stats: {
          totalRoutes: totalCount,
          byServiceType: Object.fromEntries(
            serviceStats.map((s) => [s.serviceType, s._count.id])
          ),
          byNetwork: Object.fromEntries(
            networkStats
              .filter((n) => n.network)
              .map((n) => [n.network!, n._count.id])
          ),
        },
      },
    });
  } catch (error) {
    reportApiError(error, "Railway routes API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch railway routes" },
      { status: 500 }
    );
  }
}
