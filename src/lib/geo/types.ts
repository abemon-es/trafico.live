// GeoEntity abstraction — unified geographic entity model for location pages
// Used by query builders and cached data fetchers (location-data.ts)

export type LocationLevel =
  | "community"
  | "province"
  | "municipality"
  | "city"
  | "road";

export interface GeoEntity {
  level: LocationLevel;
  slug: string;
  name: string;

  // Geographic scope for queries (only the relevant one is set)
  communityCode?: string;
  provinceCode?: string;
  municipalityCode?: string;
  roadId?: string;

  // Bounds for map viewport
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  center?: { lat: number; lng: number };

  // Display metadata
  parentName?: string;
  parentHref?: string;
  population?: number;
  area?: number;
}

// Sections that can appear on a location page
export type LocationSection =
  | "incidents"
  | "v16"
  | "cameras"
  | "radars"
  | "panels"
  | "weather"
  | "gasStations"
  | "evChargers"
  | "zbe"
  | "speedLimits"
  | "accidents"
  | "trafficFlow"
  | "riskZones"
  | "roads"
  | "news";

export interface SectionData<T> {
  items: T[];
  total: number;
  lastUpdated: Date | null;
}
