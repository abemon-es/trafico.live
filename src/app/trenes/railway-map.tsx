"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE_DEFAULT, forceSpanishLabels } from "@/lib/map-config";

interface RailwayMapProps {
  stationsGeoJSON: GeoJSON.FeatureCollection | null;
  cercaniaLines: GeoJSON.FeatureCollection | null;
  trainRoutes: GeoJSON.FeatureCollection | null;
  trainPoints: GeoJSON.FeatureCollection | null;
  onTrainClick: (props: Record<string, unknown>) => void;
  onStationClick: (props: Record<string, unknown>) => void;
}

const SPAIN_CENTER: [number, number] = [-3.7, 40.4];

// Train SVG icon as data URL — simple top-down train shape
const TRAIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
  <circle cx="14" cy="14" r="13" fill="COLOR" stroke="#fff" stroke-width="2"/>
  <path d="M10 8h8a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-8a2 2 0 012-2z" fill="#fff" opacity="0.9"/>
  <rect x="11" y="9" width="6" height="4" rx="1" fill="COLOR"/>
  <circle cx="11.5" cy="18" r="1" fill="COLOR"/>
  <circle cx="16.5" cy="18" r="1" fill="COLOR"/>
</svg>`;

function createTrainImage(color: string): string {
  const svg = TRAIN_SVG.replace(/COLOR/g, color);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function RailwayMap({
  stationsGeoJSON,
  cercaniaLines,
  trainRoutes,
  trainPoints,
  onTrainClick,
  onStationClick,
}: RailwayMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_DEFAULT,
      center: SPAIN_CENTER,
      zoom: 6,
      minZoom: 4,
      maxZoom: 17,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      forceSpanishLabels(map);
      const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

      // Load train icon images for each delay category
      const icons: [string, string][] = [
        ["train-on-time", "#059669"],
        ["train-slight", "#ca8a04"],
        ["train-moderate", "#ea580c"],
        ["train-severe", "#dc2626"],
      ];

      let loaded = 0;
      for (const [id, color] of icons) {
        const img = new Image(28, 28);
        img.onload = () => {
          if (!map.hasImage(id)) map.addImage(id, img);
          loaded++;
          if (loaded === icons.length) setupLayers();
        };
        img.src = createTrainImage(color);
      }

      function setupLayers() {
        // --- Sources ---
        map.addSource("cercania-lines", { type: "geojson", data: empty });
        map.addSource("train-routes", { type: "geojson", data: empty });
        map.addSource("stations", { type: "geojson", data: empty });
        map.addSource("trains", { type: "geojson", data: empty });

        // --- Cercanías lines (static, from GTFS shapes) ---
        map.addLayer({
          id: "cercania-lines-layer",
          type: "line",
          source: "cercania-lines",
          paint: {
            "line-color": ["coalesce", ["get", "color"], "#059669"],
            "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 10, 2, 14, 3.5],
            "line-opacity": 0.5,
          },
        });

        // --- Live train route polylines ---
        map.addLayer({
          id: "train-routes-layer",
          type: "line",
          source: "train-routes",
          paint: {
            "line-color": [
              "match", ["get", "brand"],
              "AVE", "#dc2626",
              "Alvia", "#d48139",
              "Avant", "#7c3aed",
              "Euromed", "#0891b2",
              "Talgo", "#be185d",
              "MD", "#366cf8",
              "Intercity", "#4b5563",
              "#6b7280",
            ],
            "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.5, 10, 3, 14, 5],
            "line-opacity": 0.4,
            "line-dasharray": [4, 2],
          },
        });

        // --- Station circles (small, along the lines) ---
        map.addLayer({
          id: "stations-circle",
          type: "circle",
          source: "stations",
          paint: {
            "circle-color": ["coalesce", ["get", "color"], "#94b6ff"],
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 1.5, 8, 2.5, 12, 5, 14, 7],
            "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 5, 0.5, 10, 1],
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.8,
          },
        });

        // Station labels
        map.addLayer({
          id: "stations-label",
          type: "symbol",
          source: "stations",
          minzoom: 10,
          layout: {
            "text-field": ["get", "name"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 14, 12],
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "text-max-width": 8,
          },
          paint: {
            "text-color": "#374151",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.5,
          },
        });

        // --- Train icons (symbol layer with custom images) ---
        map.addLayer({
          id: "trains-icon",
          type: "symbol",
          source: "trains",
          layout: {
            "icon-image": [
              "match", ["get", "delayCategory"],
              "on-time", "train-on-time",
              "slight", "train-slight",
              "moderate", "train-moderate",
              "severe", "train-severe",
              "train-on-time",
            ],
            "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.6, 8, 0.8, 12, 1.1, 14, 1.3],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "text-field": ["step", ["zoom"], "", 8, ["get", "brand"]],
            "text-size": 10,
            "text-offset": [0, 1.8],
            "text-anchor": "top",
            "text-font": ["Open Sans Bold"],
          },
          paint: {
            "text-color": "#374151",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1,
          },
        });

        // --- Interactions ---
        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 16, maxWidth: "280px" });

        for (const layer of ["trains-icon", "stations-circle"]) {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; popup.remove(); });
        }

        // Train hover
        map.on("mouseenter", "trains-icon", (e) => {
          const f = e.features?.[0];
          if (!f || f.geometry.type !== "Point") return;
          const p = f.properties || {};
          const delay = Number(p.delay || 0);
          const delayStr = delay <= 0 ? "✓ Puntual" : `⏱ +${delay} min retraso`;
          const delayColor = delay <= 0 ? "#059669" : delay <= 5 ? "#ca8a04" : "#dc2626";

          popup.setLngLat(f.geometry.coordinates as [number, number]).setHTML(
            `<div style="font-family:'DM Sans',system-ui;font-size:13px;line-height:1.5">
              <div style="font-weight:700;font-size:14px">${p.brand || ""} ${p.trainId || ""}</div>
              <div style="color:${delayColor};font-weight:600">${delayStr}</div>
              <div style="color:#6b7280;font-size:11px;margin-top:2px">
                ${p.origin || "?"} → ${p.destination || "?"}<br/>
                Próx: ${p.nextStation || "?"} ${p.nextArrival ? "· " + String(p.nextArrival).slice(11, 16) : ""}
              </div>
            </div>`
          ).addTo(map);
        });

        // Station hover
        map.on("mouseenter", "stations-circle", (e) => {
          const f = e.features?.[0];
          if (!f || f.geometry.type !== "Point") return;
          const p = f.properties || {};
          popup.setLngLat(f.geometry.coordinates as [number, number]).setHTML(
            `<div style="font-family:'DM Sans',system-ui;font-size:13px">
              <strong>${p.name || ""}</strong><br/>
              <span style="color:#6b7280">${p.provinceName || ""}</span>
            </div>`
          ).addTo(map);
        });

        // Click handlers
        map.on("click", "trains-icon", (e) => {
          const p = e.features?.[0]?.properties;
          if (p) onTrainClick(p);
        });
        map.on("click", "stations-circle", (e) => {
          const p = e.features?.[0]?.properties;
          if (p) onStationClick(p);
        });

        readyRef.current = true;
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; readyRef.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Data update helpers
  const updateSource = useCallback((name: string, data: GeoJSON.FeatureCollection | null) => {
    if (!readyRef.current || !mapRef.current || !data) return;
    const src = mapRef.current.getSource(name) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data);
  }, []);

  useEffect(() => { updateSource("stations", stationsGeoJSON); }, [stationsGeoJSON, updateSource]);
  useEffect(() => { updateSource("cercania-lines", cercaniaLines); }, [cercaniaLines, updateSource]);
  useEffect(() => { updateSource("train-routes", trainRoutes); }, [trainRoutes, updateSource]);
  useEffect(() => { updateSource("trains", trainPoints); }, [trainPoints, updateSource]);

  return (
    <div ref={containerRef} className="w-full h-[650px]" style={{ minHeight: 500 }} />
  );
}
