"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Map } from "lucide-react";
import type maplibregl from "maplibre-gl";

// Dynamic import types — maplibre-gl is loaded only on the client
type MapInstance = InstanceType<typeof maplibregl.Map>;

export interface HeroMapProps {
  initialStats: {
    incidentCount: number;
    cameraCount: number;
    radarCount: number;
    chargerCount: number;
    detectorCount: number;
    stationCount: number;
  };
}

// ---------------------------------------------------------------------------
// GeoJSON helpers
// ---------------------------------------------------------------------------

interface LatLngItem {
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
}

function toGeoJSON(items: LatLngItem[]) {
  return {
    type: "FeatureCollection" as const,
    features: items
      .filter((i) => {
        const lat = i.lat ?? i.latitude;
        const lng = i.lng ?? i.longitude;
        return lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng));
      })
      .map((i) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [Number(i.lng ?? i.longitude), Number(i.lat ?? i.latitude)],
        },
        properties: {},
      })),
  };
}

// ---------------------------------------------------------------------------
// Layer reveal config
// ---------------------------------------------------------------------------

const LAYERS = [
  {
    id: "incidents",
    delay: 800,
    color: "#dc2626", // signal-red
    type: "heatmap" as const,
    targetOpacity: 0.7,
    radius: 3,
  },
  {
    id: "cameras",
    delay: 1500,
    color: "#6393ff", // tl-400
    type: "circle" as const,
    targetOpacity: 0.6,
    radius: 2,
  },
  {
    id: "radars",
    delay: 2200,
    color: "#d48139", // tl-amber-400
    type: "circle" as const,
    targetOpacity: 0.5,
    radius: 2,
  },
  {
    id: "chargers",
    delay: 2800,
    color: "#34d399", // green
    type: "circle" as const,
    targetOpacity: 0.4,
    radius: 1.5,
  },
];

const LEGEND_ITEMS = [
  { label: "Incidencias", color: "#dc2626" },
  { label: "Cámaras", color: "#6393ff" },
  { label: "Radares", color: "#d48139" },
  { label: "EV", color: "#34d399" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HeroMap({ initialStats }: HeroMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapInstance | null>(null);
  const [legendVisible, setLegendVisible] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    let cancelled = false;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function initMap() {
      // Dynamically import to avoid SSR issues
      const maplibregl = (await import("maplibre-gl")).default;
      await import("maplibre-gl/dist/maplibre-gl.css");

      if (cancelled || !mapRef.current) return;

      const map = new maplibregl.Map({
        container: mapRef.current,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: [-3.7038, 40.4168],
        zoom: 5.5,
        interactive: false,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      map.on("load", async () => {
        if (cancelled) return;

        // Fetch all data sources in parallel
        const [incidentsData, camerasData, radarsData, chargersData] = await Promise.allSettled([
          fetch("/api/incidents?limit=200").then((r) => r.json()),
          fetch("/api/cameras?limit=300").then((r) => r.json()),
          fetch("/api/radars?limit=300").then((r) => r.json()),
          fetch("/api/chargers?limit=300").then((r) => r.json()),
        ]);

        if (cancelled) return;

        // Build GeoJSON for each source
        const incidentsGeoJSON =
          incidentsData.status === "fulfilled" && Array.isArray(incidentsData.value?.incidents)
            ? toGeoJSON(incidentsData.value.incidents)
            : { type: "FeatureCollection" as const, features: [] };

        const camerasGeoJSON =
          camerasData.status === "fulfilled" && Array.isArray(camerasData.value?.cameras)
            ? toGeoJSON(camerasData.value.cameras)
            : { type: "FeatureCollection" as const, features: [] };

        const radarsGeoJSON =
          radarsData.status === "fulfilled" && Array.isArray(radarsData.value?.radars)
            ? toGeoJSON(radarsData.value.radars)
            : { type: "FeatureCollection" as const, features: [] };

        const chargersGeoJSON =
          chargersData.status === "fulfilled" && Array.isArray(chargersData.value?.chargers)
            ? toGeoJSON(chargersData.value.chargers)
            : { type: "FeatureCollection" as const, features: [] };

        const geoJSONMap: Record<string, ReturnType<typeof toGeoJSON>> = {
          incidents: incidentsGeoJSON,
          cameras: camerasGeoJSON,
          radars: radarsGeoJSON,
          chargers: chargersGeoJSON,
        };

        // Add sources and layers with initial opacity = 0
        for (const layer of LAYERS) {
          if (cancelled) return;

          map.addSource(layer.id, {
            type: "geojson",
            data: geoJSONMap[layer.id],
          });

          if (layer.type === "heatmap") {
            map.addLayer({
              id: layer.id,
              type: "heatmap",
              source: layer.id,
              paint: {
                "heatmap-opacity": 0,
                "heatmap-opacity-transition": { duration: 800, delay: 0 },
                "heatmap-radius": layer.radius * 8,
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0, "rgba(0,0,0,0)",
                  0.5, `${layer.color}99`,
                  1, layer.color,
                ],
              },
            });
          } else {
            map.addLayer({
              id: layer.id,
              type: "circle",
              source: layer.id,
              paint: {
                "circle-opacity": 0,
                "circle-opacity-transition": { duration: 800, delay: 0 },
                "circle-color": layer.color,
                "circle-radius": layer.radius,
              },
            });
          }
        }

        // Reveal layers — immediate if reduced motion, delayed otherwise
        let revealedCount = 0;
        for (const layer of LAYERS) {
          const delay = prefersReducedMotion ? 0 : layer.delay;
          const opacityProp =
            layer.type === "heatmap" ? "heatmap-opacity" : "circle-opacity";

          setTimeout(() => {
            if (cancelled || !map.getLayer(layer.id)) return;
            map.setPaintProperty(layer.id, opacityProp, layer.targetOpacity);
            revealedCount += 1;
            if (revealedCount === LAYERS.length) {
              setLegendVisible(true);
            }
          }, delay);
        }

        // If reduced motion, show legend right away
        if (prefersReducedMotion) {
          setLegendVisible(true);
        }
      });
    }

    initMap().catch(console.error);

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const { incidentCount, cameraCount, radarCount, chargerCount, detectorCount, stationCount } = initialStats;

  return (
    <section className="relative h-[80vh] min-h-[580px] max-h-[760px] overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Full-width MapLibre background — light Positron style */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full opacity-90" />

      {/* White gradient scrim — heavier at bottom for text, light at top to show map */}
      <div className="absolute inset-0 bg-gradient-to-t from-white from-5% via-white/70 via-40% to-transparent dark:from-gray-950 dark:from-5% dark:via-gray-950/70 dark:via-40% dark:to-transparent pointer-events-none" />

      {/* Top bar — technical data feed look */}
      <div className="absolute top-0 inset-x-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[0.65rem] font-data text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-green opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-signal-green" />
              </span>
              LIVE
            </span>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <span>DGT NAP · AEMET · MINETUR · SCT · Euskadi</span>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <span>Refresh: 60s</span>
          </div>
          {/* Legend */}
          <div
            className={[
              "flex items-center gap-3 px-3 py-1 rounded-full",
              "bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700",
              "transition-opacity duration-700",
              legendVisible ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            {LEGEND_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[0.6rem] text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content overlay — bottom aligned */}
      <div className="relative h-full flex flex-col justify-end pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">
          {/* Heading */}
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-gray-50 leading-tight mb-3 max-w-2xl tracking-tight">
            Inteligencia vial en tiempo real para toda España
          </h2>

          {/* Description — SEO-rich */}
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-5 max-w-2xl">
            Plataforma de datos de tráfico con cobertura de toda la Península Ibérica.
            Agregamos {detectorCount.toLocaleString("es-ES")} detectores de velocidad DGT, {cameraCount.toLocaleString("es-ES")} cámaras
            en directo, {radarCount.toLocaleString("es-ES")} radares, {stationCount.toLocaleString("es-ES")} gasolineras
            con precios MINETUR y {chargerCount.toLocaleString("es-ES")} puntos de carga eléctrica.
            Datos de 12 fuentes oficiales actualizados cada 60 segundos.
          </p>

          {/* Technical stat pills */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {[
              { v: incidentCount, l: "incidencias activas" },
              { v: detectorCount, l: "detectores DGT" },
              { v: cameraCount, l: "cámaras DGT" },
              { v: radarCount, l: "radares" },
              { v: chargerCount, l: "cargadores EV" },
            ].map((s) => (
              <span
                key={s.l}
                className="inline-flex items-center gap-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1 text-xs"
              >
                <span className="font-data font-bold text-gray-900 dark:text-gray-100">{s.v.toLocaleString("es-ES")}</span>
                <span className="text-gray-500 dark:text-gray-400">{s.l}</span>
              </span>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/mapa"
              className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white font-heading font-semibold rounded-lg px-6 py-3 transition-colors shadow-sm"
            >
              <Map className="w-4 h-4" />
              Mapa en vivo
            </Link>
            <Link
              href="/explorar"
              className="inline-flex items-center gap-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:border-tl-300 text-gray-700 dark:text-gray-300 font-heading font-medium rounded-lg px-6 py-3 transition-colors"
            >
              Explorar datos
            </Link>
            <Link
              href="/profesional"
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-tl-600 transition-colors"
            >
              Acceso profesional &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
