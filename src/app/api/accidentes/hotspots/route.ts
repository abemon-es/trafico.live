import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/accidentes/hotspots
 *
 * Returns accident black spots — road segments with the highest accident
 * concentration, derived from AccidentMicrodata grouped by road + km bucket.
 *
 * Query Parameters:
 *   - province: INE 2-digit code (e.g. "28" for Madrid)
 *   - road: Road number filter (partial match, e.g. "A-1")
 *   - year: Restrict to a single year (default: all years 2019-2023)
 *   - minAccidents: Minimum number of accidents to qualify as hotspot (default 5)
 *
 * Response:
 *   {
 *     hotspots: [
 *       {
 *         road: string,
 *         km: number,
 *         count: number,
 *         fatalities: number,
 *         province: string | null,
 *         provinceName: string | null,
 *         years: number[],
 *         severityBreakdown: { fatal: number, hospitalized: number, minor: number }
 *       }
 *     ],
 *     total: number
 *   }
 */

interface HotspotRow {
  road: string;
  km_bucket: string | number;
  total_accidents: bigint | number;
  total_fatalities: bigint | number;
  province: string | null;
  province_name: string | null;
  years: string;
  severity_fatal: bigint | number;
  severity_hosp: bigint | number;
  severity_minor: bigint | number;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const province = searchParams.get("province");
    const road = searchParams.get("road");
    const yearParam = searchParams.get("year");
    const minAccidentsParam = searchParams.get("minAccidents");
    const bboxParam = searchParams.get("bbox");
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.max(1, Math.min(200, isNaN(limitParam) ? 50 : limitParam));

    const minAccidents = Math.max(1, parseInt(minAccidentsParam || "5", 10));

    // bbox=minLng,minLat,maxLng,maxLat (route-overlay corridor scoping)
    let bboxBounds: { minLng: number; minLat: number; maxLng: number; maxLat: number } | null = null;
    if (bboxParam) {
      const parts = bboxParam.split(",").map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite)) {
        bboxBounds = { minLng: parts[0], minLat: parts[1], maxLng: parts[2], maxLat: parts[3] };
      }
    }

    // Build cache key
    const cacheKey = `accidents:hotspots:${JSON.stringify({ province, road, yearParam, minAccidents, bboxBounds, limit })}`;

    const result = await getOrCompute(cacheKey, 3600, async () => {
      // Build dynamic WHERE clause fragments for raw SQL
      const conditions: Prisma.Sql[] = [
        Prisma.sql`"roadNumber" IS NOT NULL`,
        Prisma.sql`"km" IS NOT NULL`,
      ];

      if (province) {
        conditions.push(Prisma.sql`"province" = ${province}`);
      }

      if (road) {
        conditions.push(Prisma.sql`"roadNumber" ILIKE ${"%" + road.toUpperCase() + "%"}`);
      }

      if (yearParam) {
        const y = parseInt(yearParam, 10);
        if (!isNaN(y)) {
          conditions.push(Prisma.sql`"year" = ${y}`);
        }
      }

      if (bboxBounds) {
        conditions.push(Prisma.sql`"latitude"  BETWEEN ${bboxBounds.minLat} AND ${bboxBounds.maxLat}`);
        conditions.push(Prisma.sql`"longitude" BETWEEN ${bboxBounds.minLng} AND ${bboxBounds.maxLng}`);
      }

      const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

      const rows = await prisma.$queryRaw<HotspotRow[]>`
        SELECT
          "roadNumber"                            AS road,
          ROUND("km"::numeric, 0)                 AS km_bucket,
          COUNT(*)::int                           AS total_accidents,
          SUM("fatalities")::int                  AS total_fatalities,
          MODE() WITHIN GROUP (ORDER BY "province")      AS province,
          MODE() WITHIN GROUP (ORDER BY "provinceName")  AS province_name,
          AVG("latitude")                         AS avg_latitude,
          AVG("longitude")                        AS avg_longitude,
          ARRAY_AGG(DISTINCT "year" ORDER BY "year")::text AS years,
          SUM(CASE WHEN "severity" = 'fatal'         THEN 1 ELSE 0 END)::int AS severity_fatal,
          SUM(CASE WHEN "severity" = 'hospitalized'  THEN 1 ELSE 0 END)::int AS severity_hosp,
          SUM(CASE WHEN "severity" = 'minor'         THEN 1 ELSE 0 END)::int AS severity_minor
        FROM "AccidentMicrodata"
        ${whereClause}
        GROUP BY "roadNumber", ROUND("km"::numeric, 0)
        HAVING COUNT(*) >= ${minAccidents}
        ORDER BY total_accidents DESC
        LIMIT ${limit}
      `;

      const hotspots = rows.map((row) => ({
        road: row.road,
        km: typeof row.km_bucket === "string" ? parseFloat(row.km_bucket) : Number(row.km_bucket),
        count: typeof row.total_accidents === "bigint" ? Number(row.total_accidents) : row.total_accidents,
        fatalities: typeof row.total_fatalities === "bigint" ? Number(row.total_fatalities) : (row.total_fatalities ?? 0),
        province: row.province ?? null,
        provinceName: row.province_name ?? null,
        latitude: (row as unknown as { avg_latitude?: number | string | null }).avg_latitude != null
          ? Number((row as unknown as { avg_latitude: number | string }).avg_latitude) : null,
        longitude: (row as unknown as { avg_longitude?: number | string | null }).avg_longitude != null
          ? Number((row as unknown as { avg_longitude: number | string }).avg_longitude) : null,
        years: row.years
          ? String(row.years).replace(/[{}]/g, "").split(",").map(Number).filter(Boolean)
          : [],
        severityBreakdown: {
          fatal: typeof row.severity_fatal === "bigint" ? Number(row.severity_fatal) : (row.severity_fatal ?? 0),
          hospitalized: typeof row.severity_hosp === "bigint" ? Number(row.severity_hosp) : (row.severity_hosp ?? 0),
          minor: typeof row.severity_minor === "bigint" ? Number(row.severity_minor) : (row.severity_minor ?? 0),
        },
      }));

      return { hotspots, total: hotspots.length };
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (err) {
    reportApiError(err, "GET /api/accidentes/hotspots", request);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
