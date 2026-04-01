import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface RoadData {
  road: string;
  count: number;
  avgDurationMins: number | null;
  topKmPoints: Array<{ km: string; count: number }>;
  severityBreakdown: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    VERY_HIGH: number;
  };
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30", 10) || 30, 90);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get roads with count and average duration
    const byRoad = await prisma.v16BeaconEvent.groupBy({
      by: ["roadNumber"],
      where: {
        firstSeenAt: { gte: startDate },
        roadNumber: { not: null },
      },
      _count: { id: true },
      _avg: { durationSecs: true },
      orderBy: {
        _count: { id: "desc" },
      },
      take: limit,
    });

    // Get severity breakdown per road
    const severityByRoad = await prisma.v16BeaconEvent.groupBy({
      by: ["roadNumber", "severity"],
      where: {
        firstSeenAt: { gte: startDate },
        roadNumber: {
          in: byRoad.map((r) => r.roadNumber).filter((r): r is string => r !== null),
        },
      },
      _count: { id: true },
    });

    // Get km point hotspots per road
    const kmPointsByRoad = await prisma.v16BeaconEvent.groupBy({
      by: ["roadNumber", "kmPoint"],
      where: {
        firstSeenAt: { gte: startDate },
        roadNumber: {
          in: byRoad.map((r) => r.roadNumber).filter((r): r is string => r !== null),
        },
        kmPoint: { not: null },
      },
      _count: { id: true },
      orderBy: {
        _count: { id: "desc" },
      },
    });

    // Build the response
    const roads: RoadData[] = byRoad
      .filter((r) => r.roadNumber !== null)
      .map((road) => {
        const roadNumber = road.roadNumber as string;

        // Build severity breakdown
        const severityBreakdown = {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          VERY_HIGH: 0,
        };
        severityByRoad
          .filter((s) => s.roadNumber === roadNumber)
          .forEach((s) => {
            const sev = s.severity as keyof typeof severityBreakdown;
            if (sev in severityBreakdown) {
              severityBreakdown[sev] = s._count.id;
            }
          });

        // Get top km points
        const topKmPoints = kmPointsByRoad
          .filter((k) => k.roadNumber === roadNumber && k.kmPoint !== null)
          .slice(0, 5)
          .map((k) => ({
            km: String(k.kmPoint),
            count: k._count.id,
          }));

        return {
          road: roadNumber,
          count: road._count.id,
          avgDurationMins: road._avg.durationSecs
            ? Math.round(road._avg.durationSecs / 60)
            : null,
          topKmPoints,
          severityBreakdown,
        };
      });

    // Get totals
    const totalRoads = await prisma.v16BeaconEvent.groupBy({
      by: ["roadNumber"],
      where: {
        firstSeenAt: { gte: startDate },
        roadNumber: { not: null },
      },
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        roads,
        totals: {
          uniqueRoads: totalRoads.length,
          totalBeacons: totalRoads.reduce((sum, r) => sum + r._count.id, 0),
        },
        periodDays: days,
      },
    });
  } catch (error) {
    reportApiError(error, "Historico roads API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch road data" },
      { status: 500 }
    );
  }
}
