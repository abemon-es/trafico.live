import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

// Cache for 5 minutes (prices update 3x daily)
export const revalidate = 300;

interface PriceComparison {
  fuelType: string;
  fuelLabel: string;
  stationPrice: number;
  municipalityAvg: number | null;
  municipalityName: string | null;
  municipalityCount: number | null;
  provinceAvg: number;
  provinceName: string;
  provinceCount: number;
  nationalAvg: number;
  nationalCount: number;
  municipalityPercentile: number | null;
  provincePercentile: number;
  nationalPercentile: number;
}

interface ComparisonResponse {
  stationId: string;
  stationName: string;
  comparisons: PriceComparison[];
  updatedAt: string;
}

type FuelField = "priceGasoleoA" | "priceGasolina95E5" | "priceGasolina98E5" | "priceGLP";

const FUEL_TYPES: { field: FuelField; label: string; key: string }[] = [
  { field: "priceGasoleoA", label: "Gasoleo A", key: "gasoleoA" },
  { field: "priceGasolina95E5", label: "Gasolina 95", key: "gasolina95" },
  { field: "priceGasolina98E5", label: "Gasolina 98", key: "gasolina98" },
  { field: "priceGLP", label: "GLP", key: "glp" },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;

    // Get station details
    const station = await prisma.gasStation.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        municipality: true,
        municipalityCode: true,
        province: true,
        provinceName: true,
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
        priceGLP: true,
        lastPriceUpdate: true,
      },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: "Station not found" },
        { status: 404 }
      );
    }

    // Get today's date for daily stats lookup
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get province and national stats from FuelPriceDailyStats
    const [provinceStats, nationalStats] = await Promise.all([
      station.province
        ? prisma.fuelPriceDailyStats.findFirst({
            where: {
              date: today,
              scope: `province:${station.province}`,
            },
          })
        : null,
      prisma.fuelPriceDailyStats.findFirst({
        where: {
          date: today,
          scope: "national",
        },
      }),
    ]);

    // Build comparisons for each fuel type
    const comparisons: PriceComparison[] = [];

    for (const fuelType of FUEL_TYPES) {
      const stationPrice = station[fuelType.field];
      if (!stationPrice) continue;

      const price = Number(stationPrice);

      // Get municipality average (real-time calculation)
      let municipalityAvg: number | null = null;
      let municipalityCount: number | null = null;
      let municipalityPercentile: number | null = null;

      if (station.municipality) {
        const municipalityData = await prisma.gasStation.aggregate({
          where: {
            municipality: station.municipality,
            [fuelType.field]: { not: null },
          },
          _avg: { [fuelType.field]: true },
          _count: true,
        });

        if (municipalityData._count >= 2) {
          const avgValue = municipalityData._avg[fuelType.field];
          municipalityAvg = avgValue ? Number(avgValue) : null;
          municipalityCount = municipalityData._count;

          // Calculate percentile within municipality
          const cheaperCount = await prisma.gasStation.count({
            where: {
              municipality: station.municipality,
              [fuelType.field]: { lt: price },
            },
          });
          municipalityPercentile = Math.round((cheaperCount / municipalityCount) * 100);
        }
      }

      // Province average from daily stats
      let provinceAvg = 0;
      let provinceCount = 0;
      if (provinceStats) {
        const avgField = fuelType.key === "gasoleoA" ? "avgGasoleoA"
          : fuelType.key === "gasolina95" ? "avgGasolina95"
          : fuelType.key === "gasolina98" ? "avgGasolina98"
          : null;

        if (avgField && provinceStats[avgField as keyof typeof provinceStats]) {
          provinceAvg = Number(provinceStats[avgField as keyof typeof provinceStats]);
          provinceCount = provinceStats.stationCount;
        }
      }

      // If no daily stats, calculate in real-time
      if (!provinceAvg && station.province) {
        const provinceData = await prisma.gasStation.aggregate({
          where: {
            province: station.province,
            [fuelType.field]: { not: null },
          },
          _avg: { [fuelType.field]: true },
          _count: true,
        });
        const avgValue = provinceData._avg[fuelType.field];
        provinceAvg = avgValue ? Number(avgValue) : 0;
        provinceCount = provinceData._count;
      }

      // Calculate province percentile
      let provincePercentile = 50;
      if (station.province && provinceCount > 0) {
        const cheaperInProvince = await prisma.gasStation.count({
          where: {
            province: station.province,
            [fuelType.field]: { lt: price },
          },
        });
        provincePercentile = Math.round((cheaperInProvince / provinceCount) * 100);
      }

      // National average from daily stats
      let nationalAvg = 0;
      let nationalCount = 0;
      if (nationalStats) {
        const avgField = fuelType.key === "gasoleoA" ? "avgGasoleoA"
          : fuelType.key === "gasolina95" ? "avgGasolina95"
          : fuelType.key === "gasolina98" ? "avgGasolina98"
          : null;

        if (avgField && nationalStats[avgField as keyof typeof nationalStats]) {
          nationalAvg = Number(nationalStats[avgField as keyof typeof nationalStats]);
          nationalCount = nationalStats.stationCount;
        }
      }

      // If no daily stats, calculate in real-time
      if (!nationalAvg) {
        const nationalData = await prisma.gasStation.aggregate({
          where: {
            [fuelType.field]: { not: null },
          },
          _avg: { [fuelType.field]: true },
          _count: true,
        });
        const avgValue = nationalData._avg[fuelType.field];
        nationalAvg = avgValue ? Number(avgValue) : 0;
        nationalCount = nationalData._count;
      }

      // Calculate national percentile
      let nationalPercentile = 50;
      if (nationalCount > 0) {
        const cheaperNationally = await prisma.gasStation.count({
          where: {
            [fuelType.field]: { lt: price },
          },
        });
        nationalPercentile = Math.round((cheaperNationally / nationalCount) * 100);
      }

      comparisons.push({
        fuelType: fuelType.key,
        fuelLabel: fuelType.label,
        stationPrice: price,
        municipalityAvg,
        municipalityName: station.municipality,
        municipalityCount,
        provinceAvg,
        provinceName: station.provinceName || "Desconocida",
        provinceCount,
        nationalAvg,
        nationalCount,
        municipalityPercentile,
        provincePercentile,
        nationalPercentile,
      });
    }

    const response: ComparisonResponse = {
      stationId: station.id,
      stationName: station.name,
      comparisons,
      updatedAt: station.lastPriceUpdate.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    reportApiError(error, "Error fetching station comparison");
    return NextResponse.json(
      { success: false, error: "Failed to fetch comparison data" },
      { status: 500 }
    );
  }
}
