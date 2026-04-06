import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/inteligencia/carretera/[roadId]
 *
 * Returns a full road intelligence profile: accident analysis (5-year),
 * hotspot km markers, traffic volume (IMD), speed enforcement, active
 * incidents, weather vulnerability, and vehicle mix.
 *
 * Auth: same-origin or x-api-key. Rate limited. Redis cached 1h.
 *
 * Data sources: DGT (microdatos 2019-2023, IMD, incidencias en tiempo real)
 */

interface HotspotRow {
  km_bucket: string | number;
  accidents: bigint | number;
  fatalities: bigint | number;
  hospitalized: bigint | number;
}

interface WeatherRow {
  weather: string | null;
  count: bigint | number;
}

type Props = {
  params: Promise<{ roadId: string }>;
};

export async function GET(request: NextRequest, { params }: Props) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { roadId } = await params;
    const id = decodeURIComponent(roadId).toUpperCase();

    const cacheKey = `inteligencia:carretera:${id}`;

    const result = await getOrCompute(cacheKey, 3600, async () => {
      // 1. Road master data
      const road = await prisma.road.findUnique({ where: { id } });

      if (!road) return null;

      // 2. Accident analysis by year
      const accidentsByYear = await prisma.accidentMicrodata.groupBy({
        by: ["year"],
        where: { roadNumber: id },
        _count: { _all: true },
        _sum: { fatalities: true, hospitalized: true, minorInjury: true },
        orderBy: { year: "asc" },
      });

      // 3. Hotspot km markers (5km buckets)
      const hotspots = await prisma.$queryRaw<HotspotRow[]>`
        SELECT
          FLOOR(km::numeric / 5) * 5 AS km_bucket,
          COUNT(*)::int AS accidents,
          SUM(fatalities)::int AS fatalities,
          SUM(hospitalized)::int AS hospitalized
        FROM "AccidentMicrodata"
        WHERE "roadNumber" = ${id} AND km IS NOT NULL
        GROUP BY km_bucket
        ORDER BY accidents DESC
        LIMIT 10
      `;

      // 4. Traffic volume (IMD) by province
      const trafficFlow = await prisma.trafficFlow.findMany({
        where: { roadNumber: id },
        select: {
          province: true,
          provinceName: true,
          imd: true,
          imdPesados: true,
          percentPesados: true,
          year: true,
        },
        orderBy: { imd: "desc" },
      });

      // Deduplicate: latest year per province
      const imdByProvince = new Map<
        string,
        { province: string; provinceName: string | null; imd: number; pesados: number | null; pesadosPercent: number | null; year: number }
      >();
      for (const f of trafficFlow) {
        const key = f.province ?? "unknown";
        const existing = imdByProvince.get(key);
        if (!existing || f.year > existing.year) {
          imdByProvince.set(key, {
            province: f.province ?? "unknown",
            provinceName: f.provinceName,
            imd: f.imd,
            pesados: f.imdPesados,
            pesadosPercent: f.percentPesados ? Number(f.percentPesados) : null,
            year: f.year,
          });
        }
      }

      // 5. Speed enforcement
      const [radarsByType, cameraCount] = await Promise.all([
        prisma.radar.groupBy({
          by: ["type"],
          where: { roadNumber: id },
          _count: { _all: true },
        }),
        prisma.camera.count({ where: { roadNumber: id } }),
      ]);

      // 6. Active incidents
      const activeIncidents = await prisma.trafficIncident.groupBy({
        by: ["severity"],
        where: { roadNumber: id, isActive: true },
        _count: { _all: true },
      });

      // 7. Weather vulnerability
      const weatherRows = await prisma.$queryRaw<WeatherRow[]>`
        SELECT "weatherCondition" AS weather, COUNT(*)::int AS count
        FROM "AccidentMicrodata"
        WHERE "roadNumber" = ${id} AND "weatherCondition" IS NOT NULL
        GROUP BY "weatherCondition"
        ORDER BY count DESC
      `;

      // 8. Vehicle mix (booleans — count via raw SQL)
      const vehicleMixRows = await prisma.$queryRaw<
        Array<{
          total: bigint | number;
          car: bigint | number;
          motorcycle: bigint | number;
          truck: bigint | number;
          bus: bigint | number;
          bicycle: bigint | number;
          pedestrian: bigint | number;
        }>
      >`
        SELECT
          COUNT(*)::int AS total,
          SUM(CASE WHEN "involvesCar" THEN 1 ELSE 0 END)::int AS car,
          SUM(CASE WHEN "involvesMotorcycle" THEN 1 ELSE 0 END)::int AS motorcycle,
          SUM(CASE WHEN "involvesTruck" THEN 1 ELSE 0 END)::int AS truck,
          SUM(CASE WHEN "involvesBus" THEN 1 ELSE 0 END)::int AS bus,
          SUM(CASE WHEN "involvesBicycle" THEN 1 ELSE 0 END)::int AS bicycle,
          SUM(CASE WHEN "involvesPedestrian" THEN 1 ELSE 0 END)::int AS pedestrian
        FROM "AccidentMicrodata"
        WHERE "roadNumber" = ${id}
      `;
      const vmix = vehicleMixRows[0];

      return {
        road: {
          id: road.id,
          name: road.name,
          type: road.type,
          totalKm: road.totalKm ? Number(road.totalKm) : null,
          provinces: road.provinces,
        },
        accidentsByYear: accidentsByYear.map((a) => ({
          year: a.year,
          count: a._count._all,
          fatalities: a._sum.fatalities ?? 0,
          hospitalized: a._sum.hospitalized ?? 0,
          minorInjury: a._sum.minorInjury ?? 0,
        })),
        hotspots: hotspots.map((h) => ({
          kmStart: Number(h.km_bucket),
          kmEnd: Number(h.km_bucket) + 5,
          accidents: Number(h.accidents),
          fatalities: Number(h.fatalities),
          hospitalized: Number(h.hospitalized),
        })),
        imdByProvince: Array.from(imdByProvince.values()),
        enforcement: {
          radars: radarsByType.map((r) => ({
            type: r.type,
            count: r._count._all,
          })),
          cameras: cameraCount,
        },
        activeIncidents: activeIncidents.map((i) => ({
          severity: i.severity,
          count: i._count._all,
        })),
        weather: weatherRows.map((w) => ({
          condition: w.weather,
          count: Number(w.count),
        })),
        vehicleMix: {
          total: Number(vmix?.total ?? 0),
          car: Number(vmix?.car ?? 0),
          motorcycle: Number(vmix?.motorcycle ?? 0),
          truck: Number(vmix?.truck ?? 0),
          bus: Number(vmix?.bus ?? 0),
          bicycle: Number(vmix?.bicycle ?? 0),
          pedestrian: Number(vmix?.pedestrian ?? 0),
        },
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Carretera no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    reportApiError(err, "GET /api/inteligencia/carretera/[roadId]", request);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
