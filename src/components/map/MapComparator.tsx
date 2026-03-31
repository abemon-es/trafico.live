"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowLeftRight, Clock, X } from "lucide-react";

interface MapComparatorProps {
  currentIncidents: { lat: number; lng: number; effect: string }[];
  historicalIncidents: { lat: number; lng: number; effect: string }[];
  timeLabel: string;
  onClose: () => void;
}

const EFFECT_COLORS: Record<string, string> = {
  ROAD_CLOSED: "#dc2626",
  SLOW_TRAFFIC: "#f97316",
  RESTRICTED: "#eab308",
  DIVERSION: "#3b82f6",
  OTHER_EFFECT: "#6b7280",
};

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const SPAIN_CENTER: [number, number] = [-3.7038, 40.4168];

function incidentsToGeoJSON(incidents: { lat: number; lng: number; effect: string }[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: incidents.map((inc, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [inc.lng, inc.lat] },
      properties: { id: i, color: EFFECT_COLORS[inc.effect] || "#6b7280" },
    })),
  };
}

export function MapComparator({ currentIncidents, historicalIncidents, timeLabel, onClose }: MapComparatorProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftMap = useRef<maplibregl.Map | null>(null);
  const rightMap = useRef<maplibregl.Map | null>(null);
  const [syncing, setSyncing] = useState(true);

  // Initialize both maps
  useEffect(() => {
    if (!leftRef.current || !rightRef.current) return;

    const createMap = (container: HTMLDivElement) =>
      new maplibregl.Map({
        container,
        style: MAP_STYLE,
        center: SPAIN_CENTER,
        zoom: 6,
        attributionControl: false,
      });

    leftMap.current = createMap(leftRef.current);
    rightMap.current = createMap(rightRef.current);

    // Add data after load
    leftMap.current.on("load", () => {
      if (!leftMap.current) return;
      leftMap.current.addSource("incidents", { type: "geojson", data: incidentsToGeoJSON(currentIncidents) });
      leftMap.current.addLayer({
        id: "incidents-circles",
        type: "circle",
        source: "incidents",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 10, 8],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.8,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1,
        },
      });
    });

    rightMap.current.on("load", () => {
      if (!rightMap.current) return;
      rightMap.current.addSource("incidents", { type: "geojson", data: incidentsToGeoJSON(historicalIncidents) });
      rightMap.current.addLayer({
        id: "incidents-circles",
        type: "circle",
        source: "incidents",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 10, 8],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.8,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1,
        },
      });
    });

    // Sync map movements
    function syncMaps(source: maplibregl.Map, target: maplibregl.Map) {
      const onMove = () => {
        if (!syncing) return;
        target.setCenter(source.getCenter());
        target.setZoom(source.getZoom());
        target.setBearing(source.getBearing());
        target.setPitch(source.getPitch());
      };
      source.on("move", onMove);
      return () => source.off("move", onMove);
    }

    const unsync1 = syncMaps(leftMap.current, rightMap.current);
    const unsync2 = syncMaps(rightMap.current, leftMap.current);

    return () => {
      unsync1();
      unsync2();
      leftMap.current?.remove();
      rightMap.current?.remove();
      leftMap.current = null;
      rightMap.current = null;
    };
  }, []);

  // Update data when props change
  useEffect(() => {
    if (leftMap.current?.isStyleLoaded()) {
      const src = leftMap.current.getSource("incidents") as maplibregl.GeoJSONSource;
      if (src) src.setData(incidentsToGeoJSON(currentIncidents) as maplibregl.GeoJSONSourceSpecification["data"]);
    }
  }, [currentIncidents]);

  useEffect(() => {
    if (rightMap.current?.isStyleLoaded()) {
      const src = rightMap.current.getSource("incidents") as maplibregl.GeoJSONSource;
      if (src) src.setData(incidentsToGeoJSON(historicalIncidents) as maplibregl.GeoJSONSourceSpecification["data"]);
    }
  }, [historicalIncidents]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <ArrowLeftRight className="w-4 h-4 text-tl-500" />
          Comparador temporal
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              Ahora: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{currentIncidents.length}</span>
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {timeLabel}: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{historicalIncidents.length}</span>
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Maps container */}
      <div className="flex-1 flex relative">
        {/* Left map (current) */}
        <div className="w-1/2 relative">
          <div ref={leftRef} className="absolute inset-0" />
          <div className="absolute top-2 left-2 px-2 py-1 bg-white dark:bg-gray-900 rounded-lg shadow text-xs font-medium text-gray-700 dark:text-gray-300 z-10 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Ahora
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-300 dark:bg-gray-700 z-10" />

        {/* Right map (historical) */}
        <div className="w-1/2 relative">
          <div ref={rightRef} className="absolute inset-0" />
          <div className="absolute top-2 left-2 px-2 py-1 bg-white dark:bg-gray-900 rounded-lg shadow text-xs font-medium text-gray-700 dark:text-gray-300 z-10 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
