/**
 * Port Vessels API
 *
 * Returns vessels near a port based on AIS data (bounding box proximity).
 *
 * GET /api/maritimo/puertos/:slug/buques
 *   ?radius=5   (km, default 5, max 20)
 *   ?limit=100  (default 100, max 500)
 *
 * Ship type categories (ITU-R M.1371):
 *   70-79  CARGO
 *   80-89  TANKER
 *   30     FISHING
 *   60-69  PASSENGER
 *   31-32  TUG
 *   36-37  SAILING
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export const revalidate = 60;

// ~1 degree latitude ≈ 111 km
const KM_PER_DEG_LAT = 111;

function getShipCategory(shipType: number | null): string {
  if (shipType == null) return "DESCONOCIDO";
  if (shipType >= 70 && shipType <= 79) return "CARGO";
  if (shipType >= 80 && shipType <= 89) return "TANKER";
  if (shipType === 30 || (shipType >= 30 && shipType <= 39)) {
    if (shipType === 31 || shipType === 32) return "TUG";
    if (shipType === 36 || shipType === 37) return "SAILING";
    return "FISHING";
  }
  if (shipType >= 60 && shipType <= 69) return "PASSENGER";
  if (shipType >= 40 && shipType <= 49) return "HSC"; // High speed craft
  if (shipType >= 50 && shipType <= 59) return "SPECIAL";
  return "OTRO";
}

function getNavStatusLabel(navStatus: number | null): string {
  switch (navStatus) {
    case 0: return "En navegacion";
    case 1: return "Fondeado";
    case 2: return "Sin gobierno";
    case 3: return "Maniobrabilidad restringida";
    case 5: return "Amarrado";
    case 6: return "Varado";
    case 7: return "Pescando";
    case 8: return "Navegando a vela";
    default: return "Desconocido";
  }
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;

    const radiusKm = Math.min(
      Math.max(parseFloat(searchParams.get("radius") || "5"), 1),
      20
    );
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "100", 10),
      500
    );

    // Resolve port coordinates from SpanishPort
    const port = await prisma.spanishPort.findUnique({
      where: { slug },
      select: { name: true, latitude: true, longitude: true },
    });

    if (!port) {
      return NextResponse.json(
        { success: false, error: "Puerto no encontrado", vessels: [] },
        { status: 404 }
      );
    }

    const lat = Number(port.latitude);
    const lng = Number(port.longitude);

    // Bounding box approximation
    const latDelta = radiusKm / KM_PER_DEG_LAT;
    const lngDelta = radiusKm / (KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));

    // Query latest position per vessel within bounding box, last 2 hours
    const since = new Date(Date.now() - 2 * 3600_000);

    const positions = await prisma.vesselPosition.findMany({
      where: {
        latitude: { gte: lat - latDelta, lte: lat + latDelta },
        longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
        createdAt: { gte: since },
      },
      include: {
        vessel: {
          select: {
            mmsi: true,
            name: true,
            shipType: true,
            flag: true,
            length: true,
            beam: true,
            draught: true,
            destination: true,
            eta: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      distinct: ["mmsi"],
      take: limit,
    });

    // Build vessel list with categories
    const vessels = positions.map((p) => {
      const category = getShipCategory(p.vessel.shipType);
      return {
        mmsi: p.mmsi,
        name: p.vessel.name,
        shipType: p.vessel.shipType,
        category,
        flag: p.vessel.flag,
        length: p.vessel.length,
        beam: p.vessel.beam,
        draught: p.vessel.draught,
        destination: p.vessel.destination,
        eta: p.vessel.eta?.toISOString() ?? null,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        sog: p.sog,
        cog: p.cog,
        heading: p.heading,
        navStatus: p.navStatus,
        navStatusLabel: getNavStatusLabel(p.navStatus),
        updatedAt: p.createdAt.toISOString(),
      };
    });

    // Group by category for summary
    const byCategory: Record<string, number> = {};
    for (const v of vessels) {
      byCategory[v.category] = (byCategory[v.category] || 0) + 1;
    }

    return NextResponse.json(
      {
        success: true,
        port: { name: port.name, latitude: lat, longitude: lng },
        radiusKm,
        total: vessels.length,
        byCategory,
        vessels,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    reportApiError(error, "api/maritimo/puertos/[slug]/buques");
    return NextResponse.json(
      { success: false, error: "Error al obtener buques", vessels: [] },
      { status: 500 }
    );
  }
}
