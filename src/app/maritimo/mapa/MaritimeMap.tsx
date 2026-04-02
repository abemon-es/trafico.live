"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Fuel, Waves, Wind, Anchor, ShieldAlert, CloudRain, RefreshCw } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

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

interface WavePoint {
  lat: number;
  lng: number;
  waveHeight: number;
  waveDirection: number;
  wavePeriod: number;
  swellHeight: number;
  swellDirection: number;
  currentVelocity: number;
  currentDirection: number;
}

// ─── Grid of points around Spain's coast for wave data ──────────────────────

const COAST_GRID = [
  // Atlantic NW (Galicia)
  { lat: 43.4, lng: -8.4 }, { lat: 43.0, lng: -9.3 }, { lat: 42.4, lng: -8.9 },
  // Cantabrian Sea
  { lat: 43.6, lng: -7.0 }, { lat: 43.5, lng: -5.6 }, { lat: 43.5, lng: -3.8 }, { lat: 43.4, lng: -2.0 },
  // Bay of Biscay
  { lat: 43.4, lng: -1.0 },
  // Mediterranean NE (Catalonia)
  { lat: 42.3, lng: 3.2 }, { lat: 41.4, lng: 2.2 }, { lat: 41.0, lng: 1.0 },
  // Mediterranean E (Valencia)
  { lat: 40.0, lng: 0.5 }, { lat: 39.5, lng: 0.3 }, { lat: 38.5, lng: 0.0 },
  // Mediterranean SE (Murcia/Almería)
  { lat: 37.6, lng: -0.7 }, { lat: 36.8, lng: -2.0 },
  // Strait of Gibraltar
  { lat: 36.1, lng: -5.4 }, { lat: 36.0, lng: -4.4 },
  // Atlantic SW (Cádiz/Huelva)
  { lat: 36.6, lng: -6.4 }, { lat: 37.0, lng: -7.0 },
  // Balearic Islands
  { lat: 39.6, lng: 2.6 }, { lat: 39.9, lng: 4.0 }, { lat: 38.9, lng: 1.4 },
  // Canary Islands
  { lat: 28.5, lng: -16.2 }, { lat: 28.1, lng: -15.4 }, { lat: 27.8, lng: -17.9 }, { lat: 29.0, lng: -13.5 },
];

// ─── Wave severity colors ───────────────────────────────────────────────────

function getWaveColor(height: number): string {
  if (height < 0.5) return "#22c55e";  // calm — green
  if (height < 1.0) return "#84cc16";  // slight
  if (height < 1.5) return "#eab308";  // moderate — yellow
  if (height < 2.5) return "#f97316";  // rough — orange
  if (height < 4.0) return "#ef4444";  // very rough — red
  return "#7f1d1d";                     // high/phenomenal — dark red
}

function getWaveLabel(height: number): string {
  if (height < 0.5) return "Calma";
  if (height < 1.0) return "Marejadilla";
  if (height < 1.5) return "Marejada";
  if (height < 2.5) return "Fuerte marejada";
  if (height < 4.0) return "Mar gruesa";
  return "Mar muy gruesa";
}

function directionArrow(deg: number): string {
  const arrows = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"];
  return arrows[Math.round(deg / 45) % 8];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function MaritimeMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [stations, setStations] = useState<MaritimeStation[]>([]);
  const [waveData, setWaveData] = useState<WavePoint[]>([]);
  const [waveLoading, setWaveLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Layer visibility
  const [layers, setLayers] = useState({
    waves: true,
    fuel: true,
    emergencies: true,
    weather: true,
  });

  const toggleLayer = useCallback((key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ─── Initialize map ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "esri-ocean": {
            type: "raster",
            tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"],
            tileSize: 256,
            attribution: "Esri, GEBCO, NOAA",
          },
          "esri-ocean-ref": {
            type: "raster",
            tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}"],
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
      // ── Wave data source ──
      map.addSource("wave-points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Wave circles (size + color = wave height)
      map.addLayer({
        id: "wave-circles",
        type: "circle",
        source: "wave-points",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "waveHeight"], 0, 8, 1, 14, 2, 20, 4, 28, 6, 36],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.6,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.8,
        },
      });

      // Wave height labels
      map.addLayer({
        id: "wave-labels",
        type: "symbol",
        source: "wave-points",
        layout: {
          "text-field": ["concat", ["to-string", ["get", "waveHeightDisplay"]], "m"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 11,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": ["get", "color"],
          "text-halo-width": 2,
        },
      });

      // ── Maritime fuel stations ──
      map.addSource("maritime-fuel", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "fuel-clusters",
        type: "circle",
        source: "maritime-fuel",
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
        id: "fuel-cluster-count",
        type: "symbol",
        source: "maritime-fuel",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 11,
        },
        paint: { "text-color": "#fff" },
      });

      map.addLayer({
        id: "fuel-points",
        type: "circle",
        source: "maritime-fuel",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#2d9cdb",
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      // Fuel popup
      map.on("click", "fuel-points", (e) => {
        if (!e.features?.length) return;
        const p = e.features[0].properties || {};
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const fmt = (v: unknown) => v ? `${Number(v).toFixed(3)}€` : "N/D";
        new maplibregl.Popup({ offset: 15, maxWidth: "260px" })
          .setLngLat(coords)
          .setHTML(`
            <div class="p-3">
              <p class="font-bold text-sm mb-1">${p.name}</p>
              ${p.port ? `<p class="text-xs text-blue-600 mb-2">Puerto: ${p.port}</p>` : ""}
              <div class="grid grid-cols-2 gap-2">
                ${p.priceGasoleoA ? `<div class="bg-amber-50 p-1.5 rounded"><div class="text-[10px] text-amber-600">Gasóleo A</div><div class="font-bold text-amber-700 text-sm">${fmt(p.priceGasoleoA)}</div></div>` : ""}
                ${p.priceGasolina95E5 ? `<div class="bg-blue-50 p-1.5 rounded"><div class="text-[10px] text-blue-600">Gasolina 95</div><div class="font-bold text-blue-700 text-sm">${fmt(p.priceGasolina95E5)}</div></div>` : ""}
              </div>
            </div>
          `)
          .addTo(map);
      });

      // Wave popup
      map.on("click", "wave-circles", (e) => {
        if (!e.features?.length) return;
        const p = e.features[0].properties || {};
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        new maplibregl.Popup({ offset: 15, maxWidth: "280px" })
          .setLngLat(coords)
          .setHTML(`
            <div class="p-3 min-w-[220px]">
              <div class="flex items-center gap-2 mb-2">
                <span class="w-3 h-3 rounded-full" style="background:${p.color}"></span>
                <span class="font-bold text-sm">${p.label}</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="bg-blue-50 p-2 rounded">
                  <div class="text-blue-500 mb-0.5">Oleaje</div>
                  <div class="font-bold text-blue-800 text-base">${p.waveHeightDisplay}m</div>
                  <div class="text-blue-400">${p.waveArrow} ${p.wavePeriod}s</div>
                </div>
                <div class="bg-cyan-50 p-2 rounded">
                  <div class="text-cyan-500 mb-0.5">Mar de fondo</div>
                  <div class="font-bold text-cyan-800 text-base">${p.swellDisplay}m</div>
                  <div class="text-cyan-400">${p.swellArrow}</div>
                </div>
                <div class="bg-teal-50 p-2 rounded col-span-2">
                  <div class="text-teal-500 mb-0.5">Corriente</div>
                  <div class="font-bold text-teal-800">${p.currentDisplay} km/h ${p.currentArrow}</div>
                </div>
              </div>
            </div>
          `)
          .addTo(map);
      });

      // Fuel cluster zoom
      map.on("click", "fuel-clusters", async (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["fuel-clusters"] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        if (clusterId === undefined) return;
        const source = map.getSource("maritime-fuel") as maplibregl.GeoJSONSource;
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          const geom = features[0].geometry;
          if (geom.type === "Point") map.easeTo({ center: geom.coordinates as [number, number], zoom });
        } catch { /* ignore */ }
      });

      // Cursors
      for (const layer of ["wave-circles", "fuel-points", "fuel-clusters"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }

      setIsLoaded(true);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ─── Fetch wave data from Open-Meteo ────────────────────────────────────

  const fetchWaveData = useCallback(async () => {
    setWaveLoading(true);
    try {
      const lats = COAST_GRID.map((p) => p.lat).join(",");
      const lngs = COAST_GRID.map((p) => p.lng).join(",");
      const res = await fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lngs}&current=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,ocean_current_velocity,ocean_current_direction`
      );
      const data = await res.json();

      // Open-Meteo returns array when multiple coords
      const items: WavePoint[] = [];
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const d = data[i];
          if (!d.current) continue;
          items.push({
            lat: d.latitude,
            lng: d.longitude,
            waveHeight: d.current.wave_height ?? 0,
            waveDirection: d.current.wave_direction ?? 0,
            wavePeriod: d.current.wave_period ?? 0,
            swellHeight: d.current.swell_wave_height ?? 0,
            swellDirection: d.current.swell_wave_direction ?? 0,
            currentVelocity: d.current.ocean_current_velocity ?? 0,
            currentDirection: d.current.ocean_current_direction ?? 0,
          });
        }
      } else if (data.current) {
        // Single point response
        items.push({
          lat: data.latitude,
          lng: data.longitude,
          waveHeight: data.current.wave_height ?? 0,
          waveDirection: data.current.wave_direction ?? 0,
          wavePeriod: data.current.wave_period ?? 0,
          swellHeight: data.current.swell_wave_height ?? 0,
          swellDirection: data.current.swell_wave_direction ?? 0,
          currentVelocity: data.current.ocean_current_velocity ?? 0,
          currentDirection: data.current.ocean_current_direction ?? 0,
        });
      }
      setWaveData(items);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Wave data fetch failed:", err);
    } finally {
      setWaveLoading(false);
    }
  }, []);

  useEffect(() => { fetchWaveData(); }, [fetchWaveData]);

  // ─── Update wave layer ──────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const source = mapRef.current.getSource("wave-points") as maplibregl.GeoJSONSource;
    if (!source) return;

    const vis = layers.waves ? "visible" : "none";
    if (mapRef.current.getLayer("wave-circles")) mapRef.current.setLayoutProperty("wave-circles", "visibility", vis);
    if (mapRef.current.getLayer("wave-labels")) mapRef.current.setLayoutProperty("wave-labels", "visibility", vis);

    if (layers.waves && waveData.length > 0) {
      source.setData({
        type: "FeatureCollection",
        features: waveData.map((w) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [w.lng, w.lat] },
          properties: {
            waveHeight: w.waveHeight,
            waveHeightDisplay: w.waveHeight.toFixed(1),
            color: getWaveColor(w.waveHeight),
            label: getWaveLabel(w.waveHeight),
            waveArrow: directionArrow(w.waveDirection),
            wavePeriod: w.wavePeriod.toFixed(1),
            swellDisplay: w.swellHeight.toFixed(1),
            swellArrow: directionArrow(w.swellDirection),
            currentDisplay: w.currentVelocity.toFixed(1),
            currentArrow: directionArrow(w.currentDirection),
          },
        })),
      } as GeoJSON.FeatureCollection);
    }
  }, [waveData, layers.waves, isLoaded]);

  // ─── Update fuel station layer ──────────────────────────────────────────

  useEffect(() => {
    fetch("/api/maritime-stations?limit=200")
      .then((r) => r.json())
      .then((data) => { if (data.success && data.data) setStations(data.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const source = mapRef.current.getSource("maritime-fuel") as maplibregl.GeoJSONSource;
    if (!source) return;

    const vis = layers.fuel ? "visible" : "none";
    for (const id of ["fuel-clusters", "fuel-cluster-count", "fuel-points"]) {
      if (mapRef.current.getLayer(id)) mapRef.current.setLayoutProperty(id, "visibility", vis);
    }

    if (layers.fuel && stations.length > 0) {
      source.setData({
        type: "FeatureCollection",
        features: stations.map((s) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [s.longitude, s.latitude] },
          properties: { id: s.id, name: s.name, port: s.port || "", priceGasoleoA: s.priceGasoleoA, priceGasolina95E5: s.priceGasolina95E5, is24h: s.is24h ? 1 : 0 },
        })),
      } as GeoJSON.FeatureCollection);
    }
  }, [stations, layers.fuel, isLoaded]);

  // ─── Layer toggle button ────────────────────────────────────────────────

  const LayerBtn = ({ layerKey, icon, label, count }: { layerKey: keyof typeof layers; icon: React.ReactNode; label: string; count?: number }) => {
    const active = layers[layerKey];
    return (
      <button
        onClick={() => toggleLayer(layerKey)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          active
            ? "bg-white/90 dark:bg-gray-800/90 text-tl-sea-700 dark:text-tl-sea-300 shadow-sm"
            : "bg-black/20 text-white/70 hover:bg-black/30"
        }`}
      >
        {icon}
        <span>{label}</span>
        {count != null && count > 0 && (
          <span className="font-mono text-[10px] opacity-70">{count}</span>
        )}
      </button>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Layer controls — top left */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          <LayerBtn layerKey="waves" icon={<Waves className="w-3.5 h-3.5" />} label="Oleaje" count={waveData.length} />
          <LayerBtn layerKey="fuel" icon={<Fuel className="w-3.5 h-3.5" />} label="Combustible" count={stations.length} />
        </div>
      </div>

      {/* Wave legend — bottom left */}
      {layers.waves && waveData.length > 0 && (
        <div className="absolute bottom-3 left-3 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-[10px] font-mono font-medium text-gray-400 uppercase tracking-wider mb-2">Estado del mar</p>
          <div className="flex flex-col gap-1">
            {[
              { h: 0.3, label: "Calma" },
              { h: 0.7, label: "Marejadilla" },
              { h: 1.2, label: "Marejada" },
              { h: 2.0, label: "F. marejada" },
              { h: 3.0, label: "Mar gruesa" },
              { h: 5.0, label: "Muy gruesa" },
            ].map(({ h, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getWaveColor(h) }} />
                <span className="text-[11px] text-gray-600 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>
          {lastUpdated && (
            <p className="text-[10px] text-gray-400 mt-2 font-mono">
              {lastUpdated.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} · Open-Meteo
            </p>
          )}
        </div>
      )}

      {/* Refresh button — top right (below nav controls) */}
      <button
        onClick={fetchWaveData}
        disabled={waveLoading}
        className="absolute top-3 right-14 z-10 p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-tl-sea-600 transition-colors disabled:opacity-50"
        title="Actualizar datos"
      >
        <RefreshCw className={`w-4 h-4 ${waveLoading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
