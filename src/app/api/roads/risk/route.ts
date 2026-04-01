import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { RiskType, Severity } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

function calculateRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

interface StaticRiskZone {
  id: string;
  type: RiskType;
  roadNumber: string;
  kmStart: number;
  kmEnd: number;
  geometry: unknown;
  severity: Severity;
  description: string | null;
  animalType: string | null;
  incidentCount: number | null;
}

/**
 * GET /api/roads/risk
 *
 * Returns road risk analysis combining:
 * 1. Dynamic risk scores based on recent incidents and V16 beacons
 * 2. Static risk zones (TEFIVA, motorcycle, cyclist, pedestrian)
 *
 * Query parameters:
 * - days: Number of days to analyze (default: 30)
 * - type: Filter static zones by type (MOTORCYCLE, ANIMAL, CYCLIST, PEDESTRIAN)
 * - road: Filter by specific road number
 * - includeStatic: Include static risk zones ("true" or "false", default "true")
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30", 10) || 30, 90);
    const riskTypeFilter = searchParams.get("type") as RiskType | null;
    const roadFilter = searchParams.get("road");
    const includeStatic = searchParams.get("includeStatic") !== "false";

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get incidents grouped by road
    const incidentsByRoad = await prisma.trafficIncident.groupBy({
      by: ["roadNumber"],
      where: {
        startedAt: { gte: startDate },
        roadNumber: { not: null },
      },
      _count: true,
      _avg: { durationSecs: true },
    });

    // Get V16 beacons grouped by road
    const v16ByRoad = await prisma.v16BeaconEvent.groupBy({
      by: ["roadNumber"],
      where: {
        activatedAt: { gte: startDate },
        roadNumber: { not: null },
      },
      _count: true,
    });

    // Get severity breakdown per road
    const severityByRoad = await prisma.trafficIncident.groupBy({
      by: ["roadNumber", "severity"],
      where: {
        startedAt: { gte: startDate },
        roadNumber: { not: null },
      },
      _count: true,
    });

    // Get hotspots (KM points with multiple incidents)
    const hotspotsByRoad = await prisma.trafficIncident.groupBy({
      by: ["roadNumber", "kmPoint"],
      where: {
        startedAt: { gte: startDate },
        roadNumber: { not: null },
        kmPoint: { not: null },
      },
      _count: true,
      orderBy: { _count: { kmPoint: "desc" } },
    });

    // Build V16 map
    const v16Map: Record<string, number> = {};
    for (const item of v16ByRoad) {
      if (item.roadNumber) {
        v16Map[item.roadNumber] = item._count;
      }
    }

    // Build severity map
    const severityMap: Record<string, Record<string, number>> = {};
    for (const item of severityByRoad) {
      if (item.roadNumber) {
        if (!severityMap[item.roadNumber]) {
          severityMap[item.roadNumber] = { LOW: 0, MEDIUM: 0, HIGH: 0, VERY_HIGH: 0 };
        }
        severityMap[item.roadNumber][item.severity] = item._count;
      }
    }

    // Build hotspots map
    const hotspotsMap: Record<string, Array<{ km: number; count: number }>> = {};
    for (const item of hotspotsByRoad) {
      if (item.roadNumber && item.kmPoint !== null && item._count >= 2) {
        if (!hotspotsMap[item.roadNumber]) {
          hotspotsMap[item.roadNumber] = [];
        }
        hotspotsMap[item.roadNumber].push({
          km: Number(item.kmPoint),
          count: item._count,
        });
      }
    }

    // Calculate max counts for normalization
    const maxIncidentCount = Math.max(...incidentsByRoad.map((r) => r._count), 1);
    const maxV16Count = Math.max(...Object.values(v16Map), 1);

    // Calculate risk scores for each road
    const roads = incidentsByRoad
      .map((road) => {
        const roadNumber = road.roadNumber!;
        const incidentCount = road._count;
        const v16Count = v16Map[roadNumber] || 0;
        const avgDurationSecs = road._avg.durationSecs;
        const severity = severityMap[roadNumber] || { LOW: 0, MEDIUM: 0, HIGH: 0, VERY_HIGH: 0 };
        const hotspots = hotspotsMap[roadNumber] || [];

        // Calculate severity score (weighted)
        const severityScore =
          (severity.LOW * 1 +
            severity.MEDIUM * 2 +
            severity.HIGH * 4 +
            severity.VERY_HIGH * 8) /
          Math.max(incidentCount, 1);

        // Calculate normalized scores (0-100)
        const incidentScore = (incidentCount / maxIncidentCount) * 40; // 40% weight
        const v16Score = (v16Count / maxV16Count) * 20; // 20% weight
        const severityNormalized = Math.min(severityScore / 4, 1) * 30; // 30% weight (cap at 4)
        const hotspotScore = Math.min(hotspots.length * 5, 10); // 10% weight (max 10)

        const riskScore = Math.round(incidentScore + v16Score + severityNormalized + hotspotScore);
        const riskLevel = calculateRiskLevel(riskScore);

        return {
          road: roadNumber,
          incidentCount,
          v16Count,
          avgDurationMins: avgDurationSecs ? Math.round(avgDurationSecs / 60) : null,
          severityScore: Math.round(severityScore * 10) / 10,
          riskScore,
          riskLevel,
          hotspots: hotspots.slice(0, 5), // Top 5 hotspots
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore);

    // Calculate summary for dynamic risk
    const dynamicSummary = {
      totalRoads: roads.length,
      criticalRoads: roads.filter((r) => r.riskLevel === "CRITICAL").length,
      highRiskRoads: roads.filter((r) => r.riskLevel === "HIGH").length,
    };

    // Fetch static risk zones if requested
    let staticZones: StaticRiskZone[] = [];
    let staticSummary: Record<string, number> = {};

    if (includeStatic) {
      // Build where clause for static zones
      const staticWhere: Record<string, unknown> = {};
      if (riskTypeFilter) {
        staticWhere.type = riskTypeFilter;
      }
      if (roadFilter) {
        staticWhere.roadNumber = {
          contains: roadFilter,
          mode: "insensitive",
        };
      }

      const rawStaticZones = await prisma.riskZone.findMany({
        where: staticWhere,
        orderBy: [
          { severity: "desc" },
          { roadNumber: "asc" },
          { kmStart: "asc" },
        ],
      });

      staticZones = rawStaticZones.map((zone) => ({
        id: zone.id,
        type: zone.type,
        roadNumber: zone.roadNumber,
        kmStart: Number(zone.kmStart),
        kmEnd: Number(zone.kmEnd),
        geometry: zone.geometry,
        severity: zone.severity,
        description: zone.description,
        animalType: zone.animalType,
        incidentCount: zone.incidentCount,
      }));

      // Summary by type
      const byType = await prisma.riskZone.groupBy({
        by: ["type"],
        _count: true,
      });
      for (const item of byType) {
        staticSummary[item.type] = item._count;
      }
    }

    // Optionally filter dynamic roads by roadFilter
    let filteredRoads = roads;
    if (roadFilter) {
      filteredRoads = roads.filter((r) =>
        r.road.toLowerCase().includes(roadFilter.toLowerCase())
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        // Dynamic risk analysis (based on recent incidents)
        dynamicRisk: {
          roads: filteredRoads.slice(0, 50), // Top 50 roads
          summary: dynamicSummary,
          periodDays: days,
        },
        // Static risk zones (from RiskZone table)
        staticRiskZones: includeStatic
          ? {
              zones: staticZones,
              summary: staticSummary,
              totalZones: staticZones.length,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Road risk API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch road risk data" },
      { status: 500 }
    );
  }
}
