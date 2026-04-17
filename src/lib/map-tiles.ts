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

// Protomaps hosted glyph CDN — serves Noto Sans Regular/Medium/Italic reliably.
// Self-hosted PBFs on tiles.trafico.live have a wire-type 4 encoding issue that
// MapLibre cannot parse, so we delegate glyphs to the Protomaps CDN.
// Fontstacks available: "Noto Sans Regular", "Noto Sans Medium", "Noto Sans Italic".
// (Bold is NOT available → use Medium with larger text-size instead.)
const GLYPHS_URL = "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf";

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
  // Dynamic layers (Martin tile function names)
  transitVehicles: "transit_vehicles",
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
  // accidents: PMTiles not yet generated on the tile server — layer disabled.
  // Re-enable once services/tiles/generate-pmtiles.sh publishes accidents.pmtiles.

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
  transitVehicles: {
    url: `${TILES_BASE}/dynamic/transit_vehicles`,
    type: "vector" as const,
    sourceLayer: SOURCE_LAYERS.transitVehicles,
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
  const S = "iberia";
  const textEs = ["coalesce", ["get", "name:es"], ["get", "name"]] as unknown as DataDrivenPropertyValueSpecification<string>;
  const textRef = ["coalesce", ["get", "ref"], ["get", "name:es"], ["get", "name"]] as unknown as DataDrivenPropertyValueSpecification<string>;

  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      iberia: {
        type: "vector",
        url: `pmtiles://${TILES_BASE}/tiles/trafico-planet.pmtiles`,
        promoteId: { roads: "ref" },
        attribution: "© <a href='https://openstreetmap.org'>OpenStreetMap</a>",
      },
      // World landmass mask — replaces iberia-landmass.geojson with worldwide coverage.
      // Paints land on top of bathymetry layers. OSM water features paint on top of this.
      "world-land": {
        type: "geojson",
        data: "/geo/world/land.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      // World country label points (one Point per country at NE's LABEL_X/Y)
      // — the full countries polygon source would emit one label per polygon
      // in a MultiPolygon (Spain → mainland + Baleares + Canarias + Ceuta + ...),
      // causing multiple "ESPAÑA" labels on the map.
      "world-countries": {
        type: "geojson",
        data: "/geo/world/country-labels.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      // World states/provinces for admin-1 labels
      "world-states": {
        type: "geojson",
        data: "/geo/world/states.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      // Populated places for city labels
      "world-places": {
        type: "geojson",
        data: "/geo/world/places.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      // Ocean bathymetry layers (shallowest → deepest files)
      "bathymetry-200m": {
        type: "geojson",
        data: "/geo/ocean/bathymetry-200m.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      "bathymetry-1000m": {
        type: "geojson",
        data: "/geo/ocean/bathymetry-1000m.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      "bathymetry-4000m": {
        type: "geojson",
        data: "/geo/ocean/bathymetry-4000m.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      "bathymetry-6000m": {
        type: "geojson",
        data: "/geo/ocean/bathymetry-6000m.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      // Ocean infrastructure layers
      "maritime-boundaries": {
        type: "geojson",
        data: "/geo/ocean/maritime-boundaries.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      "shipping-lanes": {
        type: "geojson",
        data: "/geo/ocean/shipping-lanes.geojson",
        attribution: "",
      },
      "ocean-currents": {
        type: "geojson",
        data: "/geo/ocean/currents/major-currents.geojson",
        attribution: "",
      },
      "shipping-routes": {
        type: "geojson",
        data: "/geo/ocean/routes/major-routes.geojson",
        attribution: "",
      },
      "chokepoints": {
        type: "geojson",
        data: "/geo/ocean/routes/chokepoints.geojson",
        attribution: "",
      },
    },
    layers: [
      // ── Sea-coloured background (deepest ocean — covers entire map) ──
      { id: "background", type: "background", paint: { "background-color": "#cfdef5" } },

      // ── Ocean bathymetry (deepest → shallowest, visible z0-9) ────────
      // Layer order: background → 6000m → 4000m → 1000m → 200m → land-fill
      {
        id: "bathymetry-6000m", type: "fill", source: "bathymetry-6000m",
        maxzoom: 9,
        paint: { "fill-color": "#a4bedf", "fill-opacity": 0.7, "fill-antialias": false },
      },
      {
        id: "bathymetry-4000m", type: "fill", source: "bathymetry-4000m",
        maxzoom: 9,
        paint: { "fill-color": "#b3cae6", "fill-opacity": 0.7, "fill-antialias": false },
      },
      {
        id: "bathymetry-1000m", type: "fill", source: "bathymetry-1000m",
        maxzoom: 9,
        paint: { "fill-color": "#c4d6ed", "fill-opacity": 0.7, "fill-antialias": false },
      },
      {
        id: "bathymetry-200m", type: "fill", source: "bathymetry-200m",
        maxzoom: 9,
        paint: { "fill-color": "#d6e2f2", "fill-opacity": 0.8, "fill-antialias": false },
      },

      // ── Worldwide landmass fill ───────────────────────────────────────
      {
        id: "land-fill", type: "fill", source: "world-land",
        paint: { "fill-color": "#f6f7f9", "fill-antialias": true },
      },
      // Soft coastline halo just inside the land (global coverage)
      {
        id: "land-halo", type: "line", source: "world-land",
        paint: {
          "line-color": "#9fb6dc",
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.2, 3, 0.4, 8, 1.0, 12, 1.4],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.3, 3, 0.4, 8, 0.55, 12, 0.35],
          "line-blur": 0.6,
        },
      },

      // ── Inland water — rivers, lakes, reservoirs ───────────────────
      { id: "water", type: "fill", source: S, "source-layer": "water",
        paint: { "fill-color": "#a3c4f3", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 0, 1, 8, 0.85, 12, 0.7] },
      },

      // ── Landuse (layered) ────────────────────────────────────────────
      {
        id: "landuse-park", type: "fill", source: S, "source-layer": "landuse",
        filter: ["in", "kind", "park", "nature"],
        minzoom: 10,
        paint: { "fill-color": "#dcfce7", "fill-opacity": 0.25 },
      },
      {
        id: "landuse-residential", type: "fill", source: S, "source-layer": "landuse",
        filter: ["==", "kind", "residential"],
        minzoom: 10,
        paint: { "fill-color": "#f1f5f9", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0, 13, 0.4] },
      },
      {
        id: "landuse-industrial", type: "fill", source: S, "source-layer": "landuse",
        filter: ["in", "kind", "industrial", "commercial"],
        minzoom: 10,
        paint: { "fill-color": "#fef3c7", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0, 13, 0.3] },
      },
      {
        id: "landuse-hospital", type: "fill", source: S, "source-layer": "landuse",
        filter: ["==", "kind", "hospital"],
        minzoom: 12,
        paint: { "fill-color": "#fecaca", "fill-opacity": 0.3 },
      },
      {
        id: "landuse-school", type: "fill", source: S, "source-layer": "landuse",
        filter: ["==", "kind", "education"],
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
      // Country borders — subtle solid line (the land-halo provides the coastline).
      {
        id: "boundary-country", type: "line", source: S, "source-layer": "boundaries",
        filter: ["==", "admin_level", 2],
        paint: {
          "line-color": "#6b8cce",
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.6, 8, 1.4, 14, 2],
          "line-opacity": 0.55,
        },
      },
      // Regions (CCAA) — dashed brand line, stronger at high zoom.
      {
        id: "boundary-region", type: "line", source: S, "source-layer": "boundaries",
        filter: ["==", "admin_level", 4],
        minzoom: 4,
        paint: {
          "line-color": MAP_COLORS.primaryLight,
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.3, 8, 1, 14, 2],
          "line-dasharray": [3, 2],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.25, 7, 0.55, 12, 0.7],
        },
      },
      {
        id: "boundary-municipality", type: "line", source: S, "source-layer": "boundaries",
        filter: ["==", "admin_level", 8],
        minzoom: 10,
        paint: {
          "line-color": "#cbd5e1",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.3, 14, 1],
          "line-dasharray": [2, 2],
          "line-opacity": 0.5,
        },
      },

      // ── Maritime EEZ/territorial sea boundaries ───────────────────────
      {
        id: "maritime-boundaries", type: "line", source: "maritime-boundaries",
        minzoom: 3,
        paint: {
          "line-color": "#4b6ca8",
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 8, 1.0, 12, 1.5],
          "line-opacity": 0.35,
          "line-dasharray": [2, 3],
        },
      },

      // ── Shipping lanes — glow + solid (brand amber, low opacity) ─────
      {
        id: "shipping-lanes-glow", type: "line", source: "shipping-lanes",
        minzoom: 3,
        paint: {
          "line-color": "#d48139",
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 5, 12, 8],
          "line-opacity": 0.12,
          "line-blur": 1,
        },
      },
      {
        id: "shipping-lanes-solid", type: "line", source: "shipping-lanes",
        minzoom: 3,
        paint: {
          "line-color": "#d48139",
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1, 8, 2.5, 12, 4],
          "line-opacity": 0.35,
          "line-blur": 0,
        },
      },

      // ── Ocean currents (warm=red, cold=blue) ─────────────────────────
      {
        id: "ocean-currents", type: "line", source: "ocean-currents",
        minzoom: 2,
        maxzoom: 10,
        paint: {
          "line-color": [
            "match", ["coalesce", ["get", "temperature"], "warm"],
            "warm", "#dc3545",
            "cold", "#0d6efd",
            "#888888",
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 8, 2, 12, 3.5],
          "line-opacity": 0.5,
          "line-dasharray": [1, 2],
        },
      },

      // ── Shipping routes (major maritime routes, dashed amber) ─────────
      {
        id: "shipping-routes", type: "line", source: "shipping-routes",
        minzoom: 3,
        maxzoom: 9,
        paint: {
          "line-color": "#f59e0b",
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1, 6, 2, 9, 3],
          "line-opacity": 0.55,
          "line-dasharray": [4, 2],
        },
      },

      // ── Roads — casings (outlines for legibility + brand accent) ────
      // Motorways/trunks get a slightly darker brand casing so they "pop"
      // against the landmass; lower-order roads use a softer white casing.
      {
        id: "roads-highway-casing", type: "line", source: S, "source-layer": "roads",
        filter: ["in", "highway", "motorway", "trunk"],
        paint: {
          "line-color": "#173a9a",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.8, 10, 6, 14, 13],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0, 7, 0.9, 10, 0.95],
          "line-blur": 0.2,
        },
      },
      {
        id: "roads-major-casing", type: "line", source: S, "source-layer": "roads",
        filter: ["in", "highway", "primary", "secondary"],
        minzoom: 8,
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2, 10, 4, 14, 8],
          "line-opacity": 0.85,
        },
      },

      // ── Roads — fills ────────────────────────────────────────────────
      {
        id: "roads-highway", type: "line", source: S, "source-layer": "roads",
        filter: ["in", "highway", "motorway", "trunk"],
        paint: {
          // Brand gradient: deep tl-700 at country scale → tl-500 mid → tl-400 zoomed in.
          "line-color": [
            "interpolate", ["linear"], ["zoom"],
            5, "#1b4bd5",   // tl-600
            9, "#3b6cf8",   // tl-500
            13, "#5b8aff",  // tl-400
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.0, 10, 3.5, 14, 9],
        },
      },
      {
        id: "roads-major", type: "line", source: S, "source-layer": "roads",
        filter: ["in", "highway", "primary", "secondary"],
        paint: {
          "line-color": "#94b6ff", // tl-300
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.3, 10, 1.8, 14, 5],
        },
      },
      {
        id: "roads-medium", type: "line", source: S, "source-layer": "roads",
        filter: ["==", "highway", "tertiary"],
        minzoom: 6,
        paint: {
          "line-color": "#c9d8ef",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.15, 8, 0.4, 11, 1.1, 14, 3],
        },
      },
      {
        id: "roads-minor", type: "line", source: S, "source-layer": "roads",
        filter: ["in", "highway", "residential", "unclassified", "living_street"],
        minzoom: 9,
        paint: {
          "line-color": "#dde5f4",
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.3, 14, 2, 16, 3],
        },
      },
      {
        id: "roads-path", type: "line", source: S, "source-layer": "roads",
        filter: ["in", "highway", "path", "pedestrian", "footway", "cycleway"],
        minzoom: 14,
        paint: {
          "line-color": "#d1d5db",
          "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.5, 16, 1.5],
          "line-dasharray": [2, 2],
        },
      },

      // ── Transit ──────────────────────────────────────────────────────
      {
        id: "transit-rail", type: "line", source: S, "source-layer": "railways",
        filter: ["==", "railway", "rail"],
        minzoom: 7,
        paint: {
          "line-color": "#94a3b8",
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 10, 1, 14, 2],
          "line-dasharray": [4, 3],
        },
      },
      {
        id: "transit-light-rail", type: "line", source: S, "source-layer": "railways",
        filter: ["in", "railway", "light_rail", "subway", "tram"],
        minzoom: 10,
        paint: {
          "line-color": "#a78bfa",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 14, 1.5],
          "line-dasharray": [3, 2],
        },
      },
      // transit-ferry layer removed — custom tileset has no ferry routes in railways source-layer

      // ── Road ref shields (highway numbers like A-3, AP-7, N-340) ───
      {
        id: "road-ref-shields", type: "symbol", source: S, "source-layer": "roads",
        filter: ["all", ["has", "ref"], ["in", "highway", "motorway", "trunk", "primary", "secondary"]],
        minzoom: 7,
        layout: {
          "text-field": ["get", "ref"],
          "text-font": ["Noto Sans Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 7, 9, 10, 11, 14, 13],
          "symbol-placement": "line",
          "text-rotation-alignment": "viewport",
          "symbol-spacing": 500,
          "text-max-angle": 30,
          "text-keep-upright": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#1b4bd5",
          "text-halo-width": 2.4,
          "text-halo-blur": 0.2,
        },
      },

      // Country + state labels come from the dedicated Natural Earth `world-*`
      // symbol layers defined further down — using the tileset's `places-country`
      // and `places-state` in parallel causes visible duplicates (two "ESPAÑA"
      // texts on the same map). Removed here, kept only the NE-backed versions
      // which ship proper Spanish names.

      // ── Place labels — cities ───────────────────────────────────────
      // 11-20px mixed case, bolder — clearly bigger than towns
      {
        id: "places-city", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "place", "city"],
        layout: {
          "text-field": textEs,
          "text-font": ["Noto Sans Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 11, 7, 15, 10, 18, 12, 20],
          "text-max-width": 8,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#1e293b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      },

      // ── Place labels — towns ────────────────────────────────────────
      // 9-13px, regular weight — clearly smaller than cities
      {
        id: "places-town", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "place", "town"],
        minzoom: 7,
        layout: {
          "text-field": textEs,
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 7, 9, 10, 11, 14, 13],
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#334155",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      },

      // ── Place labels — villages ─────────────────────────────────────
      // 8-11px regular, z10+ — lighter than towns
      {
        id: "places-village", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "place", "village"],
        minzoom: 10,
        layout: {
          "text-field": textEs,
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 10, 8, 13, 10, 16, 11],
          "text-max-width": 7,
        },
        paint: {
          "text-color": "#64748b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.2,
        },
      },

      // ── Place labels — suburbs, neighbourhoods ──────────────────────
      // 7-10px uppercase compact tracking, z12+ — smallest tier
      {
        id: "places-neighbourhood", type: "symbol", source: S, "source-layer": "places",
        filter: ["in", "place", "suburb", "neighbourhood", "locality"],
        minzoom: 12,
        layout: {
          "text-field": textEs,
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 12, 7, 15, 9, 17, 10],
          "text-max-width": 6,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
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
        filter: ["in", "highway", "motorway", "trunk"],
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
        filter: ["in", "highway", "primary", "secondary"],
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
        filter: ["in", "highway", "tertiary", "residential", "unclassified"],
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

      // ── Chokepoints (strategic maritime points) ──────────────────────
      {
        id: "chokepoints-circle", type: "circle", source: "chokepoints",
        minzoom: 3,
        maxzoom: 10,
        paint: {
          "circle-color": "#d48139",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3, 7, 5, 10, 7],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.8,
        },
      },
      {
        id: "chokepoints-labels", type: "symbol", source: "chokepoints",
        minzoom: 4,
        maxzoom: 10,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 9, 7, 11, 10, 12],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
          "text-anchor": "top",
          "text-offset": [0, 0.8],
          "text-max-width": 8,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#d48139",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
          "text-halo-blur": 0.5,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.7, 7, 1],
        },
      },

      // ── World country labels (Natural Earth GeoJSON) ─────────────────
      // Complementary to the tileset places-country layer; fades out by z7.
      {
        id: "world-country-labels", type: "symbol", source: "world-countries",
        maxzoom: 7,
        layout: {
          "text-field": ["coalesce", ["get", "NAME_ES"], ["get", "NAME"]],
          "text-font": ["Noto Sans Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 2, 10, 4, 16, 6, 20],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.15,
          "text-max-width": 8,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#1f2937",
          "text-halo-color": "#f6f7f9",
          "text-halo-width": 2,
          "text-halo-blur": 0.5,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.7, 3, 1, 6, 0.9, 7, 0],
        },
      },

      // ── World state / admin-1 labels (Natural Earth GeoJSON) ─────────
      // Visible z4-8, uppercase subtle lettering.
      {
        id: "world-state-labels", type: "symbol", source: "world-states",
        minzoom: 4,
        maxzoom: 8,
        layout: {
          "text-field": ["coalesce", ["get", "name_es"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 8, 6, 11, 8, 13],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.12,
          "text-max-width": 10,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#374151",
          "text-halo-color": "#f6f7f9",
          "text-halo-width": 1.5,
          "text-halo-blur": 0.5,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.4, 5, 0.8, 7, 1, 8, 0],
        },
      },

      // ── World populated places (Natural Earth GeoJSON) ───────────────
      // Sorted by SCALERANK: 0 = biggest capitals. Show progressively from z3.
      {
        id: "world-places-labels", type: "symbol", source: "world-places",
        minzoom: 3,
        layout: {
          "text-field": ["coalesce", ["get", "NAME_ES"], ["get", "NAME"]],
          "text-font": ["Noto Sans Medium"],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            3, ["interpolate", ["linear"], ["coalesce", ["get", "POP_MAX"], 0], 0, 8, 10000000, 14],
            6, ["interpolate", ["linear"], ["coalesce", ["get", "POP_MAX"], 0], 0, 10, 10000000, 18],
            10, ["interpolate", ["linear"], ["coalesce", ["get", "POP_MAX"], 0], 0, 11, 10000000, 20],
          ],
          "text-max-width": 8,
          "text-allow-overlap": false,
          "symbol-sort-key": ["coalesce", ["get", "SCALERANK"], 99],
        },
        filter: [
          "step", ["zoom"],
          ["<=", ["coalesce", ["get", "SCALERANK"], 99], 2],
          5, ["<=", ["coalesce", ["get", "SCALERANK"], 99], 4],
          7, ["<=", ["coalesce", ["get", "SCALERANK"], 99], 6],
          9, true,
        ],
        paint: {
          "text-color": "#1e293b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
          "text-halo-blur": 0.3,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 5, 1],
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
  const S = "iberia";
  const textEs = ["coalesce", ["get", "name:es"], ["get", "name"]] as unknown as DataDrivenPropertyValueSpecification<string>;
  const textRef = ["coalesce", ["get", "ref"], ["get", "name:es"], ["get", "name"]] as unknown as DataDrivenPropertyValueSpecification<string>;

  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      iberia: {
        type: "vector",
        url: `pmtiles://${TILES_BASE}/tiles/trafico-planet.pmtiles`,
        promoteId: { roads: "ref" },
        attribution: "© <a href='https://openstreetmap.org'>OpenStreetMap</a>",
      },
      // World landmass mask — worldwide coverage replacing iberia-specific GeoJSON
      "world-land": {
        type: "geojson",
        data: "/geo/world/land.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      "world-countries": {
        type: "geojson",
        data: "/geo/world/countries.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      "world-states": {
        type: "geojson",
        data: "/geo/world/states.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      "world-places": {
        type: "geojson",
        data: "/geo/world/places.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      "bathymetry-200m": {
        type: "geojson",
        data: "/geo/ocean/bathymetry-200m.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      "bathymetry-1000m": {
        type: "geojson",
        data: "/geo/ocean/bathymetry-1000m.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      "bathymetry-4000m": {
        type: "geojson",
        data: "/geo/ocean/bathymetry-4000m.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      "bathymetry-6000m": {
        type: "geojson",
        data: "/geo/ocean/bathymetry-6000m.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      "maritime-boundaries": {
        type: "geojson",
        data: "/geo/ocean/maritime-boundaries.geojson",
        attribution: "© <a href='https://www.naturalearthdata.com'>Natural Earth</a>",
      },
      "shipping-lanes": {
        type: "geojson",
        data: "/geo/ocean/shipping-lanes.geojson",
        attribution: "",
      },
      "ocean-currents": {
        type: "geojson",
        data: "/geo/ocean/currents/major-currents.geojson",
        attribution: "",
      },
      "shipping-routes": {
        type: "geojson",
        data: "/geo/ocean/routes/major-routes.geojson",
        attribution: "",
      },
      "chokepoints": {
        type: "geojson",
        data: "/geo/ocean/routes/chokepoints.geojson",
        attribution: "",
      },
    },
    layers: [
      // Sea-coloured background — deep ocean dark
      { id: "background", type: "background", paint: { "background-color": "#0c1828" } },

      // ── Ocean bathymetry — dark graduated blues (deepest → shallowest, z0-9) ──
      { id: "bathymetry-6000m", type: "fill", source: "bathymetry-6000m",
        maxzoom: 9,
        paint: { "fill-color": "#061a30", "fill-opacity": 0.65, "fill-antialias": false } },
      { id: "bathymetry-4000m", type: "fill", source: "bathymetry-4000m",
        maxzoom: 9,
        paint: { "fill-color": "#082142", "fill-opacity": 0.65, "fill-antialias": false } },
      { id: "bathymetry-1000m", type: "fill", source: "bathymetry-1000m",
        maxzoom: 9,
        paint: { "fill-color": "#0b2a55", "fill-opacity": 0.65, "fill-antialias": false } },
      { id: "bathymetry-200m", type: "fill", source: "bathymetry-200m",
        maxzoom: 9,
        paint: { "fill-color": "#0e3268", "fill-opacity": 0.7, "fill-antialias": false } },

      // Landmass fill — dark slate (worldwide)
      { id: "land-fill", type: "fill", source: "world-land",
        paint: { "fill-color": "#151c2b", "fill-antialias": true } },
      { id: "land-halo", type: "line", source: "world-land",
        paint: {
          "line-color": "#263049",
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.2, 3, 0.3, 8, 0.8, 12, 1.2],
          "line-opacity": 0.7,
          "line-blur": 0.6,
        },
      },

      // Inland water — rivers, lakes
      { id: "water", type: "fill", source: S, "source-layer": "water",
        paint: { "fill-color": "#0c2d4a", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 0, 1, 8, 0.85, 12, 0.7] } },

      // Landuse — parks only at high zoom
      { id: "landuse-park", type: "fill", source: S, "source-layer": "landuse",
        filter: ["in", "kind", "park", "nature"],
        minzoom: 10,
        paint: { "fill-color": "#0d2818", "fill-opacity": 0.25 } },
      { id: "landuse-residential", type: "fill", source: S, "source-layer": "landuse",
        filter: ["==", "kind", "residential"], minzoom: 10,
        paint: { "fill-color": "#151b2b", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0, 13, 0.4] } },
      { id: "landuse-industrial", type: "fill", source: S, "source-layer": "landuse",
        filter: ["in", "kind", "industrial", "commercial"], minzoom: 10,
        paint: { "fill-color": "#1a1708", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0, 13, 0.3] } },

      // Buildings
      { id: "buildings", type: "fill", source: S, "source-layer": "buildings", minzoom: 13,
        paint: { "fill-color": "#1f2937", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, 0.3, 16, 0.6] } },
      { id: "buildings-outline", type: "line", source: S, "source-layer": "buildings", minzoom: 14,
        paint: { "line-color": "#374151", "line-width": 0.5, "line-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0, 16, 0.5] } },

      // Boundaries
      { id: "boundary-country", type: "line", source: S, "source-layer": "boundaries",
        filter: ["==", "admin_level", 2],
        paint: { "line-color": "#3b5998", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.6, 8, 1.4, 14, 2], "line-opacity": 0.55 } },
      { id: "boundary-region", type: "line", source: S, "source-layer": "boundaries",
        filter: ["==", "admin_level", 4], minzoom: 4,
        paint: { "line-color": "#3b5998", "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.3, 8, 1, 14, 2], "line-dasharray": [3, 2], "line-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.25, 7, 0.5, 12, 0.65] } },

      // ── Maritime EEZ/territorial sea boundaries (dark) ───────────────
      { id: "maritime-boundaries", type: "line", source: "maritime-boundaries",
        minzoom: 3,
        paint: {
          "line-color": "#6a87c0",
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 8, 1.0, 12, 1.5],
          "line-opacity": 0.35,
          "line-dasharray": [2, 3],
        },
      },

      // ── Shipping lanes (dark) ─────────────────────────────────────────
      { id: "shipping-lanes-glow", type: "line", source: "shipping-lanes",
        minzoom: 3,
        paint: { "line-color": "#f0b86a", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 5, 12, 8], "line-opacity": 0.1, "line-blur": 1 },
      },
      { id: "shipping-lanes-solid", type: "line", source: "shipping-lanes",
        minzoom: 3,
        paint: { "line-color": "#f0b86a", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1, 8, 2.5, 12, 4], "line-opacity": 0.3, "line-blur": 0 },
      },

      // ── Ocean currents (dark — warm red / cold blue, more muted) ─────
      { id: "ocean-currents", type: "line", source: "ocean-currents",
        minzoom: 2, maxzoom: 10,
        paint: {
          "line-color": ["match", ["coalesce", ["get", "temperature"], "warm"], "warm", "#c0394a", "cold", "#2563eb", "#6b7280"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 8, 2, 12, 3.5],
          "line-opacity": 0.4,
          "line-dasharray": [1, 2],
        },
      },

      // ── Shipping routes (dark) ────────────────────────────────────────
      { id: "shipping-routes", type: "line", source: "shipping-routes",
        minzoom: 3, maxzoom: 9,
        paint: { "line-color": "#fbbf24", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1, 6, 2, 9, 3], "line-opacity": 0.45, "line-dasharray": [4, 2] },
      },

      // Road casings — slightly darker than land, soft glow effect
      { id: "roads-highway-casing", type: "line", source: S, "source-layer": "roads",
        filter: ["in", "highway", "motorway", "trunk"],
        paint: { "line-color": "#0a1222", "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.8, 10, 6, 14, 13], "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0, 7, 0.8, 10, 0.9], "line-blur": 0.3 } },

      // Roads — brand-blue fills with gradient
      { id: "roads-highway", type: "line", source: S, "source-layer": "roads",
        filter: ["in", "highway", "motorway", "trunk"],
        paint: {
          "line-color": [
            "interpolate", ["linear"], ["zoom"],
            5, "#3b6cf8",   // tl-500
            9, "#5b8aff",   // tl-400
            13, "#94b6ff",  // tl-300
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.0, 10, 3.5, 14, 9],
        },
      },
      { id: "roads-major", type: "line", source: S, "source-layer": "roads",
        filter: ["in", "highway", "primary", "secondary"],
        paint: { "line-color": "#374151", "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.2, 10, 1.5, 14, 5] } },
      { id: "roads-medium", type: "line", source: S, "source-layer": "roads",
        filter: ["==", "highway", "tertiary"], minzoom: 8,
        paint: { "line-color": "#1f2937", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.2, 11, 1, 14, 3] } },
      { id: "roads-minor", type: "line", source: S, "source-layer": "roads",
        filter: ["in", "highway", "residential", "unclassified", "living_street"], minzoom: 11,
        paint: { "line-color": "#1f2937", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.3, 14, 2, 16, 3] } },
      { id: "roads-path", type: "line", source: S, "source-layer": "roads",
        filter: ["in", "highway", "path", "pedestrian", "footway", "cycleway"], minzoom: 14,
        paint: { "line-color": "#374151", "line-width": ["interpolate", ["linear"], ["zoom"], 14, 0.5, 16, 1.5], "line-dasharray": [2, 2] } },

      // Transit
      { id: "transit-rail", type: "line", source: S, "source-layer": "railways",
        filter: ["==", "railway", "rail"], minzoom: 7,
        paint: { "line-color": "#4b5563", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 10, 1, 14, 2], "line-dasharray": [4, 3] } },
      // transit-ferry layer removed — custom tileset has no ferry routes in railways source-layer

      // Road ref shields — tl-400 text on deep background halo
      { id: "road-ref-shields", type: "symbol", source: S, "source-layer": "roads",
        filter: ["all", ["has", "ref"], ["in", "highway", "motorway", "trunk", "primary", "secondary"]], minzoom: 7,
        layout: { "text-field": ["get", "ref"], "text-font": ["Noto Sans Medium"], "text-size": ["interpolate", ["linear"], ["zoom"], 7, 9, 10, 11, 14, 13], "symbol-placement": "line", "text-rotation-alignment": "viewport", "symbol-spacing": 500, "text-max-angle": 30, "text-keep-upright": true },
        paint: { "text-color": "#e8eeff", "text-halo-color": "#1b4bd5", "text-halo-width": 2.4, "text-halo-blur": 0.3 } },

      // Country + state labels come from Natural Earth `world-*-labels` below
      // (see light theme comment) — removed from tileset `places` to avoid duplicate "ESPAÑA".
      { id: "places-city", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "place", "city"],
        layout: { "text-field": textEs, "text-font": ["Noto Sans Medium"], "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10, 8, 15, 12, 18], "text-max-width": 8, "text-allow-overlap": false },
        paint: { "text-color": "#e2e8f0", "text-halo-color": "#0b0f1a", "text-halo-width": 1.5 } },
      { id: "places-town", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "place", "town"], minzoom: 7,
        layout: { "text-field": textEs, "text-font": ["Noto Sans Medium"], "text-size": ["interpolate", ["linear"], ["zoom"], 7, 9, 10, 12, 14, 15], "text-max-width": 8 },
        paint: { "text-color": "#cbd5e1", "text-halo-color": "#0b0f1a", "text-halo-width": 1.5 } },
      { id: "places-village", type: "symbol", source: S, "source-layer": "places",
        filter: ["==", "place", "village"], minzoom: 10,
        layout: { "text-field": textEs, "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 14, 12], "text-max-width": 7 },
        paint: { "text-color": "#9ca3af", "text-halo-color": "#0b0f1a", "text-halo-width": 1.2 } },
      { id: "places-neighbourhood", type: "symbol", source: S, "source-layer": "places",
        filter: ["in", "place", "suburb", "neighbourhood", "locality"], minzoom: 12,
        layout: { "text-field": textEs, "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 12, 9, 16, 12], "text-max-width": 6, "text-transform": "uppercase", "text-letter-spacing": 0.05 },
        paint: { "text-color": "#6b7280", "text-halo-color": "#0b0f1a", "text-halo-width": 1 } },

      // Road labels
      { id: "road-labels-highway", type: "symbol", source: S, "source-layer": "roads",
        filter: ["in", "highway", "motorway", "trunk"], minzoom: 10,
        layout: { "text-field": textRef, "text-font": ["Noto Sans Medium"], "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 14, 12], "symbol-placement": "line", "text-rotation-alignment": "map", "text-max-angle": 25, "symbol-spacing": 400 },
        paint: { "text-color": "#7da4f0", "text-halo-color": "#0b0f1a", "text-halo-width": 1.5 } },
      { id: "road-labels-major", type: "symbol", source: S, "source-layer": "roads",
        filter: ["in", "highway", "primary", "secondary"], minzoom: 12,
        layout: { "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 12, 9, 16, 11], "symbol-placement": "line", "text-rotation-alignment": "map", "text-max-angle": 30 },
        paint: { "text-color": "#9ca3af", "text-halo-color": "#0b0f1a", "text-halo-width": 1 } },

      // ── Chokepoints (dark) ───────────────────────────────────────────
      { id: "chokepoints-circle", type: "circle", source: "chokepoints",
        minzoom: 3, maxzoom: 10,
        paint: { "circle-color": "#fbbf24", "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3, 7, 5, 10, 7], "circle-stroke-width": 1.5, "circle-stroke-color": "#0b0f1a", "circle-opacity": 0.8 },
      },
      { id: "chokepoints-labels", type: "symbol", source: "chokepoints",
        minzoom: 4, maxzoom: 10,
        layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Medium"], "text-size": ["interpolate", ["linear"], ["zoom"], 4, 9, 7, 11, 10, 12], "text-transform": "uppercase", "text-letter-spacing": 0.1, "text-anchor": "top", "text-offset": [0, 0.8], "text-max-width": 8, "text-allow-overlap": false },
        paint: { "text-color": "#fbbf24", "text-halo-color": "#0b0f1a", "text-halo-width": 1.5, "text-halo-blur": 0.5, "text-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.7, 7, 1] },
      },

      // ── World country labels (dark) ───────────────────────────────────
      { id: "world-country-labels", type: "symbol", source: "world-countries",
        maxzoom: 7,
        layout: { "text-field": ["coalesce", ["get", "NAME_ES"], ["get", "NAME"]], "text-font": ["Noto Sans Medium"], "text-size": ["interpolate", ["linear"], ["zoom"], 2, 10, 4, 16, 6, 20], "text-transform": "uppercase", "text-letter-spacing": 0.15, "text-max-width": 8, "text-allow-overlap": false },
        paint: { "text-color": "#cbd5e1", "text-halo-color": "#0b0f1a", "text-halo-width": 2, "text-halo-blur": 0.5, "text-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.7, 3, 1, 6, 0.9, 7, 0] },
      },

      // ── World state labels (dark) ─────────────────────────────────────
      { id: "world-state-labels", type: "symbol", source: "world-states",
        minzoom: 4, maxzoom: 8,
        layout: { "text-field": ["coalesce", ["get", "name_es"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 4, 8, 6, 11, 8, 13], "text-transform": "uppercase", "text-letter-spacing": 0.12, "text-max-width": 10, "text-allow-overlap": false },
        paint: { "text-color": "#9ca3af", "text-halo-color": "#0b0f1a", "text-halo-width": 1.5, "text-halo-blur": 0.5, "text-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.4, 5, 0.8, 7, 1, 8, 0] },
      },

      // ── World populated places (dark) ─────────────────────────────────
      { id: "world-places-labels", type: "symbol", source: "world-places",
        minzoom: 3,
        layout: {
          "text-field": ["coalesce", ["get", "NAME_ES"], ["get", "NAME"]],
          "text-font": ["Noto Sans Medium"],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            3, ["interpolate", ["linear"], ["coalesce", ["get", "POP_MAX"], 0], 0, 8, 10000000, 14],
            6, ["interpolate", ["linear"], ["coalesce", ["get", "POP_MAX"], 0], 0, 10, 10000000, 18],
            10, ["interpolate", ["linear"], ["coalesce", ["get", "POP_MAX"], 0], 0, 11, 10000000, 20],
          ],
          "text-max-width": 8,
          "text-allow-overlap": false,
          "symbol-sort-key": ["coalesce", ["get", "SCALERANK"], 99],
        },
        filter: [
          "step", ["zoom"],
          ["<=", ["coalesce", ["get", "SCALERANK"], 99], 2],
          5, ["<=", ["coalesce", ["get", "SCALERANK"], 99], 4],
          7, ["<=", ["coalesce", ["get", "SCALERANK"], 99], 6],
          9, true,
        ],
        paint: { "text-color": "#e2e8f0", "text-halo-color": "#0b0f1a", "text-halo-width": 1.5, "text-halo-blur": 0.3, "text-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 5, 1] },
      },

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
        "match", ["coalesce", ["get", "category"], "OTHER"],
        "CARGO", "#16a34a",       // green
        "TANKER", "#d97706",      // amber
        "FISHING", "#0891b2",     // cyan
        "PASSENGER", "#dc2626",   // red
        "FERRY", "#dc2626",       // red
        "CRUISE", "#9333ea",      // purple
        "ROPAX", "#e11d48",       // rose
        "TUG", "#64748b",         // slate
        "PLEASURE", "#06b6d4",    // cyan light
        "SAILING", "#14b8a6",     // teal
        "MILITARY", "#1e3a5f",    // navy
        "HSC", "#f59e0b",         // yellow
        "OFFSHORE", "#ea580c",    // orange
        "DREDGING", "#78716c",    // stone
        "#94a3b8",                // default gray
      ],
      "circle-radius": [
        "interpolate", ["linear"], ["zoom"],
        3, 2,
        7, ["case",
          ["any", ["==", ["get", "category"], "CRUISE"], ["==", ["get", "category"], "CARGO"], ["==", ["get", "category"], "TANKER"]], 5,
          3
        ],
        10, ["case",
          ["any", ["==", ["get", "category"], "CRUISE"], ["==", ["get", "category"], "CARGO"], ["==", ["get", "category"], "TANKER"]], 7,
          5
        ],
        14, 10,
      ],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": [
        "case",
        [">=", ["coalesce", ["get", "sog"], 0], 10], "#22c55e",   // moving fast: green stroke
        [">=", ["coalesce", ["get", "sog"], 0], 2], "#eab308",    // slow: yellow stroke
        ["==", ["coalesce", ["get", "sog"], -1], -1], "#9ca3af",  // no data: gray stroke
        "#ef4444",                                                  // stopped: red stroke
      ],
      "circle-opacity": 0.85,
    },
  },

  // ── Aircraft symbol (replaces aircraftCircle visually) ──
  aircraftSymbol: {
    id: "aircraft-symbol",
    type: "symbol",
    source: "aircraft",
    "source-layer": SOURCE_LAYERS.aircraft,
    layout: {
      "icon-image": "icon-aircraft",
      "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.6, 10, 0.9, 14, 1.2],
      "icon-rotate": ["coalesce", ["get", "heading"], 0],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
    },
    paint: {
      "icon-opacity": 0.9,
    },
  },

  // ── Vessel symbol (replaces vesselsCircle visually) ──
  vesselsSymbol: {
    id: "vessels-symbol",
    type: "symbol",
    source: "vessels",
    "source-layer": SOURCE_LAYERS.vessels,
    layout: {
      "icon-image": [
        "match", ["coalesce", ["get", "category"], "OTHER"],
        "CARGO", "vessel-cargo",
        "TANKER", "vessel-tanker",
        "FISHING", "vessel-fishing",
        "PASSENGER", "vessel-passenger",
        "FERRY", "vessel-passenger",
        "CRUISE", "vessel-cruise",
        "ROPAX", "vessel-passenger",
        "TUG", "vessel-tug",
        "PLEASURE", "vessel-pleasure",
        "SAILING", "vessel-sailing",
        "MILITARY", "vessel-military",
        "OFFSHORE", "vessel-offshore",
        "vessel-default",
      ],
      "icon-size": ["interpolate", ["linear"], ["zoom"],
        3, 0.4,
        7, 0.6,
        10, 0.8,
        14, 1.1,
      ],
      "icon-rotate": ["coalesce", ["get", "cog"], 0],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-pitch-alignment": "map",
    },
    paint: {
      "icon-color": [
        "match", ["coalesce", ["get", "category"], "OTHER"],
        "CARGO", "#16a34a",
        "TANKER", "#d97706",
        "FISHING", "#0891b2",
        "PASSENGER", "#dc2626",
        "FERRY", "#dc2626",
        "CRUISE", "#9333ea",
        "ROPAX", "#e11d48",
        "TUG", "#64748b",
        "PLEASURE", "#06b6d4",
        "SAILING", "#14b8a6",
        "MILITARY", "#1e3a5f",
        "OFFSHORE", "#ea580c",
        "#94a3b8",
      ],
      "icon-opacity": 0.9,
    },
  },

  // ── Fleet symbol (replaces fleetCircle visually) ──
  fleetSymbol: {
    id: "fleet-symbol",
    type: "symbol",
    source: "fleet",
    "source-layer": SOURCE_LAYERS.fleet,
    layout: {
      "icon-image": "icon-train",
      "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.6, 10, 0.9, 14, 1.2],
      "icon-allow-overlap": true,
    },
    paint: {
      "icon-opacity": 0.9,
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

  // (accidentsCircle removed — accidents.pmtiles not yet generated.)

  // ── Live transit vehicles (Martin dynamic source) ──
  transitVehiclesCircle: {
    id: "transit-vehicles-circle",
    type: "circle",
    source: "transitVehicles",
    "source-layer": SOURCE_LAYERS.transitVehicles,
    paint: {
      "circle-color": [
        "match", ["coalesce", ["get", "mode"], "bus"],
        "bus",       MAP_COLORS.primary,        // #1b4bd5
        "metro",     MAP_COLORS.amber,           // #d48139
        "tram",      MAP_COLORS.evGreen,         // #34d399
        "rail",      MAP_COLORS.primaryLight,    // #94b6ff
        "funicular", "#6b7280",
        "#64748b",
      ],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2, 14, 5, 18, 8],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": [
        "interpolate", ["linear"], ["coalesce", ["get", "ageSeconds"], 0],
        60, 1.0,
        300, 0.4,
      ],
    },
  },

  // ── Live transit vehicles label (z≥13) ──
  transitVehiclesLabel: {
    id: "transit-vehicles-label",
    type: "symbol",
    source: "transitVehicles",
    "source-layer": SOURCE_LAYERS.transitVehicles,
    minzoom: 13,
    layout: {
      "text-field": ["coalesce", ["get", "operatorName"], ["get", "vehicleId"], ""],
      "text-font": ["Noto Sans Regular"],
      "text-size": 10,
      "text-offset": [0, 1.2],
      "text-anchor": "top",
      "text-max-width": 8,
      "text-allow-overlap": false,
    },
    paint: {
      "text-color": "#1e293b",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.2,
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
