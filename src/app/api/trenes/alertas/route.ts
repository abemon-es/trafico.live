import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma, RailwayServiceType } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";

export const revalidate = 60;

/**
 * GET /api/trenes/alertas
 *
 * Active railway service alerts from Renfe GTFS-RT.
 *
 * Query Parameters:
 *   - serviceType: CERCANIAS, AVE, LARGA_DISTANCIA, MEDIA_DISTANCIA
 *   - routeId: Specific GTFS route_id
 *   - active: "true" (default) or "false" for all including resolved
 *   - limit: Max records (default 50, max 200)
 *   - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const serviceType = searchParams.get("serviceType");
    const routeId = searchParams.get("routeId");
    const active = searchParams.get("active") !== "false";
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const limit = Math.min(parseInt(limitParam || "50", 10), 200);
    const offset = parseInt(offsetParam || "0", 10);

    const where: Prisma.RailwayAlertWhereInput = {};

    if (active) where.isActive = true;
    if (serviceType && Object.values(RailwayServiceType).includes(serviceType as RailwayServiceType)) {
      where.serviceType = serviceType as RailwayServiceType;
    }
    if (routeId) where.routeIds = { has: routeId };

    const [alerts, totalCount] = await Promise.all([
      prisma.railwayAlert.findMany({
        where,
        orderBy: [{ activePeriodStart: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.railwayAlert.count({ where }),
    ]);

    // Stats by effect
    const effectStats = await prisma.railwayAlert.groupBy({
      by: ["effect"],
      where,
      _count: { id: true },
    });

    // Stats by service type
    const serviceStats = await prisma.railwayAlert.groupBy({
      by: ["serviceType"],
      where,
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        alerts: alerts.map((a) => ({
          id: a.id,
          alertId: a.alertId,
          routeIds: a.routeIds,
          stopIds: a.stopIds,
          tripIds: a.tripIds,
          headerText: a.headerText,
          description: a.description,
          url: a.url,
          cause: a.cause,
          effect: a.effect,
          activePeriodStart: a.activePeriodStart,
          activePeriodEnd: a.activePeriodEnd,
          isActive: a.isActive,
          firstSeenAt: a.firstSeenAt,
          lastSeenAt: a.lastSeenAt,
          source: a.source,
          serviceType: a.serviceType,
        })),
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + alerts.length < totalCount,
        },
        stats: {
          totalAlerts: totalCount,
          byEffect: Object.fromEntries(
            effectStats.map((e) => [e.effect, e._count.id])
          ),
          byServiceType: Object.fromEntries(
            serviceStats
              .filter((s) => s.serviceType)
              .map((s) => [s.serviceType!, s._count.id])
          ),
        },
      },
    });
  } catch (error) {
    reportApiError(error, "Railway alerts API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch railway alerts" },
      { status: 500 }
    );
  }
}
