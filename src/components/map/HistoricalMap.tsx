"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Layers, Flame, Circle, MapPin, Loader2 } from "lucide-react";

export interface BeaconMapData {
  id: string;
  lat: number;
  lng: number;
  activatedAt: string;
  road: string | null;
  province: string | null;
  severity: string;
  durationSecs: number | null;
  severityWeight: number;
}

interface ClusterData {
  province: string;
  lat: number;
  lng: number;
  count: number;
}

export type ViewMode = "heatmap" | "clusters" | "points";

interface HistoricalMapProps {
  beacons: BeaconMapData[];
  clusters?: ClusterData[];
  isLoading: boolean;
  height?: string;
}

// Spain center and bounds
const SPAIN_CENTER: [number, number] = [-3.7038, 40.4168];
const SPAIN_BOUNDS: [[number, number], [number, number]] = [
  [-9.5, 35.5],
  [4.5, 44.0],
];

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f97316",
  HIGH: "#ef4444",
  VERY_HIGH: "#7f1d1d",
};

export function HistoricalMap({
  beacons,
  clusters,
  isLoading,
  height = "400px",
}: HistoricalMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("heatmap");

  // Determine default view mode based on data size
  useEffect(() => {
    if (beacons.length === 0) return;
    if (beacons.length > 100) {
      setViewMode("heatmap");
    } else if (beacons.length > 20) {
      setViewMode("clusters");
    } else {
      setViewMode("points");
    }
  }, [beacons.length]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: SPAIN_CENTER,
      zoom: 5.5,
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
      setIsMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update visualization when data or mode changes
  useEffect(() => {
    if (!map.current || !isMapLoaded || beacons.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Remove existing layers and sources
    const layersToRemove = ["heatmap-layer", "clusters-circle", "clusters-count", "unclustered-point"];
    layersToRemove.forEach((layerId) => {
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
    });

    const sourcesToRemove = ["beacons-heatmap", "beacons-cluster"];
    sourcesToRemove.forEach((sourceId) => {
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });

    // Build GeoJSON data
    const geojsonData: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: beacons.map((beacon) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [beacon.lng, beacon.lat],
        },
        properties: {
          id: beacon.id,
          severity: beacon.severity,
          severityWeight: beacon.severityWeight,
          road: beacon.road,
          province: beacon.province,
          activatedAt: beacon.activatedAt,
          durationMins: beacon.durationSecs ? Math.round(beacon.durationSecs / 60) : null,
        },
      })),
    };

    if (viewMode === "heatmap") {
      // Add heatmap source and layer
      map.current.addSource("beacons-heatmap", {
        type: "geojson",
        data: geojsonData,
      });

      map.current.addLayer({
        id: "heatmap-layer",
        type: "heatmap",
        source: "beacons-heatmap",
        paint: {
          // Weight based on severity
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "severityWeight"],
            1, 0.3,
            2, 0.5,
            3, 0.7,
            4, 1,
          ],
          // Increase intensity as zoom level increases
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 0.5,
            5, 1,
            9, 2,
          ],
          // Color gradient from blue to red
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0, 0, 255, 0)",
            0.1, "rgba(65, 105, 225, 0.4)",
            0.3, "rgba(0, 255, 128, 0.6)",
            0.5, "rgba(255, 255, 0, 0.7)",
            0.7, "rgba(255, 165, 0, 0.8)",
            1, "rgba(255, 0, 0, 0.9)",
          ],
          // Radius increases with zoom
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 4,
            5, 15,
            9, 25,
          ],
          // Decrease opacity at higher zoom levels
          "heatmap-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7, 1,
            9, 0.7,
          ],
        },
      });
    } else if (viewMode === "clusters") {
      // Add clustered source
      map.current.addSource("beacons-cluster", {
        type: "geojson",
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
        clusterProperties: {
          totalWeight: ["+", ["get", "severityWeight"]],
        },
      });

      // Cluster circles
      map.current.addLayer({
        id: "clusters-circle",
        type: "circle",
        source: "beacons-cluster",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#22c55e",   // green for small clusters
            5, "#f97316",  // orange for medium
            15, "#ef4444", // red for large
            30, "#7f1d1d", // dark red for very large
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            15,
            5, 20,
            15, 25,
            30, 35,
          ],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Cluster count labels
      map.current.addLayer({
        id: "clusters-count",
        type: "symbol",
        source: "beacons-cluster",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Unclustered points
      map.current.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "beacons-cluster",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "severity"],
            "LOW", "#22c55e",
            "MEDIUM", "#f97316",
            "HIGH", "#ef4444",
            "VERY_HIGH", "#7f1d1d",
            "#22c55e",
          ],
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Click to zoom into cluster
      map.current.on("click", "clusters-circle", async (e) => {
        const features = map.current?.queryRenderedFeatures(e.point, {
          layers: ["clusters-circle"],
        });
        if (!features || features.length === 0) return;
        const clusterId = features[0].properties?.cluster_id;
        const source = map.current?.getSource("beacons-cluster") as maplibregl.GeoJSONSource;
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          if (!map.current) return;
          const geometry = features[0].geometry;
          if (geometry.type === "Point") {
            map.current.easeTo({
              center: geometry.coordinates as [number, number],
              zoom: zoom || 10,
            });
          }
        } catch {
          // Ignore cluster expansion errors
        }
      });

      // Change cursor on hover
      map.current.on("mouseenter", "clusters-circle", () => {
        if (map.current) map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "clusters-circle", () => {
        if (map.current) map.current.getCanvas().style.cursor = "";
      });

      // Popup for unclustered points
      map.current.on("click", "unclustered-point", (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties;
        const geometry = feature.geometry;
        if (geometry.type !== "Point") return;

        const popupHTML = `
          <div class="p-2 min-w-[150px]">
            <div class="flex items-center gap-2 mb-1">
              <span class="w-3 h-3 rounded-full" style="background-color: ${SEVERITY_COLORS[props?.severity] || SEVERITY_COLORS.LOW}"></span>
              <span class="font-bold text-sm">V16 Baliza</span>
            </div>
            ${props?.road ? `<p class="text-sm font-medium">${props.road}</p>` : ""}
            ${props?.province ? `<p class="text-xs text-gray-500">${props.province}</p>` : ""}
            <p class="text-xs text-gray-500">Severidad: ${props?.severity}</p>
            ${props?.durationMins ? `<p class="text-xs text-gray-500">Duración: ${props.durationMins} min</p>` : ""}
            ${props?.activatedAt ? `<p class="text-xs text-gray-400 mt-1">${new Date(props.activatedAt).toLocaleString("es-ES")}</p>` : ""}
          </div>
        `;

        new maplibregl.Popup({ offset: 25 })
          .setLngLat(geometry.coordinates as [number, number])
          .setHTML(popupHTML)
          .addTo(map.current!);
      });
    } else {
      // Points mode - individual markers
      beacons.forEach((beacon) => {
        const el = document.createElement("div");
        el.className = "beacon-marker";
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = SEVERITY_COLORS[beacon.severity] || SEVERITY_COLORS.LOW;
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
        el.style.cursor = "pointer";

        const durationDisplay = beacon.durationSecs
          ? `${Math.round(beacon.durationSecs / 60)} min`
          : "En curso";

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([beacon.lng, beacon.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 15 }).setHTML(`
              <div class="p-2 min-w-[150px]">
                <div class="flex items-center gap-2 mb-1">
                  <span class="w-3 h-3 rounded-full" style="background-color: ${SEVERITY_COLORS[beacon.severity]}"></span>
                  <span class="font-bold text-sm">V16 Baliza</span>
                </div>
                ${beacon.road ? `<p class="text-sm font-medium">${beacon.road}</p>` : ""}
                ${beacon.province ? `<p class="text-xs text-gray-500">${beacon.province}</p>` : ""}
                <p class="text-xs text-gray-500">Severidad: ${beacon.severity}</p>
                <p class="text-xs text-gray-500">Duración: ${durationDisplay}</p>
                <p class="text-xs text-gray-400 mt-1">${new Date(beacon.activatedAt).toLocaleString("es-ES")}</p>
              </div>
            `)
          )
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    }

    // Fit bounds to data if we have points
    if (beacons.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      beacons.forEach((beacon) => {
        bounds.extend([beacon.lng, beacon.lat]);
      });

      // Only fit if we have reasonable bounds
      if (bounds.getNorthEast().lng !== bounds.getSouthWest().lng) {
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 10,
          duration: 500,
        });
      }
    }
  }, [beacons, isMapLoaded, viewMode]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header with view mode toggle */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-orange-600" />
          Mapa de Balizas V16
        </h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("heatmap")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              viewMode === "heatmap"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title="Mapa de calor"
          >
            <Flame className="w-4 h-4" />
            <span className="hidden sm:inline">Calor</span>
          </button>
          <button
            onClick={() => setViewMode("clusters")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              viewMode === "clusters"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title="Clusters"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Grupos</span>
          </button>
          <button
            onClick={() => setViewMode("points")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              viewMode === "points"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title="Puntos individuales"
          >
            <Circle className="w-4 h-4" />
            <span className="hidden sm:inline">Puntos</span>
          </button>
        </div>
      </div>

      {/* Map container */}
      <div className="relative" style={{ height }}>
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
              <span className="text-sm text-gray-500">Cargando datos...</span>
            </div>
          </div>
        )}

        {!isLoading && beacons.length === 0 && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">Sin datos de ubicación</p>
              <p className="text-sm text-gray-400 mt-1">
                No hay balizas registradas para este período
              </p>
            </div>
          </div>
        )}

        <div ref={mapContainer} className="w-full h-full" />
      </div>

      {/* Legend */}
      {beacons.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
            <span className="font-medium">Severidad:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span>Baja</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span>Media</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span>Alta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-900" />
              <span>Muy alta</span>
            </div>
            <span className="ml-auto text-gray-400">
              {beacons.length} balizas en el período
            </span>
          </div>
        </div>
      )}

      <style jsx global>{`
        .maplibregl-popup-content {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
}
