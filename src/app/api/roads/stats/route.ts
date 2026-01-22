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

import { NextResponse } from "next/server";
import prisma from "@/lib/db";

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
    // Get all roads for aggregation
    const roads = await prisma.road.findMany();

    // Calculate total stats
    const totalRoads = roads.length;
    const totalKm = roads.reduce(
      (sum, road) => sum + (road.totalKm ? Number(road.totalKm) : 0),
      0
    );

    // Calculate by type
    const typeMap = new Map<
      string,
      { count: number; totalKm: number }
    >();
    for (const road of roads) {
      const current = typeMap.get(road.type) || { count: 0, totalKm: 0 };
      typeMap.set(road.type, {
        count: current.count + 1,
        totalKm: current.totalKm + (road.totalKm ? Number(road.totalKm) : 0),
      });
    }

    const byType: TypeStats[] = Array.from(typeMap.entries())
      .map(([type, stats]) => ({
        type,
        count: stats.count,
        totalKm: Math.round(stats.totalKm * 100) / 100,
        percentage: Math.round((stats.count / totalRoads) * 10000) / 100,
      }))
      .sort((a, b) => b.totalKm - a.totalKm);

    // Calculate by province (count roads passing through each)
    const provinceMap = new Map<string, number>();
    for (const road of roads) {
      for (const province of road.provinces) {
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
      .slice(0, 20); // Top 20 provinces

    // Get longest roads
    const longestRoads: LongestRoad[] = roads
      .filter((road) => road.totalKm !== null)
      .sort((a, b) => Number(b.totalKm) - Number(a.totalKm))
      .slice(0, 10)
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

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
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
