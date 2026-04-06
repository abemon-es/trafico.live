import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export const revalidate = 300;

/**
 * GET /api/trenes/linea/[slug]
 *
 * Returns a single railway route with matched station details and active alerts.
 *
 * Response shape:
 *   - route: full RailwayRoute record (including shapeGeoJSON)
 *   - stations: matched RailwayStation records for the route's stopIds
 *   - alerts: active RailwayAlert records affecting this route
 *   - relatedRoutes: up to 6 routes with the same brand
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { slug } = await params;

    if (!slug || slug.length > 200) {
      return NextResponse.json(
        { success: false, error: "Invalid slug" },
        { status: 400 }
      );
    }

    // Fetch the route by slug
    const route = await prisma.railwayRoute.findFirst({
      where: { slug },
    });

    if (!route) {
      return NextResponse.json(
        { success: false, error: "Línea no encontrada" },
        { status: 404 }
      );
    }

    // Match stations by stopId — use the route's stopIds array
    const stations =
      route.stopIds.length > 0
        ? await prisma.railwayStation.findMany({
            where: {
              stopId: { in: route.stopIds },
            },
            select: {
              stopId: true,
              name: true,
              slug: true,
              latitude: true,
              longitude: true,
              province: true,
              provinceName: true,
              network: true,
              serviceTypes: true,
            },
          })
        : [];

    // Build a stopId → station lookup for ordered access
    const stationMap = new Map(stations.map((s) => [s.stopId, s]));

    // Ordered station list matching the route's stop sequence
    const orderedStations = route.stopIds
      .map((id) => stationMap.get(id) ?? null)
      .filter(Boolean);

    // Active alerts affecting this route
    const alerts = await prisma.railwayAlert.findMany({
      where: {
        isActive: true,
        routeIds: { has: route.routeId },
      },
      select: {
        id: true,
        alertId: true,
        headerText: true,
        description: true,
        cause: true,
        effect: true,
        activePeriodStart: true,
        activePeriodEnd: true,
      },
      orderBy: { activePeriodStart: "desc" },
      take: 20,
    });

    // Related routes with the same brand (exclude current)
    const relatedRoutes = route.brand
      ? await prisma.railwayRoute.findMany({
          where: {
            brand: route.brand,
            id: { not: route.id },
            slug: { not: null },
          },
          select: {
            id: true,
            routeId: true,
            slug: true,
            shortName: true,
            longName: true,
            brand: true,
            serviceType: true,
            color: true,
            originName: true,
            destName: true,
            stopsCount: true,
          },
          orderBy: { shortName: "asc" },
          take: 6,
        })
      : [];

    return NextResponse.json({
      success: true,
      data: {
        route: {
          id: route.id,
          routeId: route.routeId,
          slug: route.slug,
          agencyId: route.agencyId,
          shortName: route.shortName,
          longName: route.longName,
          brand: route.brand,
          serviceType: route.serviceType,
          color: route.color,
          textColor: route.textColor,
          originName: route.originName,
          originCode: route.originCode,
          destName: route.destName,
          destCode: route.destCode,
          network: route.network,
          stopsCount: route.stopsCount,
          tripCount: route.tripCount,
          shapeGeoJSON: route.shapeGeoJSON,
          stopNames: route.stopNames,
          stopIds: route.stopIds,
          source: route.source,
          fetchedAt: route.fetchedAt,
        },
        stations: orderedStations,
        alerts,
        relatedRoutes,
      },
    });
  } catch (error) {
    reportApiError(error, "Railway line detail API error", request);
    return NextResponse.json(
      { success: false, error: "Error al obtener los datos de la línea" },
      { status: 500 }
    );
  }
}
