/**
 * Vessel Detail API
 *
 * Returns a single vessel's metadata, latest position, 48h trail,
 * and nearest Spanish port.
 *
 * GET /api/maritimo/buques/[mmsi]
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

export const revalidate = 120;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KM_PER_DEG_LAT = 111;

function classifyShipType(type: number | null): string {
  if (!type) return "DESCONOCIDO";
  if (type >= 70 && type <= 79) return "CARGA";
  if (type >= 80 && type <= 89) return "PETROLERO";
  if (type >= 60 && type <= 69) return "PASAJEROS";
  if (type === 30) return "PESCA";
  if (type >= 31 && type <= 32) return "REMOLCADOR";
  if (type >= 36 && type <= 37) return "VELERO";
  if (type >= 40 && type <= 49) return "EMBARCACION RAPIDA";
  if (type === 51) return "SAR";
  if (type === 55) return "POLICIA";
  return "OTRO";
}

function decodeNavStatus(status: number | null): string {
  const map: Record<number, string> = {
    0: "Navegando a motor",
    1: "Fondeado",
    2: "Sin gobierno",
    3: "Maniobrabilidad restringida",
    5: "Amarrado",
    6: "Varado",
    7: "Pescando",
    8: "Navegando a vela",
  };
  return status !== null ? map[status] ?? "Desconocido" : "Desconocido";
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ mmsi: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { mmsi: mmsiStr } = await params;
    const mmsi = parseInt(mmsiStr, 10);

    if (isNaN(mmsi) || mmsi < 100000000 || mmsi > 999999999) {
      return NextResponse.json(
        { success: false, error: "MMSI invalido. Debe ser un numero de 9 digitos." },
        { status: 400 }
      );
    }

    // Cache key (2 min TTL)
    const cacheKey = `api:maritimo:buques:${mmsi}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=120" },
      });
    }

    // 1. Vessel metadata
    const vessel = await prisma.vessel.findUnique({
      where: { mmsi },
    });

    if (!vessel) {
      return NextResponse.json(
        { success: false, error: "Buque no encontrado" },
        { status: 404 }
      );
    }

    // 2. Last 48h positions
    const since48h = new Date(Date.now() - 48 * 3600_000);
    const positions = await prisma.vesselPosition.findMany({
      where: { mmsi, createdAt: { gte: since48h } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // 3. Nearest Spanish port (from latest position)
    let nearestPort: { name: string; slug: string; distanceKm: number } | null = null;

    if (positions.length > 0) {
      const latestLat = Number(positions[0].latitude);
      const latestLng = Number(positions[0].longitude);

      // Query ports within ~200km bounding box, then refine with haversine
      const latDelta = 200 / KM_PER_DEG_LAT;
      const lngDelta = 200 / (KM_PER_DEG_LAT * Math.cos((latestLat * Math.PI) / 180));

      const ports = await prisma.spanishPort.findMany({
        where: {
          latitude: { gte: latestLat - latDelta, lte: latestLat + latDelta },
          longitude: { gte: latestLng - lngDelta, lte: latestLng + lngDelta },
        },
        select: { name: true, slug: true, latitude: true, longitude: true },
      });

      let minDist = Infinity;
      for (const port of ports) {
        const dist = haversineKm(latestLat, latestLng, Number(port.latitude), Number(port.longitude));
        if (dist < minDist) {
          minDist = dist;
          nearestPort = {
            name: port.name,
            slug: port.slug,
            distanceKm: Math.round(dist * 10) / 10,
          };
        }
      }
    }

    // Build response
    const category = classifyShipType(vessel.shipType);
    const latestPosition = positions[0] ?? null;

    const response = {
      success: true,
      vessel: {
        mmsi: vessel.mmsi,
        imo: vessel.imo,
        name: vessel.name,
        callsign: vessel.callsign,
        shipType: vessel.shipType,
        category,
        flag: vessel.flag,
        length: vessel.length,
        beam: vessel.beam,
        draught: vessel.draught,
        destination: vessel.destination,
        eta: vessel.eta?.toISOString() ?? null,
        updatedAt: vessel.updatedAt.toISOString(),
      },
      latestPosition: latestPosition
        ? {
            latitude: Number(latestPosition.latitude),
            longitude: Number(latestPosition.longitude),
            sog: latestPosition.sog,
            cog: latestPosition.cog,
            heading: latestPosition.heading,
            navStatus: latestPosition.navStatus,
            navStatusLabel: decodeNavStatus(latestPosition.navStatus),
            createdAt: latestPosition.createdAt.toISOString(),
          }
        : null,
      trail: positions.map((p) => ({
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        sog: p.sog,
        cog: p.cog,
        heading: p.heading,
        navStatus: p.navStatus,
        createdAt: p.createdAt.toISOString(),
      })),
      nearestPort,
    };

    await setInCache(cacheKey, response, 120);

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=120" },
    });
  } catch (error) {
    reportApiError(error, "api/maritimo/buques/[mmsi]");
    return NextResponse.json(
      { success: false, error: "Error al obtener datos del buque" },
      { status: 500 }
    );
  }
}
