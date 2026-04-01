// Prisma where-clause builders for geographic entity scopes
// Each function returns a partial where object to be spread into a Prisma query.
//
// NOTE: Some models (Camera, Radar, VariablePanel, EVCharger) don't yet have
// communityCode and only recently gained municipalityCode. Until municipalityCode
// is backfilled from the collector, municipality-level queries fall back to
// province-level for these models.

import type { GeoEntity } from "./types";

// -----------------------------------------------------------------------
// TrafficIncident — has province, community, municipality, roadNumber
// -----------------------------------------------------------------------

export function buildIncidentWhere(entity: GeoEntity) {
  const base = { isActive: true } as Record<string, unknown>;
  switch (entity.level) {
    case "community":
      return { ...base, community: entity.communityCode };
    case "province":
      return { ...base, province: entity.provinceCode };
    case "municipality":
      // municipality field stores the town name, not INE code
      return { ...base, province: entity.provinceCode };
    case "city":
      return { ...base, province: entity.provinceCode };
    case "road":
      return { ...base, roadNumber: entity.roadId };
    default:
      return base;
  }
}

// -----------------------------------------------------------------------
// V16BeaconEvent — same structure as TrafficIncident
// -----------------------------------------------------------------------

export function buildV16Where(entity: GeoEntity) {
  const base = { isActive: true } as Record<string, unknown>;
  switch (entity.level) {
    case "community":
      return { ...base, community: entity.communityCode };
    case "province":
      return { ...base, province: entity.provinceCode };
    case "municipality":
    case "city":
      return { ...base, province: entity.provinceCode };
    case "road":
      return { ...base, roadNumber: entity.roadId };
    default:
      return base;
  }
}

// -----------------------------------------------------------------------
// Camera — has province; municipalityCode backfill pending
// Falls back to province for municipality/city entities.
// -----------------------------------------------------------------------

export function buildCameraWhere(entity: GeoEntity) {
  const base = { isActive: true } as Record<string, unknown>;
  switch (entity.level) {
    case "province":
      return { ...base, province: entity.provinceCode };
    case "municipality":
    case "city":
      // NOTE: municipalityCode not yet backfilled — province fallback until data is ready
      if (entity.municipalityCode) {
        return { ...base, municipalityCode: entity.municipalityCode };
      }
      return { ...base, province: entity.provinceCode };
    case "road":
      return { ...base, roadNumber: entity.roadId };
    default:
      return base;
  }
}

// -----------------------------------------------------------------------
// Radar — has province; municipalityCode backfill pending
// -----------------------------------------------------------------------

export function buildRadarWhere(entity: GeoEntity) {
  const base = { isActive: true } as Record<string, unknown>;
  switch (entity.level) {
    case "province":
      return { ...base, province: entity.provinceCode };
    case "municipality":
    case "city":
      // NOTE: municipalityCode not yet backfilled — province fallback until data is ready
      if (entity.municipalityCode) {
        return { ...base, municipalityCode: entity.municipalityCode };
      }
      return { ...base, province: entity.provinceCode };
    case "road":
      return { ...base, roadNumber: entity.roadId };
    default:
      return base;
  }
}

// -----------------------------------------------------------------------
// VariablePanel — has province, hasMessage
// -----------------------------------------------------------------------

export function buildPanelWhere(entity: GeoEntity) {
  const base = { isActive: true } as Record<string, unknown>;
  switch (entity.level) {
    case "province":
      return { ...base, province: entity.provinceCode };
    case "municipality":
    case "city":
      if (entity.municipalityCode) {
        return { ...base, municipalityCode: entity.municipalityCode };
      }
      return { ...base, province: entity.provinceCode };
    case "road":
      return { ...base, roadNumber: entity.roadId };
    default:
      return base;
  }
}

// -----------------------------------------------------------------------
// GasStation — has province, communityCode, municipalityCode
// -----------------------------------------------------------------------

export function buildGasStationWhere(entity: GeoEntity) {
  switch (entity.level) {
    case "community":
      return { communityCode: entity.communityCode };
    case "province":
      return { province: entity.provinceCode };
    case "municipality":
    case "city":
      if (entity.municipalityCode) {
        return { municipalityCode: entity.municipalityCode };
      }
      return { province: entity.provinceCode };
    case "road":
      return { nearestRoad: entity.roadId };
    default:
      return {};
  }
}

// -----------------------------------------------------------------------
// EVCharger — has province; municipalityCode backfill pending
// -----------------------------------------------------------------------

export function buildEVChargerWhere(entity: GeoEntity) {
  switch (entity.level) {
    case "province":
      return { province: entity.provinceCode };
    case "municipality":
    case "city":
      if (entity.municipalityCode) {
        return { municipalityCode: entity.municipalityCode };
      }
      return { province: entity.provinceCode };
    default:
      return {};
  }
}

// -----------------------------------------------------------------------
// WeatherAlert — has province (required String)
// No community-level filtering available; falls back to null for community.
// -----------------------------------------------------------------------

export function buildWeatherWhere(entity: GeoEntity) {
  const base = { isActive: true } as Record<string, unknown>;
  switch (entity.level) {
    case "community":
      // WeatherAlert has no communityCode — filter is limited
      return base;
    case "province":
      return { ...base, province: entity.provinceCode };
    case "municipality":
    case "city":
      return { ...base, province: entity.provinceCode };
    default:
      return base;
  }
}

// -----------------------------------------------------------------------
// SpeedLimit — has province, roadNumber
// -----------------------------------------------------------------------

export function buildSpeedLimitWhere(entity: GeoEntity) {
  switch (entity.level) {
    case "province":
      return { province: entity.provinceCode };
    case "municipality":
    case "city":
      if (entity.municipalityCode) {
        return { municipalityCode: entity.municipalityCode };
      }
      return { province: entity.provinceCode };
    case "road":
      return { roadNumber: entity.roadId };
    default:
      return {};
  }
}

// -----------------------------------------------------------------------
// HistoricalAccidents — has province (required String), year
// -----------------------------------------------------------------------

export function buildAccidentsWhere(entity: GeoEntity) {
  switch (entity.level) {
    case "province":
      return { province: entity.provinceCode };
    case "municipality":
    case "city":
      return { province: entity.provinceCode };
    default:
      return {};
  }
}

// -----------------------------------------------------------------------
// TrafficFlow — has province, roadNumber
// -----------------------------------------------------------------------

export function buildTrafficFlowWhere(entity: GeoEntity) {
  switch (entity.level) {
    case "province":
      return { province: entity.provinceCode };
    case "municipality":
    case "city":
      return { province: entity.provinceCode };
    case "road":
      return { roadNumber: entity.roadId };
    default:
      return {};
  }
}

// -----------------------------------------------------------------------
// TrafficStation — has province, municipalityCode, roadNumber
// -----------------------------------------------------------------------

export function buildTrafficStationWhere(entity: GeoEntity) {
  switch (entity.level) {
    case "province":
      return { province: entity.provinceCode };
    case "municipality":
    case "city":
      if (entity.municipalityCode) {
        return { municipalityCode: entity.municipalityCode };
      }
      return { province: entity.provinceCode };
    case "road":
      return { roadNumber: entity.roadId };
    default:
      return {};
  }
}

// -----------------------------------------------------------------------
// RoadRiskZone — has province, municipalityCode, road
// -----------------------------------------------------------------------

export function buildRiskZoneWhere(entity: GeoEntity) {
  const base = { isActive: true } as Record<string, unknown>;
  switch (entity.level) {
    case "province":
      return { ...base, province: entity.provinceCode };
    case "municipality":
    case "city":
      if (entity.municipalityCode) {
        return { ...base, municipalityCode: entity.municipalityCode };
      }
      return { ...base, province: entity.provinceCode };
    case "road":
      return { ...base, road: entity.roadId };
    default:
      return base;
  }
}

// -----------------------------------------------------------------------
// ZBEZone — uses cityName (no province code mapping available)
// Entity.name is used as the city name filter.
// -----------------------------------------------------------------------

export function buildZBEWhere(entity: GeoEntity) {
  switch (entity.level) {
    case "municipality":
    case "city":
      return { cityName: entity.name };
    case "province":
      // No direct province field on ZBEZone — return empty (fetch all)
      return {};
    default:
      return {};
  }
}

// -----------------------------------------------------------------------
// Road — has provinces (String[]) array field
// -----------------------------------------------------------------------

export function buildRoadWhere(entity: GeoEntity) {
  switch (entity.level) {
    case "province":
      return { provinces: { has: entity.provinceCode } };
    case "community":
      // Provinces are stored as codes; filter requires province list for community
      return {};
    case "road":
      return { id: entity.roadId };
    default:
      return {};
  }
}

// -----------------------------------------------------------------------
// Article — has province (String?) field
// -----------------------------------------------------------------------

export function buildArticleWhere(entity: GeoEntity) {
  const base = { status: "PUBLISHED" } as Record<string, unknown>;
  switch (entity.level) {
    case "province":
      return { ...base, province: entity.provinceCode };
    case "municipality":
    case "city":
      return { ...base, province: entity.provinceCode };
    default:
      return base;
  }
}
