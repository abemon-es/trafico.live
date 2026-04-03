/**
 * Vector tile integration layer for trafico.live
 *
 * Provides PMTiles protocol registration, tile source definitions,
 * helpers to add sources/layers to MapLibre maps, and the self-hosted
 * Protomaps basemap style.
 *
 * Architecture:
 *   - Static layers  → PMTiles files served via nginx at tiles.trafico.live/tiles/
 *   - Dynamic layers → Martin tile server proxied at tiles.trafico.live/dynamic/
 *   - Basemap        → Protomaps PMTiles (self-hosted) with CartoDB fallback
 */

import type { StyleSpecification, AddLayerObject } from "maplibre-gl";
import { initPMTilesProtocol } from "./pmtiles-protocol";

// Colors inlined to avoid circular import with map-config.ts
// (map-config.ts imports getProtomapsStyle from this file)
const MAP_COLORS = {
  primary: "#1b4bd5",
  primaryLight: "#94b6ff",
  provinceOutline: "#94b6ff",
  provinceHover: "#1b4bd5",
  cityDot: "#1b4bd5",
  incidentRed: "#dc2626",
  trafficGreen: "#059669",
  trafficYellow: "#eab308",
  trafficOrange: "#f97316",
  trafficRed: "#dc2626",
  amber: "#d48139",
  evGreen: "#34d399",
} as const;

const CARTO_VOYAGER_URL = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const CARTO_DARK_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// ─── PMTiles protocol ────────────────────────────────────────────────────────

/**
 * Register the PMTiles protocol with MapLibre GL.
 * Delegates to the shared pmtiles-protocol.ts singleton.
 * Safe to call multiple times — only registers once.
 */
export function setupPMTilesProtocol(): void {
  initPMTilesProtocol();
}

// ─── Tile source definitions ─────────────────────────────────────────────────

const TILES_BASE = "https://tiles.trafico.live";

/**
 * Source-layer names match the `-l` parameter used in tippecanoe
 * (see services/tiles/generate-pmtiles.sh).
 */
export const SOURCE_LAYERS = {
  // Static PMTiles layers (tippecanoe -l parameter)
  stations: "stations",
  cameras: "cameras",
  radars: "radars",
  gasStations: "gas_stations",
  chargers: "chargers",
  railwayStations: "railway_stations",
  railwayRoutes: "railway_routes",
  climateStations: "climate_stations",
  airQuality: "air_quality",
  airports: "airports",
  ports: "ports",
  ferryStops: "ferry_stops",
  ferryRoutes: "ferry_routes",
  transitStops: "transit_stops",
  transitRoutes: "transit_routes",
  portugalGas: "portugal_gas",
  panels: "panels",
  accidents: "accidents",
  // Dynamic layers (Martin tile function names from services/martin/config.yaml)
  sensors: "sensors",
  incidents: "incidents",
  fleet: "fleet",
  aircraft: "aircraft",
  vessels: "vessels",
  citySensors: "city_sensors",
  emergencies: "emergencies",
  roadworks: "roadworks",
} as const;

export type SourceLayerName = (typeof SOURCE_LAYERS)[keyof typeof SOURCE_LAYERS];

interface TileSourceConfig {
  /** URL for MapLibre — pmtiles:// for static, TileJSON for Martin */
  url: string;
  type: "vector";
  /** Source-layer name inside the MVT tile */
  sourceLayer: string;
}

/**
 * All available tile sources. Keys are logical layer names used in the app.
 *
 * Static layers use `pmtiles://` protocol URLs (require setupPMTilesProtocol).
 * Dynamic layers use Martin TileJSON endpoints (standard HTTP).
 */
export const TILE_SOURCES = {
  // ── Static PMTiles layers ──
  stations: {
    url: `pmtiles://${TILES_BASE}/tiles/stations.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.stations,
  },
  cameras: {
    url: `pmtiles://${TILES_BASE}/tiles/cameras.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.cameras,
  },
  radars: {
    url: `pmtiles://${TILES_BASE}/tiles/radars.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.radars,
  },
  gasStations: {
    url: `pmtiles://${TILES_BASE}/tiles/gas-stations.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.gasStations,
  },
  chargers: {
    url: `pmtiles://${TILES_BASE}/tiles/chargers.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.chargers,
  },
  railwayStations: {
    url: `pmtiles://${TILES_BASE}/tiles/railway-stations.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.railwayStations,
  },
  railwayRoutes: {
    url: `pmtiles://${TILES_BASE}/tiles/railway-routes.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.railwayRoutes,
  },
  climateStations: {
    url: `pmtiles://${TILES_BASE}/tiles/climate-stations.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.climateStations,
  },
  airQuality: {
    url: `pmtiles://${TILES_BASE}/tiles/air-quality.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.airQuality,
  },
  airports: {
    url: `pmtiles://${TILES_BASE}/tiles/airports.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.airports,
  },
  ports: {
    url: `pmtiles://${TILES_BASE}/tiles/ports.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.ports,
  },
  ferryStops: {
    url: `pmtiles://${TILES_BASE}/tiles/ferry-stops.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.ferryStops,
  },
  ferryRoutes: {
    url: `pmtiles://${TILES_BASE}/tiles/ferry-routes.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.ferryRoutes,
  },
  transitStops: {
    url: `pmtiles://${TILES_BASE}/tiles/transit-stops.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.transitStops,
  },
  transitRoutes: {
    url: `pmtiles://${TILES_BASE}/tiles/transit-routes.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.transitRoutes,
  },
  portugalGas: {
    url: `pmtiles://${TILES_BASE}/tiles/portugal-gas.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.portugalGas,
  },
  panels: {
    url: `pmtiles://${TILES_BASE}/tiles/panels.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.panels,
  },
  accidents: {
    url: `pmtiles://${TILES_BASE}/tiles/accidents.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.accidents,
  },

  // ── Dynamic Martin tile sources (TileJSON endpoint) ──
  sensors: {
    url: `${TILES_BASE}/dynamic/sensors`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.sensors,
  },
  incidents: {
    url: `${TILES_BASE}/dynamic/incidents`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.incidents,
  },
  fleet: {
    url: `${TILES_BASE}/dynamic/fleet`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.fleet,
  },
  aircraft: {
    url: `${TILES_BASE}/dynamic/aircraft`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.aircraft,
  },
  vessels: {
    url: `${TILES_BASE}/dynamic/vessels`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.vessels,
  },
  citySensors: {
    url: `${TILES_BASE}/dynamic/city_sensors`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.citySensors,
  },
  emergencies: {
    url: `${TILES_BASE}/dynamic/emergencies`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.emergencies,
  },
  roadworks: {
    url: `${TILES_BASE}/dynamic/roadworks`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.roadworks,
  },
} as const satisfies Record<string, TileSourceConfig>;

export type TileSourceName = keyof typeof TILE_SOURCES;

// ─── Source helpers ──────────────────────────────────────────────────────────

/**
 * Add a vector tile source to a MapLibre map instance.
 * Skips if the source already exists. Works for both PMTiles and Martin sources.
 */
export function addTileSource(
  map: maplibregl.Map,
  sourceId: string,
  source: TileSourceConfig,
): void {
  if (map.getSource(sourceId)) return;
  map.addSource(sourceId, {
    type: "vector",
    url: source.url,
  });
}

/**
 * Add multiple tile sources at once.
 *
 * @example
 *   addTileSources(map, {
 *     stations: TILE_SOURCES.stations,
 *     cameras: TILE_SOURCES.cameras,
 *   });
 */
export function addTileSources(
  map: maplibregl.Map,
  sources: Record<string, TileSourceConfig>,
): void {
  for (const [id, src] of Object.entries(sources)) {
    addTileSource(map, id, src);
  }
}

/**
 * Remove a tile source and all its layers from a map.
 * Finds and removes every layer using the source before removing the source.
 */
export function removeTileSource(map: maplibregl.Map, sourceId: string): void {
  if (!map.getSource(sourceId)) return;

  // Remove all layers that use this source
  for (const layer of map.getStyle().layers) {
    if ("source" in layer && layer.source === sourceId) {
      map.removeLayer(layer.id);
    }
  }
  map.removeSource(sourceId);
}

// ─── Basemap style ───────────────────────────────────────────────────────────

/**
 * Self-hosted Protomaps basemap style using brand colors.
 * Renders from a Spain-region PMTiles extract on tiles.trafico.live.
 * Labels are in Spanish natively (no post-load patching needed).
 */
export function getProtomapsStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: `${TILES_BASE}/fonts/{fontstack}/{range}.pbf`,
    sprite: `${TILES_BASE}/sprites/trafico`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${TILES_BASE}/spain.pmtiles`,
        attribution: "© <a href='https://openstreetmap.org'>OpenStreetMap</a>",
      },
    },
    layers: [
      // Background
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#f0f5ff" },
      },
      // Land
      {
        id: "earth",
        type: "fill",
        source: "protomaps",
        "source-layer": "earth",
        paint: { "fill-color": "#f8fafc" },
      },
      // Water
      {
        id: "water",
        type: "fill",
        source: "protomaps",
        "source-layer": "water",
        paint: { "fill-color": "#c0d5ff" },
      },
      // Landuse — parks, forests
      {
        id: "landuse-park",
        type: "fill",
        source: "protomaps",
        "source-layer": "landuse",
        filter: ["in", "pmap:kind", "park", "nature_reserve", "forest"],
        paint: { "fill-color": "#e8f5e9", "fill-opacity": 0.5 },
      },
      // Buildings (high zoom)
      {
        id: "buildings",
        type: "fill",
        source: "protomaps",
        "source-layer": "buildings",
        minzoom: 13,
        paint: {
          "fill-color": "#e2e8f0",
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 15, 0.5],
        },
      },
      // Roads — highway
      {
        id: "roads-highway",
        type: "line",
        source: "protomaps",
        "source-layer": "roads",
        filter: ["==", "pmap:kind", "highway"],
        paint: {
          "line-color": MAP_COLORS.primaryLight,
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 10, 3, 14, 8],
        },
      },
      // Roads — major
      {
        id: "roads-major",
        type: "line",
        source: "protomaps",
        "source-layer": "roads",
        filter: ["==", "pmap:kind", "major_road"],
        paint: {
          "line-color": "#b8cdff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 10, 1.5, 14, 5],
        },
      },
      // Roads — medium
      {
        id: "roads-medium",
        type: "line",
        source: "protomaps",
        "source-layer": "roads",
        filter: ["==", "pmap:kind", "medium_road"],
        minzoom: 9,
        paint: {
          "line-color": "#dde8ff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.3, 14, 3],
        },
      },
      // Roads — minor
      {
        id: "roads-minor",
        type: "line",
        source: "protomaps",
        "source-layer": "roads",
        filter: ["==", "pmap:kind", "minor_road"],
        minzoom: 12,
        paint: {
          "line-color": "#e8eeff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.3, 16, 2],
        },
      },
      // Boundaries (country + region)
      {
        id: "boundaries",
        type: "line",
        source: "protomaps",
        "source-layer": "boundaries",
        paint: {
          "line-color": MAP_COLORS.primaryLight,
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 10, 1.5],
          "line-dasharray": [3, 2],
        },
      },
      // Transit — rail lines (subtle)
      {
        id: "transit-rail",
        type: "line",
        source: "protomaps",
        "source-layer": "transit",
        filter: ["in", "pmap:kind", "rail", "light_rail"],
        minzoom: 8,
        paint: {
          "line-color": "#94a3b8",
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.3, 14, 1.5],
          "line-dasharray": [4, 3],
        },
      },
      // Place labels — cities, towns
      {
        id: "places-city",
        type: "symbol",
        source: "protomaps",
        "source-layer": "places",
        filter: ["in", "pmap:kind", "city", "town"],
        layout: {
          "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
          "text-font": ["Noto Sans Medium"],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            4, ["match", ["get", "pmap:kind"], "city", 11, 8],
            10, ["match", ["get", "pmap:kind"], "city", 16, 13],
          ],
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#334155",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      },
      // Place labels — villages, localities (high zoom)
      {
        id: "places-village",
        type: "symbol",
        source: "protomaps",
        "source-layer": "places",
        filter: ["in", "pmap:kind", "village", "locality", "suburb", "neighbourhood"],
        minzoom: 10,
        layout: {
          "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 14, 13],
          "text-max-width": 7,
        },
        paint: {
          "text-color": "#64748b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.2,
        },
      },
      // Road labels (high zoom)
      {
        id: "road-labels",
        type: "symbol",
        source: "protomaps",
        "source-layer": "roads",
        filter: ["in", "pmap:kind", "highway", "major_road"],
        minzoom: 11,
        layout: {
          "text-field": ["coalesce", ["get", "name:es"], ["get", "name"], ["get", "ref"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 11, 9, 16, 12],
          "symbol-placement": "line",
          "text-rotation-alignment": "map",
          "text-max-angle": 30,
        },
        paint: {
          "text-color": "#475569",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      },
    ],
  };
}

/**
 * Get the basemap style, preferring the self-hosted Protomaps style.
 *
 * @param options.fallbackToCartoDB - If true, returns CartoDB Voyager URL instead
 *   of the Protomaps style object. Useful when tiles.trafico.live is not yet deployed.
 * @param options.theme - "light" (default) or "dark". Dark falls back to CartoDB Dark Matter.
 */
export function getBasemapStyle(options?: {
  fallbackToCartoDB?: boolean;
  theme?: "light" | "dark";
}): string | StyleSpecification {
  const { fallbackToCartoDB = false, theme = "light" } = options ?? {};

  if (theme === "dark") {
    // Dark theme always uses CartoDB for now (no Protomaps dark variant yet)
    return CARTO_DARK_URL;
  }

  if (fallbackToCartoDB) {
    return CARTO_VOYAGER_URL;
  }

  return getProtomapsStyle();
}

/** CartoDB Voyager URL — re-exported for fallback scenarios */
export const MAP_STYLE_TILES = getProtomapsStyle();

// ─── Layer style presets ─────────────────────────────────────────────────────

/**
 * Pre-configured layer style objects for common data layers.
 * Components can spread these directly into map.addLayer().
 *
 * Source-layer names match tippecanoe `-l` parameters and Martin function names.
 */
export const LAYER_STYLES = {
  // ── Counting stations (estaciones-aforo) ──
  stationsCircle: {
    id: "stations-circle",
    type: "circle",
    source: "stations",
    "source-layer": SOURCE_LAYERS.stations,
    paint: {
      "circle-color": [
        "interpolate", ["linear"], ["coalesce", ["get", "imd"], 0],
        0, MAP_COLORS.primaryLight,
        5000, "#366cf8",
        10000, MAP_COLORS.trafficGreen,
        20000, "#d97706",
        50000, MAP_COLORS.trafficOrange,
        100000, MAP_COLORS.incidentRed,
      ],
      "circle-radius": [
        "interpolate", ["linear"], ["zoom"],
        5, ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 3, 100000, 8],
        10, ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 5, 100000, 14],
      ],
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.85,
    },
  },

  // ── Cameras ──
  camerasCircle: {
    id: "cameras-circle",
    type: "circle",
    source: "cameras",
    "source-layer": SOURCE_LAYERS.cameras,
    paint: {
      "circle-color": MAP_COLORS.primary,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 10],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.8,
    },
  },

  // ── Radars ──
  radarsCircle: {
    id: "radars-circle",
    type: "circle",
    source: "radars",
    "source-layer": SOURCE_LAYERS.radars,
    paint: {
      "circle-color": MAP_COLORS.incidentRed,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 9],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.85,
    },
  },

  // ── Gas stations ──
  gasStationsCircle: {
    id: "gas-stations-circle",
    type: "circle",
    source: "gasStations",
    "source-layer": SOURCE_LAYERS.gasStations,
    paint: {
      "circle-color": MAP_COLORS.amber,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 5, 14, 8],
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.8,
    },
  },

  // ── EV chargers ──
  chargersCircle: {
    id: "chargers-circle",
    type: "circle",
    source: "chargers",
    "source-layer": SOURCE_LAYERS.chargers,
    paint: {
      "circle-color": MAP_COLORS.evGreen,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 9],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.85,
    },
  },

  // ── Railway stations ──
  railwayStationsCircle: {
    id: "railway-stations-circle",
    type: "circle",
    source: "railwayStations",
    "source-layer": SOURCE_LAYERS.railwayStations,
    paint: {
      "circle-color": "#7c3aed",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 5, 14, 8],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.85,
    },
  },

  // ── Railway routes (line geometry) ──
  railwayRoutesLine: {
    id: "railway-routes-line",
    type: "line",
    source: "railwayRoutes",
    "source-layer": SOURCE_LAYERS.railwayRoutes,
    paint: {
      "line-color": ["coalesce", ["get", "color"], "#7c3aed"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1, 10, 2.5, 14, 4],
      "line-opacity": 0.7,
    },
  },

  // ── Real-time sensors (Madrid intensity) ──
  sensorsCircle: {
    id: "sensors-circle",
    type: "circle",
    source: "sensors",
    "source-layer": SOURCE_LAYERS.sensors,
    paint: {
      "circle-color": [
        "interpolate", ["linear"], ["coalesce", ["get", "serviceLevel"], 0],
        0, MAP_COLORS.trafficGreen,
        1, MAP_COLORS.trafficYellow,
        2, MAP_COLORS.trafficOrange,
        3, MAP_COLORS.trafficRed,
      ],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 12, 6, 15, 10],
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.8,
    },
  },

  // ── Active incidents ──
  incidentsCircle: {
    id: "incidents-circle",
    type: "circle",
    source: "incidents",
    "source-layer": SOURCE_LAYERS.incidents,
    paint: {
      "circle-color": [
        "match", ["get", "severity"],
        "HIGH", MAP_COLORS.incidentRed,
        "MEDIUM", MAP_COLORS.trafficOrange,
        "LOW", MAP_COLORS.trafficYellow,
        MAP_COLORS.trafficOrange,
      ],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 10, 7, 14, 12],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.9,
    },
  },

  // ── Fleet positions (Renfe LD trains) ──
  fleetCircle: {
    id: "fleet-circle",
    type: "circle",
    source: "fleet",
    "source-layer": SOURCE_LAYERS.fleet,
    paint: {
      "circle-color": [
        "interpolate", ["linear"], ["coalesce", ["get", "delay"], 0],
        0, MAP_COLORS.trafficGreen,
        5, MAP_COLORS.trafficYellow,
        15, MAP_COLORS.trafficOrange,
        30, MAP_COLORS.incidentRed,
      ],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 10, 8, 14, 12],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.9,
    },
  },

  // ── Aircraft positions (OpenSky) ──
  aircraftCircle: {
    id: "aircraft-circle",
    type: "circle",
    source: "aircraft",
    "source-layer": SOURCE_LAYERS.aircraft,
    paint: {
      "circle-color": [
        "case", ["get", "onGround"], "#94a3b8", "#0ea5e9",
      ],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 10],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.85,
    },
  },

  // ── Vessel positions (AIS) ──
  vesselsCircle: {
    id: "vessels-circle",
    type: "circle",
    source: "vessels",
    "source-layer": SOURCE_LAYERS.vessels,
    paint: {
      "circle-color": [
        "match", ["coalesce", ["get", "shipType"], 0],
        60, "#dc2626",  // passenger
        70, "#16a34a",  // cargo
        80, "#d97706",  // tanker
        "#0891b2",      // other
      ],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 10],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.85,
    },
  },

  // ── City traffic sensors ──
  citySensorsCircle: {
    id: "city-sensors-circle",
    type: "circle",
    source: "citySensors",
    "source-layer": SOURCE_LAYERS.citySensors,
    paint: {
      "circle-color": [
        "interpolate", ["linear"], ["coalesce", ["get", "serviceLevel"], 0],
        0, MAP_COLORS.trafficGreen,
        1, MAP_COLORS.trafficYellow,
        2, MAP_COLORS.trafficOrange,
        3, MAP_COLORS.trafficRed,
      ],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 12, 6, 15, 10],
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.8,
    },
  },

  // ── Maritime emergencies (SASEMAR) ──
  emergenciesCircle: {
    id: "emergencies-circle",
    type: "circle",
    source: "emergencies",
    "source-layer": SOURCE_LAYERS.emergencies,
    paint: {
      "circle-color": "#dc2626",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 5, 10, 9, 14, 14],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.9,
    },
  },

  // ── Active roadworks ──
  roadworksCircle: {
    id: "roadworks-circle",
    type: "circle",
    source: "roadworks",
    "source-layer": SOURCE_LAYERS.roadworks,
    paint: {
      "circle-color": "#f59e0b",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 10, 7, 14, 11],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.9,
    },
  },

  // ── Climate stations (AEMET) ──
  climateStationsCircle: {
    id: "climate-stations-circle",
    type: "circle",
    source: "climateStations",
    "source-layer": SOURCE_LAYERS.climateStations,
    paint: {
      "circle-color": "#06b6d4",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 9],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.85,
    },
  },

  // ── Air quality stations (MITECO) ──
  airQualityCircle: {
    id: "air-quality-circle",
    type: "circle",
    source: "airQuality",
    "source-layer": SOURCE_LAYERS.airQuality,
    paint: {
      "circle-color": "#84cc16",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 9],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.85,
    },
  },

  // ── Airports ──
  airportsCircle: {
    id: "airports-circle",
    type: "circle",
    source: "airports",
    "source-layer": SOURCE_LAYERS.airports,
    paint: {
      "circle-color": "#6366f1",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 5, 10, 9, 14, 14],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.9,
    },
  },

  // ── Spanish ports ──
  portsCircle: {
    id: "ports-circle",
    type: "circle",
    source: "ports",
    "source-layer": SOURCE_LAYERS.ports,
    paint: {
      "circle-color": "#0284c7",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 5, 10, 9, 14, 14],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.9,
    },
  },

  // ── Ferry stops ──
  ferryStopsCircle: {
    id: "ferry-stops-circle",
    type: "circle",
    source: "ferryStops",
    "source-layer": SOURCE_LAYERS.ferryStops,
    paint: {
      "circle-color": "#0891b2",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 9],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.85,
    },
  },

  // ── Ferry routes (line geometry) ──
  ferryRoutesLine: {
    id: "ferry-routes-line",
    type: "line",
    source: "ferryRoutes",
    "source-layer": SOURCE_LAYERS.ferryRoutes,
    paint: {
      "line-color": ["coalesce", ["get", "routeColor"], "#0891b2"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.5, 10, 3, 14, 5],
      "line-opacity": 0.7,
      "line-dasharray": [6, 3],
    },
  },

  // ── Transit stops (bus, metro, tram) ──
  transitStopsCircle: {
    id: "transit-stops-circle",
    type: "circle",
    source: "transitStops",
    "source-layer": SOURCE_LAYERS.transitStops,
    paint: {
      "circle-color": [
        "match", ["get", "locationType"],
        1, "#dc2626",  // station
        "#3b82f6",     // stop
      ],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2, 12, 5, 15, 8],
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.8,
    },
  },

  // ── Transit routes (line geometry) ──
  transitRoutesLine: {
    id: "transit-routes-line",
    type: "line",
    source: "transitRoutes",
    "source-layer": SOURCE_LAYERS.transitRoutes,
    paint: {
      "line-color": ["coalesce", ["get", "routeColor"], "#3b82f6"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 12, 2.5, 15, 4],
      "line-opacity": 0.7,
    },
  },

  // ── Portugal gas stations ──
  portugalGasCircle: {
    id: "portugal-gas-circle",
    type: "circle",
    source: "portugalGas",
    "source-layer": SOURCE_LAYERS.portugalGas,
    paint: {
      "circle-color": MAP_COLORS.amber,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 5, 14, 8],
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.8,
    },
  },

  // ── Variable panels (DGT) ──
  panelsCircle: {
    id: "panels-circle",
    type: "circle",
    source: "panels",
    "source-layer": SOURCE_LAYERS.panels,
    paint: {
      "circle-color": "#06b6d4",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 9],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.85,
    },
  },

  // ── Accident microdata (historical hotspots) ──
  accidentsCircle: {
    id: "accidents-circle",
    type: "circle",
    source: "accidents",
    "source-layer": SOURCE_LAYERS.accidents,
    paint: {
      "circle-color": [
        "match", ["get", "severity"],
        "FATAL", "#dc2626",
        "GRAVE", "#ea580c",
        "#f59e0b",
      ],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 4, 12, 7],
      "circle-stroke-width": 1,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.7,
    },
  },
} as const satisfies Record<string, AddLayerObject>;

// ─── Convenience: typed layer helper ─────────────────────────────────────────

export type LayerStyleName = keyof typeof LAYER_STYLES;

/**
 * Add a pre-configured tile layer to a map.
 * Automatically adds the required source if not already present.
 *
 * @param map - MapLibre map instance (must be loaded)
 * @param styleName - Key from LAYER_STYLES
 * @param options.before - Layer ID to insert before (for z-ordering)
 *
 * @example
 *   map.on("load", () => {
 *     setupPMTilesProtocol();
 *     addTileLayer(map, "stationsCircle");
 *     addTileLayer(map, "railwayRoutesLine", { before: "stations-circle" });
 *   });
 */
export function addTileLayer(
  map: maplibregl.Map,
  styleName: LayerStyleName,
  options?: { before?: string },
): void {
  const layerDef = LAYER_STYLES[styleName];
  const sourceName = layerDef.source as TileSourceName;

  // Auto-add source if it exists in our catalog and isn't on the map yet
  if (sourceName && sourceName in TILE_SOURCES && !map.getSource(sourceName)) {
    addTileSource(map, sourceName, TILE_SOURCES[sourceName as TileSourceName]);
  }

  // Skip if layer already exists
  if (map.getLayer(layerDef.id)) return;

  map.addLayer(layerDef as AddLayerObject, options?.before);
}
