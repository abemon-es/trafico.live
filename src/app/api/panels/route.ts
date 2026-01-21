import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Cache the response for 2 minutes (panels update every 5 min)
export const revalidate = 120;

interface PanelResponseItem {
  id: string;
  panelId: string;
  name: string;
  lat: number;
  lng: number;
  road: string;
  direction: string | null;
  kmPoint: number | null;
  province: string;
  provinceName: string;
  message: string | null;
  messageType: string | null;
  hasMessage: boolean;
  lastUpdated: string;
}

interface PanelsResponse {
  count: number;
  withMessages: number;
  panels: PanelResponseItem[];
  provinces: string[];
  messageTypes: string[];
  source: "database";
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filterProvince = searchParams.get("province");
    const filterRoad = searchParams.get("road");
    const filterHasMessage = searchParams.get("hasMessage");

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
    });

    const panels: PanelResponseItem[] = dbPanels.map((panel) => ({
      id: panel.id,
      panelId: panel.panelId,
      name: panel.name || `Panel ${panel.panelId}`,
      lat: Number(panel.latitude),
      lng: Number(panel.longitude),
      road: panel.roadNumber || "",
      direction: panel.direction,
      kmPoint: panel.kmPoint ? Number(panel.kmPoint) : null,
      province: panel.province || "",
      provinceName: panel.provinceName || "",
      message: panel.message,
      messageType: panel.messageType,
      hasMessage: panel.hasMessage,
      lastUpdated: panel.lastUpdated.toISOString(),
    }));

    // Extract unique provinces and message types for filtering
    const provinces = [
      ...new Set(panels.map((p) => p.provinceName).filter(Boolean)),
    ].sort();

    const messageTypes = [
      ...new Set(
        panels.map((p) => p.messageType).filter(Boolean) as string[]
      ),
    ].sort();

    const withMessages = panels.filter((p) => p.hasMessage).length;

    const response: PanelsResponse = {
      count: panels.length,
      withMessages,
      panels,
      provinces,
      messageTypes,
      source: "database",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching panels:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch panel data",
        count: 0,
        withMessages: 0,
        panels: [],
        provinces: [],
        messageTypes: [],
        source: "database" as const,
      },
      { status: 500 }
    );
  }
}
