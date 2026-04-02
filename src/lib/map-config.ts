import type maplibregl from "maplibre-gl";

// ─── Shared map configuration for all trafico.live maps ───

/** Default basemap — CartoDB Voyager (warm, detailed, Spanish-friendly) */
export const MAP_STYLE_VOYAGER = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

/** Dark basemap — for driving mode / night mode */
export const MAP_STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** Light basemap — legacy, prefer Voyager */
export const MAP_STYLE_POSITRON = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

/** Default style for all maps */
export const MAP_STYLE_DEFAULT = MAP_STYLE_VOYAGER;

/** Spain center (full Iberian Peninsula including Portugal) */
export const SPAIN_CENTER: [number, number] = [-4.0, 39.6];
export const SPAIN_ZOOM = 5.2;

/** Presets for off-screen territories */
export const MAP_PRESETS = {
  peninsula: { center: SPAIN_CENTER, zoom: SPAIN_ZOOM },
  canarias: { center: [-15.5, 28.1] as [number, number], zoom: 8 },
  ceuta: { center: [-5.34, 35.89] as [number, number], zoom: 13 },
  melilla: { center: [-2.95, 35.29] as [number, number], zoom: 13 },
  baleares: { center: [2.9, 39.6] as [number, number], zoom: 9 },
} as const;

/** Province GeoJSON URL */
export const PROVINCES_GEOJSON = "/geo/spain-provinces.geojson";

/** Territory GeoJSON URL (Portugal, Andorra, Gibraltar) */
export const TERRITORIES_GEOJSON = "/geo/territories.geojson";

/** Brand colors for map layers */
export const MAP_COLORS = {
  primary: "#1b4bd5",       // tl-600
  primaryLight: "#94b6ff",  // tl-300
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

/**
 * Force all basemap labels to Spanish.
 * Call this inside map.on("load", ...) after the style is fully loaded.
 */
export function forceSpanishLabels(map: maplibregl.Map): void {
  try {
    for (const layer of map.getStyle().layers) {
      if (layer.type === "symbol" && layer.layout?.["text-field"]) {
        try {
          map.setLayoutProperty(layer.id, "text-field", [
            "coalesce",
            ["get", "name:es"],
            ["get", "name_es"],
            ["get", "name"],
          ]);
        } catch {
          // Some layers may not support expressions — skip
        }
      }
    }
  } catch {
    // Style not loaded yet or other issue — safe to ignore
  }
}
