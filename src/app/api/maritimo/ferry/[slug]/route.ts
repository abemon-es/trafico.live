/**
 * Ferry Route Detail API
 *
 * Returns a single ferry route with all stops and trips.
 * Slug format: `${slugify(operator)}-${slugify(routeName)}` or cuid fallback.
 *
 * GET /api/maritimo/ferry/[slug]
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

export const revalidate = 3600;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Find a ferry route by slug — tries operator+routeName slug first, then id fallback.
 */
async function findRouteBySlug(slug: string) {
  const allRoutes = await prisma.ferryRoute.findMany({
    select: { id: true, operator: true, routeName: true },
  });

  const matched = allRoutes.find(
    (r) => `${slugify(r.operator)}-${slugify(r.routeName)}` === slug
  );

  if (matched) {
    return prisma.ferryRoute.findUnique({
      where: { id: matched.id },
      include: {
        stops: { orderBy: { stopName: "asc" } },
        trips: { orderBy: [{ serviceDay: "asc" }, { departsAt: "asc" }] },
      },
    });
  }

  // Fallback: try slug as cuid
  return prisma.ferryRoute.findUnique({
    where: { id: slug },
    include: {
      stops: { orderBy: { stopName: "asc" } },
      trips: { orderBy: [{ serviceDay: "asc" }, { departsAt: "asc" }] },
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { slug } = await params;

    const cacheKey = `api:maritimo:ferry:${slug}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
      });
    }

    const route = await findRouteBySlug(slug);

    if (!route) {
      return NextResponse.json(
        { success: false, error: "Ruta de ferry no encontrada" },
        { status: 404 }
      );
    }

    const response = {
      success: true,
      route: {
        id: route.id,
        operator: route.operator,
        routeId: route.routeId,
        routeName: route.routeName,
        routeType: route.routeType,
        routeColor: route.routeColor,
        geometry: route.geometry,
        updatedAt: route.updatedAt.toISOString(),
        stops: route.stops.map((s) => ({
          stopId: s.stopId,
          stopName: s.stopName,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
        })),
        trips: route.trips.map((t) => ({
          tripId: t.tripId,
          headsign: t.headsign,
          departsAt: t.departsAt,
          arrivesAt: t.arrivesAt,
          serviceDay: t.serviceDay,
        })),
      },
    };

    await setInCache(cacheKey, response, 3600);

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (error) {
    reportApiError(error, "api/maritimo/ferry/[slug]");
    return NextResponse.json(
      { success: false, error: "Error al obtener la ruta de ferry" },
      { status: 500 }
    );
  }
}
