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
    const requestedDate = searchParams.get("date");

    const cacheKey = `movilidad:corredores:${requestedDate ?? "latest"}:${limit}:${excludeSelf}`;

    const result = await getOrCompute(cacheKey, 3600, async () => {
      let resolvedDateStr: string;

      if (requestedDate) {
        resolvedDateStr = requestedDate;
      } else {
        // MobilityODFlow is a one-shot backfill; data currently ends 2024-01-07.
        // Fall back to the latest available date instead of yesterday (always empty).
        const latest = await prisma.mobilityODFlow.findFirst({
          orderBy: { date: "desc" },
          select: { date: true },
        });
        if (!latest) {
          return { data: [], resolvedDate: null };
        }
        resolvedDateStr = latest.date.toISOString().slice(0, 10);
      }

      const date = new Date(resolvedDateStr);
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

      return {
        data: corridors.map((c) => ({
          ...c,
          tripCount: Number(c.tripCount),
        })),
        resolvedDate: resolvedDateStr,
      };
    });

    return NextResponse.json({
      data: result.data,
      meta: {
        date: result.resolvedDate,
        requestedDate,
        latestFallback: !requestedDate,
        limit,
        excludeSelf,
      },
    });
  } catch (error) {
    return reportApiError(error, "movilidad/corredores");
  }
}
