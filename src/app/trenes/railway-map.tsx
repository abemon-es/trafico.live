"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface TrainFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    trainId: string;
    productType: string;
    productCode: number;
    origin: string;
    destination: string;
    nextStation: string;
    nextArrival: string;
    delay: number;
    delayCategory: string;
    accessible: boolean;
    material: string;
  };
}

interface RailwayMapProps {
  stationsGeoJSON: GeoJSON.FeatureCollection | null;
  routesGeoJSON: GeoJSON.FeatureCollection | null;
  alertRouteIds: Set<string>;
  trainsGeoJSON: GeoJSON.FeatureCollection | null;
  onStationClick: (props: Record<string, unknown>) => void;
  onTrainClick: (props: Record<string, unknown>) => void;
}

const SPAIN_CENTER: [number, number] = [-3.7, 40.4];

export default function RailwayMap({
  stationsGeoJSON,
  routesGeoJSON,
  alertRouteIds,
  trainsGeoJSON,
  onStationClick,
  onTrainClick,
}: RailwayMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: SPAIN_CENTER,
      zoom: 6,
      minZoom: 4,
      maxZoom: 16,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

      // Sources
      map.addSource("routes", { type: "geojson", data: empty });
      map.addSource("alert-routes", { type: "geojson", data: empty });
      map.addSource("stations", { type: "geojson", data: empty });
      map.addSource("trains", { type: "geojson", data: empty });

      // --- Route lines ---
      map.addLayer({
        id: "routes-line",
        type: "line",
        source: "routes",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#4a5568"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1, 10, 2.5, 14, 4],
          "line-opacity": 0.6,
        },
      });

      // Alert route highlight (dashed red on top)
      map.addLayer({
        id: "alert-routes-line",
        type: "line",
        source: "alert-routes",
        paint: {
          "line-color": "#ef4444",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 4, 14, 7],
          "line-opacity": 0.85,
          "line-dasharray": [2, 1],
        },
      });

      // --- Station circles ---
      map.addLayer({
        id: "stations-circle",
        type: "circle",
        source: "stations",
        paint: {
          "circle-color": ["coalesce", ["get", "color"], "#94b6ff"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2, 8, 3.5, 12, 6, 14, 9],
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.7)",
          "circle-opacity": 0.85,
        },
      });

      // Station labels at high zoom
      map.addLayer({
        id: "stations-label",
        type: "symbol",
        source: "stations",
        minzoom: 11,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#d1d5db",
          "text-halo-color": "#1f2937",
          "text-halo-width": 1.5,
        },
      });

      // --- Live train markers ---
      map.addLayer({
        id: "trains-circle",
        type: "circle",
        source: "trains",
        paint: {
          "circle-color": [
            "match", ["get", "delayCategory"],
            "on-time", "#22c55e",
            "slight", "#eab308",
            "moderate", "#f97316",
            "severe", "#ef4444",
            "#22c55e",
          ],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 8, 6, 12, 10, 14, 14],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.95,
        },
      });

      // Train labels
      map.addLayer({
        id: "trains-label",
        type: "symbol",
        source: "trains",
        minzoom: 8,
        layout: {
          "text-field": ["get", "trainId"],
          "text-size": 10,
          "text-offset": [0, -1.6],
          "text-anchor": "bottom",
          "text-font": ["Open Sans Bold"],
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1,
        },
      });

      // --- Interactions ---
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

      // Station hover
      map.on("mouseenter", "stations-circle", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        const p = f.properties;
        popup.setLngLat(f.geometry.coordinates as [number, number]).setHTML(
          `<div style="font-family:system-ui;font-size:13px;line-height:1.4;color:#111">
            <strong>${p?.name || ""}</strong><br/>
            <span style="color:#666">${p?.provinceName || ""}</span>
          </div>`
        ).addTo(map);
      });
      map.on("mouseleave", "stations-circle", () => { map.getCanvas().style.cursor = ""; popup.remove(); });
      map.on("click", "stations-circle", (e) => {
        const p = e.features?.[0]?.properties;
        if (p) onStationClick(p);
      });

      // Train hover
      map.on("mouseenter", "trains-circle", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        const p = f.properties;
        const delay = Number(p?.delay || 0);
        const delayStr = delay <= 0 ? "Puntual" : `+${delay} min`;
        const delayColor = delay <= 0 ? "#22c55e" : delay <= 5 ? "#eab308" : "#ef4444";
        popup.setLngLat(f.geometry.coordinates as [number, number]).setHTML(
          `<div style="font-family:system-ui;font-size:13px;line-height:1.5;color:#111">
            <strong>${p?.productType} ${p?.trainId}</strong><br/>
            <span style="color:${delayColor};font-weight:600">${delayStr}</span><br/>
            <span style="color:#666;font-size:11px">Próxima parada: ${p?.nextStation || "?"}</span>
          </div>`
        ).addTo(map);
      });
      map.on("mouseleave", "trains-circle", () => { map.getCanvas().style.cursor = ""; popup.remove(); });
      map.on("click", "trains-circle", (e) => {
        const p = e.features?.[0]?.properties;
        if (p) onTrainClick(p);
      });

      readyRef.current = true;
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; readyRef.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update stations source
  useEffect(() => {
    if (!readyRef.current || !mapRef.current || !stationsGeoJSON) return;
    const src = mapRef.current.getSource("stations") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(stationsGeoJSON);
  }, [stationsGeoJSON]);

  // Update route lines source
  useEffect(() => {
    if (!readyRef.current || !mapRef.current || !routesGeoJSON) return;

    const normalFeatures: GeoJSON.Feature[] = [];
    const alertFeatures: GeoJSON.Feature[] = [];

    for (const f of routesGeoJSON.features) {
      if (alertRouteIds.has(f.properties?.routeId)) {
        alertFeatures.push(f);
      } else {
        normalFeatures.push(f);
      }
    }

    const routeSrc = mapRef.current.getSource("routes") as maplibregl.GeoJSONSource | undefined;
    const alertSrc = mapRef.current.getSource("alert-routes") as maplibregl.GeoJSONSource | undefined;
    if (routeSrc) routeSrc.setData({ type: "FeatureCollection", features: normalFeatures });
    if (alertSrc) alertSrc.setData({ type: "FeatureCollection", features: alertFeatures });
  }, [routesGeoJSON, alertRouteIds]);

  // Update live trains source
  useEffect(() => {
    if (!readyRef.current || !mapRef.current || !trainsGeoJSON) return;
    const src = mapRef.current.getSource("trains") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(trainsGeoJSON);
  }, [trainsGeoJSON]);

  return (
    <div ref={containerRef} className="w-full h-[600px]" style={{ minHeight: 450 }} />
  );
}
