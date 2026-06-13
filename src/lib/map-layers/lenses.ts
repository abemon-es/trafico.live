import {
  Activity,
  TriangleAlert,
  Radar,
  Camera,
  Fuel,
  Zap,
  TrainFront,
  MapPin,
  Route,
  Plane,
  Building2,
  Ship,
  Sailboat,
  Anchor,
  Droplet,
  Bus,
  Wind,
  CloudSun,
  type LucideIcon,
} from "lucide-react";

export interface MapLens {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Curated layer ids this lens activates (exact set). */
  layers: string[];
}

/**
 * Intent-first map "lenses" (2026-06 mobile UX overhaul + 2026-06-13 scoping).
 *
 * The map appears in many contexts. Each opens showing only what's pertinent to
 * that page, and offers a pinned lens bar to switch sub-views in one tap —
 * instead of the 13-group checkbox tree. `LENS_SETS` maps a context to its
 * lens bar; the FIRST lens in each set is the page's calm default.
 *
 * The full layer catalogue stays reachable via the "Personalizar" panel.
 */

// ── Global explore map (/mapa) — all 10 verticals ───────────────────────────
export const MAP_LENSES: MapLens[] = [
  // Default kept calm: "what's going wrong on the roads" = incidents + works.
  { id: "trafico", label: "Tráfico", icon: Activity, layers: ["incidents", "roadworks"] },
  { id: "radares", label: "Radares", icon: Radar, layers: ["radars"] },
  { id: "camaras", label: "Cámaras", icon: Camera, layers: ["cameras"] },
  { id: "gasolineras", label: "Gasolineras", icon: Fuel, layers: ["gas-stations", "portugal-gas"] },
  { id: "carga-ev", label: "Recarga", icon: Zap, layers: ["chargers"] },
  { id: "trenes", label: "Trenes", icon: TrainFront, layers: ["fleet", "railway-stations", "railway-routes"] },
  { id: "vuelos", label: "Vuelos", icon: Plane, layers: ["aircraft", "airports"] },
  { id: "barcos", label: "Barcos", icon: Ship, layers: ["vessels", "ferry-routes", "ports", "shipping-lanes", "emergencies"] },
  { id: "transporte", label: "Transporte", icon: Bus, layers: ["transit-vehicles", "transit-routes", "transit-stops"] },
  { id: "aire", label: "Contaminación", icon: Wind, layers: ["air-quality", "climate-stations"] },
];

// ── Per-vertical scoped lens sets. First entry = calm default for that page. ──
export const LENS_SETS = {
  global: MAP_LENSES,

  trafico: [
    { id: "incidencias", label: "Incidencias", icon: TriangleAlert, layers: ["incidents", "roadworks"] },
    { id: "camaras", label: "Cámaras", icon: Camera, layers: ["cameras"] },
    { id: "radares", label: "Radares", icon: Radar, layers: ["radars"] },
    { id: "flujo", label: "Sensores", icon: Activity, layers: ["sensors", "city-sensors"] },
  ],

  // Defaults carry a static context anchor so the live layer isn't a handful
  // of floating dots on an empty country (2026-06-13 panel: "live trains only
  // = empty Spain"). The network skeleton / airports / ports give the live
  // points a frame of reference at national zoom for ~zero load cost.
  trenes: [
    { id: "trenes-vivo", label: "En vivo", icon: TrainFront, layers: ["fleet", "railway-routes"] },
    { id: "estaciones", label: "Estaciones", icon: MapPin, layers: ["railway-stations"] },
    { id: "lineas", label: "Líneas", icon: Route, layers: ["railway-routes"] },
  ],

  maritimo: [
    { id: "barcos", label: "Barcos", icon: Ship, layers: ["vessels", "ports", "shipping-lanes"] },
    { id: "ferries", label: "Ferries", icon: Sailboat, layers: ["ferry-routes", "ferry-stops"] },
    { id: "puertos", label: "Puertos", icon: Anchor, layers: ["ports"] },
    { id: "combustible-nautico", label: "Combustible", icon: Droplet, layers: ["maritime-fuel"] },
  ],

  aviacion: [
    { id: "aviones", label: "Aviones", icon: Plane, layers: ["aircraft", "airports"] },
    { id: "aeropuertos", label: "Aeropuertos", icon: Building2, layers: ["airports"] },
  ],

  "transporte-publico": [
    { id: "transporte-vivo", label: "En vivo", icon: Bus, layers: ["transit-vehicles"] },
    { id: "transporte-lineas", label: "Líneas", icon: Route, layers: ["transit-routes"] },
    { id: "paradas", label: "Paradas", icon: MapPin, layers: ["transit-stops"] },
  ],

  combustible: [
    { id: "gasolineras", label: "Gasolineras", icon: Fuel, layers: ["gas-stations", "portugal-gas"] },
    { id: "cargadores", label: "Cargadores", icon: Zap, layers: ["chargers"] },
  ],

  // Fixes the /calidad-aire bug: it was showing weather stations (meteo) instead
  // of air quality. Calidad del aire leads; weather is the secondary lens.
  aire: [
    { id: "calidad", label: "Calidad del aire", icon: Wind, layers: ["air-quality"] },
    { id: "meteo", label: "Tiempo", icon: CloudSun, layers: ["climate-stations"] },
  ],
} satisfies Record<string, MapLens[]>;

export type LensContext = keyof typeof LENS_SETS;

/** The lens the /mapa explore map opens on (back-compat export). */
export const DEFAULT_LENS = MAP_LENSES[0];

/** Resolve a context to its lens set (falls back to global). */
export function lensSet(ctx: LensContext | boolean): MapLens[] {
  if (ctx === true || ctx === false) return MAP_LENSES;
  return LENS_SETS[ctx] ?? MAP_LENSES;
}

/** The calm default layers a context opens on. */
export function defaultLensLayers(ctx: LensContext): string[] {
  return (LENS_SETS[ctx] ?? MAP_LENSES)[0].layers;
}

/**
 * Returns the lens (within the given set) whose layer set EXACTLY matches the
 * active layers, or null when the user has hand-tuned layers via "Personalizar".
 */
export function matchLens(
  activeLayers: string[],
  lenses: MapLens[] = MAP_LENSES,
): MapLens | null {
  const active = new Set(activeLayers);
  return (
    lenses.find(
      (lens) =>
        lens.layers.length === active.size &&
        lens.layers.every((l) => active.has(l)),
    ) ?? null
  );
}
