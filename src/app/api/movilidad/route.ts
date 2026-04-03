import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

const VALID_GROUP_BY = ["day", "week", "month"] as const;
type GroupBy = (typeof VALID_GROUP_BY)[number];

/**
 * GET /api/movilidad
 *
 * Origin-destination mobility flows at province level.
 * Source: Ministerio de Transportes BigData study.
 *
 * Query params:
 *   - origin: INE province code (2 digits)
 *   - dest: INE province code (2 digits)
 *   - from: start date (YYYY-MM-DD), default 30d ago
 *   - to: end date (YYYY-MM-DD), default today
 *   - groupBy: "day" | "week" | "month" (default "day")
 *   - limit: max records (default 1000, max 5000)
 */
export async function GET(request: NextRequest) {
  const rateLimited = await applyRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const { searchParams } = request.nextUrl;
    const origin = searchParams.get("origin");
    const dest = searchParams.get("dest");
    const groupByRaw = searchParams.get("groupBy") || "day";
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000"), 5000);

    // Validate groupBy BEFORE the cache callback to fail fast on bad input
    if (!(VALID_GROUP_BY as readonly string[]).includes(groupByRaw)) {
      return NextResponse.json(
        { error: `Invalid groupBy. Must be one of: ${VALID_GROUP_BY.join(", ")}` },
        { status: 400 }
      );
    }
    const groupBy = groupByRaw as GroupBy;

    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : defaultFrom;
    const to = searchParams.get("to")
      ? new Date(searchParams.get("to")!)
      : now;

    const cacheKey = `movilidad:${origin || "all"}:${dest || "all"}:${from.toISOString().slice(0, 10)}:${to.toISOString().slice(0, 10)}:${groupBy}:${limit}`;

    const data = await getOrCompute(cacheKey, 300, async () => {
      if (groupBy === "day") {
        const where: Prisma.MobilityODFlowWhereInput = {
          date: { gte: from, lte: to },
          ...(origin && { originProvince: origin }),
          ...(dest && { destProvince: dest }),
        };

        return prisma.mobilityODFlow.findMany({
          where,
          orderBy: { date: "desc" },
          take: limit,
        });
      }

      // For week/month aggregation, use raw SQL with Prisma.sql for safe interpolation.
      // dateFormat comes exclusively from the validated groupBy allowlist (never user input).
      const dateFormat = groupBy === "week" ? "IYYY-IW" : "YYYY-MM";

      const originFilter = origin
        ? Prisma.sql`AND "originProvince" = ${origin}`
        : Prisma.empty;
      const destFilter = dest
        ? Prisma.sql`AND "destProvince" = ${dest}`
        : Prisma.empty;

      return prisma.$queryRaw`
        SELECT
          TO_CHAR(date, ${dateFormat}) as period,
          "originProvince",
          "originName",
          "destProvince",
          "destName",
          SUM("tripCount") as "tripCount",
          AVG("avgDistanceKm") as "avgDistanceKm"
        FROM "MobilityODFlow"
        WHERE date >= ${from} AND date <= ${to}
        ${originFilter}
        ${destFilter}
        GROUP BY period, "originProvince", "originName", "destProvince", "destName"
        ORDER BY period DESC
        LIMIT ${limit}
      `;
    });

    return NextResponse.json({
      data,
      meta: {
        origin: origin || "all",
        dest: dest || "all",
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        groupBy,
      },
    });
  } catch (error) {
    return reportApiError(error, "movilidad");
  }
}
