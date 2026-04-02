"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Fuel } from "lucide-react";

interface MaritimeStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  port: string | null;
  priceGasoleoA: number | null;
  priceGasolina95E5: number | null;
  is24h: boolean;
}

export default function MaritimeMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [stations, setStations] = useState<MaritimeStation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      // ESRI Ocean basemap — nautical bathymetry, ports, depth contours
      style: {
        version: 8,
        sources: {
          "esri-ocean": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "© Esri, GEBCO, NOAA, National Geographic",
          },
          "esri-ocean-ref": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
          },
        },
        layers: [
          { id: "ocean-base", type: "raster", source: "esri-ocean" },
          { id: "ocean-labels", type: "raster", source: "esri-ocean-ref" },
        ],
      },
      center: [-3.7, 39.5],
      zoom: 6,
      attributionControl: false,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      maxTileCacheSize: 100,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    mapRef.current = map;

    map.on("load", () => {
      // Maritime station source (clustered)
      map.addSource("maritime-stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "maritime-clusters",
        type: "circle",
        source: "maritime-stations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#2d9cdb",
          "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 20, 28],
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      map.addLayer({
        id: "maritime-cluster-count",
        type: "symbol",
        source: "maritime-stations",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 11,
        },
        paint: { "text-color": "#fff" },
      });

      map.addLayer({
        id: "maritime-points",
        type: "circle",
        source: "maritime-stations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#2d9cdb",
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      // Click unclustered → popup
      map.on("click", "maritime-points", (e) => {
        if (!e.features?.length) return;
        const props = e.features[0].properties || {};
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const fmt = (p: unknown) => p ? `${Number(p).toFixed(3)}€` : "N/D";

        new maplibregl.Popup({ offset: 15, maxWidth: "280px" })
          .setLngLat(coords)
          .setHTML(`
            <div class="p-3 min-w-[200px]">
              <div class="flex items-center gap-2 mb-2">
                <span class="w-3 h-3 rounded-full" style="background:#2d9cdb"></span>
                <span class="font-bold text-sm">${props.name}</span>
                ${Number(props.is24h) ? '<span class="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">24h</span>' : ""}
              </div>
              ${props.port ? `<p class="text-sm text-blue-600 mb-2">Puerto: ${props.port}</p>` : ""}
              <div class="grid grid-cols-2 gap-2">
                ${props.priceGasoleoA ? `<div class="bg-amber-50 p-1.5 rounded"><div class="text-[10px] text-amber-600">Gasóleo A</div><div class="font-bold text-amber-700 text-sm">${fmt(props.priceGasoleoA)}</div></div>` : ""}
                ${props.priceGasolina95E5 ? `<div class="bg-blue-50 p-1.5 rounded"><div class="text-[10px] text-blue-600">Gasolina 95</div><div class="font-bold text-blue-700 text-sm">${fmt(props.priceGasolina95E5)}</div></div>` : ""}
              </div>
            </div>
          `)
          .addTo(map);
      });

      // Click cluster → zoom
      map.on("click", "maritime-clusters", async (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["maritime-clusters"] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        if (clusterId === undefined) return;
        const source = map.getSource("maritime-stations") as maplibregl.GeoJSONSource;
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          const geom = features[0].geometry;
          if (geom.type === "Point") {
            map.easeTo({ center: geom.coordinates as [number, number], zoom });
          }
        } catch { /* ignore */ }
      });

      // Cursor
      map.on("mouseenter", "maritime-points", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "maritime-points", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "maritime-clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "maritime-clusters", () => { map.getCanvas().style.cursor = ""; });

      setIsLoaded(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fetch maritime stations
  useEffect(() => {
    fetch("/api/maritime-stations?limit=200")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) setStations(data.data);
      })
      .catch(() => {});
  }, []);

  // Update station data on map
  useEffect(() => {
    if (!mapRef.current || !isLoaded || stations.length === 0) return;
    const source = mapRef.current.getSource("maritime-stations") as maplibregl.GeoJSONSource;
    if (!source) return;

    source.setData({
      type: "FeatureCollection",
      features: stations.map((s) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [s.longitude, s.latitude] },
        properties: {
          id: s.id,
          name: s.name,
          port: s.port || "",
          priceGasoleoA: s.priceGasoleoA,
          priceGasolina95E5: s.priceGasolina95E5,
          is24h: s.is24h ? 1 : 0,
        },
      })),
    } as GeoJSON.FeatureCollection);
  }, [stations, isLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Station count */}
      {stations.length > 0 && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow border border-gray-200 dark:border-gray-700 text-xs">
          <Fuel className="w-3.5 h-3.5 text-tl-sea-500" />
          <span className="font-mono font-medium">{stations.length}</span>
          <span className="text-gray-500">estaciones marítimas</span>
        </div>
      )}
    </div>
  );
}
