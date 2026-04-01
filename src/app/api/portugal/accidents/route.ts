import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/auth";

export const revalidate = 3600; // 1 hour — static historical data

export async function GET(request: NextRequest) {
  const authError = authenticateRequest(request);
  if (authError) return authError;

  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const sp = request.nextUrl.searchParams;

    const district = sp.get("district");
    const yearParam = sp.get("year");

    const where: Record<string, unknown> = {};

    if (district) {
      where.district = { contains: district, mode: "insensitive" };
    }
    if (yearParam) {
      const year = parseInt(yearParam);
      if (!isNaN(year)) {
        where.year = year;
      }
    }

    const records = await prisma.portugalHistoricalAccidents.findMany({
      where,
      orderBy: [{ year: "desc" }, { accidents: "desc" }],
      select: {
        id: true,
        year: true,
        district: true,
        districtName: true,
        accidents: true,
        fatalities: true,
        seriousInjury: true,
        minorInjury: true,
      },
    });

    // Aggregate totals by year across all districts in result set
    const byYear: Record<
      number,
      { year: number; accidents: number; fatalities: number; seriousInjury: number; minorInjury: number }
    > = {};
    for (const r of records) {
      if (!byYear[r.year]) {
        byYear[r.year] = { year: r.year, accidents: 0, fatalities: 0, seriousInjury: 0, minorInjury: 0 };
      }
      byYear[r.year].accidents += r.accidents;
      byYear[r.year].fatalities += r.fatalities;
      byYear[r.year].seriousInjury += r.seriousInjury;
      byYear[r.year].minorInjury += r.minorInjury;
    }

    const yearTotals = Object.values(byYear).sort((a, b) => b.year - a.year);

    return NextResponse.json({
      success: true,
      data: records,
      aggregate: {
        byYear: yearTotals,
      },
      total: records.length,
      source: "DGV Portugal",
    });
  } catch (error) {
    console.error("Error fetching Portugal accident stats:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener estadísticas de accidentes de Portugal", data: [] },
      { status: 500 }
    );
  }
}
