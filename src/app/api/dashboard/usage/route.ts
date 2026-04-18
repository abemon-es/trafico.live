/**
 * GET /api/dashboard/usage?range=7d|30d|90d
 *
 * Returns aggregated ApiUsage data for the authenticated user's keys.
 * Response shape:
 *   - daily: Array<{ date: string, requests: number }>
 *   - byEndpoint: Array<{ endpoint: string, calls: number }>
 *   - summary: { total, avgPerDay, topEndpoint }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { prisma } from "@/lib/db";
import { reportApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const VALID_RANGES = ["7d", "30d", "90d"] as const;
type Range = (typeof VALID_RANGES)[number];

function getRangeStart(range: Range): Date {
  const days = parseInt(range);
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const email = session.user.email;
    const rawRange = request.nextUrl.searchParams.get("range") ?? "7d";
    const range: Range = VALID_RANGES.includes(rawRange as Range)
      ? (rawRange as Range)
      : "7d";

    const since = getRangeStart(range);

    // Get all active key IDs owned by this user
    const userKeys = await prisma.apiKey.findMany({
      where: { email },
      select: { id: true },
    });
    const keyIds = userKeys.map((k: { id: string }) => k.id);

    if (keyIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { daily: [], byEndpoint: [], summary: { total: 0, avgPerDay: 0, topEndpoint: null } },
      });
    }

    // Fetch usage grouped by date and endpoint
    const usageRows = await prisma.apiUsage.findMany({
      where: {
        keyId: { in: keyIds },
        date: { gte: since },
      },
      select: {
        date: true,
        endpoint: true,
        requestCount: true,
      },
      orderBy: { date: "asc" },
    });

    // Aggregate by date
    const dailyMap = new Map<string, number>();
    const endpointMap = new Map<string, number>();

    for (const row of usageRows) {
      const dateStr = row.date.toISOString().slice(0, 10); // YYYY-MM-DD
      dailyMap.set(dateStr, (dailyMap.get(dateStr) ?? 0) + row.requestCount);
      endpointMap.set(
        row.endpoint,
        (endpointMap.get(row.endpoint) ?? 0) + row.requestCount
      );
    }

    // Build daily array (fill gaps with 0)
    const days = parseInt(range);
    const daily: Array<{ date: string; requests: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      daily.push({ date: key, requests: dailyMap.get(key) ?? 0 });
    }

    // Build endpoint list (top 10 by call count)
    const byEndpoint = Array.from(endpointMap.entries())
      .map(([endpoint, calls]) => ({ endpoint, calls }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    const total = daily.reduce((s, d) => s + d.requests, 0);
    const avgPerDay = days > 0 ? Math.round(total / days) : 0;
    const topEndpoint = byEndpoint[0]?.endpoint ?? null;

    return NextResponse.json({
      success: true,
      data: {
        range,
        daily,
        byEndpoint,
        summary: { total, avgPerDay, topEndpoint },
      },
    });
  } catch (error) {
    reportApiError(error, "GET /api/dashboard/usage");
    return NextResponse.json(
      { error: "Error al obtener datos de uso" },
      { status: 500 }
    );
  }
}
