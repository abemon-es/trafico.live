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
      id: "vessels-symbol",
      type: "symbol",
      source: "vessels",
      "source-layer": "vessels",
      layout: {
        "icon-image": "icon-ship",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.24, 8, 0.48, 14, 0.75],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-rotation-alignment": "map",
        "icon-rotate": ["coalesce", ["get", "cog"], ["get", "heading"], 0],
        // Show vessel name at high zoom to aid identification.
        "text-field": ["step", ["zoom"], "", 11, ["coalesce", ["get", "name"], ["get", "shipName"], ""]],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 11, 9, 14, 11],
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-optional": true,
      },
      paint: {
        "icon-opacity": [
          "case",
          // Moored / stopped → fade slightly
          ["<=", ["coalesce", ["get", "sog"], 0], 0.5], 0.55,
          0.95,
        ],
        "text-color": "#134e4a",
        "text-halo-color": "rgba(255,255,255,0.95)",
        "text-halo-width": 1.2,
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
      id: "ports-symbol",
      type: "symbol",
      source: "ports",
      "source-layer": "ports",
      layout: {
        "icon-image": "icon-port",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 4, 0.32, 10, 0.55, 14, 0.78],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "text-field": ["step", ["zoom"], "", 8, ["coalesce", ["get", "name"], ""]],
        "text-font": ["Noto Sans Medium"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 8, 10, 14, 12],
        "text-offset": [0, 1.4],
        "text-anchor": "top",
        "text-optional": true,
        "text-max-width": 8,
      },
      paint: {
        "text-color": "#075985",
        "text-halo-color": "rgba(255,255,255,0.95)",
        "text-halo-width": 1.6,
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
          "interpolate", ["linear"], ["zoom"],
          5,  ["case", ["boolean", ["feature-state", "hover"], false], 3, 1.5],
          10, ["case", ["boolean", ["feature-state", "hover"], false], 6, 3],
          14, ["case", ["boolean", ["feature-state", "hover"], false], 10, 5],
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
      id: "ferry-stops-symbol",
      type: "symbol",
      source: "ferry-stops",
      "source-layer": "ferry_stops",
      layout: {
        "icon-image": "icon-ferry-stop",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.2, 10, 0.4, 14, 0.6],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
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
      id: "maritime-fuel-symbol",
      type: "symbol",
      source: "maritime-fuel",
      "source-layer": "gas_stations",
      layout: {
        "icon-image": "icon-fuel",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.2, 10, 0.38, 14, 0.55],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
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
    animations: {
      pulse: {
        subLayerId: "emergencies-symbol",
        amplitude: 10,
        periodMs: 1400,
        haloColor: "#dc2626",
      },
    },
    style: {
      id: "emergencies-symbol",
      type: "symbol",
      source: "emergencies",
      "source-layer": "emergencies",
      layout: {
        "icon-image": "icon-emergency",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.28, 10, 0.48, 14, 0.7],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
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
      id: "aircraft-symbol",
      type: "symbol",
      source: "aircraft",
      "source-layer": "aircraft",
      layout: {
        "icon-image": "icon-plane",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 4, 0.3, 8, 0.55, 14, 0.8],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-rotation-alignment": "map",
        "icon-rotate": ["coalesce", ["get", "heading"], ["get", "trueTrack"], 0],
        "text-field": ["step", ["zoom"], "", 8, ["coalesce", ["get", "callsign"], ""]],
        "text-font": ["Noto Sans Medium"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 8, 9, 14, 11],
        "text-offset": [0, 1.3],
        "text-anchor": "top",
        "text-optional": true,
      },
      paint: {
        "icon-opacity": ["case", ["get", "onGround"], 0.45, 0.95],
        "text-color": "#075985",
        "text-halo-color": "rgba(255,255,255,0.95)",
        "text-halo-width": 1.2,
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
      id: "airports-symbol",
      type: "symbol",
      source: "airports",
      "source-layer": "airports",
      layout: {
        "icon-image": "icon-airport",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 4, 0.34, 8, 0.55, 12, 0.8, 16, 1],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        // IATA code below the icon from z7+; full name from z10+.
        "text-field": [
          "step", ["zoom"],
          "",
          7, ["coalesce", ["get", "iata"], ""],
          10, ["coalesce", ["get", "name"], ""],
        ],
        "text-font": ["Noto Sans Medium"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 7, 10, 12, 12, 16, 14],
        "text-offset": [0, 1.6],
        "text-anchor": "top",
        "text-optional": true,
        "text-max-width": 8,
      },
      paint: {
        "text-color": "#3730a3",
        "text-halo-color": "rgba(255,255,255,0.95)",
        "text-halo-width": 1.6,
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
        subLayerId: "fleet-symbol",
        amplitude: 5,
        periodMs: 1800,
        haloColor: "#f97316",
        filter: [">=", ["coalesce", ["get", "delay"], 0], 15],
      },
    },
    style: {
      id: "fleet-symbol",
      type: "symbol",
      source: "fleet",
      "source-layer": "fleet",
      layout: {
        "icon-image": "icon-train",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.34, 10, 0.62, 14, 0.92],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "text-field": ["step", ["zoom"], "",
          8, ["concat", ["coalesce", ["get", "brand"], ""], " ", ["coalesce", ["get", "trainNumber"], ""]],
        ],
        "text-font": ["Noto Sans Medium"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 8, 9, 14, 11],
        "text-offset": [0, 1.3],
        "text-anchor": "top",
        "text-optional": true,
      },
      paint: {
        "icon-opacity": 0.95,
        "text-color": "#5b21b6",
        "text-halo-color": "rgba(255,255,255,0.95)",
        "text-halo-width": 1.2,
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
      id: "railway-stations-symbol",
      type: "symbol",
      source: "railway-stations",
      "source-layer": "railway_stations",
      layout: {
        "icon-image": "icon-train-station",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.28, 10, 0.48, 14, 0.7],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "text-field": ["step", ["zoom"], "", 10, ["coalesce", ["get", "name"], ""]],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 14, 12],
        "text-offset": [0, 1.3],
        "text-anchor": "top",
        "text-optional": true,
        "text-max-width": 7,
      },
      paint: {
        "text-color": "#5b21b6",
        "text-halo-color": "rgba(255,255,255,0.95)",
        "text-halo-width": 1.4,
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
          "interpolate", ["linear"], ["zoom"],
          5,  ["case", ["boolean", ["feature-state", "hover"], false], 2, 1],
          10, ["case", ["boolean", ["feature-state", "hover"], false], 5, 2.5],
          14, ["case", ["boolean", ["feature-state", "hover"], false], 8, 4],
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
        subLayerId: "incidents-symbol",
        amplitude: 8,
        periodMs: 1600,
        haloColor: "#dc2626",
        filter: ["==", ["get", "severity"], "HIGH"],
      },
    },
    style: {
      id: "incidents-symbol",
      type: "symbol",
      source: "incidents",
      "source-layer": "incidents",
      layout: {
        "icon-image": [
          "match", ["get", "severity"],
          "HIGH",   "icon-incident-high",
          "MEDIUM", "icon-incident-medium",
          "LOW",    "icon-incident-low",
          "icon-incident-medium",
        ],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.3, 10, 0.48, 14, 0.7],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
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
      id: "roadworks-symbol",
      type: "symbol",
      source: "roadworks",
      "source-layer": "roadworks",
      layout: {
        "icon-image": "icon-roadworks",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.26, 10, 0.44, 14, 0.65],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
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
      id: "cameras-symbol",
      type: "symbol",
      source: "cameras",
      "source-layer": "cameras",
      layout: {
        "icon-image": "icon-camera",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.32, 11, 0.5, 14, 0.72],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
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
      id: "radars-symbol",
      type: "symbol",
      source: "radars",
      "source-layer": "radars",
      layout: {
        "icon-image": "icon-radar",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 11, 0.5, 14, 0.72],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
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
      id: "panels-symbol",
      type: "symbol",
      source: "panels",
      "source-layer": "panels",
      layout: {
        "icon-image": "icon-panel",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 8, 0.25, 12, 0.42, 15, 0.6],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
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
          "interpolate", ["linear"], ["zoom"],
          5, [
            "case", ["boolean", ["feature-state", "hover"], false],
            ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 0.9, 50000, 5.4],
            ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 0.5, 50000, 3],
          ],
          10, [
            "case", ["boolean", ["feature-state", "hover"], false],
            ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 1.8, 50000, 9],
            ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 1,   50000, 5],
          ],
          14, [
            "case", ["boolean", ["feature-state", "hover"], false],
            ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 3.6, 50000, 14.4],
            ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 2,   50000, 8],
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
  // NOT exposed in any preset (2026-06-10): AccidentMicrodata has 0 rows with
  // coordinates (DGT public XLSX ships no lat/lon — collector.ts hardcodes
  // null), so accidents.pmtiles cannot be generated and the source 404s.
  // Definition kept for when road+km geocoding populates coordinates.
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
      id: "accidents-symbol",
      type: "symbol",
      source: "accidents",
      "source-layer": "accidents",
      layout: {
        // Fatal → red burst; hospitalized/minor → severity-coloured triangle.
        "icon-image": [
          "match", ["coalesce", ["get", "severity"], "minor"],
          "fatal",        "icon-accident",
          "hospitalized", "icon-incident-medium",
          "icon-incident-low",
        ],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.18, 8, 0.3, 12, 0.48],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
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
      id: "transit-stops-symbol",
      type: "symbol",
      source: "transit-stops",
      "source-layer": "transit_stops",
      layout: {
        // Tile data only carries `locationType` (0 = stop, 1 = station) —
        // no mode/routeType fields. Use locationType to pick: stations get
        // the metro chip, regular stops get the bus-stop chip.
        "icon-image": [
          "case",
          ["==", ["coalesce", ["get", "locationType"], 0], 1], "icon-metro",
          "icon-bus-stop",
        ],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 8, 0.24, 12, 0.42, 15, 0.62],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
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
          "interpolate", ["linear"], ["zoom"],
          8,  ["case", ["boolean", ["feature-state", "hover"], false], 2, 1],
          12, ["case", ["boolean", ["feature-state", "hover"], false], 5, 2.5],
          15, ["case", ["boolean", ["feature-state", "hover"], false], 8, 4],
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
      id: "gas-stations-symbol",
      type: "symbol",
      source: "gas-stations",
      "source-layer": "gas_stations",
      layout: {
        "icon-image": "icon-fuel",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 11, 0.48, 14, 0.7],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
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
      id: "chargers-symbol",
      type: "symbol",
      source: "chargers",
      "source-layer": "chargers",
      layout: {
        "icon-image": "icon-charger",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 11, 0.5, 14, 0.72],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
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
