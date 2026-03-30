/**
 * Road Network Statistics API
 *
 * GET /api/roads/stats
 *   - Get aggregate statistics about the Spanish road network
 *
 * Response includes:
 *   - Total number of roads
 *   - Total kilometers
 *   - Breakdown by road type
 *   - Breakdown by province
 *   - Top 10 longest roads
 */

export const revalidate = 86400;

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";

const CACHE_KEY = "roads:stats";
const CACHE_TTL = 3600; // 1 hour

// Province code to name mapping
const PROVINCE_NAMES: Record<string, string> = {
  "01": "Alava",
  "02": "Albacete",
  "03": "Alicante",
  "04": "Almeria",
  "05": "Avila",
  "06": "Badajoz",
  "07": "Baleares",
  "08": "Barcelona",
  "09": "Burgos",
  "10": "Caceres",
  "11": "Cadiz",
  "12": "Castellon",
  "13": "Ciudad Real",
  "14": "Cordoba",
  "15": "A Coruna",
  "16": "Cuenca",
  "17": "Girona",
  "18": "Granada",
  "19": "Guadalajara",
  "20": "Gipuzkoa",
  "21": "Huelva",
  "22": "Huesca",
  "23": "Jaen",
  "24": "Leon",
  "25": "Lleida",
  "26": "La Rioja",
  "27": "Lugo",
  "28": "Madrid",
  "29": "Malaga",
  "30": "Murcia",
  "31": "Navarra",
  "32": "Ourense",
  "33": "Asturias",
  "34": "Palencia",
  "35": "Las Palmas",
  "36": "Pontevedra",
  "37": "Salamanca",
  "38": "S.C. Tenerife",
  "39": "Cantabria",
  "40": "Segovia",
  "41": "Sevilla",
  "42": "Soria",
  "43": "Tarragona",
  "44": "Teruel",
  "45": "Toledo",
  "46": "Valencia",
  "47": "Valladolid",
  "48": "Bizkaia",
  "49": "Zamora",
  "50": "Zaragoza",
  "51": "Ceuta",
  "52": "Melilla",
};

interface TypeStats {
  type: string;
  count: number;
  totalKm: number;
  percentage: number;
}

interface ProvinceStats {
  code: string;
  name: string;
  roadCount: number;
}

interface LongestRoad {
  id: string;
  name: string | null;
  type: string;
  totalKm: number;
}

interface StatsResponse {
  success: boolean;
  data: {
    total: {
      roads: number;
      kilometers: number;
    };
    byType: TypeStats[];
    byProvince: ProvinceStats[];
    longestRoads: LongestRoad[];
    networkComparison: {
      description: string;
      europeRank: number;
      worldRank: number;
    };
  };
  meta: {
    generatedAt: string;
    source: string;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
}

export async function GET(): Promise<
  NextResponse<StatsResponse | ErrorResponse>
> {
  try {
    // Serve from Redis cache if available
    const cached = await getFromCache<StatsResponse>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
          "X-Cache": "HIT",
        },
      });
    }

    // Run targeted DB queries in parallel — no full table scan
    const [totalRoads, aggregateKm, byTypeRaw, longestRoadsRaw, provincesOnly] =
      await Promise.all([
        prisma.road.count(),
        prisma.road.aggregate({ _sum: { totalKm: true } }),
        prisma.road.groupBy({
          by: ["type"],
          _count: true,
          _sum: { totalKm: true },
        }),
        prisma.road.findMany({
          orderBy: { totalKm: "desc" },
          take: 10,
          select: { id: true, name: true, type: true, totalKm: true },
        }),
        // Only select the provinces array — avoids pulling all columns
        prisma.road.findMany({ select: { provinces: true } }),
      ]);

    const totalKm = Number(aggregateKm._sum.totalKm ?? 0);

    // Build byType from groupBy result
    const byType: TypeStats[] = byTypeRaw
      .map((row) => ({
        type: row.type,
        count: row._count,
        totalKm: Math.round(Number(row._sum.totalKm ?? 0) * 100) / 100,
        percentage: Math.round((row._count / totalRoads) * 10000) / 100,
      }))
      .sort((a, b) => b.totalKm - a.totalKm);

    // Province breakdown — still needs all rows but only the provinces field
    const provinceMap = new Map<string, number>();
    for (const row of provincesOnly) {
      for (const province of row.provinces) {
        provinceMap.set(province, (provinceMap.get(province) || 0) + 1);
      }
    }

    const byProvince: ProvinceStats[] = Array.from(provinceMap.entries())
      .map(([code, count]) => ({
        code,
        name: PROVINCE_NAMES[code] || `Unknown (${code})`,
        roadCount: count,
      }))
      .sort((a, b) => b.roadCount - a.roadCount)
      .slice(0, 20);

    // Map longest roads
    const longestRoads: LongestRoad[] = longestRoadsRaw
      .filter((road) => road.totalKm !== null)
      .map((road) => ({
        id: road.id,
        name: road.name,
        type: road.type,
        totalKm: Number(road.totalKm),
      }));

    const response: StatsResponse = {
      success: true,
      data: {
        total: {
          roads: totalRoads,
          kilometers: Math.round(totalKm),
        },
        byType,
        byProvince,
        longestRoads,
        networkComparison: {
          description:
            "La Red de Carreteras del Estado (RCE) tiene 26.473 km totales: 11.746 km de autopistas/autovias, 14.230 km de carreteras convencionales, y 497 km de carreteras multicarril. Espana tiene la red de autovias mas extensa de Europa y la tercera del mundo.",
          europeRank: 1,
          worldRank: 3,
        },
      },
      meta: {
        generatedAt: new Date().toISOString(),
        source:
          "MITMA - Ministerio de Transportes y Movilidad Sostenible, Red de Carreteras del Estado",
      },
    };

    // Store in Redis for 1 hour
    await setInCache(CACHE_KEY, response, CACHE_TTL);

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Error calculating road stats:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
