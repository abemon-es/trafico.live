import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { applyRateLimit } from "@/lib/api-utils";

export const revalidate = 300;

/**
 * GET /api/trenes/estacion/[slug]
 *
 * Single railway station detail: station info + routes serving it + active alerts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResponse = authenticateRequest(request);
  if (authResponse) return authResponse;

  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { slug } = await params;

    const station = await prisma.railwayStation.findUnique({
      where: { slug },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: "Estacion no encontrada" },
        { status: 404 }
      );
    }

    // Fetch routes where stopNames contains this station's name
    // and alerts where stopIds contains this station's stopId in parallel
    const [routes, alerts, nearbyStations] = await Promise.all([
      prisma.railwayRoute.findMany({
        where: {
          stopNames: { has: station.name },
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
          textColor: true,
          originName: true,
          destName: true,
          network: true,
          stopsCount: true,
          tripCount: true,
        },
        orderBy: [{ serviceType: "asc" }, { shortName: "asc" }],
      }),
      prisma.railwayAlert.findMany({
        where: {
          isActive: true,
          stopIds: { has: station.stopId },
        },
        orderBy: { activePeriodStart: "desc" },
        take: 20,
      }),
      // Nearby stations: simple bounding box ~5km
      prisma.railwayStation.findMany({
        where: {
          id: { not: station.id },
          slug: { not: null },
          latitude: {
            gte: Number(station.latitude) - 0.045,
            lte: Number(station.latitude) + 0.045,
          },
          longitude: {
            gte: Number(station.longitude) - 0.06,
            lte: Number(station.longitude) + 0.06,
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          latitude: true,
          longitude: true,
          serviceTypes: true,
          network: true,
          provinceName: true,
        },
        orderBy: { name: "asc" },
        take: 10,
      }),
    ]);

    // Calculate distances for nearby stations
    const stationLat = Number(station.latitude);
    const stationLng = Number(station.longitude);
    const nearbyWithDistance = nearbyStations
      .map((s) => {
        const dLat = Number(s.latitude) - stationLat;
        const dLng = Number(s.longitude) - stationLng;
        const distance = Math.sqrt(dLat * dLat + dLng * dLng) * 111.32; // approximate km
        return { ...s, latitude: Number(s.latitude), longitude: Number(s.longitude), distanceKm: Math.round(distance * 10) / 10 };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({
      success: true,
      data: {
        station: {
          id: station.id,
          stopId: station.stopId,
          code: station.code,
          name: station.name,
          slug: station.slug,
          latitude: Number(station.latitude),
          longitude: Number(station.longitude),
          locationType: station.locationType,
          platformCode: station.platformCode,
          province: station.province,
          provinceName: station.provinceName,
          community: station.community,
          communityName: station.communityName,
          municipality: station.municipality,
          network: station.network,
          serviceTypes: station.serviceTypes,
          wheelchair: station.wheelchair,
          source: station.source,
        },
        routes: routes.map((r) => ({
          id: r.id,
          routeId: r.routeId,
          slug: r.slug,
          shortName: r.shortName,
          longName: r.longName,
          brand: r.brand,
          serviceType: r.serviceType,
          color: r.color,
          textColor: r.textColor,
          originName: r.originName,
          destName: r.destName,
          network: r.network,
          stopsCount: r.stopsCount,
          tripCount: r.tripCount,
        })),
        alerts: alerts.map((a) => ({
          id: a.id,
          alertId: a.alertId,
          headerText: a.headerText,
          description: a.description,
          cause: a.cause,
          effect: a.effect,
          url: a.url,
          activePeriodStart: a.activePeriodStart,
          activePeriodEnd: a.activePeriodEnd,
          serviceType: a.serviceType,
        })),
        nearby: nearbyWithDistance,
      },
    });
  } catch (error) {
    reportApiError(error, "Railway station detail API error");
    return NextResponse.json(
      { success: false, error: "Error al obtener los datos de la estacion" },
      { status: 500 }
    );
  }
}
