import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Apply rate limiting (expensive endpoint)
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Fetch all data in parallel for performance
    const [
      communities,
      provinceStats,
      accidents,
      activeIncidents,
      activeV16,
      incidentsBySource,
      incidentsByCommunity,
    ] = await Promise.all([
      // Communities with provinces
      prisma.community.findMany({
        include: {
          provinces: {
            select: {
              code: true,
              name: true,
              slug: true,
              population: true,
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      // Province stats
      prisma.province.aggregate({
        _sum: { population: true },
        _count: true,
      }),
      // Historical accidents
      prisma.historicalAccidents.aggregate({
        _sum: {
          accidents: true,
          fatalities: true,
          hospitalized: true,
        },
      }),
      // Active traffic incidents (national)
      prisma.trafficIncident.count({
        where: { isActive: true },
      }),
      // Active V16 beacons (national)
      prisma.v16BeaconEvent.count({
        where: { isActive: true },
      }),
      // Incidents by source
      prisma.trafficIncident.groupBy({
        by: ["source"],
        where: { isActive: true },
        _count: true,
      }),
      // Incidents by community
      prisma.trafficIncident.groupBy({
        by: ["community"],
        where: { isActive: true },
        _count: true,
      }),
    ]);

    // Build source breakdown
    const bySource: Record<string, number> = {};
    for (const item of incidentsBySource) {
      if (item.source) {
        bySource[item.source] = item._count;
      }
    }

    // Build community breakdown
    const byCommunity: Record<string, number> = {};
    for (const item of incidentsByCommunity) {
      if (item.community) {
        byCommunity[item.community] = item._count;
      }
    }

    const stats = {
      totalPopulation: provinceStats._sum.population || 0,
      provinceCount: provinceStats._count,
      totalAccidents: accidents._sum.accidents || 0,
      totalFatalities: accidents._sum.fatalities || 0,
      totalHospitalized: accidents._sum.hospitalized || 0,
      // Real-time national data
      activeIncidents,
      activeV16,
      incidentsBySource: bySource,
      incidentsByCommunity: byCommunity,
    };

    return NextResponse.json({
      success: true,
      data: {
        communities,
        stats,
      },
    });
  } catch (error) {
    console.error("España API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch España data" },
      { status: 500 }
    );
  }
}
