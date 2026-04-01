import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/auth";

export const revalidate = 60; // 1 min — incidents update every 5 min

export async function GET(request: NextRequest) {
  const authError = authenticateRequest(request);
  if (authError) return authError;

  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const incidents = await prisma.andorraIncident.findMany({
      where: { isActive: true },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        sourceId: true,
        category: true,
        categoryId: true,
        title: true,
        description: true,
        latitude: true,
        longitude: true,
        startedAt: true,
        endedAt: true,
      },
    });

    const data = incidents.map((i) => ({
      id: i.id,
      sourceId: i.sourceId,
      category: i.category,
      categoryId: i.categoryId,
      title: i.title,
      description: i.description,
      latitude: i.latitude,
      longitude: i.longitude,
      startedAt: i.startedAt.toISOString(),
      endedAt: i.endedAt?.toISOString() ?? null,
    }));

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
      source: "mobilitat.ad",
    });
  } catch (error) {
    reportApiError(error, "Error fetching Andorra incidents");
    return NextResponse.json(
      { success: false, error: "Error al obtener incidencias de Andorra", data: [] },
      { status: 500 }
    );
  }
}
