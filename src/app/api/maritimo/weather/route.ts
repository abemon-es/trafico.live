import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

// Cache for 5 minutes — COASTAL alerts change infrequently
export const revalidate = 300;

// Province names keyed by zone slug for filtering
const ZONE_PROVINCE_MAP: Record<string, string[]> = {
  galicia: ["a-coruna", "lugo", "ourense", "pontevedra", "15", "27", "32", "36"],
  cantabrico: ["cantabria", "asturias", "bizkaia", "gipuzkoa", "39", "33", "48", "20"],
  atlantico: ["huelva", "cadiz", "21", "11"],
  mediterraneo: ["girona", "barcelona", "tarragona", "castellon", "valencia", "alicante", "murcia", "almeria", "17", "08", "43", "12", "46", "03", "30", "04"],
  baleares: ["illes-balears", "baleares", "07"],
  canarias: ["las-palmas", "santa-cruz-de-tenerife", "35", "38"],
  estrecho: ["cadiz", "malaga", "11", "29"],
  levante: ["castellon", "valencia", "alicante", "12", "46", "03"],
};

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const zone = searchParams.get("zone")?.toLowerCase();
    const severity = searchParams.get("severity")?.toUpperCase();

    // Build cache key based on filters
    const cacheKey = `api:maritimo:weather:${zone ?? "all"}:${severity ?? "all"}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      type: "COASTAL",
      isActive: true,
    };

    if (zone && ZONE_PROVINCE_MAP[zone]) {
      where.province = { in: ZONE_PROVINCE_MAP[zone] };
    }

    if (severity) {
      where.severity = severity;
    }

    const alerts = await prisma.weatherAlert.findMany({
      where,
      orderBy: [
        { severity: "desc" },
        { startedAt: "desc" },
      ],
    });

    const response = {
      success: true,
      alerts: alerts.map((a) => ({
        id: a.id,
        alertId: a.alertId,
        type: a.type,
        severity: a.severity,
        province: a.province,
        provinceName: a.provinceName,
        startedAt: a.startedAt.toISOString(),
        endedAt: a.endedAt?.toISOString() ?? null,
        description: a.description,
        isActive: a.isActive,
      })),
      count: alerts.length,
    };

    // Cache for 5 minutes
    await setInCache(cacheKey, response, 300);

    return NextResponse.json(response);
  } catch (error) {
    reportApiError(error, "api/maritimo/weather] Error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch maritime weather alerts", alerts: [], count: 0 },
      { status: 500 }
    );
  }
}
