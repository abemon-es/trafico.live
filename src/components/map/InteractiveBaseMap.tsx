"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Locate } from "lucide-react";
import type maplibregl from "maplibre-gl";
import { initPMTilesProtocolAsync } from "@/lib/pmtiles-protocol";
import { MAP_STYLE_DEFAULT } from "@/lib/map-config";

// Dynamic import type — maplibre-gl is loaded only on the client
type MapInstance = InstanceType<typeof maplibregl.Map>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InteractiveBaseMapProps {
  /** Map container height. Default: "100%" */
  height?: string;
  /** Initial center. Default: [-4.0, 39.6] (Iberian Peninsula) */
  center?: [number, number];
  /** Initial zoom. Default: 5.2 */
  zoom?: number;
  /** Callback after map loads — add your own layers here */
  onMapLoad?: (map: MapInstance) => void;
  /** Whether to show the sidebar panel on province click. Default: true */
  showSidebar?: boolean;
  /** Whether to show province boundaries. Default: true */
  showProvinces?: boolean;
  /** Whether to show quick access buttons (Canarias, Ceuta, Melilla). Default: true */
  showQuickAccess?: boolean;
  /** Whether to show city dots and labels. Default: true */
  showCities?: boolean;
  /** Additional CSS classes for the outermost container div */
  className?: string;
  /** Whether to allow zoom/pan. Default: true */
  interactive?: boolean;
  /** Children rendered on top of the map (e.g. custom controls) */
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Cities + territories data
// ---------------------------------------------------------------------------

const MAJOR_CITIES = [
  { name: "Madrid",     slug: "madrid",              lng: -3.7038, lat: 40.4168, type: "city" },
  { name: "Barcelona",  slug: "barcelona",            lng:  2.1734, lat: 41.3851, type: "city" },
  { name: "Valencia",   slug: "valencia",             lng: -0.3763, lat: 39.4699, type: "city" },
  { name: "Sevilla",    slug: "sevilla",              lng: -5.9845, lat: 37.3891, type: "city" },
  { name: "Zaragoza",   slug: "zaragoza",             lng: -0.8773, lat: 41.6488, type: "city" },
  { name: "Málaga",     slug: "malaga",               lng: -4.4214, lat: 36.7213, type: "city" },
  { name: "Murcia",     slug: "murcia",               lng: -1.1307, lat: 37.9922, type: "city" },
  { name: "Bilbao",     slug: "bilbao",               lng: -2.9350, lat: 43.2630, type: "city" },
  { name: "Palma",      slug: "palma-de-mallorca",    lng:  2.6502, lat: 39.5696, type: "city" },
  { name: "Valladolid", slug: "valladolid",           lng: -4.7245, lat: 41.6523, type: "city" },
  { name: "Alicante",   slug: "alicante",             lng: -0.4907, lat: 38.3452, type: "city" },
  { name: "Córdoba",    slug: "cordoba",              lng: -4.7794, lat: 37.8882, type: "city" },
  // More Spanish cities
  { name: "Vigo",       slug: "vigo",                 lng: -8.7207, lat: 42.2328, type: "city" },
  { name: "A Coruña",   slug: "a-coruna",             lng: -8.4063, lat: 43.3623, type: "city" },
  { name: "Santander",  slug: "santander",            lng: -3.8044, lat: 43.4623, type: "city" },
  { name: "San Sebastián", slug: "san-sebastian",     lng: -1.9812, lat: 43.3183, type: "city" },
  { name: "Granada",    slug: "granada",              lng: -3.5986, lat: 37.1773, type: "city" },
  { name: "Las Palmas", slug: "las-palmas-de-gran-canaria", lng: -15.4138, lat: 28.0997, type: "city" },
  { name: "S/C Tenerife", slug: "santa-cruz-de-tenerife", lng: -16.2519, lat: 28.4636, type: "city" },
  // Cross-border territories
  { name: "Portugal",   slug: "/portugal",            lng: -8.2245, lat: 39.3999, type: "country",
    bounds: [[-9.5, 36.96], [-6.19, 42.15]] as [[number,number],[number,number]],
    dataUrl: "/api/portugal/gas-stations?limit=1" },
  { name: "Andorra",    slug: "/andorra",             lng:  1.5218, lat: 42.5063, type: "country",
    bounds: [[1.41, 42.43], [1.79, 42.66]] as [[number,number],[number,number]],
    dataUrl: "/api/andorra/incidents" },
  { name: "Gibraltar",  slug: "/gibraltar",           lng: -5.3536, lat: 36.1408, type: "country",
    bounds: [[-5.37, 36.11], [-5.34, 36.16]] as [[number,number],[number,number]],
    dataUrl: null },
  { name: "Marruecos",  slug: "/marruecos",           lng: -6.8498, lat: 33.9716, type: "country",
    bounds: [[-13.2, 27.6], [-1.0, 35.9]] as [[number,number],[number,number]],
    dataUrl: null },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InteractiveBaseMap({
  height = "100%",
  center = [-4.0, 39.6],
  zoom = 5.2,
  onMapLoad,
  showSidebar = true,
  showProvinces = true,
  showQuickAccess = true,
  showCities = true,
  className = "",
  interactive = true,
  children,
}: InteractiveBaseMapProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapInstance | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    name: string;
    code: string;
    type: "province" | "country";
    href: string;
    bounds?: [[number, number], [number, number]];
  } | null>(null);
  const [selectedData, setSelectedData] = useState<Record<string, string | number> | null>(null);
  const [userLocated, setUserLocated] = useState(false);

  // ---------------------------------------------------------------------------
  // Fly helpers
  // ---------------------------------------------------------------------------

  const flyTo = useCallback((lng: number, lat: number, z: number) => {
    mapInstanceRef.current?.flyTo({ center: [lng, lat], zoom: z, duration: 1200, essential: true });
  }, []);

  const flyToOverview = useCallback(() => {
    mapInstanceRef.current?.flyTo({ center, zoom, duration: 800 });
  }, [center, zoom]);

  // ---------------------------------------------------------------------------
  // Geolocation — "Mi zona" button
  // ---------------------------------------------------------------------------

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        setUserLocated(true);
        const map = mapInstanceRef.current;
        if (!map) return;
        map.flyTo({ center: [longitude, latitude], zoom: 9, duration: 1500, essential: true });
        if (!showSidebar || !showProvinces) return;
        map.once("moveend", () => {
          const point = map.project([longitude, latitude]);
          const features = map.queryRenderedFeatures(point, { layers: ["ibm-province-fill"] });
          if (features.length > 0) {
            const code = features[0].properties?.cod_prov;
            const name = features[0].properties?.nombre;
            if (code && name) {
              setSelected({ name, code, type: "province", href: `/provincias/${code}` });
              setSelectedData(null);
              try { map.setFilter("ibm-province-hover", ["==", "cod_prov", code]); } catch {}
              fetchProvinceData(name ?? code).then(setSelectedData).catch(() => {});
            }
          }
        });
      },
      () => { /* silently fail */ },
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, [showSidebar, showProvinces]);

  // ---------------------------------------------------------------------------
  // Province API data fetch
  // ---------------------------------------------------------------------------

  async function fetchProvinceData(name: string) {
    const [inc, cam, rad, gas, ev, meteo] = await Promise.allSettled([
      fetch(`/api/incidents?province=${encodeURIComponent(name)}&limit=1`).then((r) => r.json()),
      fetch(`/api/cameras?province=${encodeURIComponent(name)}&limit=1`).then((r) => r.json()),
      fetch(`/api/radars?province=${encodeURIComponent(name)}&limit=1`).then((r) => r.json()),
      fetch(`/api/gas-stations?province=${encodeURIComponent(name)}&limit=1`).then((r) => r.json()),
      fetch(`/api/chargers?province=${encodeURIComponent(name)}&limit=1`).then((r) => r.json()),
      fetch(`/api/weather?province=${encodeURIComponent(name)}`).then((r) => r.json()),
    ]);
    return {
      "Incidencias":   inc.status    === "fulfilled" ? (inc.value.count ?? inc.value.incidents?.length ?? 0) : 0,
      "Cámaras":       cam.status    === "fulfilled" ? (cam.value.count ?? 0) : 0,
      "Radares":       rad.status    === "fulfilled" ? (rad.value.count ?? 0) : 0,
      "Gasolineras":   gas.status    === "fulfilled" ? (gas.value.count ?? gas.value.total ?? 0) : 0,
      "Cargadores EV": ev.status     === "fulfilled" ? (ev.value.totalCount ?? ev.value.count ?? 0) : 0,
      "Alertas meteo": meteo.status  === "fulfilled" ? (meteo.value.count ?? 0) : 0,
    } as Record<string, string | number>;
  }

  // ---------------------------------------------------------------------------
  // Map init
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = typeof window !== "undefined" && "ontouchstart" in window;

    async function initMap() {
      const maplibregl = (await import("maplibre-gl")).default;
      await import("maplibre-gl/dist/maplibre-gl.css");
      await initPMTilesProtocolAsync();
      if (cancelled || !mapRef.current) return;

      const map = new maplibregl.Map({
        container: mapRef.current,
        style: MAP_STYLE_DEFAULT,
        center,
        zoom,
        interactive,
        scrollZoom: interactive && !isTouch,
        boxZoom: false,
        dragRotate: false,
        doubleClickZoom: interactive,
        touchZoomRotate: interactive,
        dragPan: interactive,
        minZoom: 3,
        maxZoom: 14,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      map.on("load", async () => {
        if (cancelled) return;

        // ── Province boundaries ────────────────────────────────────────────
        if (showProvinces) {
          try {
            const provRes = await fetch("/geo/spain-provinces.geojson");
            const provData = await provRes.json();
            if (cancelled) return;

            map.addSource("ibm-provinces", { type: "geojson", data: provData });

            map.addLayer({
              id: "ibm-province-fill",
              type: "fill",
              source: "ibm-provinces",
              paint: { "fill-color": "#1b4bd5", "fill-opacity": 0 },
            });

            map.addLayer({
              id: "ibm-province-outline",
              type: "line",
              source: "ibm-provinces",
              paint: {
                "line-color": "#c0d5ff",
                "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.5, 8, 1.5, 12, 2.5],
                "line-opacity": 0.6,
              },
            });

            map.addLayer({
              id: "ibm-province-hover",
              type: "fill",
              source: "ibm-provinces",
              paint: { "fill-color": "#1b4bd5", "fill-opacity": 0.15 },
              filter: ["==", "cod_prov", ""],
            });

            map.addLayer({
              id: "ibm-province-labels",
              type: "symbol",
              source: "ibm-provinces",
              layout: {
                "text-field": ["get", "nombre"],
                "text-font": ["Noto Sans Medium"],
                "text-size": ["interpolate", ["linear"], ["zoom"], 5, 8, 7, 11, 9, 0],
                "text-allow-overlap": false,
                "text-ignore-placement": false,
              },
              paint: {
                "text-color": "#475569",
                "text-halo-color": "#ffffff",
                "text-halo-width": 1.5,
                "text-opacity": ["interpolate", ["linear"], ["zoom"], 5.5, 0, 6, 0.7, 8, 0.7, 9, 0],
              },
            });

            // Hover
            map.on("mousemove", "ibm-province-fill", (e) => {
              if (!e.features?.length) return;
              map.getCanvas().style.cursor = "pointer";
              const code = e.features[0].properties?.cod_prov;
              const name = e.features[0].properties?.nombre;
              if (code) map.setFilter("ibm-province-hover", ["==", "cod_prov", code]);
              setHoveredProvince(name ?? null);
            });
            map.on("mouseleave", "ibm-province-fill", () => {
              map.getCanvas().style.cursor = "";
              map.setFilter("ibm-province-hover", ["==", "cod_prov", ""]);
              setHoveredProvince(null);
            });

            // Click → zoom + sidebar
            map.on("click", "ibm-province-fill", (e) => {
              if (!e.features?.length) return;
              const code = e.features[0].properties?.cod_prov;
              const name = e.features[0].properties?.nombre;
              if (!code) return;

              const geometry = e.features[0].geometry;
              if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
                const coords = geometry.type === "Polygon"
                  ? geometry.coordinates.flat()
                  : geometry.coordinates.flat(2);
                const lngs = coords.map((c: number[]) => c[0]);
                const lats = coords.map((c: number[]) => c[1]);
                const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
                const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
                const span = Math.max(Math.max(...lngs) - Math.min(...lngs), Math.max(...lats) - Math.min(...lats));
                const z = span > 3 ? 7 : span > 1.5 ? 8 : span > 0.5 ? 9 : 10;
                map.flyTo({ center: [cLng, cLat], zoom: z, duration: 1200, essential: true });
              }

              map.setFilter("ibm-province-hover", ["==", "cod_prov", code]);

              if (showSidebar) {
                setSelected({ name: name ?? code, code, type: "province", href: `/provincias/${code}` });
                setSelectedData(null);
                fetchProvinceData(name ?? code).then(setSelectedData).catch(() => {});
              }
            });
          } catch {
            // Province boundaries optional — continue without them
          }

          // ── Territory polygons (Portugal, Andorra, Gibraltar) ────────────
          try {
            const terrRes = await fetch("/geo/territories.geojson");
            const terrData = await terrRes.json();
            if (cancelled) return;
            map.addSource("ibm-territories", { type: "geojson", data: terrData });
          } catch {
            map.addSource("ibm-territories", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          }

          map.addLayer({ id: "ibm-territory-fill",    type: "fill", source: "ibm-territories", paint: { "fill-color": "#1b4bd5", "fill-opacity": 0 } });
          map.addLayer({ id: "ibm-territory-outline", type: "line", source: "ibm-territories", paint: { "line-color": "#94b6ff", "line-width": 1.5, "line-opacity": 0.6, "line-dasharray": [4, 3] } });
          map.addLayer({ id: "ibm-territory-hover",   type: "fill", source: "ibm-territories", paint: { "fill-color": "#1b4bd5", "fill-opacity": 0.12 }, filter: ["==", "name", ""] });

          map.on("mousemove", "ibm-territory-fill", (e) => {
            if (!e.features?.length) return;
            map.getCanvas().style.cursor = "pointer";
            const n = e.features[0].properties?.name;
            if (n) { map.setFilter("ibm-territory-hover", ["==", "name", n]); setHoveredProvince(n); }
          });
          map.on("mouseleave", "ibm-territory-fill", () => {
            map.getCanvas().style.cursor = "";
            map.setFilter("ibm-territory-hover", ["==", "name", ""]);
            setHoveredProvince(null);
          });
          map.on("click", "ibm-territory-fill", (e) => {
            e.originalEvent.stopPropagation();
            if (!e.features?.length) return;
            const props = e.features[0].properties;
            if (!props?.name) return;
            const geo = e.features[0].geometry;
            if (geo.type === "Polygon") {
              const coords = geo.coordinates[0];
              const lngs = coords.map((c: number[]) => c[0]);
              const lats = coords.map((c: number[]) => c[1]);
              map.flyTo({
                center: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2],
                zoom: props.name === "Andorra" ? 11 : props.name === "Gibraltar" ? 14 : props.name === "Marruecos" ? 6 : 7,
                duration: 1200,
                essential: true,
              });
            }
            if (showSidebar) {
              setSelected({ name: props.name, code: props.slug, type: "country", href: props.slug });
              setSelectedData(null);
              if (props.dataUrl) {
                fetch(props.dataUrl).then((r) => r.json()).then((d) => {
                  if (props.slug === "/portugal") {
                    setSelectedData({ "Gasolineras": d.count ?? d.total ?? "3.000+", "Fuente": "DGEG", "Meteo": "IPMA", "Accidentes": "ANSR" });
                  } else if (props.slug === "/andorra") {
                    setSelectedData({ "Incidencias": d.incidents?.length ?? d.count ?? 0, "Fuente": "Mobilitat", "Cámaras": "En vivo" });
                  }
                }).catch(() => {});
              } else if (props.slug === "/marruecos") {
                setSelectedData({ "Frontera": "Ceuta + Melilla", "Tránsito": "Paso del Estrecho", "Fuente": "DGT + DGSN" });
              } else {
                setSelectedData({ "Territorio": "Británico", "Frontera": "España", "Acceso": "La Línea" });
              }
            }
          });
        }

        // ── Major city dots + labels ───────────────────────────────────────
        if (showCities) {
          const citiesGeoJSON = {
            type: "FeatureCollection" as const,
            features: MAJOR_CITIES.map((c) => ({
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
              properties: { name: c.name, slug: c.slug, type: c.type },
            })),
          };
          map.addSource("ibm-cities", { type: "geojson", data: citiesGeoJSON });

          map.addLayer({
            id: "ibm-city-dots",
            type: "circle",
            source: "ibm-cities",
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
            id: "ibm-city-labels",
            type: "symbol",
            source: "ibm-cities",
            layout: {
              "text-field": ["get", "name"],
              "text-font": ["Noto Sans Medium"],
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

          // Reveal cities
          setTimeout(() => {
            if (cancelled) return;
            map.setPaintProperty("ibm-city-dots", "circle-opacity", 1);
            map.setPaintProperty("ibm-city-dots", "circle-stroke-opacity", 1);
            map.setPaintProperty("ibm-city-labels", "text-opacity", 1);
          }, prefersReducedMotion ? 0 : 500);

          // City click → navigate
          map.on("click", "ibm-city-dots", (e) => {
            e.originalEvent.stopPropagation();
            if (!e.features?.length) return;
            const props = e.features[0].properties;
            const slug = props?.slug;
            const type = props?.type;
            if (!slug) return;

            if (type === "country") {
              const territory = MAJOR_CITIES.find((c) => c.slug === slug);
              if (territory && "bounds" in territory && territory.bounds) {
                map.fitBounds(territory.bounds as [[number,number],[number,number]], { padding: 40, duration: 800 });
              }
              const href = slug.startsWith("/") ? slug : `/${slug}`;
              if (showSidebar) {
                setSelected({ name: props.name, code: slug, type: "country", href });
                setSelectedData(null);
                const dataUrl = MAJOR_CITIES.find((c) => c.slug === slug && "dataUrl" in c)?.dataUrl;
                if (dataUrl) {
                  fetch(dataUrl as string).then((r) => r.json()).then((d) => {
                    if (slug === "/portugal") {
                      setSelectedData({ "Gasolineras": d.count ?? d.total ?? "3.000+", "Fuente": "DGEG", "Meteo": "IPMA" });
                    } else if (slug === "/andorra") {
                      setSelectedData({ "Incidencias": d.incidents?.length ?? d.count ?? 0, "Fuente": "Mobilitat", "Cámaras": "En vivo" });
                    }
                  }).catch(() => {});
                } else {
                  setSelectedData({ "Territorio": "Británico de ultramar", "Acceso": "Frontera con España" });
                }
              }
            } else {
              // City → navigate directly
              router.push(`/trafico/${slug}`);
            }
          });
          map.on("mouseenter", "ibm-city-dots", () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", "ibm-city-dots", () => { map.getCanvas().style.cursor = ""; });
        }

        // ── Fire onMapLoad so page-specific layers can be added ───────────
        if (onMapLoad) {
          onMapLoad(map);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {/* MapLibre container */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />

      {/* Province hover tooltip */}
      {hoveredProvince && (
        <div className="absolute top-4 left-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pointer-events-none z-20 shadow-sm">
          <p className="text-sm font-heading font-semibold text-gray-900 dark:text-gray-100">{hoveredProvince}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Clic para ver tráfico en esta provincia</p>
        </div>
      )}

      {/* Sidebar panel — province/territory details */}
      {showSidebar && selected && (
        <div className="absolute top-0 left-0 bottom-0 w-full sm:w-[320px] z-20 bg-white/97 dark:bg-gray-950/97 backdrop-blur-md border-r border-gray-200 dark:border-gray-700 shadow-2xl overflow-y-auto">
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">{selected.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {selected.type === "province" ? `Provincia · INE ${selected.code}` : "Territorio · Cobertura internacional"}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  setSelectedData(null);
                  flyToOverview();
                  try { mapInstanceRef.current?.setFilter("ibm-province-hover", ["==", "cod_prov", ""]); } catch {}
                }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0 mt-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1"
              >
                Volver al mapa
              </button>
            </div>

            {/* Infrastructure stats grid */}
            {selectedData ? (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {Object.entries(selectedData).map(([key, val]) => (
                  <div key={key} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2">
                    <p className="text-[0.6rem] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{key}</p>
                    <p className="font-data text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {typeof val === "number" ? val.toLocaleString("es-ES") : val}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse" />
                ))}
              </div>
            )}

            {/* Traffic health indicator (province only) */}
            {selected.type === "province" && selectedData && (
              <div className="mb-4 bg-tl-50 dark:bg-tl-950/30 border border-tl-200 dark:border-tl-800 rounded-lg px-3 py-2.5">
                <p className="text-[0.6rem] text-tl-600 dark:text-tl-400 uppercase tracking-wider font-semibold mb-1">Estado del tráfico</p>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-green opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-signal-green" />
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {Number(selectedData["Incidencias"] ?? 0) < 5 ? "Fluido" : Number(selectedData["Incidencias"] ?? 0) < 15 ? "Moderado" : "Congestionado"}
                  </span>
                </div>
                <p className="text-[0.65rem] text-gray-500 dark:text-gray-400 mt-1">
                  {Number(selectedData["Incidencias"] ?? 0)} incidencias activas · {Number(selectedData["Radares"] ?? 0)} radares en vigilancia
                </p>
              </div>
            )}

            {/* Quick section links */}
            <div className="space-y-1 mb-4">
              <p className="text-[0.6rem] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold mb-1.5">Secciones disponibles</p>
              {(selected.type === "province"
                ? [
                    { label: "Incidencias en vivo",      href: `${selected.href}#incidencias` },
                    { label: "Cámaras DGT",              href: `${selected.href}#camaras` },
                    { label: "Radares",                  href: `${selected.href}#radares` },
                    { label: "Gasolineras y precios",    href: `${selected.href}#combustible` },
                    { label: "Cargadores EV",            href: `${selected.href}#carga-ev` },
                    { label: "Meteorología",             href: `${selected.href}#meteo` },
                    { label: "Carreteras",               href: `${selected.href}#carreteras` },
                    { label: "Accidentalidad histórica", href: `${selected.href}#accidentes` },
                    { label: "Zonas de riesgo",          href: `${selected.href}#riesgo` },
                  ]
                : selected.code === "/portugal"
                  ? [
                      { label: "Combustible Portugal",  href: "/portugal/combustible" },
                      { label: "Meteorología IPMA",     href: "/portugal" },
                      { label: "Accidentes ANSR",       href: "/portugal" },
                    ]
                  : selected.code === "/andorra"
                    ? [
                        { label: "Incidencias Mobilitat", href: "/andorra" },
                        { label: "Cámaras en vivo",       href: "/andorra" },
                      ]
                    : selected.code === "/marruecos"
                      ? [
                          { label: "Paso del Estrecho",     href: "/marruecos" },
                          { label: "Frontera Ceuta",        href: "/ceuta" },
                          { label: "Frontera Melilla",      href: "/melilla" },
                        ]
                      : [{ label: "Información general", href: selected.href }]
              ).map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
                >
                  {link.label}
                  <span className="text-gray-300 dark:text-gray-600">&rarr;</span>
                </Link>
              ))}
            </div>

            {/* Main CTA */}
            <Link
              href={selected.href}
              className="flex items-center justify-center gap-1.5 w-full bg-tl-600 hover:bg-tl-700 text-white font-heading font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors"
            >
              Ver todo sobre {selected.name}
            </Link>
          </div>
        </div>
      )}

      {/* Quick access buttons — Canarias, Ceuta, Melilla + geolocation */}
      {showQuickAccess && (
        <div className="absolute bottom-6 right-4 sm:right-6 z-20 flex flex-row sm:flex-col gap-1.5 overflow-x-auto">
          <button
            onClick={locateUser}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all backdrop-blur-sm border shadow-sm ${
              userLocated
                ? "bg-tl-600 text-white border-tl-600"
                : "bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-tl-300"
            }`}
            title="Localizar mi ubicación"
          >
            <Locate className="w-3.5 h-3.5" />
            Mi zona
          </button>
          <button
            onClick={() => flyTo(-15.5, 28.1, 8)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-tl-300 transition-all shadow-sm"
          >
            Canarias
          </button>
          <button
            onClick={() => flyTo(-5.34, 35.89, 13)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-tl-300 transition-all shadow-sm"
          >
            Ceuta
          </button>
          <button
            onClick={() => flyTo(-2.95, 35.29, 13)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-tl-300 transition-all shadow-sm"
          >
            Melilla
          </button>
          <button
            onClick={() => flyTo(2.9, 39.6, 9)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-tl-300 transition-all shadow-sm"
          >
            Baleares
          </button>
        </div>
      )}

      {/* Slot for page-specific controls */}
      {children}
    </div>
  );
}
