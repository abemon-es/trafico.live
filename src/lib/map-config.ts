import type maplibregl from "maplibre-gl";
import { getProtomapsStyle, getProtomapsDarkStyle } from "@/lib/map-tiles";

// ─── Shared map configuration for all trafico.live maps ───

// ── Self-hosted Protomaps styles ──

/** Self-hosted Protomaps basemap — light theme (brand-colored, Spanish labels) */
export const MAP_STYLE_PROTOMAPS = getProtomapsStyle();

/** Self-hosted Protomaps basemap — dark theme (brand-colored, Spanish labels) */
export const MAP_STYLE_PROTOMAPS_DARK = getProtomapsDarkStyle();

// ── CartoDB fallbacks ──

/** CartoDB Voyager — warm, detailed basemap. Kept as fallback. */
export const MAP_STYLE_VOYAGER = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

/** CartoDB Dark Matter — dark basemap fallback */
export const MAP_STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** CartoDB Positron — light basemap, legacy */
export const MAP_STYLE_POSITRON = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

/** Default style for all maps — self-hosted Protomaps (Spanish labels, brand colors) */
export const MAP_STYLE_DEFAULT = MAP_STYLE_PROTOMAPS;

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
  marruecos: { center: [-6.85, 33.97] as [number, number], zoom: 6 },
  portugal: { center: [-8.22, 39.4] as [number, number], zoom: 7 },
  andorra: { center: [1.52, 42.51] as [number, number], zoom: 11 },
  gibraltar: { center: [-5.35, 36.14] as [number, number], zoom: 14 },
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
 *
 * No-op when using the self-hosted Protomaps style — labels are already in
 * Spanish via `["coalesce", ["get", "name:es"], ["get", "name"]]` expressions
 * baked into the style definition.
 */
export function forceSpanishLabels(map: maplibregl.Map): void {
  try {
    const style = map.getStyle();
    // Protomaps styles already use Spanish labels — skip patching
    const isProtomaps = style?.sources != null && "protomaps" in style.sources;
    if (isProtomaps) return;

    // CartoDB fallback — patch every symbol layer to prefer Spanish names
    for (const layer of style.layers) {
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
