import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Cache the response for 60 seconds
export const revalidate = 60;

export async function GET() {
  try {
    // Query active V16 beacons from database (stored by v16-collector every 5 min)
    const dbBeacons = await prisma.v16BeaconEvent.findMany({
      where: { isActive: true },
      orderBy: { activatedAt: "desc" },
    });

    // Convert to GeoJSON for map consumption
    const geojson = {
      type: "FeatureCollection" as const,
      features: dbBeacons.map((beacon) => ({
        type: "Feature" as const,
        id: beacon.recordId || beacon.situationId,
        geometry: {
          type: "Point" as const,
          coordinates: [Number(beacon.longitude), Number(beacon.latitude)],
        },
        properties: {
          situationId: beacon.situationId,
          recordId: beacon.recordId,
          activatedAt: beacon.activatedAt.toISOString(),
          deactivatedAt: beacon.deactivatedAt?.toISOString() || null,
          roadNumber: beacon.roadNumber,
          kmPoint: beacon.kmPoint ? Number(beacon.kmPoint) : null,
          direction: beacon.direction,
          severity: beacon.severity,
          mobilityType: beacon.mobilityType,
          description: beacon.description,
          province: beacon.province,
          provinceName: beacon.provinceName,
          community: beacon.community,
          communityName: beacon.communityName,
        },
      })),
    };

    // Get last fetch time for freshness indicator
    const latestFetch = dbBeacons.length > 0
      ? dbBeacons.reduce((latest, b) =>
          b.fetchedAt > latest ? b.fetchedAt : latest,
          dbBeacons[0].fetchedAt
        )
      : new Date();

    return NextResponse.json({
      count: dbBeacons.length,
      lastUpdated: latestFetch.toISOString(),
      source: "database",
      geojson,
      beacons: dbBeacons.map((b) => ({
        id: b.recordId || b.situationId,
        lat: Number(b.latitude),
        lng: Number(b.longitude),
        road: b.roadNumber,
        km: b.kmPoint ? Number(b.kmPoint) : null,
        severity: b.severity,
        activatedAt: b.activatedAt.toISOString(),
        description: b.description,
        province: b.provinceName,
        community: b.communityName,
      })),
    });
  } catch (error) {
    console.error("Error fetching V16 beacons from database:", error);
    return NextResponse.json(
      { error: "Internal server error", beacons: [] },
      { status: 500 }
    );
  }
}
