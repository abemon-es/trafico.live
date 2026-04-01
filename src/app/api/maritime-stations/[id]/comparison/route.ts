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

type FuelField = "priceGasoleoA" | "priceGasolina95E5";

const FUEL_TYPES: { field: FuelField; label: string; key: string }[] = [
  { field: "priceGasoleoA", label: "Gasoleo A", key: "gasoleoA" },
  { field: "priceGasolina95E5", label: "Gasolina 95", key: "gasolina95" },
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
    const station = await prisma.maritimeStation.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        locality: true,
        province: true,
        provinceName: true,
        priceGasoleoA: true,
        priceGasolina95E5: true,
        lastPriceUpdate: true,
      },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: "Station not found" },
        { status: 404 }
      );
    }

    // Build comparisons for each fuel type
    const comparisons: PriceComparison[] = [];

    for (const fuelType of FUEL_TYPES) {
      const stationPrice = station[fuelType.field];
      if (!stationPrice) continue;

      const price = Number(stationPrice);

      // Province average for maritime stations
      let provinceAvg = 0;
      let provinceCount = 0;
      let provincePercentile = 50;

      if (station.province) {
        const provinceData = await prisma.maritimeStation.aggregate({
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

        if (provinceCount > 0) {
          const cheaperInProvince = await prisma.maritimeStation.count({
            where: {
              province: station.province,
              [fuelType.field]: { lt: price },
            },
          });
          provincePercentile = Math.round((cheaperInProvince / provinceCount) * 100);
        }
      }

      // National average
      const nationalData = await prisma.maritimeStation.aggregate({
        where: {
          [fuelType.field]: { not: null },
        },
        _avg: { [fuelType.field]: true },
        _count: true,
      });
      const nationalAvgValue = nationalData._avg[fuelType.field];
      const nationalAvg = nationalAvgValue ? Number(nationalAvgValue) : 0;
      const nationalCount = nationalData._count;

      // National percentile
      let nationalPercentile = 50;
      if (nationalCount > 0) {
        const cheaperNationally = await prisma.maritimeStation.count({
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
        municipalityAvg: null, // Maritime stations typically don't have multiple per municipality
        municipalityName: station.locality,
        municipalityCount: null,
        provinceAvg,
        provinceName: station.provinceName || "Desconocida",
        provinceCount,
        nationalAvg,
        nationalCount,
        municipalityPercentile: null,
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
    reportApiError(error, "Error fetching maritime station comparison");
    return NextResponse.json(
      { success: false, error: "Failed to fetch comparison data" },
      { status: 500 }
    );
  }
}
