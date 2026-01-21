import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ community: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { community: slug } = await params;

    const community = await prisma.community.findUnique({
      where: { slug },
      include: {
        provinces: {
          include: {
            municipalities: {
              select: {
                code: true,
                name: true,
                slug: true,
                population: true,
              },
              orderBy: { population: "desc" },
              take: 5,
            },
          },
          orderBy: { population: "desc" },
        },
      },
    });

    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 }
      );
    }

    // Get province codes for filtering
    const provinceCodes = community.provinces.map((p) => p.code);

    // Get accident stats and real-time incident data in parallel
    const [accidents, activeIncidents, incidentsByType, incidentsBySource, activeV16] = await Promise.all([
      // Historical accidents
      prisma.historicalAccidents.aggregate({
        where: { province: { in: provinceCodes } },
        _sum: {
          accidents: true,
          fatalities: true,
          hospitalized: true,
        },
      }),
      // Active traffic incidents in this community
      prisma.trafficIncident.count({
        where: {
          isActive: true,
          community: community.code,
        },
      }),
      // Incidents by type
      prisma.trafficIncident.groupBy({
        by: ["type"],
        where: {
          isActive: true,
          community: community.code,
        },
        _count: true,
      }),
      // Incidents by source
      prisma.trafficIncident.groupBy({
        by: ["source"],
        where: {
          isActive: true,
          community: community.code,
        },
        _count: true,
      }),
      // Active V16 beacons
      prisma.v16BeaconEvent.count({
        where: {
          isActive: true,
          community: community.code,
        },
      }),
    ]);

    // Build incident breakdown
    const byType: Record<string, number> = {};
    for (const item of incidentsByType) {
      byType[item.type] = item._count;
    }

    const bySource: Record<string, number> = {};
    for (const item of incidentsBySource) {
      if (item.source) {
        bySource[item.source] = item._count;
      }
    }

    const stats = {
      totalAccidents: accidents._sum.accidents || 0,
      totalFatalities: accidents._sum.fatalities || 0,
      totalHospitalized: accidents._sum.hospitalized || 0,
      // Real-time data
      activeIncidents,
      activeV16,
      incidentsByType: byType,
      incidentsBySource: bySource,
    };

    return NextResponse.json({
      success: true,
      data: {
        community,
        stats,
      },
    });
  } catch (error) {
    console.error("Community API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch community data" },
      { status: 500 }
    );
  }
}
