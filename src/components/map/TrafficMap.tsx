"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { IncidentEffect, IncidentCause } from "@/lib/parsers/datex2";
import type { GeoJSON } from "geojson";
import {
  createIncidentMarkerElement,
  createSimpleMarkerElement,
  getIncidentPopupHTML,
  EFFECT_COLORS,
} from "./IncidentMarker";

export type IncidentViewMode = "heatmap" | "clusters" | "points";

export interface ActiveLayers {
  v16: boolean;
  incidents: boolean;
  cameras: boolean;
  chargers: boolean;
  zbe: boolean;
  weather: boolean;
  highways: boolean;
  provinces: boolean;
  radars: boolean;
  riskZones: boolean;
  gasStations: boolean;
  maritimeStations: boolean;
}

export interface IncidentFilters {
  effects: IncidentEffect[];
  causes: IncidentCause[];
}

export interface V16Beacon {
  id: string;
  lat: number;
  lng: number;
  road?: string;
  km?: number;
  severity: string;
  activatedAt?: string;
  description?: string;
}

export interface Incident {
  id: string;
  lat: number;
  lng: number;
  type: string;
  effect: IncidentEffect;
  cause: IncidentCause;
  road?: string;
  km?: number;
  province?: string;
  severity: string;
  description?: string;
  laneInfo?: string;
  startedAt?: string;
}

export interface Camera {
  id: string;
  lat: number;
  lng: number;
  name: string;
  road?: string;
  province?: string;
  imageUrl?: string;
}

export interface Charger {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  city: string | null;
  province: string;
  operator: string | null;
  totalPowerKw: number;
  connectorCount: number;
  connectorTypes: string[];
  is24h: boolean;
}

export interface WeatherAlert {
  id: string;
  type: string;
  severity: string;
  province: string;
  provinceName: string | null;
  startedAt: string;
  endedAt: string | null;
  description: string | null;
}

export interface Radar {
  id: string;
  radarId: string;
  lat: number;
  lng: number;
  road: string;
  kmPoint: number;
  direction: string | null;
  province: string;
  provinceName: string;
  type: string;
  speedLimit: number | null;
  avgSpeedPartner: string | null;
  lastUpdated: string;
}

export interface RiskZone {
  id: string;
  type: string;
  roadNumber: string;
  kmStart: number;
  kmEnd: number;
  severity: string;
  description: string | null;
  animalType: string | null;
  incidentCount: number | null;
  lastUpdated: string;
  geometry?: unknown;
  // For display on map, we'll compute center point
  lat?: number;
  lng?: number;
}

export interface ZBEZone {
  id: string;
  name: string;
  cityName: string;
  polygon: unknown;
  centroid: { lat: number; lng: number } | null;
  restrictions: Record<string, string>;
  schedule: Record<string, string | null> | null;
  activeAllYear: boolean;
  fineAmount: number | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  sourceUrl: string | null;
  lastUpdated: string;
}

export interface GasStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  postalCode: string | null;
  locality: string | null;
  municipality: string | null;
  province: string | null;
  provinceName: string | null;
  priceGasoleoA: number | null;
  priceGasolina95E5: number | null;
  priceGasolina98E5: number | null;
  priceGLP: number | null;
  schedule: string | null;
  is24h: boolean;
  lastPriceUpdate: string;
}

export interface MaritimeStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  port: string | null;
  locality: string | null;
  province: string | null;
  provinceName: string | null;
  priceGasoleoA: number | null;
  priceGasolina95E5: number | null;
  schedule: string | null;
  is24h: boolean;
  lastPriceUpdate: string;
}

export interface TrafficMapRef {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  getMap: () => maplibregl.Map | null;
}

interface TrafficMapProps {
  activeLayers: ActiveLayers;
  v16Data?: V16Beacon[];
  incidentData?: Incident[];
  cameraData?: Camera[];
  chargerData?: Charger[];
  weatherData?: WeatherAlert[];
  radarData?: Radar[];
  riskZoneData?: RiskZone[];
  zbeData?: ZBEZone[];
  gasStationData?: GasStation[];
  maritimeStationData?: MaritimeStation[];
  incidentFilters?: IncidentFilters;
  incidentViewMode?: IncidentViewMode;
  height?: string;
  onIncidentClick?: (incident: Incident) => void;
}

// Spain center coordinates
const SPAIN_CENTER: [number, number] = [-3.7038, 40.4168];

// Map location presets for quick navigation
export const MAP_PRESETS = {
  peninsula: { center: [-3.7038, 40.4168] as [number, number], zoom: 6 },
  canarias: { center: [-15.8, 28.3] as [number, number], zoom: 8 },
  ceuta: { center: [-5.32, 35.89] as [number, number], zoom: 12 },
  melilla: { center: [-2.94, 35.29] as [number, number], zoom: 12 },
};

// Empty array - cameras will be loaded from API
const SAMPLE_CAMERAS: Camera[] = [];

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f97316",
  HIGH: "#ef4444",
  VERY_HIGH: "#7f1d1d",
};

// Severity weights for heatmap intensity
const SEVERITY_WEIGHT: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  VERY_HIGH: 4,
};

// Cluster colors by size
const CLUSTER_COLORS = {
  small: "#51bbd6",   // < 10
  medium: "#f1f075",  // 10-50
  large: "#f28cb1",   // > 50
};

// Weather alert colors by type
const WEATHER_COLORS: Record<string, string> = {
  RAIN: "#3b82f6",      // Blue
  SNOW: "#60a5fa",      // Light blue
  ICE: "#22d3ee",       // Cyan
  FOG: "#6b7280",       // Gray
  WIND: "#14b8a6",      // Teal
  TEMPERATURE: "#f97316", // Orange
  STORM: "#8b5cf6",     // Purple
  COASTAL: "#0ea5e9",   // Sky blue
  OTHER: "#6b7280",     // Gray
};

// Weather alert icons (emoji)
const WEATHER_ICONS: Record<string, string> = {
  RAIN: "🌧️",
  SNOW: "❄️",
  ICE: "🧊",
  FOG: "🌫️",
  WIND: "💨",
  TEMPERATURE: "🌡️",
  STORM: "⛈️",
  COASTAL: "🌊",
  OTHER: "⚠️",
};

// Weather alert type labels in Spanish
const WEATHER_LABELS: Record<string, string> = {
  RAIN: "Lluvia",
  SNOW: "Nieve",
  ICE: "Hielo",
  FOG: "Niebla",
  WIND: "Viento",
  TEMPERATURE: "Temperatura",
  STORM: "Tormenta",
  COASTAL: "Costero",
  OTHER: "Otro",
};

// Radar type colors and labels
const RADAR_COLORS: Record<string, string> = {
  FIXED: "#eab308",         // Yellow
  SECTION: "#f97316",       // Orange
  MOBILE_ZONE: "#f59e0b",   // Amber
  TRAFFIC_LIGHT: "#ef4444", // Red
};

const RADAR_LABELS: Record<string, string> = {
  FIXED: "Radar fijo",
  SECTION: "Radar de tramo",
  MOBILE_ZONE: "Zona radar móvil",
  TRAFFIC_LIGHT: "Semáforo foto-rojo",
};

// Risk zone type colors and labels
const RISK_ZONE_COLORS: Record<string, string> = {
  ANIMAL: "#92400e",     // Brown
  MOTORCYCLE: "#dc2626", // Red
  CYCLIST: "#2563eb",    // Blue
  PEDESTRIAN: "#7c3aed", // Purple
};

const RISK_ZONE_LABELS: Record<string, string> = {
  ANIMAL: "Zona de fauna",
  MOTORCYCLE: "Zona peligrosa motos",
  CYCLIST: "Zona ciclistas",
  PEDESTRIAN: "Zona peatones",
};

// Helper to convert incidents to GeoJSON
function incidentsToGeoJSON(incidents: Incident[]): GeoJSON {
  return {
    type: "FeatureCollection",
    features: incidents.map((inc) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [inc.lng, inc.lat],
      },
      properties: {
        id: inc.id,
        type: inc.type,
        effect: inc.effect,
        cause: inc.cause,
        road: inc.road || "",
        km: inc.km || 0,
        province: inc.province || "",
        severity: inc.severity,
        severityWeight: SEVERITY_WEIGHT[inc.severity] || 1,
        description: inc.description || "",
        laneInfo: inc.laneInfo || "",
        startedAt: inc.startedAt || "",
        color: EFFECT_COLORS[inc.effect] || EFFECT_COLORS.OTHER_EFFECT,
      },
    })),
  };
}

// Helper to convert V16 beacons to GeoJSON
function v16ToGeoJSON(beacons: V16Beacon[]): GeoJSON {
  return {
    type: "FeatureCollection",
    features: beacons.map((beacon) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [beacon.lng, beacon.lat],
      },
      properties: {
        id: beacon.id,
        road: beacon.road || "",
        km: beacon.km || 0,
        severity: beacon.severity,
        description: beacon.description || "",
        activatedAt: beacon.activatedAt || "",
        color: SEVERITY_COLORS[beacon.severity] || SEVERITY_COLORS.LOW,
      },
    })),
  };
}

const TrafficMap = forwardRef<TrafficMapRef, TrafficMapProps>(function TrafficMap(
  { activeLayers, v16Data, incidentData, cameraData, chargerData, weatherData, radarData, riskZoneData, zbeData, gasStationData, maritimeStationData, incidentFilters, incidentViewMode, height = "500px", onIncidentClick },
  ref
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [provinceCoords, setProvinceCoords] = useState<Map<string, [number, number]>>(new Map());

  // Load province coordinates for weather markers
  useEffect(() => {
    fetch("/geojson/provinces.json")
      .then((res) => res.json())
      .then((data) => {
        const coords = new Map<string, [number, number]>();
        for (const feature of data.features) {
          const code = feature.properties.code;
          const [lng, lat] = feature.geometry.coordinates;
          coords.set(code, [lng, lat]);
        }
        setProvinceCoords(coords);
      })
      .catch((err) => console.error("Failed to load province coords:", err));
  }, []);

  // Use provided data or empty arrays
  const beacons = v16Data || [];
  const cameras = cameraData || [];
  const chargers = chargerData || [];
  const radars = radarData || [];
  const riskZones = riskZoneData || [];
  const zbeZones = zbeData || [];
  const gasStations = gasStationData || [];
  const maritimeStations = maritimeStationData || [];

  // Filter incidents based on incidentFilters
  const incidents = (incidentData || []).filter((incident) => {
    if (!incidentFilters) return true;
    const { effects, causes } = incidentFilters;

    // If no filters active, show all
    if (effects.length === 0 && causes.length === 0) return true;

    // If effect filters active, must match one
    const effectMatch = effects.length === 0 || effects.includes(incident.effect);
    // If cause filters active, must match one
    const causeMatch = causes.length === 0 || causes.includes(incident.cause);

    return effectMatch && causeMatch;
  });

  // Expose map methods via ref
  useImperativeHandle(ref, () => ({
    flyTo: (lng: number, lat: number, zoom: number = 12) => {
      map.current?.flyTo({ center: [lng, lat], zoom, duration: 1000 });
    },
    getMap: () => map.current,
  }));

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: SPAIN_CENTER,
      zoom: 6,
      attributionControl: false,
    });

    map.current.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.current.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.current.on("load", () => {
      // Load highways GeoJSON
      fetch("/geojson/highways.json")
        .then((res) => res.json())
        .then((data) => {
          if (!map.current) return;

          // Add highways source
          map.current.addSource("highways", {
            type: "geojson",
            data: data,
          });

          // Add highway lines layer (background/casing)
          map.current.addLayer({
            id: "highways-casing",
            type: "line",
            source: "highways",
            layout: {
              "line-join": "round",
              "line-cap": "round",
              visibility: "none",
            },
            paint: {
              "line-color": "#ffffff",
              "line-width": 8,
              "line-opacity": 0.9,
            },
          });

          // Add highway lines layer (main)
          map.current.addLayer({
            id: "highways-line",
            type: "line",
            source: "highways",
            layout: {
              "line-join": "round",
              "line-cap": "round",
              visibility: "none",
            },
            paint: {
              "line-color": ["get", "color"],
              "line-width": 4,
              "line-opacity": 0.8,
            },
          });

          // Add highway labels
          map.current.addLayer({
            id: "highways-labels",
            type: "symbol",
            source: "highways",
            layout: {
              "symbol-placement": "line",
              "text-field": ["get", "id"],
              "text-size": 12,
              "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
              visibility: "none",
            },
            paint: {
              "text-color": "#374151",
              "text-halo-color": "#ffffff",
              "text-halo-width": 2,
            },
          });
        })
        .catch((err) => console.error("Failed to load highways GeoJSON:", err));

      // Load provinces GeoJSON
      fetch("/geojson/provinces.json")
        .then((res) => res.json())
        .then((data) => {
          if (!map.current) return;

          // Add provinces source
          map.current.addSource("provinces", {
            type: "geojson",
            data: data,
          });

          // Add province circles layer
          map.current.addLayer({
            id: "provinces-circles",
            type: "circle",
            source: "provinces",
            layout: {
              visibility: "none",
            },
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                4, 8,
                8, 16,
              ],
              "circle-color": "#6366f1",
              "circle-opacity": 0.6,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            },
          });

          // Add province labels
          map.current.addLayer({
            id: "provinces-labels",
            type: "symbol",
            source: "provinces",
            layout: {
              "text-field": ["get", "name"],
              "text-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                4, 10,
                8, 14,
              ],
              "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
              "text-offset": [0, 1.5],
              visibility: "none",
            },
            paint: {
              "text-color": "#374151",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.5,
            },
          });

          // Add click handler for provinces
          map.current.on("click", "provinces-circles", (e) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0];
              const props = feature.properties;
              if (props && props.code) {
                window.location.href = `/provincias/${props.code}`;
              }
            }
          });

          // Change cursor on hover
          map.current.on("mouseenter", "provinces-circles", () => {
            if (map.current) {
              map.current.getCanvas().style.cursor = "pointer";
            }
          });

          map.current.on("mouseleave", "provinces-circles", () => {
            if (map.current) {
              map.current.getCanvas().style.cursor = "";
            }
          });
        })
        .catch((err) => console.error("Failed to load provinces GeoJSON:", err));

      setIsLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Toggle highway layers visibility
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const visibility = activeLayers.highways ? "visible" : "none";

    if (map.current.getLayer("highways-casing")) {
      map.current.setLayoutProperty("highways-casing", "visibility", visibility);
    }
    if (map.current.getLayer("highways-line")) {
      map.current.setLayoutProperty("highways-line", "visibility", visibility);
    }
    if (map.current.getLayer("highways-labels")) {
      map.current.setLayoutProperty("highways-labels", "visibility", visibility);
    }
  }, [activeLayers.highways, isLoaded]);

  // Toggle province layers visibility
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const visibility = activeLayers.provinces ? "visible" : "none";

    if (map.current.getLayer("provinces-circles")) {
      map.current.setLayoutProperty("provinces-circles", "visibility", visibility);
    }
    if (map.current.getLayer("provinces-labels")) {
      map.current.setLayoutProperty("provinces-labels", "visibility", visibility);
    }
  }, [activeLayers.provinces, isLoaded]);

  // Setup clustering sources and layers (run once after map loads)
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Skip if sources already exist
    if (map.current.getSource("incidents-cluster")) return;

    // Add incidents cluster source
    map.current.addSource("incidents-cluster", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Add V16 cluster source
    map.current.addSource("v16-cluster", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Incident cluster circles
    map.current.addLayer({
      id: "incident-clusters",
      type: "circle",
      source: "incidents-cluster",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          CLUSTER_COLORS.small,
          10,
          CLUSTER_COLORS.medium,
          50,
          CLUSTER_COLORS.large,
        ],
        "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 50, 32],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
      },
    });

    // Incident cluster count labels
    map.current.addLayer({
      id: "incident-cluster-count",
      type: "symbol",
      source: "incidents-cluster",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": 12,
      },
      paint: {
        "text-color": "#333",
      },
    });

    // Add incidents heatmap source (separate from cluster source)
    map.current.addSource("incidents-heatmap", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    // Heatmap layer for incidents
    map.current.addLayer({
      id: "incidents-heat",
      type: "heatmap",
      source: "incidents-heatmap",
      layout: { visibility: "none" },
      paint: {
        "heatmap-weight": [
          "interpolate", ["linear"], ["get", "severityWeight"],
          1, 0.3, 2, 0.5, 3, 0.7, 4, 1
        ],
        "heatmap-intensity": [
          "interpolate", ["linear"], ["zoom"],
          0, 0.5, 5, 1, 9, 2
        ],
        "heatmap-color": [
          "interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(0,0,255,0)",
          0.1, "rgba(65,105,225,0.4)",
          0.3, "rgba(0,255,128,0.6)",
          0.5, "rgba(255,255,0,0.7)",
          0.7, "rgba(255,165,0,0.8)",
          1, "rgba(255,0,0,0.9)"
        ],
        "heatmap-radius": [
          "interpolate", ["linear"], ["zoom"],
          0, 4, 5, 15, 9, 25
        ],
        "heatmap-opacity": [
          "interpolate", ["linear"], ["zoom"],
          7, 1, 9, 0.7
        ],
      },
    });

    // V16 cluster circles
    map.current.addLayer({
      id: "v16-clusters",
      type: "circle",
      source: "v16-cluster",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#f97316", // orange for V16
          10,
          "#ef4444", // red for larger
          50,
          "#7f1d1d",
        ],
        "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 28],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
      },
    });

    // V16 cluster count labels
    map.current.addLayer({
      id: "v16-cluster-count",
      type: "symbol",
      source: "v16-cluster",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": 11,
      },
      paint: {
        "text-color": "#fff",
      },
    });

    // Add ZBE zones source
    map.current.addSource("zbe-zones", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    // ZBE fill layer (semi-transparent purple)
    map.current.addLayer({
      id: "zbe-fill",
      type: "fill",
      source: "zbe-zones",
      paint: {
        "fill-color": "#9333ea",
        "fill-opacity": 0.2,
      },
    });

    // ZBE outline layer
    map.current.addLayer({
      id: "zbe-outline",
      type: "line",
      source: "zbe-zones",
      paint: {
        "line-color": "#9333ea",
        "line-width": 2,
        "line-opacity": 0.8,
      },
    });

    // ZBE labels at centroid
    map.current.addSource("zbe-labels", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.current.addLayer({
      id: "zbe-label",
      type: "symbol",
      source: "zbe-labels",
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": 12,
        "text-anchor": "center",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#7c3aed",
        "text-halo-color": "#fff",
        "text-halo-width": 1.5,
      },
    });

    // Click handler for ZBE zones
    map.current.on("click", "zbe-fill", (e) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties;
      if (!props) return;

      const restrictions = props.restrictions ? JSON.parse(props.restrictions) : {};
      const restrictionsList = Object.entries(restrictions)
        .map(([label, desc]) => `<li><strong>${label}:</strong> ${desc}</li>`)
        .join("");

      new maplibregl.Popup({ maxWidth: "300px" })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-2">
            <div class="flex items-center gap-2 mb-2">
              <span class="w-3 h-3 rounded-full bg-purple-600"></span>
              <span class="font-bold text-sm">${props.name}</span>
            </div>
            <p class="text-sm text-gray-600 mb-2">${props.cityName}</p>
            ${restrictionsList ? `<div class="text-xs"><strong>Restricciones:</strong><ul class="list-disc pl-4 mt-1">${restrictionsList}</ul></div>` : ""}
            ${props.fineAmount ? `<p class="text-xs text-red-600 mt-2">Multa: ${props.fineAmount}€</p>` : ""}
          </div>
        `)
        .addTo(map.current!);
    });

    // Cursor change on ZBE hover
    map.current.on("mouseenter", "zbe-fill", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer";
    });
    map.current.on("mouseleave", "zbe-fill", () => {
      if (map.current) map.current.getCanvas().style.cursor = "";
    });

    // Click handler for incident clusters - zoom in
    map.current.on("click", "incident-clusters", async (e) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: ["incident-clusters"],
      });
      if (!features.length) return;

      const clusterId = features[0].properties?.cluster_id;
      if (clusterId === undefined) return;

      const source = map.current!.getSource("incidents-cluster") as maplibregl.GeoJSONSource;
      try {
        const zoom = await source.getClusterExpansionZoom(clusterId);
        const geometry = features[0].geometry;
        if (geometry.type === "Point") {
          map.current!.easeTo({
            center: geometry.coordinates as [number, number],
            zoom: zoom,
          });
        }
      } catch {
        // Ignore cluster expansion errors
      }
    });

    // Click handler for V16 clusters - zoom in
    map.current.on("click", "v16-clusters", async (e) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: ["v16-clusters"],
      });
      if (!features.length) return;

      const clusterId = features[0].properties?.cluster_id;
      if (clusterId === undefined) return;

      const source = map.current!.getSource("v16-cluster") as maplibregl.GeoJSONSource;
      try {
        const zoom = await source.getClusterExpansionZoom(clusterId);
        const geometry = features[0].geometry;
        if (geometry.type === "Point") {
          map.current!.easeTo({
            center: geometry.coordinates as [number, number],
            zoom: zoom,
          });
        }
      } catch {
        // Ignore cluster expansion errors
      }
    });

    // Cursor change on cluster hover
    map.current.on("mouseenter", "incident-clusters", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer";
    });
    map.current.on("mouseleave", "incident-clusters", () => {
      if (map.current) map.current.getCanvas().style.cursor = "";
    });
    map.current.on("mouseenter", "v16-clusters", () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer";
    });
    map.current.on("mouseleave", "v16-clusters", () => {
      if (map.current) map.current.getCanvas().style.cursor = "";
    });
  }, [isLoaded]);

  // Update cluster data when incidents change (handles all view modes)
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const mode = incidentViewMode || "clusters";
    const clusterSource = map.current.getSource("incidents-cluster") as maplibregl.GeoJSONSource;
    const heatmapSource = map.current.getSource("incidents-heatmap") as maplibregl.GeoJSONSource;

    // Set visibility based on mode
    const showClusters = activeLayers.incidents && mode === "clusters";
    const showHeatmap = activeLayers.incidents && mode === "heatmap";

    // Cluster layers visibility
    if (map.current.getLayer("incident-clusters")) {
      map.current.setLayoutProperty("incident-clusters", "visibility", showClusters ? "visible" : "none");
    }
    if (map.current.getLayer("incident-cluster-count")) {
      map.current.setLayoutProperty("incident-cluster-count", "visibility", showClusters ? "visible" : "none");
    }

    // Heatmap layer visibility
    if (map.current.getLayer("incidents-heat")) {
      map.current.setLayoutProperty("incidents-heat", "visibility", showHeatmap ? "visible" : "none");
    }

    // Update data for active mode
    if (activeLayers.incidents) {
      const geojson = incidentsToGeoJSON(incidents);
      if (clusterSource && mode === "clusters") {
        clusterSource.setData(geojson as maplibregl.GeoJSONSourceSpecification["data"]);
      }
      if (heatmapSource && (mode === "heatmap" || mode === "points")) {
        // Heatmap source is also used for points mode reference
        heatmapSource.setData(geojson as maplibregl.GeoJSONSourceSpecification["data"]);
      }
    }
  }, [activeLayers.incidents, isLoaded, incidents, incidentViewMode]);

  // Update cluster data when V16 beacons change
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const source = map.current.getSource("v16-cluster") as maplibregl.GeoJSONSource;
    if (!source) return;

    // Update visibility
    const visibility = activeLayers.v16 ? "visible" : "none";
    if (map.current.getLayer("v16-clusters")) {
      map.current.setLayoutProperty("v16-clusters", "visibility", visibility);
    }
    if (map.current.getLayer("v16-cluster-count")) {
      map.current.setLayoutProperty("v16-cluster-count", "visibility", visibility);
    }

    // Update data
    if (activeLayers.v16) {
      source.setData(v16ToGeoJSON(beacons) as maplibregl.GeoJSONSourceSpecification["data"]);
    }
  }, [activeLayers.v16, isLoaded, beacons]);

  // Update ZBE zones data
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const zonesSource = map.current.getSource("zbe-zones") as maplibregl.GeoJSONSource;
    const labelsSource = map.current.getSource("zbe-labels") as maplibregl.GeoJSONSource;
    if (!zonesSource || !labelsSource) return;

    // Update visibility
    const visibility = activeLayers.zbe ? "visible" : "none";
    if (map.current.getLayer("zbe-fill")) {
      map.current.setLayoutProperty("zbe-fill", "visibility", visibility);
    }
    if (map.current.getLayer("zbe-outline")) {
      map.current.setLayoutProperty("zbe-outline", "visibility", visibility);
    }
    if (map.current.getLayer("zbe-label")) {
      map.current.setLayoutProperty("zbe-label", "visibility", visibility);
    }

    // Update data
    if (activeLayers.zbe && zbeZones.length > 0) {
      // Convert ZBE zones to GeoJSON polygons
      const polygonFeatures = zbeZones
        .filter((zone) => zone.polygon)
        .map((zone) => ({
          type: "Feature" as const,
          geometry: zone.polygon as GeoJSON.Geometry,
          properties: {
            id: zone.id,
            name: zone.name,
            cityName: zone.cityName,
            restrictions: JSON.stringify(zone.restrictions),
            fineAmount: zone.fineAmount,
          },
        }));

      zonesSource.setData({
        type: "FeatureCollection",
        features: polygonFeatures,
      } as maplibregl.GeoJSONSourceSpecification["data"]);

      // Create label points at centroids
      const labelFeatures = zbeZones
        .filter((zone) => zone.centroid)
        .map((zone) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [zone.centroid!.lng, zone.centroid!.lat],
          },
          properties: {
            name: zone.cityName,
          },
        }));

      labelsSource.setData({
        type: "FeatureCollection",
        features: labelFeatures,
      } as maplibregl.GeoJSONSourceSpecification["data"]);
    } else {
      // Clear data when layer is disabled
      zonesSource.setData({ type: "FeatureCollection", features: [] } as maplibregl.GeoJSONSourceSpecification["data"]);
      labelsSource.setData({ type: "FeatureCollection", features: [] } as maplibregl.GeoJSONSourceSpecification["data"]);
    }
  }, [activeLayers.zbe, isLoaded, zbeZones]);

  // Update individual markers for cameras, chargers, and unclustered points
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing markers (cameras, chargers, unclustered items)
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add individual V16 markers for unclustered beacons (at high zoom)
    // This provides the pulsing animation and popup functionality
    if (activeLayers.v16 && beacons.length > 0 && beacons.length <= 50) {
      beacons.forEach((beacon) => {
        const el = document.createElement("div");
        el.className = "v16-marker";
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = SEVERITY_COLORS[beacon.severity] || SEVERITY_COLORS.LOW;
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
        el.style.cursor = "pointer";
        el.style.animation = "pulse 2s infinite";

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([beacon.lng, beacon.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(`
              <div class="p-2 min-w-[150px]">
                <div class="flex items-center gap-2 mb-1">
                  <span class="w-3 h-3 rounded-full" style="background-color: ${SEVERITY_COLORS[beacon.severity] || SEVERITY_COLORS.LOW}"></span>
                  <span class="font-bold text-sm">V16 Baliza</span>
                </div>
                ${beacon.road ? `<p class="text-sm font-medium">${beacon.road}${beacon.km ? ` km ${beacon.km}` : ""}</p>` : ""}
                <p class="text-xs text-gray-500">Severidad: ${beacon.severity}</p>
                ${beacon.description ? `<p class="text-xs mt-1">${beacon.description}</p>` : ""}
                ${beacon.activatedAt ? `<p class="text-xs text-gray-400 mt-1">Desde: ${new Date(beacon.activatedAt).toLocaleString("es-ES")}</p>` : ""}
              </div>
            `)
          )
          .addTo(map.current!);

        markersRef.current.push(marker);
      });

      // Hide cluster layer when showing individual markers
      if (map.current.getLayer("v16-clusters")) {
        map.current.setLayoutProperty("v16-clusters", "visibility", "none");
      }
      if (map.current.getLayer("v16-cluster-count")) {
        map.current.setLayoutProperty("v16-cluster-count", "visibility", "none");
      }
    }

    // Add individual incident markers based on view mode
    const mode = incidentViewMode || "clusters";
    // Show individual markers when:
    // - In "points" mode: always show all markers
    // - In "clusters" mode: show when count is low (<=50)
    // - In "heatmap" mode: never show individual markers
    const shouldShowIndividualIncidents = activeLayers.incidents && incidents.length > 0 && (
      mode === "points" || (mode === "clusters" && incidents.length <= 50)
    );

    if (shouldShowIndividualIncidents) {
      const useDetailedMarkers = incidents.length < 100;

      incidents.forEach((incident) => {
        const el = useDetailedMarkers
          ? createIncidentMarkerElement(incident.effect, incident.cause, 28)
          : createSimpleMarkerElement(incident.effect, 14);

        if (onIncidentClick) {
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            onIncidentClick(incident);
          });
        }

        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([incident.lng, incident.lat])
          .addTo(map.current!);

        markersRef.current.push(marker);
      });

      // Hide cluster layers when showing individual markers
      if (map.current.getLayer("incident-clusters")) {
        map.current.setLayoutProperty("incident-clusters", "visibility", "none");
      }
      if (map.current.getLayer("incident-cluster-count")) {
        map.current.setLayoutProperty("incident-cluster-count", "visibility", "none");
      }
      // Also hide heatmap when showing individual markers
      if (map.current.getLayer("incidents-heat")) {
        map.current.setLayoutProperty("incidents-heat", "visibility", "none");
      }
    }

    // Add cameras
    if (activeLayers.cameras && cameras.length > 0) {
      cameras.forEach((camera) => {
        const el = document.createElement("div");
        el.className = "camera-marker";
        el.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="6" width="16" height="12" rx="2" fill="#3b82f6" stroke="white" stroke-width="2"/>
            <path d="M18 9L22 7V17L18 15V9Z" fill="#3b82f6" stroke="white" stroke-width="2"/>
          </svg>
        `;
        el.style.cursor = "pointer";

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([camera.lng, camera.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 25, maxWidth: "280px" }).setHTML(`
              <div class="p-2">
                ${camera.imageUrl ? `
                  <div class="mb-2 bg-gray-100 rounded overflow-hidden">
                    <img src="${camera.imageUrl}" alt="${camera.name}" class="w-full h-32 object-cover" loading="lazy" onerror="this.style.display='none'" />
                  </div>
                ` : ""}
                <p class="font-bold text-sm">${camera.name}</p>
                ${camera.province ? `<p class="text-xs text-gray-500">${camera.province}</p>` : ""}
                <a href="/camaras?id=${camera.id}" class="inline-block mt-2 text-blue-600 text-sm hover:underline">Ver cámara →</a>
              </div>
            `)
          )
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    }

    // Add chargers
    if (activeLayers.chargers && chargers.length > 0) {
      chargers.forEach((charger) => {
        const el = document.createElement("div");
        el.className = "charger-marker";
        el.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#22c55e" stroke="white" stroke-width="2"/>
            <path d="M13 6L9 12H11V18L15 12H13V6Z" fill="white"/>
          </svg>
        `;
        el.style.cursor = "pointer";

        const powerDisplay = charger.totalPowerKw >= 1
          ? `${Math.round(charger.totalPowerKw)} kW`
          : `${Math.round(charger.totalPowerKw * 1000)} W`;
        const connectorTypesDisplay = charger.connectorTypes.join(", ");
        const is24hBadge = charger.is24h
          ? '<span class="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded ml-1">24h</span>'
          : '';

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([charger.lng, charger.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 25, maxWidth: "280px" }).setHTML(`
              <div class="p-2 min-w-[200px]">
                <div class="flex items-center gap-2 mb-1">
                  <span class="w-3 h-3 rounded-full bg-green-500"></span>
                  <span class="font-bold text-sm flex-1">${charger.name}</span>
                  ${is24hBadge}
                </div>
                <div class="text-sm text-gray-600 space-y-1">
                  <p><strong>Potencia:</strong> ${powerDisplay}</p>
                  <p><strong>Conectores:</strong> ${charger.connectorCount} (${connectorTypesDisplay})</p>
                  ${charger.operator ? `<p><strong>Operador:</strong> ${charger.operator}</p>` : ""}
                  ${charger.address ? `<p class="text-xs">${charger.address}</p>` : ""}
                  ${charger.city ? `<p class="text-xs text-gray-500">${charger.city}, ${charger.province}</p>` : ""}
                </div>
              </div>
            `)
          )
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    }

    // Add radars
    if (activeLayers.radars && radars.length > 0) {
      radars.forEach((radar) => {
        const color = RADAR_COLORS[radar.type] || RADAR_COLORS.FIXED;
        const label = RADAR_LABELS[radar.type] || radar.type;

        const el = document.createElement("div");
        el.className = "radar-marker";
        el.innerHTML = `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
            <path d="M12 6V12L16 14" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="12" r="3" fill="white"/>
          </svg>
        `;
        el.style.cursor = "pointer";

        const speedDisplay = radar.speedLimit
          ? `<p class="text-lg font-bold text-center" style="color: ${color}">${radar.speedLimit} km/h</p>`
          : "";
        const directionDisplay = radar.direction
          ? `<span class="text-xs text-gray-500">${radar.direction === "INCREASING" ? "↑ Sentido creciente" : "↓ Sentido decreciente"}</span>`
          : "";

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([radar.lng, radar.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 25, maxWidth: "280px" }).setHTML(`
              <div class="p-2 min-w-[180px]">
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-3 h-3 rounded-full" style="background: ${color}"></span>
                  <span class="font-bold text-sm">${label}</span>
                </div>
                ${speedDisplay}
                <div class="text-sm text-gray-600 space-y-1">
                  <p><strong>Carretera:</strong> ${radar.road} km ${radar.kmPoint}</p>
                  ${directionDisplay}
                  ${radar.provinceName ? `<p class="text-xs text-gray-500">${radar.provinceName}</p>` : ""}
                  ${radar.avgSpeedPartner ? `<p class="text-xs text-orange-600">Radar de tramo (con ${radar.avgSpeedPartner})</p>` : ""}
                </div>
              </div>
            `)
          )
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    }

    // Add risk zones as line segments or markers
    if (activeLayers.riskZones && riskZones.length > 0) {
      // Check if we have a source for line rendering
      if (!map.current.getSource("risk-zones-lines")) {
        map.current.addSource("risk-zones-lines", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        // Risk zone line layer with glow effect
        map.current.addLayer({
          id: "risk-zones-glow",
          type: "line",
          source: "risk-zones-lines",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 8,
            "line-opacity": 0.3,
            "line-blur": 3,
          },
        });

        map.current.addLayer({
          id: "risk-zones-line",
          type: "line",
          source: "risk-zones-lines",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 4,
            "line-opacity": 0.8,
          },
        });

        // Click handler for risk zone lines
        map.current.on("click", "risk-zones-line", (e) => {
          if (!e.features?.length) return;
          const props = e.features[0].properties;
          if (!props) return;

          const animalInfo = props.animalType
            ? `<p><strong>Tipo:</strong> ${props.animalType}</p>`
            : "";
          const incidentInfo = props.incidentCount
            ? `<p><strong>Incidentes históricos:</strong> ${props.incidentCount}</p>`
            : "";

          new maplibregl.Popup({ maxWidth: "280px" })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="p-2 min-w-[200px]">
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-3 h-3 rounded-full" style="background: ${props.color}"></span>
                  <span class="font-bold text-sm">${props.label}</span>
                  <span class="text-xs px-1.5 py-0.5 rounded" style="background: ${props.severityColor}; color: white;">${props.severity}</span>
                </div>
                <div class="text-sm text-gray-600 space-y-1">
                  <p><strong>Carretera:</strong> ${props.roadNumber}</p>
                  <p><strong>Tramo:</strong> km ${props.kmStart} - ${props.kmEnd}</p>
                  ${animalInfo}
                  ${incidentInfo}
                  ${props.description ? `<p class="text-xs text-gray-500 mt-1">${props.description}</p>` : ""}
                </div>
              </div>
            `)
            .addTo(map.current!);
        });

        // Cursor change on hover
        map.current.on("mouseenter", "risk-zones-line", () => {
          if (map.current) map.current.getCanvas().style.cursor = "pointer";
        });
        map.current.on("mouseleave", "risk-zones-line", () => {
          if (map.current) map.current.getCanvas().style.cursor = "";
        });
      }

      // Build features from zones with geometry
      const lineFeatures = riskZones
        .filter((zone) => zone.geometry)
        .map((zone) => {
          const color = RISK_ZONE_COLORS[zone.type] || RISK_ZONE_COLORS.ANIMAL;
          const label = RISK_ZONE_LABELS[zone.type] || zone.type;
          const severityColor = SEVERITY_COLORS[zone.severity] || SEVERITY_COLORS.MEDIUM;

          return {
            type: "Feature" as const,
            geometry: zone.geometry as GeoJSON.Geometry,
            properties: {
              id: zone.id,
              type: zone.type,
              roadNumber: zone.roadNumber,
              kmStart: zone.kmStart,
              kmEnd: zone.kmEnd,
              severity: zone.severity,
              description: zone.description || "",
              animalType: zone.animalType || "",
              incidentCount: zone.incidentCount || 0,
              color,
              label,
              severityColor,
            },
          };
        });

      const source = map.current.getSource("risk-zones-lines") as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: lineFeatures,
        } as maplibregl.GeoJSONSourceSpecification["data"]);
      }

      // For zones without geometry, show markers at computed centroid (fallback)
      riskZones
        .filter((zone) => !zone.geometry && zone.lat && zone.lng)
        .forEach((zone) => {
          const color = RISK_ZONE_COLORS[zone.type] || RISK_ZONE_COLORS.ANIMAL;
          const label = RISK_ZONE_LABELS[zone.type] || zone.type;
          const severityColor = SEVERITY_COLORS[zone.severity] || SEVERITY_COLORS.MEDIUM;

          const el = document.createElement("div");
          el.className = "risk-zone-marker";
          el.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 22H22L12 2Z" fill="${color}" stroke="white" stroke-width="2"/>
              <text x="12" y="17" text-anchor="middle" fill="white" font-size="10" font-weight="bold">!</text>
            </svg>
          `;
          el.style.cursor = "pointer";

          const animalInfo = zone.animalType
            ? `<p><strong>Tipo:</strong> ${zone.animalType}</p>`
            : "";
          const incidentInfo = zone.incidentCount
            ? `<p><strong>Incidentes históricos:</strong> ${zone.incidentCount}</p>`
            : "";

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([zone.lng!, zone.lat!])
            .setPopup(
              new maplibregl.Popup({ offset: 25, maxWidth: "280px" }).setHTML(`
                <div class="p-2 min-w-[200px]">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="w-3 h-3 rounded-full" style="background: ${color}"></span>
                    <span class="font-bold text-sm">${label}</span>
                    <span class="text-xs px-1.5 py-0.5 rounded" style="background: ${severityColor}; color: white;">${zone.severity}</span>
                  </div>
                  <div class="text-sm text-gray-600 space-y-1">
                    <p><strong>Carretera:</strong> ${zone.roadNumber}</p>
                    <p><strong>Tramo:</strong> km ${zone.kmStart} - ${zone.kmEnd}</p>
                    ${animalInfo}
                    ${incidentInfo}
                    ${zone.description ? `<p class="text-xs text-gray-500 mt-1">${zone.description}</p>` : ""}
                  </div>
                </div>
              `)
            )
            .addTo(map.current!);

          markersRef.current.push(marker);
        });
    } else if (map.current.getSource("risk-zones-lines")) {
      // Clear risk zone lines when layer is disabled
      const source = map.current.getSource("risk-zones-lines") as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({ type: "FeatureCollection", features: [] } as maplibregl.GeoJSONSourceSpecification["data"]);
      }
    }

    // Add weather alerts (province-level markers)
    if (activeLayers.weather && weatherData && weatherData.length > 0 && provinceCoords.size > 0) {
      // Group alerts by province
      const byProvince = new Map<string, WeatherAlert[]>();
      for (const alert of weatherData) {
        const list = byProvince.get(alert.province) || [];
        list.push(alert);
        byProvince.set(alert.province, list);
      }

      // Helper to get severity weight
      const severityWeight = (severity: string): number => {
        switch (severity) {
          case "EXTREME": return 4;
          case "SEVERE": return 3;
          case "MODERATE": return 2;
          case "MINOR": return 1;
          default: return 0;
        }
      };

      // Create marker for each province with alerts
      for (const [province, alerts] of byProvince) {
        const coords = provinceCoords.get(province);
        if (!coords) continue;

        // Find worst severity alert for display
        const worstAlert = alerts.reduce((a, b) =>
          severityWeight(b.severity) > severityWeight(a.severity) ? b : a
        );

        const el = document.createElement("div");
        el.className = "weather-marker";
        el.style.cursor = "pointer";

        const color = WEATHER_COLORS[worstAlert.type] || WEATHER_COLORS.OTHER;
        const icon = WEATHER_ICONS[worstAlert.type] || WEATHER_ICONS.OTHER;

        el.innerHTML = `
          <div style="
            background: ${color};
            padding: 4px 8px;
            border-radius: 16px;
            color: white;
            font-size: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            <span>${icon}</span>
            ${alerts.length > 1 ? `<span>${alerts.length}</span>` : ""}
          </div>
        `;

        // Build popup content with all alerts for this province
        const alertsHtml = alerts.map((alert) => {
          const alertColor = WEATHER_COLORS[alert.type] || WEATHER_COLORS.OTHER;
          const alertIcon = WEATHER_ICONS[alert.type] || WEATHER_ICONS.OTHER;
          const alertLabel = WEATHER_LABELS[alert.type] || alert.type;
          return `
            <div class="mb-2 pb-2 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
              <div class="flex items-center gap-2">
                <span style="color: ${alertColor}">${alertIcon}</span>
                <span class="font-medium text-sm">${alertLabel}</span>
                <span class="text-xs px-1.5 py-0.5 rounded" style="background: ${alertColor}20; color: ${alertColor}">${alert.severity}</span>
              </div>
              ${alert.description ? `<p class="text-xs text-gray-600 mt-1">${alert.description}</p>` : ""}
              <p class="text-xs text-gray-400 mt-1">Desde: ${new Date(alert.startedAt).toLocaleString("es-ES")}</p>
            </div>
          `;
        }).join("");

        const provinceName = alerts[0]?.provinceName || province;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(coords)
          .setPopup(
            new maplibregl.Popup({ offset: 25, maxWidth: "300px" }).setHTML(`
              <div class="p-2">
                <p class="font-bold text-sm mb-2">${provinceName} - Alertas meteorológicas</p>
                ${alertsHtml}
              </div>
            `)
          )
          .addTo(map.current!);

        markersRef.current.push(marker);
      }
    }

    // Add gas stations
    if (activeLayers.gasStations && gasStations.length > 0) {
      gasStations.forEach((station) => {
        const el = document.createElement("div");
        el.className = "gas-station-marker";
        el.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#f97316" stroke="white" stroke-width="2"/>
            <path d="M7 18V8C7 7.45 7.196 6.98 7.588 6.59C7.98 6.2 8.45 6.005 9 6.005H13C13.55 6.005 14.021 6.2 14.413 6.59C14.805 6.98 15.001 7.45 15.001 8V18" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M15 11H16.5C17.05 11 17.521 11.196 17.913 11.588C18.305 11.98 18.501 12.45 18.501 13V15C18.501 15.283 18.596 15.521 18.786 15.711C18.976 15.901 19.214 15.996 19.497 15.996C19.78 15.996 20.018 15.901 20.211 15.711C20.404 15.521 20.501 15.283 20.501 15V10" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            <rect x="9" y="10" width="4" height="3" fill="white"/>
          </svg>
        `;
        el.style.cursor = "pointer";

        const formatPrice = (price: number | null) => price ? `${price.toFixed(3)}€` : "N/D";
        const is24hBadge = station.is24h
          ? '<span class="inline-block px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded ml-1">24h</span>'
          : '';

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([station.longitude, station.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25, maxWidth: "300px" }).setHTML(`
              <div class="p-2 min-w-[220px]">
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-3 h-3 rounded-full bg-orange-500"></span>
                  <span class="font-bold text-sm flex-1">${station.name}</span>
                  ${is24hBadge}
                </div>
                <div class="grid grid-cols-2 gap-2 mb-2">
                  ${station.priceGasoleoA ? `
                    <div class="bg-amber-50 p-1.5 rounded">
                      <div class="text-xs text-amber-600">Gasóleo A</div>
                      <div class="font-bold text-amber-700">${formatPrice(station.priceGasoleoA)}</div>
                    </div>
                  ` : ''}
                  ${station.priceGasolina95E5 ? `
                    <div class="bg-blue-50 p-1.5 rounded">
                      <div class="text-xs text-blue-600">Gasolina 95</div>
                      <div class="font-bold text-blue-700">${formatPrice(station.priceGasolina95E5)}</div>
                    </div>
                  ` : ''}
                  ${station.priceGasolina98E5 ? `
                    <div class="bg-purple-50 p-1.5 rounded">
                      <div class="text-xs text-purple-600">Gasolina 98</div>
                      <div class="font-bold text-purple-700">${formatPrice(station.priceGasolina98E5)}</div>
                    </div>
                  ` : ''}
                  ${station.priceGLP ? `
                    <div class="bg-green-50 p-1.5 rounded">
                      <div class="text-xs text-green-600">GLP</div>
                      <div class="font-bold text-green-700">${formatPrice(station.priceGLP)}</div>
                    </div>
                  ` : ''}
                </div>
                <div class="text-xs text-gray-600 space-y-1">
                  ${station.address ? `<p>${station.address}</p>` : ''}
                  ${station.locality ? `<p>${station.locality}${station.provinceName ? `, ${station.provinceName}` : ''}</p>` : ''}
                  ${station.schedule ? `<p class="text-gray-400">${station.schedule}</p>` : ''}
                </div>
                <div class="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                  <span class="text-xs text-gray-400">${station.latitude.toFixed(5)}, ${station.longitude.toFixed(5)}</span>
                  <a href="/gasolineras/terrestres/${station.id}" class="text-orange-600 text-xs hover:underline">Ver detalles →</a>
                </div>
              </div>
            `)
          )
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    }

    // Add maritime stations
    if (activeLayers.maritimeStations && maritimeStations.length > 0) {
      maritimeStations.forEach((station) => {
        const el = document.createElement("div");
        el.className = "maritime-station-marker";
        el.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" stroke-width="2"/>
            <path d="M12 5V12M12 12L8 16M12 12L16 16" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <path d="M6 19H18" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
        el.style.cursor = "pointer";

        const formatPrice = (price: number | null) => price ? `${price.toFixed(3)}€` : "N/D";
        const is24hBadge = station.is24h
          ? '<span class="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded ml-1">24h</span>'
          : '';

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([station.longitude, station.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25, maxWidth: "280px" }).setHTML(`
              <div class="p-2 min-w-[200px]">
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span class="font-bold text-sm flex-1">${station.name}</span>
                  ${is24hBadge}
                </div>
                ${station.port ? `<p class="text-sm text-blue-600 mb-2">Puerto: ${station.port}</p>` : ''}
                <div class="grid grid-cols-2 gap-2 mb-2">
                  ${station.priceGasoleoA ? `
                    <div class="bg-amber-50 p-1.5 rounded">
                      <div class="text-xs text-amber-600">Gasóleo A</div>
                      <div class="font-bold text-amber-700">${formatPrice(station.priceGasoleoA)}</div>
                    </div>
                  ` : ''}
                  ${station.priceGasolina95E5 ? `
                    <div class="bg-blue-50 p-1.5 rounded">
                      <div class="text-xs text-blue-600">Gasolina 95</div>
                      <div class="font-bold text-blue-700">${formatPrice(station.priceGasolina95E5)}</div>
                    </div>
                  ` : ''}
                </div>
                <div class="text-xs text-gray-600 space-y-1">
                  ${station.locality ? `<p>${station.locality}${station.provinceName ? `, ${station.provinceName}` : ''}</p>` : ''}
                  ${station.schedule ? `<p class="text-gray-400">${station.schedule}</p>` : ''}
                </div>
                <div class="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                  <span class="text-xs text-gray-400">${station.latitude.toFixed(5)}, ${station.longitude.toFixed(5)}</span>
                  <a href="/gasolineras/maritimas/${station.id}" class="text-blue-600 text-xs hover:underline">Ver detalles →</a>
                </div>
              </div>
            `)
          )
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    }
  }, [activeLayers, isLoaded, beacons, incidents, cameras, chargers, weatherData, provinceCoords, onIncidentClick, gasStations, maritimeStations, incidentViewMode]);

  return (
    <>
      <style jsx global>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
        .maplibregl-popup-content {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
      <div
        ref={mapContainer}
        className="w-full"
        style={{ backgroundColor: "#f5f5f5", height }}
      />
    </>
  );
});

export default TrafficMap;
