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

import type { StyleSpecification, AddLayerObject, DataDrivenPropertyValueSpecification } from "maplibre-gl";
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
  roadSegments: "road_segments",
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
  roadSegments: {
    url: `pmtiles://${TILES_BASE}/tiles/road-segments.pmtiles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.roadSegments,
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
  const S = "protomaps";
  const textEs = ["coalesce", ["get", "name:es"], ["get", "name"]] as unknown as DataDrivenPropertyValueSpecification<string>;
  const textRef = ["coalesce", ["get", "ref"], ["get", "name:es"], ["get", "name"]] as unknown as DataDrivenPropertyValueSpecification<string>;

  return {
    version: 8,
    glyphs: `${TILES_BASE}/fonts/{fontstack}/{range}.pbf`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${TILES_BASE}/spain.pmtiles`,
        attribution: "© <a href='https://openstreetmap.org'>OpenStreetMap</a>",
      },
    },
    layers: [
      // ── Background + terrain ─────────────────────────────────────────
      { id: "background", type: "background", paint: { "background-color": "#f0f5ff" } },
      { id: "earth", type: "fill", source: S, "source-layer": "earth", paint: { "fill-color": "#f8fafc" } },

      // ── Water — ocean/sea only, no inland rivers/lakes ──────────────
      { id: "water", type: "fill", source: S, "source-layer": "water",
        paint: { "fill-color": "#c0d5ff", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 0, 1, 8, 0.7, 12, 0.4] },
      },

      // ── Landuse (layered) ────────────────────────────────────────────
      {
        id: "landuse-park", type: "fill", source: S, "source-layer": "landuse",
        filter: ["in", "pmap:kind", "park", "nature_reserve", "forest", "wood"],
        minzoom: 10,
        paint: { "fill-color": "#dcfce7", "fill-opacity": 0.25 },
      },
      {
        id: "landuse-residential", type: "fill", source: S, "source-layer": "landuse",
        filter: ["in", "pmap:kind", "residential", "suburb"],
        minzoom: 10,
        paint: { "fill-color": "#f1f5f9", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0, 13, 0.4] },
      },
      {
        id: "landuse-industrial", type: "fill", source: S, "source-layer": "landuse",
        filter: ["in", "pmap:kind", "industrial", "quarry"],
        minzoom: 10,
        paint: { "fill-color": "#fef3c7", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0, 13, 0.3] },
      },
      {
        id: "landuse-hospital", type: "fill", source: S, "source-layer": "landuse",
        filter: ["==", "pmap:kind", "hospital"],
        minzoom: 12,
        paint: { "fill-color": "#fecaca", "fill-opacity": 0.3 },
      },
      {
        id: "landuse-school", type: "fill", source: S, "source-layer": "landuse",
        filter: ["in", "pmap:kind", "school", "university", "college"],
        minzoom: 12,
        paint: { "fill-color": "#e0e7ff", "fill-opacity": 0.3 },
      },

      // ── Buildings ────────────────────────────────────────────────────
      {
        id: "buildings", type: "fill", source: S, "source-layer": "buildings",
        minzoom: 13,
        paint: {
          "fill-color": "#e2e8f0",
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, 0.3, 16, 0.6],
        },
      },
      {
        id: "buildings-outline", type: "line", source: S, "source-layer": "buildings",
        minzoom: 14,
        paint: { "line-color": "#cbd5e1", "line-width": 0.5, "line-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0, 16, 0.5] },
      },

      // ── Boundaries (country → region → municipality) ─────────────────
      {
        id: "boundary-country", type: "line", source: S, "source-layer": "boundaries",
        filter: ["==", "pmap:kind", "country"],
        paint: {
          "line-color": "#6b8cce",
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1, 8, 2.5, 14, 3],
          "line-dasharray": [5, 2],
        },
      },
      {
        id: "boundary-region", type: "line", source: S, "source-layer": "boundaries",
        filter: ["any", ["==", "pmap:kind", "region"], ["==", "pmap:kind", "macroregion"]],
        minzoom: 4,
        paint: {
          "line-color": MAP_COLORS.primaryLight,
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.3, 8, 1, 14, 2],
          "line-dasharray": [3, 2],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.3, 7, 0.7],
        },
      },
      {
        id: "boundary-municipality", type: "line", source: S, "source-layer": "boundaries",
        filter: ["==", "pmap:kind", "locality"],
        minzoom: 10,
        paint: {
          "line-color": "#cbd5e1",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.3, 14, 1],
          "line-dasharray": [2, 2],
          "line-opacity": 0.5,
        },
      },

      // ── Roads — casings (white outlines for legibility) ──────────────
      {
        id: "roads-highway-casing", type: "line", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "highway"],
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.5, 10, 5, 14, 12],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0, 7, 0.8],
        },
      },
      {
        id: "roads-major-casing", type: "line", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "major_road"],
        minzoom: 8,
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2, 10, 4, 14, 8],
          "line-opacity": 0.8,
        },
      },

      // ── Roads — fills ────────────────────────────────────────────────
      {
        id: "roads-highway", type: "line", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "highway"],
        paint: {
          "line-color": ["interpolate", ["linear"], ["zoom"], 5, MAP_COLORS.primaryLight, 10, "#7da4f0"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 10, 3, 14, 8],
        },
      },
      {
        id: "roads-major", type: "line", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "major_road"],
        paint: {
          "line-color": "#b8cdff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.2, 10, 1.5, 14, 5],
        },
      },
      {
        id: "roads-medium", type: "line", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "medium_road"],
        minzoom: 6,
        paint: {
          "line-color": "#dde8ff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.1, 8, 0.3, 11, 1, 14, 3],
        },
      },
      {
        id: "roads-minor", type: "line", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "minor_road"],
        minzoom: 9,
        paint: {
          "line-color": "#e8eeff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.3, 14, 2, 16, 3],
        },
      },
      {
        id: "roads-path", type: "line", source: S, "source-layer": "roads",
        filter: ["in", "pmap:kind", "path", "pedestrian", "footway", "cycleway"],
        minzoom: 14,
        paint: {
          "line-color": "#d1d5db",
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.5, 16, 1.5],
          "line-dasharray": [2, 2],
        },
      },

      // ── Transit ──────────────────────────────────────────────────────
      {
        id: "transit-rail", type: "line", source: S, "source-layer": "transit",
        filter: ["in", "pmap:kind", "rail"],
        minzoom: 7,
        paint: {
          "line-color": "#94a3b8",
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 10, 1, 14, 2],
          "line-dasharray": [4, 3],
        },
      },
      {
        id: "transit-light-rail", type: "line", source: S, "source-layer": "transit",
        filter: ["in", "pmap:kind", "light_rail", "subway", "tram"],
        minzoom: 10,
        paint: {
          "line-color": "#a78bfa",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 14, 1.5],
          "line-dasharray": [3, 2],
        },
      },
      {
        id: "transit-ferry", type: "line", source: S, "source-layer": "transit",
        filter: ["==", "pmap:kind", "ferry"],
        minzoom: 6,
        paint: {
          "line-color": "#38bdf8",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.5, 10, 1.5, 14, 2.5],
          "line-dasharray": [6, 3],
        },
      },

      // ── Road ref shields (highway numbers) ──────────────────────────
      {
        id: "road-ref-shields", type: "symbol", source: S, "source-layer": "roads",
        filter: ["all", ["has", "ref"], ["in", "pmap:kind", "highway", "major_road"]],
        minzoom: 7,
        layout: {
          "text-field": ["get", "ref"],
          "text-font": ["Noto Sans Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 7, 8, 12, 10],
          "symbol-placement": "line",
          "text-rotation-alignment": "viewport",
          "symbol-spacing": 500,
          "text-max-angle": 30,
          "text-keep-upright": true,
        },
        paint: {
          "text-color": "#1e40af",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      },

      // ── Place labels — country ──────────────────────────────────────
      {
        id: "places-country", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "pmap:kind", "country"],
        maxzoom: 7,
        layout: {
          "text-field": textEs,
          "text-font": ["Noto Sans Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 12, 6, 18],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.15,
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#475569",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      },

      // ── Place labels — state / autonomous community ─────────────────
      {
        id: "places-state", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "pmap:kind", "state"],
        minzoom: 4,
        maxzoom: 9,
        layout: {
          "text-field": textEs,
          "text-font": ["Noto Sans Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 9, 7, 13],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
          "text-max-width": 10,
        },
        paint: {
          "text-color": "#64748b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 6, 1],
        },
      },

      // ── Place labels — cities ───────────────────────────────────────
      {
        id: "places-city", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "pmap:kind", "city"],
        layout: {
          "text-field": textEs,
          "text-font": ["Noto Sans Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 15, 12, 18],
          "text-max-width": 8,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#1e293b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      },

      // ── Place labels — towns ────────────────────────────────────────
      {
        id: "places-town", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "pmap:kind", "town"],
        minzoom: 7,
        layout: {
          "text-field": textEs,
          "text-font": ["Noto Sans Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 7, 9, 10, 12, 14, 15],
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#334155",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      },

      // ── Place labels — villages ─────────────────────────────────────
      {
        id: "places-village", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "pmap:kind", "village"],
        minzoom: 10,
        layout: {
          "text-field": textEs,
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 14, 12],
          "text-max-width": 7,
        },
        paint: {
          "text-color": "#64748b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.2,
        },
      },

      // ── Place labels — suburbs, neighbourhoods ──────────────────────
      {
        id: "places-neighbourhood", type: "symbol", source: S, "source-layer": "places",
        filter: ["in", "pmap:kind", "suburb", "neighbourhood", "locality"],
        minzoom: 12,
        layout: {
          "text-field": textEs,
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 12, 9, 16, 12],
          "text-max-width": 6,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.05,
        },
        paint: {
          "text-color": "#94a3b8",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      },

      // ── Road name labels ────────────────────────────────────────────
      {
        id: "road-labels-highway", type: "symbol", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "highway"],
        minzoom: 10,
        layout: {
          "text-field": textRef,
          "text-font": ["Noto Sans Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 14, 12],
          "symbol-placement": "line",
          "text-rotation-alignment": "map",
          "text-max-angle": 25,
          "symbol-spacing": 400,
        },
        paint: { "text-color": "#1e40af", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
      },
      {
        id: "road-labels-major", type: "symbol", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "major_road"],
        minzoom: 12,
        layout: {
          "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 12, 9, 16, 11],
          "symbol-placement": "line",
          "text-rotation-alignment": "map",
          "text-max-angle": 30,
        },
        paint: { "text-color": "#475569", "text-halo-color": "#ffffff", "text-halo-width": 1 },
      },
      {
        id: "road-labels-minor", type: "symbol", source: S, "source-layer": "roads",
        filter: ["in", "pmap:kind", "medium_road", "minor_road"],
        minzoom: 14,
        layout: {
          "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 14, 9, 16, 11],
          "symbol-placement": "line",
          "text-rotation-alignment": "map",
          "text-max-angle": 30,
        },
        paint: { "text-color": "#64748b", "text-halo-color": "#ffffff", "text-halo-width": 1 },
      },

      // Water labels removed — focus on infrastructure, not geography

      // ── POI labels (high zoom) ──────────────────────────────────────
      {
        id: "poi-labels", type: "symbol", source: S, "source-layer": "pois",
        minzoom: 14,
        layout: {
          "text-field": textEs,
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-offset": [0, 0.8],
          "text-anchor": "top",
          "text-max-width": 6,
        },
        paint: {
          "text-color": "#64748b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
          "text-opacity": 0.8,
        },
      },
    ],
  };
}

/**
 * Self-hosted Protomaps basemap — dark theme.
 * Same source/structure as the light variant, inverted palette.
 */
export function getProtomapsDarkStyle(): StyleSpecification {
  const S = "protomaps";
  const textEs = ["coalesce", ["get", "name:es"], ["get", "name"]] as unknown as DataDrivenPropertyValueSpecification<string>;
  const textRef = ["coalesce", ["get", "ref"], ["get", "name:es"], ["get", "name"]] as unknown as DataDrivenPropertyValueSpecification<string>;

  return {
    version: 8,
    glyphs: `${TILES_BASE}/fonts/{fontstack}/{range}.pbf`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${TILES_BASE}/spain.pmtiles`,
        attribution: "© <a href='https://openstreetmap.org'>OpenStreetMap</a>",
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#0b0f1a" } },
      { id: "earth", type: "fill", source: S, "source-layer": "earth", paint: { "fill-color": "#111827" } },

      // Water — ocean only, faded at zoom
      { id: "water", type: "fill", source: S, "source-layer": "water",
        paint: { "fill-color": "#0c2d4a", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 0, 1, 8, 0.7, 12, 0.4] } },

      // Landuse — parks only at high zoom
      { id: "landuse-park", type: "fill", source: S, "source-layer": "landuse",
        filter: ["in", "pmap:kind", "park", "nature_reserve", "forest", "wood"],
        minzoom: 10,
        paint: { "fill-color": "#0d2818", "fill-opacity": 0.25 } },
      { id: "landuse-residential", type: "fill", source: S, "source-layer": "landuse",
        filter: ["in", "pmap:kind", "residential", "suburb"], minzoom: 10,
        paint: { "fill-color": "#151b2b", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0, 13, 0.4] } },
      { id: "landuse-industrial", type: "fill", source: S, "source-layer": "landuse",
        filter: ["in", "pmap:kind", "industrial", "quarry"], minzoom: 10,
        paint: { "fill-color": "#1a1708", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0, 13, 0.3] } },

      // Buildings
      { id: "buildings", type: "fill", source: S, "source-layer": "buildings", minzoom: 13,
        paint: { "fill-color": "#1f2937", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, 0.3, 16, 0.6] } },
      { id: "buildings-outline", type: "line", source: S, "source-layer": "buildings", minzoom: 14,
        paint: { "line-color": "#374151", "line-width": 0.5, "line-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0, 16, 0.5] } },

      // Boundaries
      { id: "boundary-country", type: "line", source: S, "source-layer": "boundaries",
        filter: ["==", "pmap:kind", "country"],
        paint: { "line-color": "#4b6ca8", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1, 8, 2.5, 14, 3], "line-dasharray": [5, 2] } },
      { id: "boundary-region", type: "line", source: S, "source-layer": "boundaries",
        filter: ["any", ["==", "pmap:kind", "region"], ["==", "pmap:kind", "macroregion"]], minzoom: 4,
        paint: { "line-color": "#3b5998", "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.3, 8, 1, 14, 2], "line-dasharray": [3, 2], "line-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.3, 7, 0.5] } },

      // Road casings (dark outlines)
      { id: "roads-highway-casing", type: "line", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "highway"],
        paint: { "line-color": "#0b0f1a", "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.5, 10, 5, 14, 12], "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0, 7, 0.6] } },

      // Roads
      { id: "roads-highway", type: "line", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "highway"],
        paint: { "line-color": ["interpolate", ["linear"], ["zoom"], 5, "#3b6cf8", 10, "#5b8aff"], "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 10, 3, 14, 8] } },
      { id: "roads-major", type: "line", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "major_road"],
        paint: { "line-color": "#374151", "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.2, 10, 1.5, 14, 5] } },
      { id: "roads-medium", type: "line", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "medium_road"], minzoom: 8,
        paint: { "line-color": "#1f2937", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.2, 11, 1, 14, 3] } },
      { id: "roads-minor", type: "line", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "minor_road"], minzoom: 11,
        paint: { "line-color": "#1f2937", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.3, 14, 2, 16, 3] } },
      { id: "roads-path", type: "line", source: S, "source-layer": "roads",
        filter: ["in", "pmap:kind", "path", "pedestrian", "footway", "cycleway"], minzoom: 14,
        paint: { "line-color": "#374151", "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.5, 16, 1.5], "line-dasharray": [2, 2] } },

      // Transit
      { id: "transit-rail", type: "line", source: S, "source-layer": "transit",
        filter: ["in", "pmap:kind", "rail"], minzoom: 7,
        paint: { "line-color": "#4b5563", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 10, 1, 14, 2], "line-dasharray": [4, 3] } },
      { id: "transit-ferry", type: "line", source: S, "source-layer": "transit",
        filter: ["==", "pmap:kind", "ferry"], minzoom: 6,
        paint: { "line-color": "#1e5a8a", "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.5, 10, 1.5, 14, 2.5], "line-dasharray": [6, 3] } },

      // Road ref shields
      { id: "road-ref-shields", type: "symbol", source: S, "source-layer": "roads",
        filter: ["all", ["has", "ref"], ["in", "pmap:kind", "highway", "major_road"]], minzoom: 7,
        layout: { "text-field": ["get", "ref"], "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 7, 8, 12, 10], "symbol-placement": "line", "text-rotation-alignment": "viewport", "symbol-spacing": 500, "text-max-angle": 30, "text-keep-upright": true },
        paint: { "text-color": "#7da4f0", "text-halo-color": "#0b0f1a", "text-halo-width": 2 } },

      // Place labels
      { id: "places-country", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "pmap:kind", "country"], maxzoom: 7,
        layout: { "text-field": textEs, "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 3, 12, 6, 18], "text-transform": "uppercase", "text-letter-spacing": 0.15, "text-max-width": 8 },
        paint: { "text-color": "#9ca3af", "text-halo-color": "#0b0f1a", "text-halo-width": 2 } },
      { id: "places-state", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "pmap:kind", "state"], minzoom: 4, maxzoom: 9,
        layout: { "text-field": textEs, "text-font": ["Noto Sans Medium"], "text-size": ["interpolate", ["linear"], ["zoom"], 4, 9, 7, 13], "text-transform": "uppercase", "text-letter-spacing": 0.1, "text-max-width": 10 },
        paint: { "text-color": "#6b7280", "text-halo-color": "#0b0f1a", "text-halo-width": 1.5, "text-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 6, 1] } },
      { id: "places-city", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "pmap:kind", "city"],
        layout: { "text-field": textEs, "text-font": ["Noto Sans Medium"], "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 15, 12, 18], "text-max-width": 8, "text-allow-overlap": false },
        paint: { "text-color": "#e2e8f0", "text-halo-color": "#0b0f1a", "text-halo-width": 1.5 } },
      { id: "places-town", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "pmap:kind", "town"], minzoom: 7,
        layout: { "text-field": textEs, "text-font": ["Noto Sans Medium"], "text-size": ["interpolate", ["linear"], ["zoom"], 7, 9, 10, 12, 14, 15], "text-max-width": 8 },
        paint: { "text-color": "#cbd5e1", "text-halo-color": "#0b0f1a", "text-halo-width": 1.5 } },
      { id: "places-village", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "pmap:kind", "village"], minzoom: 10,
        layout: { "text-field": textEs, "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 14, 12], "text-max-width": 7 },
        paint: { "text-color": "#9ca3af", "text-halo-color": "#0b0f1a", "text-halo-width": 1.2 } },
      { id: "places-neighbourhood", type: "symbol", source: S, "source-layer": "places",
        filter: ["in", "pmap:kind", "suburb", "neighbourhood", "locality"], minzoom: 12,
        layout: { "text-field": textEs, "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 12, 9, 16, 12], "text-max-width": 6, "text-transform": "uppercase", "text-letter-spacing": 0.05 },
        paint: { "text-color": "#6b7280", "text-halo-color": "#0b0f1a", "text-halo-width": 1 } },

      // Road labels
      { id: "road-labels-highway", type: "symbol", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "highway"], minzoom: 10,
        layout: { "text-field": textRef, "text-font": ["Noto Sans Medium"], "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 14, 12], "symbol-placement": "line", "text-rotation-alignment": "map", "text-max-angle": 25, "symbol-spacing": 400 },
        paint: { "text-color": "#7da4f0", "text-halo-color": "#0b0f1a", "text-halo-width": 1.5 } },
      { id: "road-labels-major", type: "symbol", source: S, "source-layer": "roads",
        filter: ["==", "pmap:kind", "major_road"], minzoom: 12,
        layout: { "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 12, 9, 16, 11], "symbol-placement": "line", "text-rotation-alignment": "map", "text-max-angle": 30 },
        paint: { "text-color": "#9ca3af", "text-halo-color": "#0b0f1a", "text-halo-width": 1 } },

      // Water labels removed — infrastructure focus
    ],
  };
}

/**
 * Get the basemap style, preferring the self-hosted Protomaps style.
 *
 * @param options.fallbackToCartoDB - If true, returns CartoDB Voyager URL instead
 *   of the Protomaps style object. Useful when tiles.trafico.live is not yet deployed.
 * @param options.theme - "light" (default) or "dark".
 */
export function getBasemapStyle(options?: {
  fallbackToCartoDB?: boolean;
  theme?: "light" | "dark";
}): string | StyleSpecification {
  const { fallbackToCartoDB = false, theme = "light" } = options ?? {};

  if (fallbackToCartoDB) {
    return theme === "dark" ? CARTO_DARK_URL : CARTO_VOYAGER_URL;
  }

  return theme === "dark" ? getProtomapsDarkStyle() : getProtomapsStyle();
}

/** Pre-built style objects for direct use */
export const MAP_STYLE_TILES = getProtomapsStyle();
export const MAP_STYLE_TILES_DARK = getProtomapsDarkStyle();

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

  // ── Road segments (IMD traffic flow polylines) ──
  roadSegmentsLine: {
    id: "road-segments-line",
    type: "line",
    source: "roadSegments",
    "source-layer": SOURCE_LAYERS.roadSegments,
    paint: {
      "line-color": [
        "interpolate", ["linear"], ["coalesce", ["get", "imd"], 0],
        0, "#94a3b8",
        2000, "#3b82f6",
        5000, MAP_COLORS.trafficGreen,
        10000, "#eab308",
        20000, MAP_COLORS.trafficOrange,
        50000, MAP_COLORS.incidentRed,
      ],
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        5, ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 0.5, 50000, 3],
        10, ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 1, 50000, 5],
        14, ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 2, 50000, 8],
      ],
      "line-opacity": 0.8,
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
