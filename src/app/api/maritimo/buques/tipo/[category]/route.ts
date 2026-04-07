/**
 * Vessel Type Category API
 *
 * Returns vessels filtered by ship type category as JSON.
 *
 * GET /api/maritimo/buques/tipo/[category]
 *   ?limit=50   (default 50, max 200)
 *   ?offset=0   (default 0)
 *
 * Categories: carga, petrolero, pesca, pasajeros, remolcador, velero,
 *             embarcacion-rapida, sar, policia, otro
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const revalidate = 300;

// Ship type ranges per category
const CATEGORIES: Record<string, { label: string; types: number[] }> = {
  carga: { label: "Buques de carga", types: [70, 71, 72, 73, 74, 75, 76, 77, 78, 79] },
  petrolero: { label: "Petroleros", types: [80, 81, 82, 83, 84, 85, 86, 87, 88, 89] },
  pesca: { label: "Pesqueros", types: [30] },
  pasajeros: { label: "Pasajeros y cruceros", types: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69] },
  remolcador: { label: "Remolcadores", types: [31, 32] },
  velero: { label: "Veleros", types: [36, 37] },
  "embarcacion-rapida": { label: "Embarcaciones rapidas", types: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49] },
  sar: { label: "Salvamento", types: [51] },
  policia: { label: "Patrulleras", types: [55] },
  otro: { label: "Otros buques", types: [] },
};

const ALL_KNOWN_TYPES = Object.values(CATEGORIES)
  .flatMap((c) => c.types)
  .filter((t) => t > 0);

type RouteContext = { params: Promise<{ category: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { category: slug } = await context.params;
    const cat = CATEGORIES[slug];

    if (!cat) {
      return NextResponse.json(
        { error: "Not Found", message: `Unknown category: ${slug}` },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
      200
    );
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const cacheKey = `api:buques:tipo:${slug}:${limit}:${offset}`;

    const data = await getOrCompute(cacheKey, 300, async () => {
      const isOtro = slug === "otro";

      const where = isOtro
        ? { OR: [{ shipType: { notIn: ALL_KNOWN_TYPES } }, { shipType: null }] }
        : { shipType: { in: cat.types } };

      const [vessels, totalCount] = await Promise.all([
        prisma.vessel.findMany({
          where,
          include: {
            positions: {
              orderBy: { createdAt: "desc" as const },
              take: 1,
              select: {
                latitude: true,
                longitude: true,
                sog: true,
                heading: true,
                createdAt: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.vessel.count({ where }),
      ]);

      return {
        category: slug,
        label: cat.label,
        total: totalCount,
        limit,
        offset,
        vessels: vessels.map((v) => {
          const pos = v.positions[0];
          return {
            mmsi: v.mmsi,
            imo: v.imo,
            name: v.name,
            flag: v.flag,
            shipType: v.shipType,
            length: v.length,
            beam: v.beam,
            destination: v.destination,
            updatedAt: v.updatedAt,
            position: pos
              ? {
                  latitude: Number(pos.latitude),
                  longitude: Number(pos.longitude),
                  sog: pos.sog,
                  heading: pos.heading,
                  updatedAt: pos.createdAt,
                }
              : null,
          };
        }),
      };
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    reportApiError(error, "api/maritimo/buques/tipo] Vessel type error");
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch vessels" },
      { status: 500 }
    );
  }
}
