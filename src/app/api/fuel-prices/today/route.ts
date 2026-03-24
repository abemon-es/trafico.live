import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";

const CACHE_KEY = "api:fuel-prices:today";
const CACHE_TTL = 300; // 5 minutes

// Cache for 10 minutes
export const revalidate = 600;

export async function GET(request: NextRequest) {
  try {
    const cached = await getFromCache(CACHE_KEY);
    if (cached) return NextResponse.json(cached);

    // Get today's date (start of day)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get national stats for today
    const nationalStats = await prisma.fuelPriceDailyStats.findFirst({
      where: {
        scope: "national",
        date: today,
      },
    });

    // Get yesterday's stats for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayStats = await prisma.fuelPriceDailyStats.findFirst({
      where: {
        scope: "national",
        date: yesterday,
      },
    });

    // Get province stats
    const provinceStats = await prisma.fuelPriceDailyStats.findMany({
      where: {
        scope: { startsWith: "province:" },
        date: today,
      },
      orderBy: { avgGasoleoA: "asc" },
    });

    // Get community stats
    const communityStats = await prisma.fuelPriceDailyStats.findMany({
      where: {
        scope: { startsWith: "community:" },
        date: today,
      },
      orderBy: { avgGasoleoA: "asc" },
    });

    // Calculate trends
    const calculateTrend = (current: number | null, previous: number | null) => {
      if (current == null || previous == null) return null;
      const change = current - previous;
      const percentChange = (change / previous) * 100;
      return {
        change: Number(change.toFixed(3)),
        percentChange: Number(percentChange.toFixed(2)),
        direction: change > 0.001 ? "up" : change < -0.001 ? "down" : "flat",
      };
    };

    // Province name lookup
    const PROVINCES: Record<string, string> = {
      "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
      "05": "Ávila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
      "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón",
      "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
      "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
      "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
      "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
      "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
      "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
      "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
      "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
      "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
      "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla",
    };

    const COMMUNITIES: Record<string, string> = {
      "01": "Andalucía", "02": "Aragón", "03": "Asturias", "04": "Baleares",
      "05": "Canarias", "06": "Cantabria", "07": "Castilla y León",
      "08": "Castilla-La Mancha", "09": "Cataluña", "10": "Comunidad Valenciana",
      "11": "Extremadura", "12": "Galicia", "13": "Comunidad de Madrid",
      "14": "Región de Murcia", "15": "Navarra", "16": "País Vasco",
      "17": "La Rioja", "18": "Ceuta", "19": "Melilla",
    };

    const responseData = {
      success: true,
      date: today.toISOString().split("T")[0],
      national: nationalStats
        ? {
            avgGasoleoA: nationalStats.avgGasoleoA ? Number(nationalStats.avgGasoleoA) : null,
            minGasoleoA: nationalStats.minGasoleoA ? Number(nationalStats.minGasoleoA) : null,
            maxGasoleoA: nationalStats.maxGasoleoA ? Number(nationalStats.maxGasoleoA) : null,
            avgGasolina95: nationalStats.avgGasolina95 ? Number(nationalStats.avgGasolina95) : null,
            minGasolina95: nationalStats.minGasolina95 ? Number(nationalStats.minGasolina95) : null,
            maxGasolina95: nationalStats.maxGasolina95 ? Number(nationalStats.maxGasolina95) : null,
            avgGasolina98: nationalStats.avgGasolina98 ? Number(nationalStats.avgGasolina98) : null,
            minGasolina98: nationalStats.minGasolina98 ? Number(nationalStats.minGasolina98) : null,
            maxGasolina98: nationalStats.maxGasolina98 ? Number(nationalStats.maxGasolina98) : null,
            stationCount: nationalStats.stationCount,
          }
        : null,
      trends: yesterdayStats && nationalStats
        ? {
            gasoleoA: calculateTrend(
              nationalStats.avgGasoleoA ? Number(nationalStats.avgGasoleoA) : null,
              yesterdayStats.avgGasoleoA ? Number(yesterdayStats.avgGasoleoA) : null
            ),
            gasolina95: calculateTrend(
              nationalStats.avgGasolina95 ? Number(nationalStats.avgGasolina95) : null,
              yesterdayStats.avgGasolina95 ? Number(yesterdayStats.avgGasolina95) : null
            ),
            gasolina98: calculateTrend(
              nationalStats.avgGasolina98 ? Number(nationalStats.avgGasolina98) : null,
              yesterdayStats.avgGasolina98 ? Number(yesterdayStats.avgGasolina98) : null
            ),
          }
        : null,
      byProvince: provinceStats.map((s) => {
        const code = s.scope.replace("province:", "");
        return {
          code,
          name: PROVINCES[code] || code,
          avgGasoleoA: s.avgGasoleoA ? Number(s.avgGasoleoA) : null,
          avgGasolina95: s.avgGasolina95 ? Number(s.avgGasolina95) : null,
          avgGasolina98: s.avgGasolina98 ? Number(s.avgGasolina98) : null,
          stationCount: s.stationCount,
        };
      }),
      byCommunity: communityStats.map((s) => {
        const code = s.scope.replace("community:", "");
        return {
          code,
          name: COMMUNITIES[code] || code,
          avgGasoleoA: s.avgGasoleoA ? Number(s.avgGasoleoA) : null,
          avgGasolina95: s.avgGasolina95 ? Number(s.avgGasolina95) : null,
          avgGasolina98: s.avgGasolina98 ? Number(s.avgGasolina98) : null,
          stationCount: s.stationCount,
        };
      }),
    };

    await setInCache(CACHE_KEY, responseData, CACHE_TTL);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching fuel prices:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch fuel prices" },
      { status: 500 }
    );
  }
}
