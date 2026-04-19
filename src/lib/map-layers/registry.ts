/**
 * Layer Registry — single source of truth for all trafico.live map layers.
 *
 * Every entry maps 1:1 to a source in TILE_SOURCES / LAYER_STYLES from
 * src/lib/map-tiles.ts. No new layers are invented here.
 *
 * TODO: Once the accidents-heatmap agent ships their heatmap variant to
 * LAYER_STYLES in map-tiles.ts, add an "accidents-heatmap" entry here in
 * group "road.historical". The circle variant is already catalogued below.
 */

import type { LayerDefinition } from "./types";

const TILES_BASE = "https://tiles.trafico.live";

export const LAYER_REGISTRY: LayerDefinition[] = [
  // ─────────────────────────── MARITIME ───────────────────────────────────────

  {
    id: "vessels",
    group: "maritime.live",
    label: "Barcos en tiempo real",
    description: "Posiciones AIS (aisstream.io, actualización continua)",
    source: { type: "martin", ref: `${TILES_BASE}/dynamic/vessels` },
    interactive: true,
    minZoom: 3,
    style: {
      id: "vessels-circle",
      type: "circle",
      source: "vessels",
      "source-layer": "vessels",
      paint: {
        "circle-color": [
          "match", ["coalesce", ["get", "category"], "OTHER"],
          "CARGO",     "#16a34a",
          "TANKER",    "#d97706",
          "FISHING",   "#0891b2",
          "PASSENGER", "#dc2626",
          "FERRY",     "#dc2626",
          "CRUISE",    "#9333ea",
          "ROPAX",     "#e11d48",
          "TUG",       "#64748b",
          "PLEASURE",  "#06b6d4",
          "SAILING",   "#14b8a6",
          "MILITARY",  "#1e3a5f",
          "HSC",       "#f59e0b",
          "OFFSHORE",  "#ea580c",
          "DREDGING",  "#78716c",
          "#94a3b8",
        ],
        "circle-radius": [
          "interpolate", ["linear"], ["zoom"],
          3, 2,
          7, ["case",
            ["any",
              ["==", ["get", "category"], "CRUISE"],
              ["==", ["get", "category"], "CARGO"],
              ["==", ["get", "category"], "TANKER"]],
            5, 3],
          10, ["case",
            ["any",
              ["==", ["get", "category"], "CRUISE"],
              ["==", ["get", "category"], "CARGO"],
              ["==", ["get", "category"], "TANKER"]],
            7, 5],
          14, 10,
        ],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": [
          "case",
          [">=", ["coalesce", ["get", "sog"], 0], 10], "#22c55e",
          [">=", ["coalesce", ["get", "sog"], 0], 2],  "#eab308",
          ["==", ["coalesce", ["get", "sog"], -1], -1], "#9ca3af",
          "#ef4444",
        ],
        "circle-opacity": 0.85,
      },
    },
    legend: [
      { color: "#16a34a", label: "Carga" },
      { color: "#d97706", label: "Petrolero" },
      { color: "#dc2626", label: "Pasajeros/Ferry" },
      { color: "#9333ea", label: "Crucero" },
      { color: "#0891b2", label: "Pesca" },
      { color: "#94a3b8", label: "Otros" },
    ],
  },

  {
    id: "ports",
    group: "maritime.static",
    label: "Puertos",
    description: "197 puertos del Estado (Puertos del Estado WFS)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/ports.pmtiles` },
    interactive: true,
    minZoom: 4,
    style: {
      id: "ports-circle",
      type: "circle",
      source: "ports",
      "source-layer": "ports",
      paint: {
        "circle-color": "#0284c7",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 5, 10, 9, 14, 14],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9,
      },
    },
    legend: [{ color: "#0284c7", label: "Puerto" }],
  },

  {
    id: "ferry-routes",
    group: "maritime.static",
    label: "Líneas de ferry",
    description: "Rutas de ferry (Fred. Olsen, Baleària, Vizcaya)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/ferry-routes.pmtiles` },
    interactive: true,
    minZoom: 4,
    animations: { hover: true, flow: { speed: 28, dashPattern: [6, 3] } },
    style: {
      id: "ferry-routes-line",
      type: "line",
      source: "ferry-routes",
      "source-layer": "ferry_routes",
      paint: {
        "line-color": ["coalesce", ["get", "routeColor"], "#0891b2"],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 10],
          ["interpolate", ["linear"], ["zoom"], 5, 1.5, 10, 3, 14, 5],
        ],
        "line-opacity": [
          "case", ["boolean", ["feature-state", "hover"], false], 1, 0.7,
        ],
        "line-dasharray": [6, 3],
      },
    },
    legend: [{ color: "#0891b2", label: "Ruta de ferry" }],
  },

  {
    id: "ferry-stops",
    group: "maritime.static",
    label: "Paradas de ferry",
    description: "Paradas de líneas de ferry (GTFS)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/ferry-stops.pmtiles` },
    interactive: true,
    minZoom: 5,
    style: {
      id: "ferry-stops-circle",
      type: "circle",
      source: "ferry-stops",
      "source-layer": "ferry_stops",
      paint: {
        "circle-color": "#0891b2",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 9],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.85,
      },
    },
    legend: [{ color: "#0891b2", label: "Parada de ferry" }],
  },

  {
    id: "maritime-fuel",
    group: "maritime.static",
    label: "Combustible náutico",
    description: "Estaciones de combustible náutico en puertos (MITERD)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/gas-stations.pmtiles` },
    interactive: true,
    minZoom: 4,
    style: {
      id: "maritime-fuel-circle",
      type: "circle",
      source: "maritime-fuel",
      "source-layer": "gas_stations",
      paint: {
        "circle-color": "#d48139",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 5, 14, 8],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.8,
      },
    },
    legend: [{ color: "#d48139", label: "Gasolinera náutica" }],
  },

  {
    id: "shipping-lanes",
    group: "maritime.static",
    label: "Vías marítimas",
    description: "Corredores principales de tráfico marítimo internacional",
    source: { type: "geojson", ref: "/geo/ocean/shipping-lanes.geojson" },
    interactive: true,
    animations: { hover: true, flow: { speed: 18, dashPattern: [5, 3] } },
    minZoom: 3,
    style: [
      {
        id: "shipping-lanes-glow",
        type: "line",
        source: "shipping-lanes",
        minzoom: 3,
        paint: {
          "line-color": "#d48139",
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 5, 12, 8],
          "line-opacity": 0.12,
          "line-blur": 1,
        },
      },
      {
        id: "shipping-lanes-solid",
        type: "line",
        source: "shipping-lanes",
        minzoom: 3,
        paint: {
          "line-color": "#d48139",
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1, 8, 2.5, 12, 4],
          "line-opacity": 0.35,
        },
      },
    ],
    legend: [{ color: "#d48139", label: "Vía marítima" }],
  },

  {
    id: "emergencies",
    group: "maritime.live",
    label: "Emergencias marítimas",
    description: "Emergencias activas SASEMAR",
    source: { type: "martin", ref: `${TILES_BASE}/dynamic/emergencies` },
    interactive: true,
    minZoom: 4,
    animations: { pulse: { amplitude: 8, periodMs: 1400, haloColor: "#dc2626" } },
    style: {
      id: "emergencies-circle",
      type: "circle",
      source: "emergencies",
      "source-layer": "emergencies",
      paint: {
        "circle-color": "#dc2626",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 5, 10, 9, 14, 14],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9,
      },
    },
    legend: [{ color: "#dc2626", label: "Emergencia" }],
  },

  // ─────────────────────────── AVIATION ───────────────────────────────────────

  {
    id: "aircraft",
    group: "air.live",
    label: "Aeronaves",
    description: "Posiciones ADS-B (OpenSky Network, actualización cada 15 min)",
    source: { type: "martin", ref: `${TILES_BASE}/dynamic/aircraft` },
    interactive: true,
    minZoom: 4,
    style: {
      id: "aircraft-circle",
      type: "circle",
      source: "aircraft",
      "source-layer": "aircraft",
      paint: {
        "circle-color": ["case", ["get", "onGround"], "#94a3b8", "#0ea5e9"],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 10],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.85,
      },
    },
    legend: [
      { color: "#0ea5e9", label: "En vuelo" },
      { color: "#94a3b8", label: "En tierra" },
    ],
  },

  {
    id: "airports",
    group: "air.static",
    label: "Aeropuertos",
    description: "42 aeropuertos AENA + estadísticas Eurostat",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/airports.pmtiles` },
    interactive: true,
    minZoom: 4,
    style: {
      id: "airports-circle",
      type: "circle",
      source: "airports",
      "source-layer": "airports",
      paint: {
        "circle-color": "#6366f1",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 5, 10, 9, 14, 14],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9,
      },
    },
    legend: [{ color: "#6366f1", label: "Aeropuerto" }],
  },

  // ─────────────────────────── RAIL ────────────────────────────────────────────

  {
    id: "fleet",
    group: "rail.live",
    label: "Trenes LD en ruta",
    description: "GPS Renfe AVE/Alvia/LD (~115 trenes, actualización 2 min)",
    source: { type: "martin", ref: `${TILES_BASE}/dynamic/fleet` },
    interactive: true,
    minZoom: 4,
    animations: {
      pulse: {
        amplitude: 5,
        periodMs: 1800,
        haloColor: "#f97316",
        filter: [">=", ["coalesce", ["get", "delay"], 0], 15],
      },
    },
    style: {
      id: "fleet-circle",
      type: "circle",
      source: "fleet",
      "source-layer": "fleet",
      paint: {
        "circle-color": [
          "interpolate", ["linear"], ["coalesce", ["get", "delay"], 0],
          0,  "#059669",
          5,  "#eab308",
          15, "#f97316",
          30, "#dc2626",
        ],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 10, 8, 14, 12],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9,
      },
    },
    legend: [
      { color: "#059669", label: "A tiempo" },
      { color: "#eab308", label: "5-15 min" },
      { color: "#f97316", label: "15-30 min" },
      { color: "#dc2626", label: ">30 min" },
    ],
  },

  {
    id: "railway-stations",
    group: "rail.static",
    label: "Estaciones de tren",
    description: "2.154 estaciones Renfe (GTFS estático)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/railway-stations.pmtiles` },
    interactive: true,
    minZoom: 5,
    style: {
      id: "railway-stations-circle",
      type: "circle",
      source: "railway-stations",
      "source-layer": "railway_stations",
      paint: {
        "circle-color": "#7c3aed",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 5, 14, 8],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.85,
      },
    },
    legend: [{ color: "#7c3aed", label: "Estación" }],
  },

  {
    id: "railway-routes",
    group: "rail.static",
    label: "Líneas ferroviarias",
    description: "1.248 rutas Renfe con geometría (GTFS estático)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/railway-routes.pmtiles` },
    interactive: true,
    minZoom: 5,
    animations: { hover: true, flow: { speed: 40, dashPattern: [6, 4] } },
    style: {
      id: "railway-routes-line",
      type: "line",
      source: "railway-routes",
      "source-layer": "railway_routes",
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#7c3aed"],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 5, 14, 8],
          ["interpolate", ["linear"], ["zoom"], 5, 1, 10, 2.5, 14, 4],
        ],
        "line-opacity": [
          "case", ["boolean", ["feature-state", "hover"], false], 1, 0.7,
        ],
      },
    },
    legend: [{ color: "#7c3aed", label: "Línea ferroviaria" }],
  },

  // ─────────────────────────── ROAD ────────────────────────────────────────────

  {
    id: "incidents",
    group: "road.live",
    label: "Incidencias viales",
    description: "Incidencias activas DGT (DATEX II)",
    source: { type: "martin", ref: `${TILES_BASE}/dynamic/incidents` },
    interactive: true,
    minZoom: 4,
    animations: {
      pulse: {
        amplitude: 6,
        periodMs: 1600,
        haloColor: "#dc2626",
        filter: ["==", ["get", "severity"], "HIGH"],
      },
    },
    style: {
      id: "incidents-circle",
      type: "circle",
      source: "incidents",
      "source-layer": "incidents",
      paint: {
        "circle-color": [
          "match", ["get", "severity"],
          "HIGH",   "#dc2626",
          "MEDIUM", "#f97316",
          "LOW",    "#eab308",
          "#f97316",
        ],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 10, 7, 14, 12],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9,
      },
    },
    legend: [
      { color: "#dc2626", label: "Alta" },
      { color: "#f97316", label: "Media" },
      { color: "#eab308", label: "Baja" },
    ],
  },

  {
    id: "roadworks",
    group: "road.live",
    label: "Obras en carretera",
    description: "Zonas de obras activas DGT (conos conectados)",
    source: { type: "martin", ref: `${TILES_BASE}/dynamic/roadworks` },
    interactive: true,
    minZoom: 5,
    style: {
      id: "roadworks-circle",
      type: "circle",
      source: "roadworks",
      "source-layer": "roadworks",
      paint: {
        "circle-color": "#f59e0b",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 10, 7, 14, 11],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9,
      },
    },
    legend: [{ color: "#f59e0b", label: "Obras" }],
  },

  {
    id: "sensors",
    group: "road.live",
    label: "Sensores Madrid",
    description: "6.117 detectores de tráfico Madrid (5 min)",
    source: { type: "martin", ref: `${TILES_BASE}/dynamic/sensors` },
    interactive: true,
    minZoom: 8,
    style: {
      id: "sensors-circle",
      type: "circle",
      source: "sensors",
      "source-layer": "sensors",
      paint: {
        "circle-color": [
          "interpolate", ["linear"], ["coalesce", ["get", "serviceLevel"], 0],
          0, "#059669",
          1, "#eab308",
          2, "#f97316",
          3, "#dc2626",
        ],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 12, 6, 15, 10],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.8,
      },
    },
    legend: [
      { color: "#059669", label: "Fluido" },
      { color: "#eab308", label: "Denso" },
      { color: "#f97316", label: "Congestionado" },
      { color: "#dc2626", label: "Cortado" },
    ],
  },

  {
    id: "city-sensors",
    group: "road.live",
    label: "Sensores urbanos",
    description: "Sensores de tráfico en Barcelona, Valencia y Zaragoza",
    source: { type: "martin", ref: `${TILES_BASE}/dynamic/city_sensors` },
    interactive: true,
    minZoom: 8,
    style: {
      id: "city-sensors-circle",
      type: "circle",
      source: "city-sensors",
      "source-layer": "city_sensors",
      paint: {
        "circle-color": [
          "interpolate", ["linear"], ["coalesce", ["get", "serviceLevel"], 0],
          0, "#059669",
          1, "#eab308",
          2, "#f97316",
          3, "#dc2626",
        ],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3, 12, 6, 15, 10],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.8,
      },
    },
    legend: [
      { color: "#059669", label: "Fluido" },
      { color: "#dc2626", label: "Congestionado" },
    ],
  },

  {
    id: "cameras",
    group: "road.static",
    label: "Cámaras de tráfico",
    description: "Cámaras DGT en carreteras españolas",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/cameras.pmtiles` },
    interactive: true,
    minZoom: 7,
    style: {
      id: "cameras-circle",
      type: "circle",
      source: "cameras",
      "source-layer": "cameras",
      paint: {
        "circle-color": "#1b4bd5",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 10],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.8,
      },
    },
    legend: [{ color: "#1b4bd5", label: "Cámara" }],
  },

  {
    id: "radars",
    group: "road.static",
    label: "Radares",
    description: "Radares de velocidad DGT",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/radars.pmtiles` },
    interactive: true,
    minZoom: 7,
    style: {
      id: "radars-circle",
      type: "circle",
      source: "radars",
      "source-layer": "radars",
      paint: {
        "circle-color": "#dc2626",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 9],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.85,
      },
    },
    legend: [{ color: "#dc2626", label: "Radar" }],
  },

  {
    id: "panels",
    group: "road.static",
    label: "Paneles variables",
    description: "Paneles de información variable DGT",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/panels.pmtiles` },
    interactive: true,
    minZoom: 8,
    style: {
      id: "panels-circle",
      type: "circle",
      source: "panels",
      "source-layer": "panels",
      paint: {
        "circle-color": "#06b6d4",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 9],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.85,
      },
    },
    legend: [{ color: "#06b6d4", label: "Panel variable" }],
  },

  {
    id: "stations",
    group: "road.historical",
    label: "Estaciones de aforo",
    description: "14.400+ estaciones de conteo (Ministerio de Transportes)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/stations.pmtiles` },
    interactive: true,
    minZoom: 5,
    style: {
      id: "stations-circle",
      type: "circle",
      source: "stations",
      "source-layer": "stations",
      paint: {
        "circle-color": [
          "interpolate", ["linear"], ["coalesce", ["get", "imd"], 0],
          0,      "#94b6ff",
          5000,   "#366cf8",
          10000,  "#059669",
          20000,  "#d97706",
          50000,  "#f97316",
          100000, "#dc2626",
        ],
        "circle-radius": [
          "interpolate", ["linear"], ["zoom"],
          5,  ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 3, 100000, 8],
          10, ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 5, 100000, 14],
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.85,
      },
    },
    legend: [
      { color: "#94b6ff", label: "< 5.000 veh/día" },
      { color: "#059669", label: "5.000–20.000" },
      { color: "#dc2626", label: "> 50.000 veh/día" },
    ],
  },

  {
    id: "road-segments",
    group: "road.historical",
    label: "Tráfico anual (IMD)",
    description: "Intensidad Media Diaria por tramo (datos anuales)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/road-segments.pmtiles` },
    interactive: true,
    minZoom: 5,
    animations: { hover: true, flow: { speed: 35, dashPattern: [8, 4] } },
    style: {
      id: "road-segments-line",
      type: "line",
      source: "road-segments",
      "source-layer": "road_segments",
      paint: {
        "line-color": [
          "interpolate", ["linear"], ["coalesce", ["get", "imd"], 0],
          0,     "#94a3b8",
          2000,  "#3b82f6",
          5000,  "#059669",
          10000, "#eab308",
          20000, "#f97316",
          50000, "#dc2626",
        ],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          [
            "interpolate", ["linear"], ["zoom"],
            5,  ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 0.9, 50000, 5.4],
            10, ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 1.8, 50000, 9],
            14, ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 3.6, 50000, 14.4],
          ],
          [
            "interpolate", ["linear"], ["zoom"],
            5,  ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 0.5, 50000, 3],
            10, ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 1,   50000, 5],
            14, ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 2,   50000, 8],
          ],
        ],
        "line-opacity": [
          "case", ["boolean", ["feature-state", "hover"], false], 1, 0.8,
        ],
      },
    },
    legend: [
      { color: "#94a3b8", label: "< 2.000 veh/día" },
      { color: "#3b82f6", label: "2.000–5.000" },
      { color: "#059669", label: "5.000–10.000" },
      { color: "#eab308", label: "10.000–20.000" },
      { color: "#f97316", label: "20.000–50.000" },
      { color: "#dc2626", label: "> 50.000 veh/día" },
    ],
  },

  // ── Province choropleth (S0 stub) ─────────────────────────────────────────
  // TODO(S1): wire province-choropleth to /api/estadisticas/accidentes with a
  // data-driven fill-color expression (interpolate over value or ratePer100k).
  // For S0 the layer renders flat-filled province polygons so the preset +
  // layer id exist — ProvinceHeatmap.tsx has been deleted.
  {
    id: "province-choropleth",
    group: "road.historical",
    label: "Mapa por provincias",
    description: "Coropleta provincial (stub S0 — métrica por provincia pendiente de S1)",
    source: { type: "geojson", ref: "/geo/spain-provinces.geojson" },
    interactive: false,
    minZoom: 3,
    maxZoom: 10,
    style: [
      {
        id: "province-choropleth-fill",
        type: "fill",
        source: "province-choropleth",
        paint: {
          "fill-color": "#94b6ff",
          "fill-opacity": 0.35,
        },
      },
      {
        id: "province-choropleth-outline",
        type: "line",
        source: "province-choropleth",
        paint: {
          "line-color": "#1e3a8a",
          "line-width": 0.6,
          "line-opacity": 0.6,
        },
      },
    ],
    legend: [{ color: "#94b6ff", label: "Provincia (datos pendientes S1)" }],
  },

  // ── Accident microdata (static PMTiles) ───────────────────────────────────
  // TODO: accidents-heatmap agent will add a heatmap variant. Once LAYER_STYLES
  // in map-tiles.ts has "accidentsHeatmap", add "accidents-heatmap" entry here.
  {
    id: "accidents",
    group: "road.historical",
    label: "Siniestros DGT",
    description: "~500.000 siniestros DGT 2019–2023 (microdatos)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/accidents.pmtiles` },
    interactive: true,
    minZoom: 5,
    style: {
      id: "accidents-circle",
      type: "circle",
      source: "accidents",
      "source-layer": "accidents",
      paint: {
        "circle-color": [
          "match", ["coalesce", ["get", "severity"], "minor"],
          "fatal",        "#dc2626",
          "hospitalized", "#f97316",
          "#eab308",
        ],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 4, 12, 7],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.75,
      },
    },
    legend: [
      { color: "#dc2626", label: "Mortal" },
      { color: "#f97316", label: "Hospitalizado" },
      { color: "#eab308", label: "Leve" },
    ],
  },

  // ─────────────────────────── TRANSIT ─────────────────────────────────────────

  {
    id: "transit-stops",
    group: "transit.static",
    label: "Paradas de transporte público",
    description: "Paradas de metro, bus y tram (15+ operadores GTFS)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/transit-stops.pmtiles` },
    interactive: true,
    minZoom: 9,
    style: {
      id: "transit-stops-circle",
      type: "circle",
      source: "transit-stops",
      "source-layer": "transit_stops",
      paint: {
        "circle-color": ["match", ["get", "locationType"], 1, "#dc2626", "#3b82f6"],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2, 12, 5, 15, 8],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.8,
      },
    },
    legend: [
      { color: "#dc2626", label: "Estación" },
      { color: "#3b82f6", label: "Parada" },
    ],
  },

  {
    id: "transit-routes",
    group: "transit.static",
    label: "Líneas de transporte público",
    description: "Rutas de metro, bus y tram (GTFS)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/transit-routes.pmtiles` },
    interactive: true,
    minZoom: 8,
    animations: { hover: true, flow: { speed: 22, dashPattern: [5, 3] } },
    style: {
      id: "transit-routes-line",
      type: "line",
      source: "transit-routes",
      "source-layer": "transit_routes",
      paint: {
        "line-color": ["coalesce", ["get", "routeColor"], "#3b82f6"],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          ["interpolate", ["linear"], ["zoom"], 8, 2, 12, 5, 15, 8],
          ["interpolate", ["linear"], ["zoom"], 8, 1, 12, 2.5, 15, 4],
        ],
        "line-opacity": [
          "case", ["boolean", ["feature-state", "hover"], false], 1, 0.7,
        ],
      },
    },
    legend: [{ color: "#3b82f6", label: "Línea" }],
  },

  {
    id: "transit-vehicles",
    group: "transit.live",
    label: "Vehículos en ruta",
    description: "Posiciones en tiempo real de vehículos de transporte público",
    source: { type: "martin", ref: `${TILES_BASE}/dynamic/transit_vehicles` },
    interactive: true,
    minZoom: 9,
    style: [
      {
        id: "transit-vehicles-circle",
        type: "circle",
        source: "transit-vehicles",
        "source-layer": "transit_vehicles",
        paint: {
          "circle-color": [
            "match", ["coalesce", ["get", "mode"], "bus"],
            "bus",       "#1b4bd5",
            "metro",     "#d48139",
            "tram",      "#34d399",
            "rail",      "#94b6ff",
            "funicular", "#6b7280",
            "#64748b",
          ],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2, 14, 5, 18, 8],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": [
            "interpolate", ["linear"], ["coalesce", ["get", "ageSeconds"], 0],
            60, 1.0, 300, 0.4,
          ],
        },
      },
      {
        id: "transit-vehicles-label",
        type: "symbol",
        source: "transit-vehicles",
        "source-layer": "transit_vehicles",
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
    ],
    legend: [
      { color: "#1b4bd5", label: "Bus" },
      { color: "#d48139", label: "Metro" },
      { color: "#34d399", label: "Tranvía" },
      { color: "#94b6ff", label: "Cercanías" },
    ],
  },

  // ─────────────────────────── FUEL ────────────────────────────────────────────

  {
    id: "gas-stations",
    group: "fuel",
    label: "Gasolineras",
    description: "Gasolineras en España (MINETUR)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/gas-stations.pmtiles` },
    interactive: true,
    minZoom: 7,
    style: {
      id: "gas-stations-circle",
      type: "circle",
      source: "gas-stations",
      "source-layer": "gas_stations",
      paint: {
        "circle-color": "#d48139",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 5, 14, 8],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.8,
      },
    },
    legend: [{ color: "#d48139", label: "Gasolinera" }],
  },

  {
    id: "portugal-gas",
    group: "fuel",
    label: "Gasolineras Portugal",
    description: "Gasolineras en Portugal (DGEG)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/portugal-gas.pmtiles` },
    interactive: true,
    minZoom: 7,
    style: {
      id: "portugal-gas-circle",
      type: "circle",
      source: "portugal-gas",
      "source-layer": "portugal_gas",
      paint: {
        "circle-color": "#d48139",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 5, 14, 8],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.8,
      },
    },
    legend: [{ color: "#d48139", label: "Gasolinera" }],
  },

  {
    id: "chargers",
    group: "fuel",
    label: "Cargadores eléctricos",
    description: "Puntos de carga para vehículos eléctricos",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/chargers.pmtiles` },
    interactive: true,
    minZoom: 7,
    style: {
      id: "chargers-circle",
      type: "circle",
      source: "chargers",
      "source-layer": "chargers",
      paint: {
        "circle-color": "#34d399",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 9],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.85,
      },
    },
    legend: [{ color: "#34d399", label: "Cargador EV" }],
  },

  // ─────────────────────────── METEO / AQ ──────────────────────────────────────

  {
    id: "climate-stations",
    group: "meteo",
    label: "Estaciones meteorológicas",
    description: "~900 estaciones AEMET con registros históricos",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/climate-stations.pmtiles` },
    interactive: true,
    minZoom: 5,
    style: {
      id: "climate-stations-circle",
      type: "circle",
      source: "climate-stations",
      "source-layer": "climate_stations",
      paint: {
        "circle-color": "#06b6d4",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 9],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.85,
      },
    },
    legend: [{ color: "#06b6d4", label: "Estación AEMET" }],
  },

  {
    id: "air-quality",
    group: "airquality",
    label: "Calidad del aire",
    description: "565 estaciones ICA (MITECO)",
    source: { type: "pmtiles", ref: `pmtiles://${TILES_BASE}/tiles/air-quality.pmtiles` },
    interactive: true,
    minZoom: 5,
    style: {
      id: "air-quality-circle",
      type: "circle",
      source: "air-quality",
      "source-layer": "air_quality",
      paint: {
        "circle-color": "#84cc16",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 6, 14, 9],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.85,
      },
    },
    legend: [{ color: "#84cc16", label: "Estación ICA" }],
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export const LAYER_MAP: Map<string, LayerDefinition> = new Map(
  LAYER_REGISTRY.map((l) => [l.id, l]),
);

export function getLayer(id: string): LayerDefinition | undefined {
  return LAYER_MAP.get(id);
}

export function getLayersByGroup(group: LayerDefinition["group"]): LayerDefinition[] {
  return LAYER_REGISTRY.filter((l) => l.group === group);
}
