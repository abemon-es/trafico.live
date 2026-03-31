import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";

const CACHE_KEY_PREFIX = "api:panels";
const CACHE_TTL = 300; // 5 minutes — panels update every ~5 min

export interface PanelResponseItem {
  id: string;
  roadNumber: string;
  kmPoint: number | null;
  direction: string | null;
  province: string;
  provinceName: string;
  message: string | null;
  hasMessage: boolean;
  latitude: number;
  longitude: number;
  lastUpdated: string;
}

export interface PanelsResponse {
  count: number;
  withMessages: number;
  withoutMessages: number;
  panels: PanelResponseItem[];
  provinces: { code: string; name: string }[];
  roads: string[];
  source: "database" | "cache";
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filterProvince = searchParams.get("province");
    const filterRoad = searchParams.get("road");
    const filterHasMessage = searchParams.get("hasMessage");

    // Build a deterministic cache key from query params
    const paramStr = new URLSearchParams(
      [...searchParams.entries()].sort(([a], [b]) => a.localeCompare(b))
    ).toString();
    const cacheKey = paramStr ? `${CACHE_KEY_PREFIX}:${paramStr}` : CACHE_KEY_PREFIX;

    const cached = await getFromCache<PanelsResponse>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, source: "cache" });
    }

    // Build where clause
    const whereClause: Record<string, unknown> = { isActive: true };

    if (filterProvince) {
      whereClause.provinceName = filterProvince;
    }

    if (filterRoad) {
      whereClause.roadNumber = filterRoad;
    }

    if (filterHasMessage === "true") {
      whereClause.hasMessage = true;
    }

    const dbPanels = await prisma.variablePanel.findMany({
      where: whereClause,
      orderBy: [{ hasMessage: "desc" }, { roadNumber: "asc" }],
      take: 5000,
      select: {
        id: true,
        roadNumber: true,
        kmPoint: true,
        direction: true,
        province: true,
        provinceName: true,
        message: true,
        hasMessage: true,
        latitude: true,
        longitude: true,
        lastUpdated: true,
      },
    });

    const panels: PanelResponseItem[] = dbPanels.map((panel) => ({
      id: panel.id,
      roadNumber: panel.roadNumber || "",
      kmPoint: panel.kmPoint ? Number(panel.kmPoint) : null,
      direction: panel.direction,
      province: panel.province || "",
      provinceName: panel.provinceName || "",
      message: panel.message,
      hasMessage: panel.hasMessage,
      latitude: Number(panel.latitude),
      longitude: Number(panel.longitude),
      lastUpdated: panel.lastUpdated.toISOString(),
    }));

    const withMessages = panels.filter((p) => p.hasMessage).length;
    const withoutMessages = panels.length - withMessages;

    // Extract unique provinces for filtering
    const provinceMap = new Map<string, string>();
    for (const p of panels) {
      if (p.province && p.provinceName) {
        provinceMap.set(p.province, p.provinceName);
      }
    }
    const provinces = [...provinceMap.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));

    // Extract unique roads for filtering
    const roads = [
      ...new Set(panels.map((p) => p.roadNumber).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));

    const response: PanelsResponse = {
      count: panels.length,
      withMessages,
      withoutMessages,
      panels,
      provinces,
      roads,
      source: "database",
    };

    await setInCache(cacheKey, response, CACHE_TTL);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching panels:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch panel data",
        count: 0,
        withMessages: 0,
        withoutMessages: 0,
        panels: [],
        provinces: [],
        roads: [],
        source: "database" as const,
      },
      { status: 500 }
    );
  }
}
