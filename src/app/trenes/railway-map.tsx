"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE_DEFAULT, forceSpanishLabels } from "@/lib/map-config";
import {
  setupPMTilesProtocol,
  addTileSource,
  TILE_SOURCES,
  LAYER_STYLES,
  SOURCE_LAYERS,
} from "@/lib/map-tiles";

interface RailwayMapProps {
  trainRoutes: GeoJSON.FeatureCollection | null;
  onTrainClick: (props: Record<string, unknown>) => void;
  onStationClick: (props: Record<string, unknown>) => void;
}

const SPAIN_CENTER: [number, number] = [-3.7, 40.4];

export default function RailwayMap({
  trainRoutes,
  onTrainClick,
  onStationClick,
}: RailwayMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Register PMTiles protocol before creating the map
    setupPMTilesProtocol();

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

      // --- Tile sources ---
      addTileSource(map, "railwayRoutes", TILE_SOURCES.railwayRoutes);
      addTileSource(map, "railwayStations", TILE_SOURCES.railwayStations);
      addTileSource(map, "fleet", TILE_SOURCES.fleet);

      // --- GeoJSON source for interpolated train route lines (client-generated) ---
      map.addSource("train-routes", { type: "geojson", data: empty });

      // --- Layers (bottom to top) ---

      // Cercanias / railway route lines (PMTiles)
      map.addLayer(LAYER_STYLES.railwayRoutesLine as maplibregl.AddLayerObject);

      // Live train route polylines (GeoJSON — interpolated per session)
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

      // Railway station circles (PMTiles)
      map.addLayer(LAYER_STYLES.railwayStationsCircle as maplibregl.AddLayerObject);

      // Station labels (PMTiles, high zoom)
      map.addLayer({
        id: "railway-stations-label",
        type: "symbol",
        source: "railwayStations",
        "source-layer": SOURCE_LAYERS.railwayStations,
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

      // Fleet circles (Martin dynamic tiles)
      map.addLayer(LAYER_STYLES.fleetCircle as maplibregl.AddLayerObject);

      // Fleet labels (dynamic tiles, medium zoom)
      map.addLayer({
        id: "fleet-label",
        type: "symbol",
        source: "fleet",
        "source-layer": SOURCE_LAYERS.fleet,
        minzoom: 8,
        layout: {
          "text-field": ["get", "brand"],
          "text-size": 10,
          "text-offset": [0, 1.8],
          "text-anchor": "top",
          "text-font": ["Open Sans Bold"],
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#374151",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      });

      // --- Interactions ---
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 16, maxWidth: "280px" });

      for (const layer of ["fleet-circle", "railway-stations-circle"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; popup.remove(); });
      }

      // Fleet hover — properties are flat strings/numbers from vector tiles
      map.on("mouseenter", "fleet-circle", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties || {};
        const delay = Number(p.delay || 0);
        const delayStr = delay <= 0 ? "Puntual" : `+${delay} min retraso`;
        const delayColor = delay <= 0 ? "#059669" : delay <= 5 ? "#ca8a04" : "#dc2626";

        // For vector tile features, coordinates come from the geometry
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        popup.setLngLat(coords).setHTML(
          `<div style="font-family:'DM Sans',system-ui;font-size:13px;line-height:1.5">
            <div style="font-weight:700;font-size:14px">${p.brand || ""} ${p.trainNumber || p.trainId || ""}</div>
            <div style="color:${delayColor};font-weight:600">${delayStr}</div>
            <div style="color:#6b7280;font-size:11px;margin-top:2px">
              ${p.originStation || p.origin || "?"} &rarr; ${p.destStation || p.destination || "?"}
            </div>
          </div>`
        ).addTo(map);
      });

      // Station hover — properties are flat strings/numbers from vector tiles
      map.on("mouseenter", "railway-stations-circle", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties || {};
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        popup.setLngLat(coords).setHTML(
          `<div style="font-family:'DM Sans',system-ui;font-size:13px">
            <strong>${p.name || ""}</strong><br/>
            <span style="color:#6b7280">${p.province || p.provinceName || ""}</span>
          </div>`
        ).addTo(map);
      });

      // Click handlers — normalize tile property names for the detail panel
      map.on("click", "fleet-circle", (e) => {
        const p = e.features?.[0]?.properties;
        if (!p) return;
        // Martin fleet tiles use trainNumber/originStation/destStation/serviceType/rollingStock
        // Detail panel expects trainId/origin/destination/productType/material
        onTrainClick({
          ...p,
          trainId: p.trainNumber ?? p.trainId,
          origin: p.originStation ?? p.origin,
          destination: p.destStation ?? p.destination,
          productType: p.serviceType ?? p.productType,
          material: p.rollingStock ?? p.material,
        });
      });
      map.on("click", "railway-stations-circle", (e) => {
        const p = e.features?.[0]?.properties;
        if (p) onStationClick(p);
      });

      readyRef.current = true;
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; readyRef.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Only trainRoutes uses GeoJSON setData — the rest come from tiles
  const updateSource = useCallback((name: string, data: GeoJSON.FeatureCollection | null) => {
    if (!readyRef.current || !mapRef.current || !data) return;
    const src = mapRef.current.getSource(name) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data);
  }, []);

  useEffect(() => { updateSource("train-routes", trainRoutes); }, [trainRoutes, updateSource]);

  return (
    <div ref={containerRef} className="w-full h-[650px]" style={{ minHeight: 500 }} />
  );
}
