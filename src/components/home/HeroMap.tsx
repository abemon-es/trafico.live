"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  { label: "Provincias", color: "#c0d5ff" },
  { label: "Ciudades", color: "#1b4bd5" },
  { label: "Incidencias", color: "#dc2626" },
  { label: "Cámaras", color: "#6393ff" },
  { label: "Radares", color: "#d48139" },
  { label: "EV", color: "#34d399" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MAJOR_CITIES = [
  { name: "Madrid", slug: "madrid", lng: -3.7038, lat: 40.4168, type: "city" },
  { name: "Barcelona", slug: "barcelona", lng: 2.1734, lat: 41.3851, type: "city" },
  { name: "Valencia", slug: "valencia", lng: -0.3763, lat: 39.4699, type: "city" },
  { name: "Sevilla", slug: "sevilla", lng: -5.9845, lat: 37.3891, type: "city" },
  { name: "Zaragoza", slug: "zaragoza", lng: -0.8773, lat: 41.6488, type: "city" },
  { name: "Málaga", slug: "malaga", lng: -4.4214, lat: 36.7213, type: "city" },
  { name: "Murcia", slug: "murcia", lng: -1.1307, lat: 37.9922, type: "city" },
  { name: "Bilbao", slug: "bilbao", lng: -2.9350, lat: 43.2630, type: "city" },
  { name: "Palma", slug: "palma-de-mallorca", lng: 2.6502, lat: 39.5696, type: "city" },
  { name: "Valladolid", slug: "valladolid", lng: -4.7245, lat: 41.6523, type: "city" },
  { name: "Alicante", slug: "alicante", lng: -0.4907, lat: 38.3452, type: "city" },
  { name: "Córdoba", slug: "cordoba", lng: -4.7794, lat: 37.8882, type: "city" },
  // Cross-border territories (with bounding boxes for zoom)
  { name: "Portugal", slug: "/portugal", lng: -8.2245, lat: 39.3999, type: "country",
    bounds: [[-9.5, 36.96], [-6.19, 42.15]] as [[number,number],[number,number]],
    dataUrl: "/api/portugal/gas-stations?limit=1" },
  { name: "Andorra", slug: "/andorra", lng: 1.5218, lat: 42.5063, type: "country",
    bounds: [[1.41, 42.43], [1.79, 42.66]] as [[number,number],[number,number]],
    dataUrl: "/api/andorra/incidents" },
  { name: "Gibraltar", slug: "/gibraltar", lng: -5.3536, lat: 36.1408, type: "country",
    bounds: [[-5.37, 36.11], [-5.34, 36.16]] as [[number,number],[number,number]],
    dataUrl: null },
];

export function HeroMap({ initialStats }: HeroMapProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapInstance | null>(null);
  const [legendVisible, setLegendVisible] = useState(false);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    name: string;
    code: string;
    type: "province" | "country";
    href: string;
    bounds?: [[number, number], [number, number]];
  } | null>(null);
  const [selectedData, setSelectedData] = useState<Record<string, string | number> | null>(null);
  const [mapFocused, setMapFocused] = useState(false);

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
        interactive: true,
        scrollZoom: true,
        boxZoom: false,
        dragRotate: false,
        doubleClickZoom: true,
        touchZoomRotate: true,
        dragPan: true,
        minZoom: 4,
        maxZoom: 12,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      map.on("load", async () => {
        if (cancelled) return;

        // ── Province boundaries ──
        try {
          const provRes = await fetch("/geo/spain-provinces.geojson");
          const provData = await provRes.json();
          if (cancelled) return;

          map.addSource("provinces", { type: "geojson", data: provData });

          map.addLayer({
            id: "province-fill",
            type: "fill",
            source: "provinces",
            paint: { "fill-color": "#1b4bd5", "fill-opacity": 0 },
          });

          map.addLayer({
            id: "province-outline",
            type: "line",
            source: "provinces",
            paint: {
              "line-color": "#c0d5ff",
              "line-width": 0.5,
              "line-opacity": 0.6,
            },
          });

          map.addLayer({
            id: "province-hover",
            type: "fill",
            source: "provinces",
            paint: { "fill-color": "#1b4bd5", "fill-opacity": 0.1 },
            filter: ["==", "cod_prov", ""],
          });

          // Province hover
          map.on("mousemove", "province-fill", (e) => {
            if (!e.features?.length) return;
            map.getCanvas().style.cursor = "pointer";
            const code = e.features[0].properties?.cod_prov;
            const name = e.features[0].properties?.nombre;
            if (code) map.setFilter("province-hover", ["==", "cod_prov", code]);
            setHoveredProvince(name ?? null);
          });
          map.on("mouseleave", "province-fill", () => {
            map.getCanvas().style.cursor = "";
            map.setFilter("province-hover", ["==", "cod_prov", ""]);
            setHoveredProvince(null);
          });

          // Province click → zoom in + select
          map.on("click", "province-fill", (e) => {
            if (!e.features?.length) return;
            const code = e.features[0].properties?.cod_prov;
            const name = e.features[0].properties?.nombre;
            if (!code) return;

            // Calculate bounds of the clicked province
            const geometry = e.features[0].geometry;
            if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
              const coords = geometry.type === "Polygon"
                ? geometry.coordinates.flat()
                : geometry.coordinates.flat(2);
              const lngs = coords.map((c: number[]) => c[0]);
              const lats = coords.map((c: number[]) => c[1]);
              const bounds: [[number, number], [number, number]] = [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)],
              ];
              map.fitBounds(bounds, { padding: 60, duration: 800 });
            }

            setSelected({ name: name ?? code, code, type: "province", href: `/provincias/${code}` });
            setSelectedData(null);
            // Fetch province stats
            fetch(`/api/province/stats?code=${code}`).then((r) => r.json()).then((d) => {
              setSelectedData({
                "Incidencias": d.incidents ?? 0,
                "Cámaras": d.cameras ?? 0,
                "Radares": d.radars ?? 0,
                "Gasolineras": d.gasStations ?? 0,
              });
            }).catch(() => {});
            setMapFocused(true);
            map.setFilter("province-hover", ["==", "cod_prov", code]);
          });
        } catch {
          // Province boundaries optional — continue without them
        }

        // ── Major cities ──
        const citiesGeoJSON = {
          type: "FeatureCollection" as const,
          features: MAJOR_CITIES.map((c) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
            properties: { name: c.name, slug: c.slug, type: c.type },
          })),
        };
        map.addSource("cities", { type: "geojson", data: citiesGeoJSON });
        map.addLayer({
          id: "city-dots",
          type: "circle",
          source: "cities",
          paint: {
            "circle-radius": ["match", ["get", "type"], "country", 6, 4],
            "circle-color": ["match", ["get", "type"], "country", "#092ea8", "#1b4bd5"],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
            "circle-opacity": 0,
            "circle-opacity-transition": { duration: 600, delay: 0 },
            "circle-stroke-opacity": 0,
            "circle-stroke-opacity-transition": { duration: 600, delay: 0 },
          },
        });
        map.addLayer({
          id: "city-labels",
          type: "symbol",
          source: "cities",
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Open Sans Semibold"],
            "text-size": 11,
            "text-offset": [0, 1.2],
            "text-anchor": "top",
          },
          paint: {
            "text-color": "#374151",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.5,
            "text-opacity": 0,
            "text-opacity-transition": { duration: 600, delay: 0 },
          },
        });

        // Reveal cities early
        setTimeout(() => {
          if (cancelled) return;
          map.setPaintProperty("city-dots", "circle-opacity", 1);
          map.setPaintProperty("city-dots", "circle-stroke-opacity", 1);
          map.setPaintProperty("city-labels", "text-opacity", 1);
        }, prefersReducedMotion ? 0 : 500);

        // City click → navigate
        map.on("click", "city-dots", (e) => {
          e.originalEvent.stopPropagation();
          if (!e.features?.length) return;
          const props = e.features[0].properties;
          const slug = props?.slug;
          const type = props?.type;
          if (!slug) return;

          if (type === "country") {
            // Same zoom + panel effect as provinces
            const territory = MAJOR_CITIES.find((c) => c.slug === slug);
            if (territory && "bounds" in territory && territory.bounds) {
              map.fitBounds(territory.bounds as [[number,number],[number,number]], { padding: 40, duration: 800 });
            }
            const href = slug.startsWith("/") ? slug : `/${slug}`;
            setSelected({ name: props.name, code: slug, type: "country", href });
            setMapFocused(true);
            setSelectedData(null);

            // Fetch real data for this territory
            const dataUrl = MAJOR_CITIES.find((c) => c.slug === slug && "dataUrl" in c)?.dataUrl;
            if (dataUrl) {
              fetch(dataUrl as string).then((r) => r.json()).then((d) => {
                if (slug === "/portugal") {
                  setSelectedData({
                    "Gasolineras": d.count ?? d.total ?? "3.000+",
                    "Fuente": "DGEG",
                    "Meteo": "IPMA",
                  });
                } else if (slug === "/andorra") {
                  setSelectedData({
                    "Incidencias": d.incidents?.length ?? d.count ?? 0,
                    "Fuente": "Mobilitat",
                    "Cámaras": "En vivo",
                  });
                }
              }).catch(() => {});
            } else {
              setSelectedData({ "Territorio": "Británico de ultramar", "Acceso": "Frontera con España" });
            }
          } else {
            // City → navigate directly
            router.push(`/trafico/${slug}`);
          }
        });
        map.on("mouseenter", "city-dots", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "city-dots", () => { map.getCanvas().style.cursor = ""; });

        // ── Data layers (existing) ──
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

      {/* White gradient scrim — fades when map is focused */}
      <div className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${mapFocused ? "opacity-20" : "opacity-100"}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-white from-5% via-white/70 via-40% to-transparent dark:from-gray-950 dark:from-5% dark:via-gray-950/70 dark:via-40% dark:to-transparent" />
      </div>

      {/* Top bar — technical data feed look */}
      {/* Province hover tooltip */}
      {hoveredProvince && (
        <div className="absolute top-14 left-4 sm:left-6 lg:left-8 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pointer-events-none z-20 shadow-sm">
          <p className="text-sm font-heading font-semibold text-gray-900 dark:text-gray-100">{hoveredProvince}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Clic para ver tráfico en esta provincia</p>
        </div>
      )}

      {/* Technical data feed bar */}
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

      {/* Main content overlay — bottom aligned, hides when map focused */}
      <div className={`relative h-full flex flex-col justify-end pb-10 px-4 sm:px-6 lg:px-8 transition-all duration-500 ${mapFocused ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"}`}>
        <div className="max-w-7xl mx-auto w-full">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-gray-50 leading-tight mb-3 max-w-2xl tracking-tight">
            Inteligencia vial en tiempo real para toda España
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-5 max-w-2xl">
            Plataforma de datos de tráfico con cobertura de toda la Península Ibérica.
            Agregamos {detectorCount.toLocaleString("es-ES")} detectores de velocidad DGT, {cameraCount.toLocaleString("es-ES")} cámaras
            en directo, {radarCount.toLocaleString("es-ES")} radares, {stationCount.toLocaleString("es-ES")} gasolineras
            con precios MINETUR y {chargerCount.toLocaleString("es-ES")} puntos de carga eléctrica.
            Datos de 12 fuentes oficiales actualizados cada 60 segundos.
          </p>
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {[
              { v: incidentCount, l: "incidencias activas" },
              { v: detectorCount, l: "detectores DGT" },
              { v: cameraCount, l: "cámaras DGT" },
              { v: radarCount, l: "radares" },
              { v: chargerCount, l: "cargadores EV" },
            ].map((s) => (
              <span key={s.l} className="inline-flex items-center gap-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1 text-xs">
                <span className="font-data font-bold text-gray-900 dark:text-gray-100">{s.v.toLocaleString("es-ES")}</span>
                <span className="text-gray-500 dark:text-gray-400">{s.l}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/mapa" className="inline-flex items-center gap-2 bg-tl-600 hover:bg-tl-700 text-white font-heading font-semibold rounded-lg px-6 py-3 transition-colors shadow-sm">
              <Map className="w-4 h-4" />
              Mapa en vivo
            </Link>
            <Link href="/explorar" className="inline-flex items-center gap-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:border-tl-300 text-gray-700 dark:text-gray-300 font-heading font-medium rounded-lg px-6 py-3 transition-colors">
              Explorar datos
            </Link>
            <Link href="/profesional" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-tl-600 transition-colors">
              Acceso profesional &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Selected zone panel — province or territory */}
      {selected && (
        <div className="absolute bottom-6 left-4 sm:left-6 lg:left-8 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 shadow-lg max-w-md">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <p className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100">{selected.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selected.type === "province" ? `Provincia · INE ${selected.code}` : "Territorio · Cobertura internacional"}
              </p>
            </div>
            <button
              onClick={() => {
                setSelected(null);
                setSelectedData(null);
                setMapFocused(false);
                mapInstanceRef.current?.flyTo({ center: [-3.7038, 40.4168], zoom: 5.5, duration: 800 });
                try { mapInstanceRef.current?.setFilter("province-hover", ["==", "cod_prov", ""]); } catch {}
              }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0 mt-1"
            >
              Volver al mapa
            </button>
          </div>

          {/* Data pills — show real stats */}
          {selectedData ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(selectedData).map(([key, val]) => (
                <span key={key} className="inline-flex items-center gap-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-[0.65rem]">
                  <span className="text-gray-500 dark:text-gray-400">{key}</span>
                  <span className="font-data font-semibold text-gray-900 dark:text-gray-100">{typeof val === "number" ? val.toLocaleString("es-ES") : val}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="flex gap-1.5 mb-3">
              {[1, 2, 3].map((i) => (
                <span key={i} className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          <Link
            href={selected.href}
            className="inline-flex items-center gap-1.5 bg-tl-600 hover:bg-tl-700 text-white font-heading font-semibold text-sm rounded-lg px-4 py-2 transition-colors"
          >
            Ver tráfico en {selected.name}
          </Link>
        </div>
      )}
    </section>
  );
}
