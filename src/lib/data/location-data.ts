// Cached data fetchers for all 15 location section data types.
// Each function wraps a Prisma query with stampede-protected caching via getOrCompute.
//
// TTL guide:
//   REALTIME  (120s)  — incidents, V16 beacons, variable panels
//   FREQUENT  (300s)  — cameras, weather alerts
//   DAILY     (3600s) — fuel prices, EV chargers
//   WEEKLY    (86400s)— radars, speed limits, ZBE zones
//   MONTHLY   (604800s) — IMD/traffic flow, historical accidents

import { getOrCompute } from "../redis";
import { prisma } from "../db";
import type { GeoEntity, SectionData } from "../geo/types";
import {
  buildIncidentWhere,
  buildV16Where,
  buildCameraWhere,
  buildRadarWhere,
  buildPanelWhere,
  buildGasStationWhere,
  buildEVChargerWhere,
  buildWeatherWhere,
  buildSpeedLimitWhere,
  buildAccidentsWhere,
  buildTrafficFlowWhere,
  buildTrafficStationWhere,
  buildRiskZoneWhere,
  buildZBEWhere,
  buildRoadWhere,
  buildArticleWhere,
} from "../geo/query-builders";

// -----------------------------------------------------------------------
// TTL constants (seconds)
// -----------------------------------------------------------------------

const TTL = {
  REALTIME: 120, // incidents, V16, panels
  FREQUENT: 300, // cameras, weather
  DAILY: 3_600, // fuel prices, EV chargers
  WEEKLY: 86_400, // radars, speed limits, ZBE
  MONTHLY: 604_800, // IMD, historical accidents
} as const;

// -----------------------------------------------------------------------
// Cache key helper
// -----------------------------------------------------------------------

function cacheKey(entity: GeoEntity, section: string): string {
  const scope =
    entity.municipalityCode ??
    entity.provinceCode ??
    entity.communityCode ??
    entity.roadId ??
    entity.slug;
  return `loc:${entity.level}:${scope}:${section}`;
}

// -----------------------------------------------------------------------
// 1. Traffic Incidents
// -----------------------------------------------------------------------

export async function getLocationIncidents(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.trafficIncident.findMany>>[number]>> {
  return getOrCompute(cacheKey(entity, "incidents"), TTL.REALTIME, async () => {
    const where = buildIncidentWhere(entity);
    const [items, total] = await Promise.all([
      prisma.trafficIncident.findMany({
        where,
        orderBy: { startedAt: "desc" },
        take: limit,
      }),
      prisma.trafficIncident.count({ where }),
    ]);
    const lastUpdated =
      items.length > 0 ? (items[0].fetchedAt ?? null) : null;
    return { items, total, lastUpdated };
  });
}

// -----------------------------------------------------------------------
// 2. V16 Beacon Events
// -----------------------------------------------------------------------

export async function getLocationV16(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.v16BeaconEvent.findMany>>[number]>> {
  return getOrCompute(cacheKey(entity, "v16"), TTL.REALTIME, async () => {
    const where = buildV16Where(entity);
    const [items, total] = await Promise.all([
      prisma.v16BeaconEvent.findMany({
        where,
        orderBy: { activatedAt: "desc" },
        take: limit,
      }),
      prisma.v16BeaconEvent.count({ where }),
    ]);
    const lastUpdated =
      items.length > 0 ? (items[0].fetchedAt ?? null) : null;
    return { items, total, lastUpdated };
  });
}

// -----------------------------------------------------------------------
// 3. Traffic Cameras
// -----------------------------------------------------------------------

export async function getLocationCameras(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.camera.findMany>>[number]>> {
  return getOrCompute(cacheKey(entity, "cameras"), TTL.FREQUENT, async () => {
    const where = buildCameraWhere(entity);
    const [items, total] = await Promise.all([
      prisma.camera.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
      }),
      prisma.camera.count({ where }),
    ]);
    const lastUpdated =
      items.length > 0 ? (items[0].lastUpdated ?? null) : null;
    return { items, total, lastUpdated };
  });
}

// -----------------------------------------------------------------------
// 4. Radars
// -----------------------------------------------------------------------

export async function getLocationRadars(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.radar.findMany>>[number]>> {
  return getOrCompute(cacheKey(entity, "radars"), TTL.WEEKLY, async () => {
    const where = buildRadarWhere(entity);
    const [items, total] = await Promise.all([
      prisma.radar.findMany({
        where,
        orderBy: { roadNumber: "asc" },
        take: limit,
      }),
      prisma.radar.count({ where }),
    ]);
    const lastUpdated =
      items.length > 0 ? (items[0].lastUpdated ?? null) : null;
    return { items, total, lastUpdated };
  });
}

// -----------------------------------------------------------------------
// 5. Variable Panels (DGT panneau messages)
// -----------------------------------------------------------------------

export async function getLocationPanels(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.variablePanel.findMany>>[number]>> {
  return getOrCompute(cacheKey(entity, "panels"), TTL.REALTIME, async () => {
    const where = buildPanelWhere(entity);
    const [items, total] = await Promise.all([
      prisma.variablePanel.findMany({
        where,
        orderBy: { fetchedAt: "desc" },
        take: limit,
      }),
      prisma.variablePanel.count({ where }),
    ]);
    const lastUpdated =
      items.length > 0 ? (items[0].fetchedAt ?? null) : null;
    return { items, total, lastUpdated };
  });
}

// -----------------------------------------------------------------------
// 6. Gas Stations
// -----------------------------------------------------------------------

export async function getLocationGasStations(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.gasStation.findMany>>[number]>> {
  return getOrCompute(
    cacheKey(entity, "gasStations"),
    TTL.DAILY,
    async () => {
      const where = buildGasStationWhere(entity);
      const [items, total] = await Promise.all([
        prisma.gasStation.findMany({
          where,
          orderBy: { priceGasoleoA: "asc" },
          take: limit,
        }),
        prisma.gasStation.count({ where }),
      ]);
      const lastUpdated =
        items.length > 0 ? (items[0].lastUpdated ?? null) : null;
      return { items, total, lastUpdated };
    }
  );
}

// -----------------------------------------------------------------------
// 7. EV Chargers
// -----------------------------------------------------------------------

export async function getLocationEVChargers(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.eVCharger.findMany>>[number]>> {
  return getOrCompute(
    cacheKey(entity, "evChargers"),
    TTL.DAILY,
    async () => {
      const where = buildEVChargerWhere(entity);
      const [items, total] = await Promise.all([
        prisma.eVCharger.findMany({
          where,
          orderBy: { name: "asc" },
          take: limit,
        }),
        prisma.eVCharger.count({ where }),
      ]);
      const lastUpdated =
        items.length > 0 ? (items[0].lastUpdated ?? null) : null;
      return { items, total, lastUpdated };
    }
  );
}

// -----------------------------------------------------------------------
// 8. Weather Alerts
// -----------------------------------------------------------------------

export async function getLocationWeather(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.weatherAlert.findMany>>[number]>> {
  return getOrCompute(cacheKey(entity, "weather"), TTL.FREQUENT, async () => {
    const where = buildWeatherWhere(entity);
    const [items, total] = await Promise.all([
      prisma.weatherAlert.findMany({
        where,
        orderBy: { startedAt: "desc" },
        take: limit,
      }),
      prisma.weatherAlert.count({ where }),
    ]);
    const lastUpdated =
      items.length > 0 ? (items[0].fetchedAt ?? null) : null;
    return { items, total, lastUpdated };
  });
}

// -----------------------------------------------------------------------
// 9. Speed Limits
// -----------------------------------------------------------------------

export async function getLocationSpeedLimits(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.speedLimit.findMany>>[number]>> {
  return getOrCompute(
    cacheKey(entity, "speedLimits"),
    TTL.WEEKLY,
    async () => {
      const where = buildSpeedLimitWhere(entity);
      const [items, total] = await Promise.all([
        prisma.speedLimit.findMany({
          where,
          orderBy: [{ roadNumber: "asc" }, { kmStart: "asc" }],
          take: limit,
        }),
        prisma.speedLimit.count({ where }),
      ]);
      const lastUpdated =
        items.length > 0 ? (items[0].lastUpdated ?? null) : null;
      return { items, total, lastUpdated };
    }
  );
}

// -----------------------------------------------------------------------
// 10. Historical Accidents
// -----------------------------------------------------------------------

export async function getLocationAccidents(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.historicalAccidents.findMany>>[number]>> {
  return getOrCompute(
    cacheKey(entity, "accidents"),
    TTL.MONTHLY,
    async () => {
      const where = buildAccidentsWhere(entity);
      const [items, total] = await Promise.all([
        prisma.historicalAccidents.findMany({
          where,
          orderBy: [{ year: "desc" }, { accidents: "desc" }],
          take: limit,
        }),
        prisma.historicalAccidents.count({ where }),
      ]);
      // HistoricalAccidents has no fetchedAt — use null
      return { items, total, lastUpdated: null };
    }
  );
}

// -----------------------------------------------------------------------
// 11. Traffic Flow (IMD segments)
// -----------------------------------------------------------------------

export async function getLocationTrafficFlow(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.trafficFlow.findMany>>[number]>> {
  return getOrCompute(
    cacheKey(entity, "trafficFlow"),
    TTL.MONTHLY,
    async () => {
      const where = buildTrafficFlowWhere(entity);
      const [items, total] = await Promise.all([
        prisma.trafficFlow.findMany({
          where,
          orderBy: [{ year: "desc" }, { imd: "desc" }],
          take: limit,
        }),
        prisma.trafficFlow.count({ where }),
      ]);
      // TrafficFlow has no fetchedAt
      return { items, total, lastUpdated: null };
    }
  );
}

// -----------------------------------------------------------------------
// 12. Traffic Stations (counting stations)
// -----------------------------------------------------------------------

export async function getLocationTrafficStations(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.trafficStation.findMany>>[number]>> {
  return getOrCompute(
    cacheKey(entity, "trafficStations"),
    TTL.MONTHLY,
    async () => {
      const where = buildTrafficStationWhere(entity);
      const [items, total] = await Promise.all([
        prisma.trafficStation.findMany({
          where,
          orderBy: [{ year: "desc" }, { imd: "desc" }],
          take: limit,
        }),
        prisma.trafficStation.count({ where }),
      ]);
      return { items, total, lastUpdated: null };
    }
  );
}

// -----------------------------------------------------------------------
// 13. Road Risk Zones
// -----------------------------------------------------------------------

export async function getLocationRiskZones(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.roadRiskZone.findMany>>[number]>> {
  return getOrCompute(
    cacheKey(entity, "riskZones"),
    TTL.WEEKLY,
    async () => {
      const where = buildRiskZoneWhere(entity);
      const [items, total] = await Promise.all([
        prisma.roadRiskZone.findMany({
          where,
          orderBy: { road: "asc" },
          take: limit,
        }),
        prisma.roadRiskZone.count({ where }),
      ]);
      const lastUpdated =
        items.length > 0 ? (items[0].sourceUpdated ?? null) : null;
      return { items, total, lastUpdated };
    }
  );
}

// -----------------------------------------------------------------------
// 14. ZBE Low-Emission Zones
// -----------------------------------------------------------------------

export async function getLocationZBE(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.zBEZone.findMany>>[number]>> {
  return getOrCompute(cacheKey(entity, "zbe"), TTL.WEEKLY, async () => {
    const where = buildZBEWhere(entity);
    const [items, total] = await Promise.all([
      prisma.zBEZone.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
      }),
      prisma.zBEZone.count({ where }),
    ]);
    const lastUpdated =
      items.length > 0 ? (items[0].lastUpdated ?? null) : null;
    return { items, total, lastUpdated };
  });
}

// -----------------------------------------------------------------------
// 15. Roads
// -----------------------------------------------------------------------

export async function getLocationRoads(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.road.findMany>>[number]>> {
  return getOrCompute(cacheKey(entity, "roads"), TTL.WEEKLY, async () => {
    const where = buildRoadWhere(entity);
    const [items, total] = await Promise.all([
      prisma.road.findMany({
        where,
        orderBy: { id: "asc" },
        take: limit,
      }),
      prisma.road.count({ where }),
    ]);
    // Road has no fetchedAt/lastUpdated
    return { items, total, lastUpdated: null };
  });
}

// -----------------------------------------------------------------------
// 16. News / Articles
// -----------------------------------------------------------------------

export async function getLocationNews(
  entity: GeoEntity,
  limit = 10
): Promise<SectionData<Awaited<ReturnType<typeof prisma.article.findMany>>[number]>> {
  return getOrCompute(cacheKey(entity, "news"), TTL.FREQUENT, async () => {
    const where = buildArticleWhere(entity);
    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take: limit,
        include: { tags: { include: { tag: true } } },
      }),
      prisma.article.count({ where }),
    ]);
    const lastUpdated =
      items.length > 0 ? (items[0].publishedAt ?? null) : null;
    return { items, total, lastUpdated };
  });
}
