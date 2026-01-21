"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { IncidentEffect, IncidentCause } from "@/lib/parsers/datex2";
import {
  createIncidentMarkerElement,
  createSimpleMarkerElement,
  getIncidentPopupHTML,
  EFFECT_COLORS,
} from "./IncidentMarker";

export interface ActiveLayers {
  v16: boolean;
  incidents: boolean;
  cameras: boolean;
  chargers: boolean;
  zbe: boolean;
  weather: boolean;
  highways: boolean;
  provinces: boolean;
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
  incidentFilters?: IncidentFilters;
  height?: string;
  onIncidentClick?: (incident: Incident) => void;
}

// Spain center coordinates
const SPAIN_CENTER: [number, number] = [-3.7038, 40.4168];
const SPAIN_BOUNDS: [[number, number], [number, number]] = [
  [-9.5, 35.5], // SW
  [4.5, 44.0],  // NE
];

// Empty array - cameras will be loaded from API
const SAMPLE_CAMERAS: Camera[] = [];

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f97316",
  HIGH: "#ef4444",
  VERY_HIGH: "#7f1d1d",
};

// Legacy incident colors - now using EFFECT_COLORS from IncidentMarker

const TrafficMap = forwardRef<TrafficMapRef, TrafficMapProps>(function TrafficMap(
  { activeLayers, v16Data, incidentData, cameraData, chargerData, incidentFilters, height = "500px", onIncidentClick },
  ref
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Use provided data or empty arrays
  const beacons = v16Data || [];
  const cameras = cameraData || [];
  const chargers = chargerData || [];

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
      maxBounds: SPAIN_BOUNDS,
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

  // Update markers when layers or data change
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add V16 beacons
    if (activeLayers.v16 && beacons.length > 0) {
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

        // Pulsing animation for active beacons
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
    }

    // Add incidents with new DGT-style markers
    if (activeLayers.incidents && incidents.length > 0) {
      // Use simple markers when there are many incidents, detailed when fewer
      const useDetailedMarkers = incidents.length < 100;

      incidents.forEach((incident) => {
        const el = useDetailedMarkers
          ? createIncidentMarkerElement(incident.effect, incident.cause, 28)
          : createSimpleMarkerElement(incident.effect, 14);

        // Add click handler to open modal if callback provided
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

        // Build popup HTML
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
  }, [activeLayers, isLoaded, beacons, incidents, cameras, chargers, onIncidentClick]);

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
