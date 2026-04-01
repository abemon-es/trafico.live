import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/auth";

export const revalidate = 300; // 5 min — prices update 3x daily

type FuelField =
  | "priceGasoleoSimples"
  | "priceGasoleoEspecial"
  | "priceGasolina95"
  | "priceGasolina95Especial"
  | "priceGasolina98"
  | "priceGasolina98Especial"
  | "priceGPL"
  | "priceGNC";

const VALID_FUEL_FIELDS: FuelField[] = [
  "priceGasoleoSimples",
  "priceGasoleoEspecial",
  "priceGasolina95",
  "priceGasolina95Especial",
  "priceGasolina98",
  "priceGasolina98Especial",
  "priceGPL",
  "priceGNC",
];

export async function GET(request: NextRequest) {
  const authError = authenticateRequest(request);
  if (authError) return authError;

  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const sp = request.nextUrl.searchParams;

    const district = sp.get("district");
    const municipality = sp.get("municipality");
    const brand = sp.get("brand");
    const fuelParam = sp.get("fuel") || "gasoleoSimples";
    const limit = Math.min(parseInt(sp.get("limit") || "100"), 500);
    const offset = parseInt(sp.get("offset") || "0");

    // Map short fuel name to Prisma field
    const fuelFieldMap: Record<string, FuelField> = {
      gasoleoSimples: "priceGasoleoSimples",
      gasoleoEspecial: "priceGasoleoEspecial",
      gasolina95: "priceGasolina95",
      gasolina95Especial: "priceGasolina95Especial",
      gasolina98: "priceGasolina98",
      gasolina98Especial: "priceGasolina98Especial",
      gpl: "priceGPL",
      gnc: "priceGNC",
    };

    const fuelField: FuelField =
      fuelFieldMap[fuelParam] ??
      (VALID_FUEL_FIELDS.includes(fuelParam as FuelField)
        ? (fuelParam as FuelField)
        : "priceGasoleoSimples");

    // Build where clause
    const where: Record<string, unknown> = {
      [fuelField]: { not: null },
    };

    if (district) {
      where.district = { equals: district, mode: "insensitive" };
    }
    if (municipality) {
      where.municipality = { contains: municipality, mode: "insensitive" };
    }
    if (brand) {
      where.brand = { contains: brand, mode: "insensitive" };
    }

    const [stations, total, aggregates] = await Promise.all([
      prisma.portugalGasStation.findMany({
        where,
        orderBy: { [fuelField]: "asc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          address: true,
          locality: true,
          district: true,
          municipality: true,
          brand: true,
          stationType: true,
          is24h: true,
          lastPriceUpdate: true,
          priceGasoleoSimples: true,
          priceGasoleoEspecial: true,
          priceGasoleoColorido: true,
          priceGasolina95: true,
          priceGasolina95Especial: true,
          priceGasolina98: true,
          priceGasolina98Especial: true,
          priceGPL: true,
          priceGNC: true,
        },
      }),
      prisma.portugalGasStation.count({ where }),
      prisma.portugalGasStation.aggregate({
        _avg: {
          priceGasoleoSimples: true,
          priceGasolina95: true,
          priceGasolina98: true,
          priceGPL: true,
        },
        _min: {
          priceGasoleoSimples: true,
          priceGasolina95: true,
          priceGasolina98: true,
          priceGPL: true,
        },
        _count: { id: true },
      }),
    ]);

    const data = stations.map((s) => ({
      id: s.id,
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      address: s.address,
      locality: s.locality,
      district: s.district,
      municipality: s.municipality,
      brand: s.brand,
      stationType: s.stationType,
      is24h: s.is24h,
      lastPriceUpdate: s.lastPriceUpdate?.toISOString() ?? null,
      prices: {
        gasoleoSimples: s.priceGasoleoSimples ? Number(s.priceGasoleoSimples) : null,
        gasoleoEspecial: s.priceGasoleoEspecial ? Number(s.priceGasoleoEspecial) : null,
        gasoleoColorido: s.priceGasoleoColorido ? Number(s.priceGasoleoColorido) : null,
        gasolina95: s.priceGasolina95 ? Number(s.priceGasolina95) : null,
        gasolina95Especial: s.priceGasolina95Especial
          ? Number(s.priceGasolina95Especial)
          : null,
        gasolina98: s.priceGasolina98 ? Number(s.priceGasolina98) : null,
        gasolina98Especial: s.priceGasolina98Especial
          ? Number(s.priceGasolina98Especial)
          : null,
        gpl: s.priceGPL ? Number(s.priceGPL) : null,
        gnc: s.priceGNC ? Number(s.priceGNC) : null,
      },
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      stats: {
        totalStations: aggregates._count.id,
        avgPrices: {
          gasoleoSimples: aggregates._avg.priceGasoleoSimples
            ? Number(aggregates._avg.priceGasoleoSimples)
            : null,
          gasolina95: aggregates._avg.priceGasolina95
            ? Number(aggregates._avg.priceGasolina95)
            : null,
          gasolina98: aggregates._avg.priceGasolina98
            ? Number(aggregates._avg.priceGasolina98)
            : null,
          gpl: aggregates._avg.priceGPL ? Number(aggregates._avg.priceGPL) : null,
        },
        minPrices: {
          gasoleoSimples: aggregates._min.priceGasoleoSimples
            ? Number(aggregates._min.priceGasoleoSimples)
            : null,
          gasolina95: aggregates._min.priceGasolina95
            ? Number(aggregates._min.priceGasolina95)
            : null,
          gasolina98: aggregates._min.priceGasolina98
            ? Number(aggregates._min.priceGasolina98)
            : null,
          gpl: aggregates._min.priceGPL ? Number(aggregates._min.priceGPL) : null,
        },
      },
      source: "DGEG",
    });
  } catch (error) {
    console.error("Error fetching Portugal gas stations:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener gasolineras de Portugal",
        data: [],
        pagination: { total: 0, limit: 100, offset: 0, hasMore: false },
      },
      { status: 500 }
    );
  }
}
