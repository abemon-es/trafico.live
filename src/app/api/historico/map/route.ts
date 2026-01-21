import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

interface BeaconMapData {
  id: string;
  lat: number;
  lng: number;
  activatedAt: string;
  road: string | null;
  province: string | null;
  severity: string;
  durationSecs: number | null;
  severityWeight: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    // Get V16 beacon events for the period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch beacon locations for the map
    const beacons = await prisma.v16BeaconEvent.findMany({
      where: {
        firstSeenAt: { gte: startDate },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        activatedAt: true,
        roadNumber: true,
        provinceName: true,
        severity: true,
        durationSecs: true,
      },
      orderBy: {
        activatedAt: "desc",
      },
    });

    // Map severity to numeric weight for heatmap intensity
    const severityWeight: Record<string, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      VERY_HIGH: 4,
    };

    // Transform to map-friendly format
    const mapBeacons: BeaconMapData[] = beacons.map((b) => ({
      id: b.id,
      lat: Number(b.latitude),
      lng: Number(b.longitude),
      activatedAt: b.activatedAt.toISOString(),
      road: b.roadNumber,
      province: b.provinceName,
      severity: b.severity,
      durationSecs: b.durationSecs,
      severityWeight: severityWeight[b.severity] || 1,
    }));

    // Calculate clusters if we have many points
    // Simple grid-based clustering for provinces
    const provinceClusters: Record<string, { count: number; lat: number; lng: number }> = {};

    for (const beacon of mapBeacons) {
      if (beacon.province) {
        if (!provinceClusters[beacon.province]) {
          provinceClusters[beacon.province] = {
            count: 0,
            lat: beacon.lat,
            lng: beacon.lng,
          };
        }
        provinceClusters[beacon.province].count++;
        // Update to centroid (moving average)
        const cluster = provinceClusters[beacon.province];
        cluster.lat = (cluster.lat * (cluster.count - 1) + beacon.lat) / cluster.count;
        cluster.lng = (cluster.lng * (cluster.count - 1) + beacon.lng) / cluster.count;
      }
    }

    const clusters = Object.entries(provinceClusters).map(([province, data]) => ({
      province,
      lat: data.lat,
      lng: data.lng,
      count: data.count,
    }));

    return NextResponse.json({
      success: true,
      data: {
        beacons: mapBeacons,
        clusters,
        count: mapBeacons.length,
        periodDays: days,
      },
    });
  } catch (error) {
    console.error("Historico map API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch map data" },
      { status: 500 }
    );
  }
}
