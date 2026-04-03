import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

const CACHE_KEY_PREFIX = "api:gas-stations";
const CACHE_TTL = 300; // 5 minutes — prices update 3x/day

// Cache for 5 minutes
export const revalidate = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;

    const cacheKey = `${CACHE_KEY_PREFIX}:${id}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const station = await prisma.gasStation.findUnique({
      where: { id },
      include: {
        priceHistory: {
          orderBy: { recordedAt: "desc" },
          take: 30, // Last 30 days
        },
      },
    });

    if (!station) {
      return NextResponse.json(
        { success: false, error: "Gas station not found" },
        { status: 404 }
      );
    }

    const responseData = {
      success: true,
      station: {
        id: station.id,
        name: station.name,
        latitude: Number(station.latitude),
        longitude: Number(station.longitude),
        address: station.address,
        postalCode: station.postalCode,
        locality: station.locality,
        municipality: station.municipality,
        municipalityCode: station.municipalityCode,
        province: station.province,
        provinceName: station.provinceName,
        communityCode: station.communityCode,
        nearestRoad: station.nearestRoad,
        roadKm: station.roadKm ? Number(station.roadKm) : null,

        // All prices
        priceGasoleoA: station.priceGasoleoA ? Number(station.priceGasoleoA) : null,
        priceGasoleoB: station.priceGasoleoB ? Number(station.priceGasoleoB) : null,
        priceGasoleoPremium: station.priceGasoleoPremium ? Number(station.priceGasoleoPremium) : null,
        priceGasolina95E5: station.priceGasolina95E5 ? Number(station.priceGasolina95E5) : null,
        priceGasolina95E10: station.priceGasolina95E10 ? Number(station.priceGasolina95E10) : null,
        priceGasolina98E5: station.priceGasolina98E5 ? Number(station.priceGasolina98E5) : null,
        priceGasolina98E10: station.priceGasolina98E10 ? Number(station.priceGasolina98E10) : null,
        priceGLP: station.priceGLP ? Number(station.priceGLP) : null,
        priceGNC: station.priceGNC ? Number(station.priceGNC) : null,
        priceGNL: station.priceGNL ? Number(station.priceGNL) : null,
        priceHidrogeno: station.priceHidrogeno ? Number(station.priceHidrogeno) : null,
        priceAdblue: station.priceAdblue ? Number(station.priceAdblue) : null,
        priceGasoleoNuevoA: station.priceGasoleoNuevoA ? Number(station.priceGasoleoNuevoA) : null,
        priceBioetanol: station.priceBioetanol ? Number(station.priceBioetanol) : null,
        priceBiodiesel: station.priceBiodiesel ? Number(station.priceBiodiesel) : null,

        // Station info
        schedule: station.schedule,
        is24h: station.is24h,
        margin: station.margin,
        saleType: station.saleType,

        // Timestamps
        lastPriceUpdate: station.lastPriceUpdate.toISOString(),
        lastUpdated: station.lastUpdated.toISOString(),

        // Price history
        priceHistory: station.priceHistory.map((h) => ({
          date: h.recordedAt.toISOString().split("T")[0],
          priceGasoleoA: h.priceGasoleoA ? Number(h.priceGasoleoA) : null,
          priceGasolina95E5: h.priceGasolina95E5 ? Number(h.priceGasolina95E5) : null,
          priceGasolina98E5: h.priceGasolina98E5 ? Number(h.priceGasolina98E5) : null,
          priceGLP: h.priceGLP ? Number(h.priceGLP) : null,
        })),
      },
    };

    await setInCache(cacheKey, responseData, CACHE_TTL);
    return NextResponse.json(responseData);
  } catch (error) {
    reportApiError(error, "Error fetching gas station");
    return NextResponse.json(
      { success: false, error: "Failed to fetch gas station" },
      { status: 500 }
    );
  }
}
