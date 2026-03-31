import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";

export const dynamic = "force-dynamic";

const CACHE_TTL = 120; // 2 minutes

interface TimelineIncident {
  id: string;
  lat: number;
  lng: number;
  type: string;
  effect: string;
  cause: string;
  road: string | null;
  km: number | null;
  province: string | null;
  severity: string;
  description: string | null;
  startedAt: string;
  endedAt: string | null;
}

interface TimelineSlot {
  timestamp: string;
  incidents: TimelineIncident[];
  count: number;
}

// Map raw DB types to our effect/cause classification
function classifyEffect(type: string, managementType: string | null): string {
  if (managementType?.includes("diversion")) return "DIVERSION";
  if (type === "ROAD_CLOSED" || managementType?.includes("roadClosed")) return "ROAD_CLOSED";
  if (type === "SLOW_TRAFFIC" || type === "CONGESTION") return "SLOW_TRAFFIC";
  if (managementType?.includes("restricted") || type === "RESTRICTION") return "RESTRICTED";
  return "OTHER_EFFECT";
}

function classifyCause(causeType: string | null, type: string): string {
  if (causeType?.includes("maintenance") || causeType?.includes("road")) return "ROADWORK";
  if (causeType?.includes("accident") || type === "ACCIDENT") return "ACCIDENT";
  if (causeType?.includes("weather") || causeType?.includes("ice") || causeType?.includes("fog")) return "WEATHER";
  if (causeType?.includes("restriction")) return "RESTRICTION";
  return "OTHER_CAUSE";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = Math.min(parseInt(searchParams.get("hours") || "24", 10) || 24, 72);
    const slots = Math.min(parseInt(searchParams.get("slots") || "24", 10) || 24, 48);

    const cacheKey = `incidents:timeline:${hours}h:${slots}s`;
    const cached = await getFromCache<{ success: boolean; data: { slots: TimelineSlot[]; hours: number } }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const now = new Date();
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const intervalMs = (hours * 60 * 60 * 1000) / slots;

    // Fetch all incidents that were active during the time window
    const incidents = await prisma.trafficIncident.findMany({
      where: {
        startedAt: { lte: now },
        OR: [
          { endedAt: null, isActive: true },
          { endedAt: { gte: start } },
          { lastSeenAt: { gte: start } },
        ],
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        type: true,
        causeType: true,
        managementType: true,
        roadNumber: true,
        kmPoint: true,
        provinceName: true,
        severity: true,
        description: true,
        startedAt: true,
        endedAt: true,
        lastSeenAt: true,
        isActive: true,
      },
      orderBy: { startedAt: "desc" },
      take: 5000,
    });

    // Build time slots
    const timelineSlots: TimelineSlot[] = [];

    for (let i = 0; i < slots; i++) {
      const slotTime = new Date(start.getTime() + i * intervalMs);
      const slotEnd = new Date(slotTime.getTime() + intervalMs);

      // Find incidents active at this time slot
      const activeAtSlot = incidents.filter((inc) => {
        const incStart = inc.startedAt;
        const incEnd = inc.endedAt || inc.lastSeenAt || (inc.isActive ? now : inc.lastSeenAt);
        return incStart <= slotEnd && (incEnd ? incEnd >= slotTime : true);
      });

      timelineSlots.push({
        timestamp: slotTime.toISOString(),
        count: activeAtSlot.length,
        incidents: activeAtSlot.map((inc) => ({
          id: inc.id,
          lat: Number(inc.latitude),
          lng: Number(inc.longitude),
          type: String(inc.type),
          effect: classifyEffect(String(inc.type), inc.managementType),
          cause: classifyCause(inc.causeType, String(inc.type)),
          road: inc.roadNumber,
          km: inc.kmPoint ? Number(inc.kmPoint) : null,
          province: inc.provinceName,
          severity: String(inc.severity),
          description: inc.description,
          startedAt: inc.startedAt.toISOString(),
          endedAt: inc.endedAt?.toISOString() || null,
        })),
      });
    }

    const response = {
      success: true,
      data: {
        slots: timelineSlots,
        hours,
        slotCount: slots,
        totalIncidents: incidents.length,
      },
    };

    await setInCache(cacheKey, response, CACHE_TTL);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Incidents timeline API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch timeline data" },
      { status: 500 }
    );
  }
}
