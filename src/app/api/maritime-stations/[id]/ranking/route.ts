import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

// Cache for 5 minutes (prices update 3x daily)
export const revalidate = 300;

interface RankingData {
  scope: "municipality" | "province" | "national";
  scopeName: string;
  rank: number;
  total: number;
  percentile: number;
  price: number;
  cheapestPrice: number;
  avgPrice: number;
}

interface RankingResponse {
  stationId: string;
  stationName: string;
  fuel: string;
  fuelLabel: string;
  rankings: RankingData[];
}

type FuelField = "priceGasoleoA" | "priceGasolina95E5";

const FUEL_MAP: Record<string, { field: FuelField; label: string }> = {
  gasoleoA: { field: "priceGasoleoA", label: "Gasoleo A" },
  gasolina95: { field: "priceGasolina95E5", label: "Gasolina 95" },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const fuelParam = searchParams.get("fuel") || "gasoleoA";

    const fuelConfig = FUEL_MAP[fuelParam];
    if (!fuelConfig) {
      return NextResponse.json(
        { success: false, error: "Invalid fuel type" },
        { status: 400 }
      );
    }

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
      },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: "Station not found" },
        { status: 404 }
      );
    }

    const stationPrice = station[fuelConfig.field];
    if (!stationPrice) {
      return NextResponse.json(
        { success: false, error: `Station does not have ${fuelConfig.label} price` },
        { status: 404 }
      );
    }

    const price = Number(stationPrice);
    const rankings: RankingData[] = [];

    // Province ranking
    if (station.province) {
      const [cheaperCount, total, aggregates] = await Promise.all([
        prisma.maritimeStation.count({
          where: {
            province: station.province,
            [fuelConfig.field]: { lt: price },
          },
        }),
        prisma.maritimeStation.count({
          where: {
            province: station.province,
            [fuelConfig.field]: { not: null },
          },
        }),
        prisma.maritimeStation.aggregate({
          where: {
            province: station.province,
            [fuelConfig.field]: { not: null },
          },
          _min: { [fuelConfig.field]: true },
          _avg: { [fuelConfig.field]: true },
        }),
      ]);

      if (total >= 2) {
        const rank = cheaperCount + 1;
        const minPrice = aggregates._min[fuelConfig.field];
        const avgPrice = aggregates._avg[fuelConfig.field];

        rankings.push({
          scope: "province",
          scopeName: station.provinceName || station.province,
          rank,
          total,
          percentile: Math.round((cheaperCount / total) * 100),
          price,
          cheapestPrice: minPrice ? Number(minPrice) : price,
          avgPrice: avgPrice ? Number(avgPrice) : price,
        });
      }
    }

    // National ranking
    const [cheaperCount, total, aggregates] = await Promise.all([
      prisma.maritimeStation.count({
        where: {
          [fuelConfig.field]: { lt: price },
        },
      }),
      prisma.maritimeStation.count({
        where: {
          [fuelConfig.field]: { not: null },
        },
      }),
      prisma.maritimeStation.aggregate({
        where: {
          [fuelConfig.field]: { not: null },
        },
        _min: { [fuelConfig.field]: true },
        _avg: { [fuelConfig.field]: true },
      }),
    ]);

    const rank = cheaperCount + 1;
    const minPrice = aggregates._min[fuelConfig.field];
    const avgPrice = aggregates._avg[fuelConfig.field];

    rankings.push({
      scope: "national",
      scopeName: "Espana",
      rank,
      total,
      percentile: Math.round((cheaperCount / total) * 100),
      price,
      cheapestPrice: minPrice ? Number(minPrice) : price,
      avgPrice: avgPrice ? Number(avgPrice) : price,
    });

    const response: RankingResponse = {
      stationId: station.id,
      stationName: station.name,
      fuel: fuelParam,
      fuelLabel: fuelConfig.label,
      rankings,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    reportApiError(error, "Error fetching maritime station ranking");
    return NextResponse.json(
      { success: false, error: "Failed to fetch ranking data" },
      { status: 500 }
    );
  }
}
