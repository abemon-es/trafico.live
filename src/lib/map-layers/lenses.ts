import {
  Activity,
  Radar,
  Camera,
  Fuel,
  Zap,
  TrainFront,
  Plane,
  Ship,
  Bus,
  Wind,
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
 * Intent-first map "lenses" (2026-06-13 mobile UX overhaul).
 *
 * The `/mapa` page used to open with the 29-layer "all" preset — tens of
 * thousands of markers stacked on a phone screen, with the layer you actually
 * wanted buried behind a 13-group checkbox panel. Users arrive with a question
 * ("¿dónde hay radar?", "¿gasolina barata?"), not a desire to manage a data
 * inventory.
 *
 * Each lens swaps the whole map to ONE coherent answer in a single tap, above
 * the fold. The full layer catalogue stays reachable via the "Personalizar"
 * panel for power users — lenses just cover the common intents.
 */
export const MAP_LENSES: MapLens[] = [
  {
    id: "trafico",
    label: "Tráfico",
    icon: Activity,
    layers: ["incidents", "roadworks", "sensors", "city-sensors"],
  },
  { id: "radares", label: "Radares", icon: Radar, layers: ["radars"] },
  { id: "camaras", label: "Cámaras", icon: Camera, layers: ["cameras"] },
  {
    id: "gasolineras",
    label: "Gasolineras",
    icon: Fuel,
    layers: ["gas-stations", "portugal-gas"],
  },
  { id: "carga-ev", label: "Carga EV", icon: Zap, layers: ["chargers"] },
  {
    id: "trenes",
    label: "Trenes",
    icon: TrainFront,
    layers: ["fleet", "railway-stations", "railway-routes"],
  },
  {
    id: "vuelos",
    label: "Vuelos",
    icon: Plane,
    layers: ["aircraft", "airports"],
  },
  {
    id: "barcos",
    label: "Barcos",
    icon: Ship,
    layers: ["vessels", "ferry-routes", "ports", "shipping-lanes", "emergencies"],
  },
  {
    id: "transporte",
    label: "Transporte",
    icon: Bus,
    layers: ["transit-vehicles", "transit-routes", "transit-stops"],
  },
  {
    id: "aire",
    label: "Aire",
    icon: Wind,
    layers: ["air-quality", "climate-stations"],
  },
];

/** The lens the map opens on. Tráfico = the most common "is there a problem?" intent. */
export const DEFAULT_LENS = MAP_LENSES[0];

/**
 * Returns the lens whose layer set EXACTLY matches the active layers, or null
 * when the user has hand-tuned layers via "Personalizar" (custom state — no
 * lens chip is highlighted).
 */
export function matchLens(activeLayers: string[]): MapLens | null {
  const active = new Set(activeLayers);
  return (
    MAP_LENSES.find(
      (lens) =>
        lens.layers.length === active.size &&
        lens.layers.every((l) => active.has(l)),
    ) ?? null
  );
}
