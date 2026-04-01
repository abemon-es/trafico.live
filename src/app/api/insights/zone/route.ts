import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const radius = Math.min(parseFloat(searchParams.get("radius") || "0.2"), 1); // degrees

    if (!lat || !lng) {
      return NextResponse.json({ success: false, error: "lat and lng required" }, { status: 400 });
    }

    const cacheKey = `insights:zone:${lat.toFixed(2)}:${lng.toFixed(2)}:${radius}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const minLat = lat - radius;
    const maxLat = lat + radius;
    const minLng = lng - radius;
    const maxLng = lng + radius;

    // Aggregate data in the zone
    const [activeIncidents, recentIncidents, cameras, radars] = await Promise.all([
      prisma.trafficIncident.count({
        where: {
          isActive: true,
          latitude: { gte: minLat, lte: maxLat },
          longitude: { gte: minLng, lte: maxLng },
        },
      }),
      prisma.trafficIncident.findMany({
        where: {
          latitude: { gte: minLat, lte: maxLat },
          longitude: { gte: minLng, lte: maxLng },
          startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { type: true, severity: true, causeType: true, roadNumber: true },
        take: 200,
      }),
      prisma.camera.count({
        where: {
          latitude: { gte: minLat, lte: maxLat },
          longitude: { gte: minLng, lte: maxLng },
        },
      }),
      prisma.radar.count({
        where: {
          latitude: { gte: minLat, lte: maxLat },
          longitude: { gte: minLng, lte: maxLng },
        },
      }),
    ]);

    // Analyze patterns
    const totalRecent = recentIncidents.length;
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byRoad: Record<string, number> = {};
    const byCause: Record<string, number> = {};

    for (const inc of recentIncidents) {
      byType[String(inc.type)] = (byType[String(inc.type)] || 0) + 1;
      bySeverity[String(inc.severity)] = (bySeverity[String(inc.severity)] || 0) + 1;
      if (inc.roadNumber) byRoad[inc.roadNumber] = (byRoad[inc.roadNumber] || 0) + 1;
      if (inc.causeType) byCause[inc.causeType] = (byCause[inc.causeType] || 0) + 1;
    }

    const topRoad = Object.entries(byRoad).sort((a, b) => b[1] - a[1])[0];
    const topCause = Object.entries(byCause).sort((a, b) => b[1] - a[1])[0];
    const highSeverity = (bySeverity["HIGH"] || 0) + (bySeverity["VERY_HIGH"] || 0);

    // Generate natural language summary
    const lines: string[] = [];

    if (activeIncidents > 0) {
      lines.push(`${activeIncidents} incidencia${activeIncidents > 1 ? "s" : ""} activa${activeIncidents > 1 ? "s" : ""} ahora mismo.`);
    } else {
      lines.push("Sin incidencias activas en este momento.");
    }

    if (totalRecent > 0) {
      lines.push(`${totalRecent} incidencias en los últimos 7 días.`);
      if (topRoad) lines.push(`La carretera más afectada es la ${topRoad[0]} (${topRoad[1]} incidencias).`);
      if (topCause) {
        const causeLabel: Record<string, string> = {
          roadMaintenance: "obras", accident: "accidentes", weather: "meteorología",
          restrictionOfAccess: "restricciones",
        };
        const label = causeLabel[topCause[0]] || topCause[0];
        lines.push(`Causa principal: ${label}.`);
      }
      if (highSeverity > 0) {
        const pct = Math.round((highSeverity / totalRecent) * 100);
        lines.push(`${pct}% de incidencias de alta gravedad.`);
      }
    }

    if (cameras > 0) lines.push(`${cameras} cámara${cameras > 1 ? "s" : ""} de tráfico en la zona.`);
    if (radars > 0) lines.push(`${radars} radar${radars > 1 ? "es" : ""} de velocidad.`);

    // Risk level
    let riskLevel: "low" | "medium" | "high" = "low";
    if (activeIncidents >= 3 || highSeverity > totalRecent * 0.3) riskLevel = "high";
    else if (activeIncidents >= 1 || totalRecent > 10) riskLevel = "medium";

    const response = {
      success: true,
      data: {
        summary: lines.join(" "),
        riskLevel,
        stats: {
          activeIncidents,
          recentIncidents: totalRecent,
          cameras,
          radars,
        },
        breakdown: { byType, bySeverity, byRoad, byCause },
      },
    };

    await setInCache(cacheKey, response, 120);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Zone insights API error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate insights" }, { status: 500 });
  }
}
