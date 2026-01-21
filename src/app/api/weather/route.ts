import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Cache the response for 5 minutes
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provinceFilter = searchParams.get("province");
    const typeFilter = searchParams.get("type")?.split(",").filter(Boolean);

    // Build where clause
    const whereClause: Record<string, unknown> = { isActive: true };

    if (provinceFilter) {
      whereClause.province = provinceFilter;
    }

    if (typeFilter && typeFilter.length > 0) {
      whereClause.type = { in: typeFilter };
    }

    // Fetch active weather alerts
    const alerts = await prisma.weatherAlert.findMany({
      where: whereClause,
      orderBy: { startedAt: "desc" },
    });

    // Get counts by type and province
    const [countsByType, countsByProvince] = await Promise.all([
      prisma.weatherAlert.groupBy({
        by: ["type"],
        where: { isActive: true },
        _count: true,
      }),
      prisma.weatherAlert.groupBy({
        by: ["province"],
        where: { isActive: true },
        _count: true,
      }),
    ]);

    const byType: Record<string, number> = {};
    for (const item of countsByType) {
      byType[item.type] = item._count;
    }

    const byProvince: Record<string, number> = {};
    for (const item of countsByProvince) {
      byProvince[item.province] = item._count;
    }

    // Get last fetch time
    const latestFetch = alerts.length > 0
      ? alerts.reduce((latest, a) =>
          a.fetchedAt > latest ? a.fetchedAt : latest,
          alerts[0].fetchedAt
        )
      : new Date();

    return NextResponse.json({
      count: alerts.length,
      lastUpdated: latestFetch.toISOString(),
      counts: {
        byType,
        byProvince,
      },
      alerts: alerts.map((a) => ({
        id: a.alertId,
        type: a.type,
        severity: a.severity,
        province: a.province,
        provinceName: a.provinceName,
        startedAt: a.startedAt.toISOString(),
        endedAt: a.endedAt?.toISOString() || null,
        description: a.description,
      })),
    });
  } catch (error) {
    console.error("Error fetching weather alerts:", error);
    return NextResponse.json(
      { error: "Internal server error", alerts: [], counts: {} },
      { status: 500 }
    );
  }
}
