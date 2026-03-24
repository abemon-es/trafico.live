import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

// Cache for 1 hour — history data changes once per day
export const revalidate = 3600;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;

    const history = await prisma.gasStationPriceHistory.findMany({
      where: { stationId: id },
      orderBy: { recordedAt: "desc" },
      take: 30,
      select: {
        recordedAt: true,
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
        priceGLP: true,
      },
    });

    if (history.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Return oldest-first for chart rendering
    const data = history
      .reverse()
      .map((h) => ({
        date: h.recordedAt.toISOString().split("T")[0],
        avgGasoleoA: h.priceGasoleoA ? Number(h.priceGasoleoA) : null,
        avgGasolina95: h.priceGasolina95E5 ? Number(h.priceGasolina95E5) : null,
        avgGasolina98: h.priceGasolina98E5 ? Number(h.priceGasolina98E5) : null,
        avgGLP: h.priceGLP ? Number(h.priceGLP) : null,
      }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching station price history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
