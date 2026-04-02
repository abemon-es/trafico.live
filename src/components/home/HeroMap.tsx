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
        style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
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

  const { incidentCount, cameraCount, radarCount, chargerCount } = initialStats;

  return (
    <section className="py-14 px-6">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start justify-between gap-14">
        {/* ---------------------------------------------------------------- */}
        {/* Left — text content */}
        {/* ---------------------------------------------------------------- */}
        <div className="max-w-lg w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-tl-50 border border-tl-200 mb-6">
            <span className="w-2 h-2 rounded-full bg-signal-green animate-pulse flex-shrink-0" />
            <span className="text-xs font-medium text-tl-600 tracking-wide">
              Datos en tiempo real · 12 fuentes oficiales
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-heading text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-50 leading-tight mb-5">
            Inteligencia vial para toda España
          </h1>

          {/* Description */}
          <p className="font-body text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
            Incidencias de tráfico, cámaras, radares, precios de combustible y puntos de carga
            eléctrica actualizados al minuto desde DGT, AEMET, SCT y Euskadi.
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-6 mb-8 text-sm text-gray-500 dark:text-gray-400">
            <span>
              <strong className="font-semibold text-gray-900 dark:text-gray-100 font-data tabular-nums">
                {incidentCount.toLocaleString("es-ES")}
              </strong>{" "}
              incidencias
            </span>
            <span>
              <strong className="font-semibold text-gray-900 dark:text-gray-100 font-data tabular-nums">
                {cameraCount.toLocaleString("es-ES")}
              </strong>{" "}
              cámaras
            </span>
            <span>
              <strong className="font-semibold text-gray-900 dark:text-gray-100 font-data tabular-nums">
                {chargerCount.toLocaleString("es-ES")}
              </strong>{" "}
              puntos EV
            </span>
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white font-medium rounded-lg px-6 py-3 transition-colors"
            >
              <Map className="w-4 h-4" />
              Mapa en vivo
            </Link>
            <Link
              href="/estaciones-aforo"
              className="inline-flex items-center gap-2 border border-gray-200 dark:border-gray-700 hover:border-tl-300 dark:hover:border-tl-600 text-gray-600 dark:text-gray-300 font-medium rounded-lg px-6 py-3 transition-colors"
            >
              Explorar datos
            </Link>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Right — animated map card */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex-1 max-w-xl w-full">
          <div className="relative bg-tl-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden aspect-video">
            {/* MapLibre container */}
            <div ref={mapRef} className="absolute inset-0 w-full h-full" />

            {/* Legend */}
            <div
              className={[
                "absolute bottom-3 left-1/2 -translate-x-1/2",
                "flex items-center gap-3 px-3 py-1.5 rounded-full",
                "bg-black/60 backdrop-blur-sm border border-white/10",
                "transition-opacity duration-700",
                legendVisible ? "opacity-100" : "opacity-0",
              ].join(" ")}
            >
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-white/70 whitespace-nowrap">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Live indicator */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-green animate-pulse" />
              <span className="text-xs text-white/70 font-medium">En vivo</span>
            </div>

            {/* Stat overlay — bottom right */}
            <div className="absolute bottom-3 right-3 text-right hidden sm:block">
              <p className="text-xs text-white/40 font-data tabular-nums leading-relaxed">
                {radarCount.toLocaleString("es-ES")} radares
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
