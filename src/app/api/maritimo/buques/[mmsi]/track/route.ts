import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCompute } from "@/lib/redis";

interface RouteParams {
  params: Promise<{ mmsi: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { mmsi: mmsiStr } = await params;
  const mmsi = parseInt(mmsiStr, 10);

  if (isNaN(mmsi)) {
    return NextResponse.json({ error: "MMSI inválido" }, { status: 400 });
  }

  const hoursParam = req.nextUrl.searchParams.get("hours");
  const hours = Math.min(Math.max(parseInt(hoursParam ?? "24", 10) || 24, 1), 168);

  const cacheKey = `vessel:track:${mmsi}:${hours}`;

  const geojson = await getOrCompute(cacheKey, 30, async () => {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const positions = await prisma.vesselPosition.findMany({
      where: { mmsi, createdAt: { gt: since } },
      orderBy: { createdAt: "asc" },
      select: {
        latitude: true,
        longitude: true,
        sog: true,
        cog: true,
        heading: true,
        navStatus: true,
        createdAt: true,
      },
    });

    if (positions.length === 0) return null;

    const coords = positions.map((p) => [
      parseFloat(p.longitude.toString()),
      parseFloat(p.latitude.toString()),
    ]);

    const latest = positions[positions.length - 1];

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: coords,
          },
          properties: {
            mmsi,
            hours,
            pointCount: positions.length,
          },
        },
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              parseFloat(latest.longitude.toString()),
              parseFloat(latest.latitude.toString()),
            ],
          },
          properties: {
            mmsi,
            sog: latest.sog,
            cog: latest.cog,
            heading: latest.heading,
            navStatus: latest.navStatus,
            timestamp: latest.createdAt.toISOString(),
          },
        },
      ],
    };
  });

  if (!geojson) {
    return NextResponse.json(
      { error: "No hay posiciones recientes para este buque" },
      { status: 404 }
    );
  }

  return NextResponse.json(geojson, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
