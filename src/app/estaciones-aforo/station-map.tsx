"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE_DEFAULT, forceSpanishLabels } from "@/lib/map-config";

interface Station {
  id: string;
  stationCode: string;
  province: string | null;
  provinceName: string | null;
  roadNumber: string;
  roadType: string | null;
  kmPoint: number;
  stationType: string | null;
  population: string | null;
  latitude: number;
  longitude: number;
  year: number;
  imd: number | null;
  imdLigeros: number | null;
  imdPesados: number | null;
  percentPesados: number | null;
}

interface StationMapProps {
  stations: Station[];
  geojson?: GeoJSON.FeatureCollection | null;
  onStationClick: (station: Station) => void;
  selectedStation: Station | null;
}

const SPAIN_CENTER: [number, number] = [-3.7, 40.4];
const INITIAL_ZOOM = 6;

function getCircleColor(): maplibregl.ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "imd"], 0],
    0, "#94b6ff",       // tl-300 — no data / very low
    5000, "#366cf8",    // tl-500
    10000, "#059669",   // green
    20000, "#d97706",   // yellow/amber
    50000, "#ea580c",   // orange
    100000, "#dc2626",  // red
  ];
}

function getCircleRadius(): maplibregl.ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    5, ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 3, 100000, 8],
    10, ["interpolate", ["linear"], ["coalesce", ["get", "imd"], 0], 0, 5, 100000, 14],
  ];
}

function stationsToGeoJSON(stations: Station[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stations.map((s) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [s.longitude, s.latitude],
      },
      properties: {
        id: s.id,
        stationCode: s.stationCode,
        roadNumber: s.roadNumber,
        kmPoint: s.kmPoint,
        provinceName: s.provinceName || "",
        population: s.population || "",
        imd: s.imd,
        imdLigeros: s.imdLigeros,
        imdPesados: s.imdPesados,
        percentPesados: s.percentPesados,
        stationType: s.stationType || "",
      },
    })),
  };
}

export default function StationMap({
  stations,
  geojson,
  onStationClick,
  selectedStation,
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const stationsLookup = useRef<Map<string, Station>>(new Map());

  // Build lookup
  useEffect(() => {
    const lookup = new Map<string, Station>();
    stations.forEach((s) => lookup.set(s.id, s));
    stationsLookup.current = lookup;
  }, [stations]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_DEFAULT,
      center: SPAIN_CENTER,
      zoom: INITIAL_ZOOM,
      minZoom: 4,
      maxZoom: 16,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.on("load", () => {
      forceSpanishLabels(map);
      // Empty source — updated when stations prop changes
      map.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "stations-circle",
        type: "circle",
        source: "stations",
        paint: {
          "circle-color": getCircleColor(),
          "circle-radius": getCircleRadius(),
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.85,
        },
      });

      // Hover cursor
      map.on("mouseenter", "stations-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "stations-circle", () => {
        map.getCanvas().style.cursor = "";
      });

      // Click handler
      map.on("click", "stations-circle", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const stationId = feature.properties?.id;
        const station = stationsLookup.current.get(stationId);
        if (station) {
          onStationClick(station);
        }
      });

      // Popup on hover
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
      });

      map.on("mouseenter", "stations-circle", (e) => {
        const feature = e.features?.[0];
        if (!feature || !feature.geometry || feature.geometry.type !== "Point") return;
        const props = feature.properties;
        const coords = feature.geometry.coordinates as [number, number];

        const imd = props?.imd;
        const imdStr = imd ? Number(imd).toLocaleString("es-ES") : "Sin datos";

        popup
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:system-ui;font-size:13px;line-height:1.4">
              <strong>${props?.roadNumber || ""}</strong> km ${Number(props?.kmPoint || 0).toFixed(1)}<br/>
              <span style="color:#666">${props?.provinceName || ""}</span><br/>
              IMD: <strong>${imdStr}</strong> veh/día
            </div>`
          )
          .addTo(map);
      });

      map.on("mouseleave", "stations-circle", () => {
        popup.remove();
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update source data — prefer pre-built GeoJSON from API, fallback to conversion
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateSource = () => {
      const source = map.getSource("stations") as maplibregl.GeoJSONSource | undefined;
      if (source) {
        const data = geojson?.type === "FeatureCollection" ? geojson : stationsToGeoJSON(stations);
        source.setData(data);
      }
    };

    if (map.loaded()) {
      updateSource();
    } else {
      map.on("load", updateSource);
    }
  }, [stations, geojson]);

  // Fly to selected station
  useEffect(() => {
    if (!selectedStation || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedStation.longitude, selectedStation.latitude],
      zoom: 12,
      duration: 1200,
    });
  }, [selectedStation]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[500px]"
      style={{ minHeight: 400 }}
    />
  );
}
