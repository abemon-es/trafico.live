import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface ProvinceRanking {
  rank: number;
  provinceCode: string;
  provinceName: string;
  value: number;
  formattedValue: string;
  population?: number;
  area?: number;
  change?: number; // vs previous period
}

interface RoadRanking {
  rank: number;
  roadNumber: string;
  roadType?: string;
  value: number;
  formattedValue: string;
  incidents?: number;
  v16?: number;
  imd?: number;
}

interface RankingsAPIResponse {
  success: boolean;
  data?: {
    provinces: {
      byIncidentsTotal: ProvinceRanking[];
      byIncidentsPer100k: ProvinceRanking[];
      byV16Total: ProvinceRanking[];
      byV16Per100k: ProvinceRanking[];
      byAccidentsPer100k: ProvinceRanking[];
      mostImproved: ProvinceRanking[];
      mostWorsened: ProvinceRanking[];
    };
    roads: {
      byIncidentsTotal: RoadRanking[];
      byRiskScore: RoadRanking[];
      byIMD: RoadRanking[];
      mostDangerous: RoadRanking[];
    };
    summary: {
      totalIncidents: number;
      totalV16: number;
      periodDays: number;
      lastUpdated: string;
    };
  };
  error?: string;
}

/**
 * GET /api/rankings
 *
 * Pre-calculated rankings for provinces and roads
 *
 * Query parameters:
 * - days: Number of days for time-based data (default 30)
 * - limit: Maximum items per ranking list (default 10)
 * - category: Specific category to fetch ("provinces", "roads", or "all")
 */
export async function GET(request: NextRequest): Promise<NextResponse<RankingsAPIResponse>> {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse as NextResponse<RankingsAPIResponse>;

  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const category = searchParams.get("category") || "all";

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    // Get all provinces with population data
    const provinces = await prisma.province.findMany({
      select: {
        code: true,
        name: true,
        population: true,
        area: true,
      },
    });

    const provinceMap = new Map(provinces.map((p) => [p.code, p]));

    let provinceRankings = null;
    let roadRankings = null;

    if (category === "all" || category === "provinces") {
      // Get incidents by province (current period)
      const incidentsByProvince = await prisma.trafficIncident.groupBy({
        by: ["province"],
        where: {
          startedAt: { gte: startDate },
          province: { not: null },
        },
        _count: { id: true },
      });

      // Get incidents by province (previous period)
      const incidentsByProvincePrev = await prisma.trafficIncident.groupBy({
        by: ["province"],
        where: {
          startedAt: { gte: prevStartDate, lt: startDate },
          province: { not: null },
        },
        _count: { id: true },
      });

      const prevIncidentsMap = new Map(
        incidentsByProvincePrev.map((i) => [i.province, i._count.id])
      );

      // Get V16 by province (current period)
      const v16ByProvince = await prisma.v16BeaconEvent.groupBy({
        by: ["province"],
        where: {
          activatedAt: { gte: startDate },
          province: { not: null },
        },
        _count: { id: true },
      });

      // Get historical accidents (latest year)
      const latestAccidentYear = await prisma.historicalAccidents.findFirst({
        orderBy: { year: "desc" },
        select: { year: true },
      });

      const accidentsByProvince = latestAccidentYear
        ? await prisma.historicalAccidents.groupBy({
            by: ["province"],
            where: { year: latestAccidentYear.year },
            _sum: { accidents: true, fatalities: true },
          })
        : [];

      // Calculate rankings

      // By incidents total
      const byIncidentsTotal: ProvinceRanking[] = incidentsByProvince
        .map((i) => {
          const provinceData = provinceMap.get(i.province || "");
          const prevCount = prevIncidentsMap.get(i.province) || 0;
          const change = prevCount > 0 ? ((i._count.id - prevCount) / prevCount) * 100 : null;
          return {
            rank: 0,
            provinceCode: i.province || "",
            provinceName: provinceData?.name || i.province || "Desconocido",
            value: i._count.id,
            formattedValue: i._count.id.toLocaleString("es-ES"),
            population: provinceData?.population || undefined,
            change: change !== null ? Math.round(change) : undefined,
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, limit)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      // By incidents per 100k population
      const byIncidentsPer100k: ProvinceRanking[] = incidentsByProvince
        .map((i) => {
          const provinceData = provinceMap.get(i.province || "");
          const population = provinceData?.population || 0;
          const rate = population > 0 ? (i._count.id / population) * 100000 : 0;
          return {
            rank: 0,
            provinceCode: i.province || "",
            provinceName: provinceData?.name || i.province || "Desconocido",
            value: rate,
            formattedValue: rate.toFixed(1),
            population: population || undefined,
          };
        })
        .filter((p) => p.population && p.population > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, limit)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      // By V16 total
      const byV16Total: ProvinceRanking[] = v16ByProvince
        .map((v) => {
          const provinceData = provinceMap.get(v.province || "");
          return {
            rank: 0,
            provinceCode: v.province || "",
            provinceName: provinceData?.name || v.province || "Desconocido",
            value: v._count.id,
            formattedValue: v._count.id.toLocaleString("es-ES"),
            population: provinceData?.population || undefined,
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, limit)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      // By V16 per 100k
      const byV16Per100k: ProvinceRanking[] = v16ByProvince
        .map((v) => {
          const provinceData = provinceMap.get(v.province || "");
          const population = provinceData?.population || 0;
          const rate = population > 0 ? (v._count.id / population) * 100000 : 0;
          return {
            rank: 0,
            provinceCode: v.province || "",
            provinceName: provinceData?.name || v.province || "Desconocido",
            value: rate,
            formattedValue: rate.toFixed(1),
            population: population || undefined,
          };
        })
        .filter((p) => p.population && p.population > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, limit)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      // By accidents per 100k (historical data)
      const byAccidentsPer100k: ProvinceRanking[] = accidentsByProvince
        .map((a) => {
          const provinceData = provinceMap.get(a.province || "");
          const population = provinceData?.population || 0;
          const accidentsCount = a._sum.accidents || 0;
          const rate = population > 0 ? (accidentsCount / population) * 100000 : 0;
          return {
            rank: 0,
            provinceCode: a.province || "",
            provinceName: provinceData?.name || a.province || "Desconocido",
            value: rate,
            formattedValue: rate.toFixed(1),
            population: population || undefined,
          };
        })
        .filter((p) => p.population && p.population > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, limit)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      // Most improved (biggest decrease in incidents)
      const mostImproved: ProvinceRanking[] = incidentsByProvince
        .map((i) => {
          const provinceData = provinceMap.get(i.province || "");
          const prevCount = prevIncidentsMap.get(i.province) || 0;
          const change = prevCount > 0 ? ((i._count.id - prevCount) / prevCount) * 100 : null;
          return {
            rank: 0,
            provinceCode: i.province || "",
            provinceName: provinceData?.name || i.province || "Desconocido",
            value: change !== null ? change : 0,
            formattedValue: change !== null ? `${change > 0 ? "+" : ""}${change.toFixed(1)}%` : "N/A",
            change: change !== null ? Math.round(change) : undefined,
          };
        })
        .filter((p) => p.change !== undefined && p.change < 0)
        .sort((a, b) => a.value - b.value) // Most negative first
        .slice(0, limit)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      // Most worsened (biggest increase in incidents)
      const mostWorsened: ProvinceRanking[] = incidentsByProvince
        .map((i) => {
          const provinceData = provinceMap.get(i.province || "");
          const prevCount = prevIncidentsMap.get(i.province) || 0;
          const change = prevCount > 0 ? ((i._count.id - prevCount) / prevCount) * 100 : null;
          return {
            rank: 0,
            provinceCode: i.province || "",
            provinceName: provinceData?.name || i.province || "Desconocido",
            value: change !== null ? change : 0,
            formattedValue: change !== null ? `${change > 0 ? "+" : ""}${change.toFixed(1)}%` : "N/A",
            change: change !== null ? Math.round(change) : undefined,
          };
        })
        .filter((p) => p.change !== undefined && p.change > 0)
        .sort((a, b) => b.value - a.value) // Most positive first
        .slice(0, limit)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      provinceRankings = {
        byIncidentsTotal,
        byIncidentsPer100k,
        byV16Total,
        byV16Per100k,
        byAccidentsPer100k,
        mostImproved,
        mostWorsened,
      };
    }

    if (category === "all" || category === "roads") {
      // Get incidents by road
      const incidentsByRoad = await prisma.trafficIncident.groupBy({
        by: ["roadNumber"],
        where: {
          startedAt: { gte: startDate },
          roadNumber: { not: null },
        },
        _count: { id: true },
      });

      // Get V16 by road
      const v16ByRoad = await prisma.v16BeaconEvent.groupBy({
        by: ["roadNumber"],
        where: {
          activatedAt: { gte: startDate },
          roadNumber: { not: null },
        },
        _count: { id: true },
      });

      // Get IMD data (average per road)
      const imdByRoad = await prisma.trafficFlow.groupBy({
        by: ["roadNumber", "roadType"],
        _avg: { imd: true },
        orderBy: { _avg: { imd: "desc" } },
      });

      const imdMap = new Map(imdByRoad.map((r) => [r.roadNumber, { avgIMD: r._avg.imd || 0, roadType: r.roadType }]));
      const v16Map = new Map(v16ByRoad.map((v) => [v.roadNumber, v._count.id]));

      // By incidents total
      const byIncidentsTotal: RoadRanking[] = incidentsByRoad
        .filter((i) => i.roadNumber)
        .map((i) => {
          const imdData = imdMap.get(i.roadNumber || "");
          return {
            rank: 0,
            roadNumber: i.roadNumber || "",
            roadType: imdData?.roadType || undefined,
            value: i._count.id,
            formattedValue: i._count.id.toLocaleString("es-ES"),
            incidents: i._count.id,
            v16: v16Map.get(i.roadNumber || "") || 0,
            imd: imdData ? Math.round(imdData.avgIMD) : undefined,
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, limit)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      // Calculate risk score (incidents + v16 weighted)
      const roadStats = new Map<string, { incidents: number; v16: number; imd: number; roadType?: string }>();

      for (const i of incidentsByRoad) {
        if (!i.roadNumber) continue;
        const imdData = imdMap.get(i.roadNumber);
        roadStats.set(i.roadNumber, {
          incidents: i._count.id,
          v16: v16Map.get(i.roadNumber) || 0,
          imd: imdData ? Math.round(imdData.avgIMD) : 0,
          roadType: imdData?.roadType || undefined,
        });
      }

      for (const v of v16ByRoad) {
        if (!v.roadNumber) continue;
        if (!roadStats.has(v.roadNumber)) {
          const imdData = imdMap.get(v.roadNumber);
          roadStats.set(v.roadNumber, {
            incidents: 0,
            v16: v._count.id,
            imd: imdData ? Math.round(imdData.avgIMD) : 0,
            roadType: imdData?.roadType || undefined,
          });
        }
      }

      // By risk score (incidents * 1.0 + v16 * 0.5)
      const byRiskScore: RoadRanking[] = Array.from(roadStats.entries())
        .map(([road, stats]) => {
          const riskScore = stats.incidents * 1.0 + stats.v16 * 0.5;
          return {
            rank: 0,
            roadNumber: road,
            roadType: stats.roadType,
            value: riskScore,
            formattedValue: riskScore.toFixed(1),
            incidents: stats.incidents,
            v16: stats.v16,
            imd: stats.imd || undefined,
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, limit)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      // By IMD (traffic volume)
      const byIMD: RoadRanking[] = imdByRoad
        .filter((r) => r._avg.imd && r._avg.imd > 0)
        .slice(0, limit)
        .map((r, index) => ({
          rank: index + 1,
          roadNumber: r.roadNumber,
          roadType: r.roadType || undefined,
          value: r._avg.imd || 0,
          formattedValue: Math.round(r._avg.imd || 0).toLocaleString("es-ES"),
          imd: Math.round(r._avg.imd || 0),
        }));

      // Most dangerous (highest incident rate relative to traffic)
      const mostDangerous: RoadRanking[] = Array.from(roadStats.entries())
        .filter(([, stats]) => stats.imd > 0)
        .map(([road, stats]) => {
          // Incidents per million vehicles (IMD * days = total vehicles)
          const totalVehicles = stats.imd * days;
          const rate = totalVehicles > 0 ? (stats.incidents / totalVehicles) * 1000000 : 0;
          return {
            rank: 0,
            roadNumber: road,
            roadType: stats.roadType,
            value: rate,
            formattedValue: rate.toFixed(2),
            incidents: stats.incidents,
            v16: stats.v16,
            imd: stats.imd,
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, limit)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      roadRankings = {
        byIncidentsTotal,
        byRiskScore,
        byIMD,
        mostDangerous,
      };
    }

    // Get totals for summary
    const [totalIncidents, totalV16] = await Promise.all([
      prisma.trafficIncident.count({ where: { startedAt: { gte: startDate } } }),
      prisma.v16BeaconEvent.count({ where: { activatedAt: { gte: startDate } } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        provinces: provinceRankings || {
          byIncidentsTotal: [],
          byIncidentsPer100k: [],
          byV16Total: [],
          byV16Per100k: [],
          byAccidentsPer100k: [],
          mostImproved: [],
          mostWorsened: [],
        },
        roads: roadRankings || {
          byIncidentsTotal: [],
          byRiskScore: [],
          byIMD: [],
          mostDangerous: [],
        },
        summary: {
          totalIncidents,
          totalV16,
          periodDays: days,
          lastUpdated: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Rankings API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to calculate rankings" },
      { status: 500 }
    );
  }
}
