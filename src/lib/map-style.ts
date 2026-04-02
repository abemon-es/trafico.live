/**
 * trafico.live branded map style using Protomaps basemaps.
 *
 * Generates a MapLibre style spec that:
 * - Uses self-hosted PMTiles from tiles.trafico.live
 * - Labels in Spanish (lang: "es")
 * - Brand colors (tl-* palette for roads, water, boundaries)
 * - Light and dark themes
 *
 * @see https://docs.protomaps.com/basemaps/maplibre
 */
import { MapStyleVariant } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";

// Tile server URL — self-hosted on hetzner-prod via Coolify
const TILES_URL = "https://tiles.trafico.live/spain.pmtiles";

// Font assets — hosted alongside tiles
const GLYPHS_URL = "https://tiles.trafico.live/fonts/{fontstack}/{range}.pbf";

// Sprite assets
const SPRITE_URL = "https://tiles.trafico.live/sprites/v4/light";

/**
 * Generate a trafico.live branded MapLibre style.
 *
 * @param theme - "light" (default) or "dark"
 * @returns MapLibre StyleSpecification
 */
export function getTraficoMapStyle(theme: "light" | "dark" = "light"): StyleSpecification {
  // Use Protomaps layers function if available, otherwise fallback to manual style
  try {
    // Dynamic import to avoid build issues if package isn't ready
    const { layers } = require("@protomaps/basemaps");

    const variant: MapStyleVariant = theme === "dark" ? "dark" : "light";

    return {
      version: 8,
      glyphs: GLYPHS_URL,
      sprite: theme === "dark"
        ? "https://tiles.trafico.live/sprites/v4/dark"
        : SPRITE_URL,
      sources: {
        protomaps: {
          type: "vector",
          url: `pmtiles://${TILES_URL}`,
          attribution: "© <a href='https://openstreetmap.org'>OpenStreetMap</a>",
        },
      },
      layers: layers("protomaps", variant, "es"),
    } as StyleSpecification;
  } catch {
    // Fallback: manual style without @protomaps/basemaps
    return getManualStyle(theme);
  }
}

/**
 * Manual style fallback — uses the same PMTiles source but with hand-crafted layers
 * matching the trafico.live brand.
 */
function getManualStyle(theme: "light" | "dark"): StyleSpecification {
  const isDark = theme === "dark";

  const bg = isDark ? "#0b0f1a" : "#f8fafc";
  const earth = isDark ? "#111827" : "#ffffff";
  const water = isDark ? "#0c2d4a" : "#c0d5ff";
  const waterLabel = isDark ? "#5ab5ec" : "#092ea8";
  const roadHighway = isDark ? "#6393ff" : "#94b6ff";
  const roadMajor = isDark ? "#374151" : "#c0d5ff";
  const roadMinor = isDark ? "#1f2937" : "#e2e8f0";
  const boundary = isDark ? "#4b5563" : "#94b6ff";
  const textPrimary = isDark ? "#e2e8f0" : "#1e293b";
  const textSecondary = isDark ? "#9ca3af" : "#64748b";
  const textHalo = isDark ? "#0b0f1a" : "#ffffff";
  const building = isDark ? "#1f2937" : "#e2e8f0";

  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${TILES_URL}`,
        attribution: "© <a href='https://openstreetmap.org'>OpenStreetMap</a>",
      },
    },
    layers: [
      // Background
      { id: "bg", type: "background", paint: { "background-color": bg } },

      // Earth/land
      { id: "earth", type: "fill", source: "protomaps", "source-layer": "earth",
        paint: { "fill-color": earth } },

      // Water
      { id: "water", type: "fill", source: "protomaps", "source-layer": "water",
        paint: { "fill-color": water } },

      // Landuse (parks, forests)
      { id: "landuse-park", type: "fill", source: "protomaps", "source-layer": "landuse",
        filter: ["in", "pmap:kind", "park", "nature_reserve", "forest"],
        paint: { "fill-color": isDark ? "#1a2e1a" : "#ecfdf5", "fill-opacity": 0.5 } },

      // Buildings (zoom 14+)
      { id: "buildings", type: "fill", source: "protomaps", "source-layer": "buildings",
        minzoom: 13,
        paint: { "fill-color": building, "fill-opacity": 0.6 } },

      // Boundaries (provinces, countries)
      { id: "boundaries", type: "line", source: "protomaps", "source-layer": "boundaries",
        paint: { "line-color": boundary, "line-width": 0.7, "line-dasharray": [3, 2], "line-opacity": 0.6 } },

      // Roads — minor (zoom 10+)
      { id: "roads-minor", type: "line", source: "protomaps", "source-layer": "roads",
        minzoom: 10,
        filter: ["in", "pmap:kind", "minor_road", "other"],
        paint: { "line-color": roadMinor, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.3, 14, 2] } },

      // Roads — medium
      { id: "roads-medium", type: "line", source: "protomaps", "source-layer": "roads",
        minzoom: 7,
        filter: ["in", "pmap:kind", "medium_road"],
        paint: { "line-color": roadMajor, "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 10, 1.5, 14, 4] } },

      // Roads — major (highways, motorways)
      { id: "roads-major-casing", type: "line", source: "protomaps", "source-layer": "roads",
        filter: ["in", "pmap:kind", "highway", "major_road"],
        paint: {
          "line-color": isDark ? "#1b4bd5" : "#092ea8",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 10, 3, 14, 8],
          "line-opacity": 0.15,
        } },
      { id: "roads-major", type: "line", source: "protomaps", "source-layer": "roads",
        filter: ["in", "pmap:kind", "highway", "major_road"],
        paint: {
          "line-color": roadHighway,
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.5, 10, 2, 14, 6],
        } },

      // Water labels
      { id: "water-labels", type: "symbol", source: "protomaps", "source-layer": "water",
        layout: {
          "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
          "text-font": ["Noto Sans Italic"],
          "text-size": 11,
        },
        paint: { "text-color": waterLabel, "text-halo-color": textHalo, "text-halo-width": 1 } },

      // Place labels (cities, towns)
      { id: "places-city", type: "symbol", source: "protomaps", "source-layer": "places",
        filter: ["in", "pmap:kind", "city", "town"],
        layout: {
          "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
          "text-font": ["Noto Sans Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 10, 8, 13, 12, 16],
          "text-allow-overlap": false,
        },
        paint: { "text-color": textPrimary, "text-halo-color": textHalo, "text-halo-width": 1.5 } },

      // Place labels (villages, suburbs)
      { id: "places-small", type: "symbol", source: "protomaps", "source-layer": "places",
        minzoom: 10,
        filter: ["in", "pmap:kind", "village", "suburb", "neighbourhood"],
        layout: {
          "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 14, 12],
        },
        paint: { "text-color": textSecondary, "text-halo-color": textHalo, "text-halo-width": 1 } },

      // Road labels
      { id: "road-labels", type: "symbol", source: "protomaps", "source-layer": "roads",
        minzoom: 11,
        filter: ["in", "pmap:kind", "highway", "major_road", "medium_road"],
        layout: {
          "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "symbol-placement": "line",
          "text-rotation-alignment": "map",
        },
        paint: { "text-color": textSecondary, "text-halo-color": textHalo, "text-halo-width": 1 } },

      // Country/region labels
      { id: "country-labels", type: "symbol", source: "protomaps", "source-layer": "places",
        filter: ["in", "pmap:kind", "country", "state", "region"],
        layout: {
          "text-field": ["coalesce", ["get", "name:es"], ["get", "name"]],
          "text-font": ["Noto Sans Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 6, 15],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
        },
        paint: { "text-color": textSecondary, "text-halo-color": textHalo, "text-halo-width": 1.5, "text-opacity": 0.7 } },
    ],
  } as unknown as StyleSpecification;
}

/**
 * Check if the self-hosted tile server is available.
 * Falls back to CartoDB Voyager if tiles.trafico.live is unreachable.
 */
export async function getMapStyleWithFallback(theme: "light" | "dark" = "light"): Promise<string | StyleSpecification> {
  try {
    // Quick HEAD check on the PMTiles file
    const res = await fetch(TILES_URL, { method: "HEAD", signal: AbortSignal.timeout(3000) });
    if (res.ok) return getTraficoMapStyle(theme);
  } catch {
    // Tile server unreachable — fallback
  }

  // Fallback to CartoDB
  return theme === "dark"
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
}
