import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/movilidad/corredores
 *
 * Top province-to-province corridors by trip volume.
 *
 * Query params:
 *   - date: single date (YYYY-MM-DD), default yesterday
 *   - limit: max results (default 20, max 100)
 *   - exclude_self: boolean (default true) — exclude intra-province trips
 */
export async function GET(request: NextRequest) {
  const rateLimited = await applyRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const excludeSelf = searchParams.get("exclude_self") !== "false";

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = searchParams.get("date") || yesterday.toISOString().slice(0, 10);
    const date = new Date(dateStr);

    const cacheKey = `movilidad:corredores:${dateStr}:${limit}:${excludeSelf}`;

    const data = await getOrCompute(cacheKey, 3600, async () => {
      const selfFilter = excludeSelf
        ? `AND "originProvince" != "destProvince"`
        : "";

      const corridors = await prisma.$queryRawUnsafe<
        Array<{
          originProvince: string;
          originName: string;
          destProvince: string;
          destName: string;
          tripCount: bigint;
          avgDistanceKm: number;
        }>
      >(
        `
        SELECT
          "originProvince",
          "originName",
          "destProvince",
          "destName",
          "tripCount",
          "avgDistanceKm"
        FROM "MobilityODFlow"
        WHERE date = $1 ${selfFilter}
        ORDER BY "tripCount" DESC
        LIMIT $2
        `,
        date,
        limit
      );

      return corridors.map((c) => ({
        ...c,
        tripCount: Number(c.tripCount),
      }));
    });

    return NextResponse.json({
      data,
      meta: { date: dateStr, limit, excludeSelf },
    });
  } catch (error) {
    return reportApiError(error, "movilidad/corredores");
  }
}
