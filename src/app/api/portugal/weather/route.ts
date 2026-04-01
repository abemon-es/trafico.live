import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/auth";

export const revalidate = 300; // 5 min

export async function GET(request: NextRequest) {
  const authError = authenticateRequest(request);
  if (authError) return authError;

  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const sp = request.nextUrl.searchParams;

    const area = sp.get("area");
    const severity = sp.get("severity");

    const where: Record<string, unknown> = { isActive: true };

    if (area) {
      where.OR = [
        { areaCode: { equals: area, mode: "insensitive" } },
        { areaName: { contains: area, mode: "insensitive" } },
      ];
    }

    if (severity) {
      where.severity = { equals: severity, mode: "insensitive" };
    }

    const alerts = await prisma.portugalWeatherAlert.findMany({
      where,
      orderBy: [{ severity: "asc" }, { startedAt: "desc" }],
      select: {
        id: true,
        alertId: true,
        type: true,
        severity: true,
        areaCode: true,
        areaName: true,
        startedAt: true,
        endedAt: true,
        description: true,
      },
    });

    const data = alerts.map((a) => ({
      id: a.id,
      alertId: a.alertId,
      type: a.type,
      severity: a.severity,
      areaCode: a.areaCode,
      areaName: a.areaName,
      startedAt: a.startedAt.toISOString(),
      endedAt: a.endedAt?.toISOString() ?? null,
      description: a.description,
    }));

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
      source: "IPMA",
    });
  } catch (error) {
    console.error("Error fetching Portugal weather alerts:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener alertas meteorológicas de Portugal", data: [] },
      { status: 500 }
    );
  }
}
