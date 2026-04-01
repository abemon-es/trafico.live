import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

export const dynamic = "force-dynamic";

// Haversine formula to calculate distance between two coordinates in km
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface CorrelationMatch {
  v16Id: string;
  incidentId: string;
  distanceKm: number;
  timeDiffMinutes: number;
  v16Time: Date;
  incidentTime: Date;
  province: string | null;
  road: string | null;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);
    const maxDistanceKm = parseFloat(searchParams.get("maxDistance") || "2");
    const maxTimeDiffMinutes = parseInt(searchParams.get("maxTimeDiff") || "60", 10);

    // Redis cache — 300s TTL to avoid recomputing the expensive correlation loop
    const cacheKey = `correlation:${days}:${maxDistanceKm}:${maxTimeDiffMinutes}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get V16 events with coordinates
    const v16Events = await prisma.v16BeaconEvent.findMany({
      where: {
        activatedAt: { gte: startDate },
      },
      select: {
        id: true,
        activatedAt: true,
        latitude: true,
        longitude: true,
        provinceName: true,
        roadNumber: true,
      },
      orderBy: { activatedAt: "desc" },
      take: 2000,
    });

    // Get incidents with coordinates
    const incidents = await prisma.trafficIncident.findMany({
      where: {
        startedAt: { gte: startDate },
      },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        latitude: true,
        longitude: true,
        provinceName: true,
        roadNumber: true,
        type: true,
      },
      orderBy: { startedAt: "desc" },
      take: 2000,
    });

    // Pre-group both datasets by province to reduce comparisons from O(n²)
    // to O(n * m/p) where p = number of provinces
    const v16ByProvince = new Map<string, typeof v16Events>();
    for (const v16 of v16Events) {
      const prov = v16.provinceName || "_unknown";
      if (!v16ByProvince.has(prov)) v16ByProvince.set(prov, []);
      v16ByProvince.get(prov)!.push(v16);
    }

    const incidentsByProvince = new Map<string, typeof incidents>();
    for (const inc of incidents) {
      const prov = inc.provinceName || "_unknown";
      if (!incidentsByProvince.has(prov)) incidentsByProvince.set(prov, []);
      incidentsByProvince.get(prov)!.push(inc);
    }

    // Find correlations — only compare within the same province
    const correlations: CorrelationMatch[] = [];
    const v16WithCorrelation = new Set<string>();
    const incidentsWithCorrelation = new Set<string>();

    for (const [prov, provV16s] of v16ByProvince) {
      const provIncidents = incidentsByProvince.get(prov);
      if (!provIncidents) continue;

      for (const v16 of provV16s) {
        if (!v16.latitude || !v16.longitude) continue;

        for (const incident of provIncidents) {
          if (!incident.latitude || !incident.longitude) continue;

          // Calculate spatial distance
          const distance = haversineDistance(
            Number(v16.latitude),
            Number(v16.longitude),
            Number(incident.latitude),
            Number(incident.longitude)
          );

          if (distance > maxDistanceKm) continue;

          // Calculate time difference (in minutes)
          const v16Time = v16.activatedAt.getTime();
          const incidentStart = incident.startedAt.getTime();
          const incidentEnd = incident.endedAt?.getTime() || incidentStart + 3600000; // Default 1hr

          // Check if V16 was activated during or near the incident
          let timeDiffMinutes: number;
          if (v16Time >= incidentStart && v16Time <= incidentEnd) {
            // V16 was during the incident
            timeDiffMinutes = 0;
          } else if (v16Time < incidentStart) {
            // V16 was before the incident
            timeDiffMinutes = (incidentStart - v16Time) / 60000;
          } else {
            // V16 was after the incident ended
            timeDiffMinutes = (v16Time - incidentEnd) / 60000;
          }

          if (timeDiffMinutes > maxTimeDiffMinutes) continue;

          // This is a correlation
          correlations.push({
            v16Id: v16.id,
            incidentId: incident.id,
            distanceKm: Math.round(distance * 100) / 100,
            timeDiffMinutes: Math.round(timeDiffMinutes),
            v16Time: v16.activatedAt,
            incidentTime: incident.startedAt,
            province: v16.provinceName || incident.provinceName,
            road: v16.roadNumber || incident.roadNumber,
          });

          v16WithCorrelation.add(v16.id);
          incidentsWithCorrelation.add(incident.id);
        }
      }
    }

    // Calculate statistics
    const totalV16 = v16Events.length;
    const totalIncidents = incidents.length;
    const v16CorrelatedCount = v16WithCorrelation.size;
    const incidentsCorrelatedCount = incidentsWithCorrelation.size;

    const v16CorrelationRate = totalV16 > 0
      ? Math.round((v16CorrelatedCount / totalV16) * 1000) / 10
      : 0;
    const incidentCorrelationRate = totalIncidents > 0
      ? Math.round((incidentsCorrelatedCount / totalIncidents) * 1000) / 10
      : 0;

    // Group correlations by distance ranges
    const byDistance = {
      under500m: correlations.filter((c) => c.distanceKm < 0.5).length,
      under1km: correlations.filter((c) => c.distanceKm >= 0.5 && c.distanceKm < 1).length,
      under2km: correlations.filter((c) => c.distanceKm >= 1 && c.distanceKm < 2).length,
      over2km: correlations.filter((c) => c.distanceKm >= 2).length,
    };

    // Group by time proximity
    const byTimeDiff = {
      during: correlations.filter((c) => c.timeDiffMinutes === 0).length,
      within15min: correlations.filter((c) => c.timeDiffMinutes > 0 && c.timeDiffMinutes <= 15).length,
      within30min: correlations.filter((c) => c.timeDiffMinutes > 15 && c.timeDiffMinutes <= 30).length,
      within60min: correlations.filter((c) => c.timeDiffMinutes > 30 && c.timeDiffMinutes <= 60).length,
    };

    // Group by province
    const byProvince: Record<string, number> = {};
    for (const corr of correlations) {
      const prov = corr.province || "Desconocida";
      byProvince[prov] = (byProvince[prov] || 0) + 1;
    }

    // Sort provinces by correlation count
    const topProvinces = Object.entries(byProvince)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([province, count]) => ({ province, count }));

    // Group by road
    const byRoad: Record<string, number> = {};
    for (const corr of correlations) {
      if (corr.road) {
        byRoad[corr.road] = (byRoad[corr.road] || 0) + 1;
      }
    }

    // Sort roads by correlation count
    const topRoads = Object.entries(byRoad)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([road, count]) => ({ road, count }));

    // Sample correlations for display
    const sampleCorrelations = correlations
      .slice(0, 20)
      .map((c) => ({
        distanceKm: c.distanceKm,
        timeDiffMinutes: c.timeDiffMinutes,
        v16Time: c.v16Time.toISOString(),
        incidentTime: c.incidentTime.toISOString(),
        province: c.province,
        road: c.road,
      }));

    const responseBody = {
      success: true,
      data: {
        summary: {
          totalV16: totalV16,
          totalIncidents: totalIncidents,
          totalCorrelations: correlations.length,
          v16Correlated: v16CorrelatedCount,
          incidentsCorrelated: incidentsCorrelatedCount,
          v16CorrelationRate: v16CorrelationRate,
          incidentCorrelationRate: incidentCorrelationRate,
        },
        byDistance,
        byTimeDiff,
        topProvinces,
        topRoads,
        sampleCorrelations,
        parameters: {
          days,
          maxDistanceKm,
          maxTimeDiffMinutes,
        },
      },
    };

    await setInCache(cacheKey, responseBody, 300);
    return NextResponse.json(responseBody);
  } catch (error) {
    reportApiError(error, "Correlation API error");
    return NextResponse.json(
      { success: false, error: "Failed to calculate correlations" },
      { status: 500 }
    );
  }
}
