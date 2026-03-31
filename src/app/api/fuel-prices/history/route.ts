import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { PROVINCE_NAMES, COMMUNITY_NAMES } from "@/lib/geo/ine-codes";

// Cache for 1 hour (historical data doesn't change frequently)
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    // Parameters
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30"), 1), 365);
    const scope = searchParams.get("scope") || "national"; // national, tax-free, province:XX, community:XX, road:XX
    const compareWith = searchParams.get("compare"); // Optional: another scope to compare

    // Calculate date range
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    // Fetch historical data for primary scope
    const history = await prisma.fuelPriceDailyStats.findMany({
      where: {
        scope,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    // Fetch comparison data if requested
    let comparisonHistory = null;
    if (compareWith) {
      comparisonHistory = await prisma.fuelPriceDailyStats.findMany({
        where: {
          scope: compareWith,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: "asc" },
      });
    }

    // Transform data for response
    const transformRecord = (record: typeof history[0]) => ({
      date: record.date.toISOString().split("T")[0],
      avgGasoleoA: record.avgGasoleoA ? Number(record.avgGasoleoA) : null,
      minGasoleoA: record.minGasoleoA ? Number(record.minGasoleoA) : null,
      maxGasoleoA: record.maxGasoleoA ? Number(record.maxGasoleoA) : null,
      avgGasolina95: record.avgGasolina95 ? Number(record.avgGasolina95) : null,
      minGasolina95: record.minGasolina95 ? Number(record.minGasolina95) : null,
      maxGasolina95: record.maxGasolina95 ? Number(record.maxGasolina95) : null,
      avgGasolina98: record.avgGasolina98 ? Number(record.avgGasolina98) : null,
      minGasolina98: record.minGasolina98 ? Number(record.minGasolina98) : null,
      maxGasolina98: record.maxGasolina98 ? Number(record.maxGasolina98) : null,
      stationCount: record.stationCount,
    });

    // Calculate statistics
    const calculateStats = (records: typeof history) => {
      if (records.length === 0) return null;

      const avgGasoleoA = records
        .filter(r => r.avgGasoleoA !== null)
        .map(r => Number(r.avgGasoleoA));
      const avgGasolina95 = records
        .filter(r => r.avgGasolina95 !== null)
        .map(r => Number(r.avgGasolina95));

      const first = records[0];
      const last = records[records.length - 1];

      const gasoleoAChange = first.avgGasoleoA && last.avgGasoleoA
        ? Number(last.avgGasoleoA) - Number(first.avgGasoleoA)
        : null;
      const gasolina95Change = first.avgGasolina95 && last.avgGasolina95
        ? Number(last.avgGasolina95) - Number(first.avgGasolina95)
        : null;

      return {
        recordCount: records.length,
        gasoleoA: avgGasoleoA.length > 0 ? {
          periodAvg: Number((avgGasoleoA.reduce((a, b) => a + b, 0) / avgGasoleoA.length).toFixed(3)),
          periodMin: Number(Math.min(...avgGasoleoA).toFixed(3)),
          periodMax: Number(Math.max(...avgGasoleoA).toFixed(3)),
          change: gasoleoAChange ? Number(gasoleoAChange.toFixed(3)) : null,
          changePercent: gasoleoAChange && first.avgGasoleoA
            ? Number(((gasoleoAChange / Number(first.avgGasoleoA)) * 100).toFixed(2))
            : null,
        } : null,
        gasolina95: avgGasolina95.length > 0 ? {
          periodAvg: Number((avgGasolina95.reduce((a, b) => a + b, 0) / avgGasolina95.length).toFixed(3)),
          periodMin: Number(Math.min(...avgGasolina95).toFixed(3)),
          periodMax: Number(Math.max(...avgGasolina95).toFixed(3)),
          change: gasolina95Change ? Number(gasolina95Change.toFixed(3)) : null,
          changePercent: gasolina95Change && first.avgGasolina95
            ? Number(((gasolina95Change / Number(first.avgGasolina95)) * 100).toFixed(2))
            : null,
        } : null,
      };
    };

    // Get scope display name
    const getScopeName = (s: string) => {
      if (s === "national") return "Nacional (Península + Baleares)";
      if (s === "tax-free") return "Territorios exentos (Canarias, Ceuta, Melilla)";
      if (s.startsWith("province:")) {
        const code = s.replace("province:", "");
        return PROVINCE_NAMES[code] || code;
      }
      if (s.startsWith("community:")) {
        const code = s.replace("community:", "");
        return COMMUNITY_NAMES[code] || code;
      }
      if (s.startsWith("road:")) {
        return s.replace("road:", "");
      }
      return s;
    };

    return NextResponse.json({
      success: true,
      query: {
        scope,
        scopeName: getScopeName(scope),
        days,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      stats: calculateStats(history),
      history: history.map(transformRecord),
      comparison: compareWith ? {
        scope: compareWith,
        scopeName: getScopeName(compareWith),
        stats: calculateStats(comparisonHistory || []),
        history: (comparisonHistory || []).map(transformRecord),
      } : null,
    });
  } catch (error) {
    console.error("Error fetching fuel price history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch fuel price history" },
      { status: 500 }
    );
  }
}
