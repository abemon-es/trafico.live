import { reportApiError } from "@/lib/api-error";
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
    const cameras = await prisma.andorraCamera.findMany({
      where: { isActive: true },
      orderBy: [{ route: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        elevation: true,
        route: true,
        imageUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: cameras,
      total: cameras.length,
      source: "mobilitat.ad",
    });
  } catch (error) {
    reportApiError(error, "Error fetching Andorra cameras");
    return NextResponse.json(
      { success: false, error: "Error al obtener cámaras de Andorra", data: [] },
      { status: 500 }
    );
  }
}
