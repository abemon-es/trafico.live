"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Map, Locate, Cloud } from "lucide-react";
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

// Change 8: Pass all properties through (not just coordinates)
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
        properties: Object.fromEntries(
          Object.entries(i).filter(([k]) => !["lat", "lng", "latitude", "longitude"].includes(k))
        ),
      })),
  };
}

// ---------------------------------------------------------------------------
// Layer reveal config
// ---------------------------------------------------------------------------

// Weather type translations
const WEATHER_TYPE_ES: Record<string, string> = {
  RAIN: "Lluvia", SNOW: "Nieve", WIND: "Viento", FOG: "Niebla",
  STORM: "Tormenta", HEAT: "Calor extremo", COLD: "Frío extremo",
  COASTAL: "Fenómeno costero", AVALANCHE: "Avalancha", FLOOD: "Inundación",
  ICE: "Hielo", HAIL: "Granizo", THUNDERSTORM: "Tormenta eléctrica",
  FIRE: "Riesgo de incendio", UV: "Radiación UV",
};
const WEATHER_SEV_ES: Record<string, string> = {
  LOW: "Amarilla", MEDIUM: "Naranja", HIGH: "Roja", EXTREME: "Extrema",
  YELLOW: "Amarilla", ORANGE: "Naranja", RED: "Roja",
};

// Traffic flow layers — no infrastructure, only live traffic + alerts
const LEGEND_ITEMS = [
  { label: "Provincias", color: "#c0d5ff" },
  { label: "Ciudades", color: "#1b4bd5" },
  { label: "Fluido", color: "#059669" },
  { label: "Lento", color: "#eab308" },
  { label: "Congestionado", color: "#dc2626" },
  { label: "Alerta", color: "#dc2626" },
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
  const [userLocated, setUserLocated] = useState(false);
  // Change 4: Incident hover popup state
  const [hoveredIncident, setHoveredIncident] = useState<{ x: number; y: number; road: string; type: string; severity: string } | null>(null);
  const [weatherVisible, setWeatherVisible] = useState(false);
  const [weatherAlerts, setWeatherAlerts] = useState<Array<{ province: string; type: string; severity: string; description: string }>>([]);

  // Fly to a specific location on the map
  const flyTo = useCallback((lng: number, lat: number, zoom: number) => {
    mapInstanceRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1200, essential: true });
    setMapFocused(true);
  }, []);

  // Geolocate user → fly to location → auto-select their province
  const locateUser = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        setUserLocated(true);
        const map = mapInstanceRef.current;
        if (!map) return;
        map.flyTo({ center: [longitude, latitude], zoom: 9, duration: 1500, essential: true });
        // After fly completes, query province under user's coords and auto-select it
        map.once("moveend", () => {
          const point = map.project([longitude, latitude]);
          const features = map.queryRenderedFeatures(point, { layers: ["province-fill"] });
          if (features.length > 0) {
            const code = features[0].properties?.cod_prov;
            const name = features[0].properties?.nombre;
            if (code && name) {
              setSelected({ name, code, type: "province", href: `/provincias/${code}` });
              setMapFocused(true);
              setSelectedData(null);
              try { map.setFilter("province-hover", ["==", "cod_prov", code]); } catch {}
              Promise.allSettled([
                fetch(`/api/incidents?province=${encodeURIComponent(name)}&limit=1`).then((r) => r.json()),
                fetch(`/api/cameras?province=${encodeURIComponent(name)}&limit=1`).then((r) => r.json()),
                fetch(`/api/radars?province=${encodeURIComponent(name)}&limit=1`).then((r) => r.json()),
                fetch(`/api/gas-stations?province=${encodeURIComponent(name)}&limit=1`).then((r) => r.json()),
                fetch(`/api/chargers?province=${encodeURIComponent(name)}&limit=1`).then((r) => r.json()),
                fetch(`/api/weather?province=${encodeURIComponent(name)}`).then((r) => r.json()),
              ]).then(([inc, cam, rad, gas, ev, meteo]) => {
                setSelectedData({
                  "Incidencias": inc.status === "fulfilled" ? (inc.value.count ?? inc.value.incidents?.length ?? 0) : 0,
                  "Cámaras": cam.status === "fulfilled" ? (cam.value.count ?? 0) : 0,
                  "Radares": rad.status === "fulfilled" ? (rad.value.count ?? 0) : 0,
                  "Gasolineras": gas.status === "fulfilled" ? (gas.value.count ?? gas.value.total ?? 0) : 0,
                  "Cargadores EV": ev.status === "fulfilled" ? (ev.value.totalCount ?? ev.value.count ?? 0) : 0,
                  "Alertas meteo": meteo.status === "fulfilled" ? (meteo.value.count ?? 0) : 0,
                });
              }).catch(() => {});
            }
          } else {
            setMapFocused(true);
          }
        });
      },
      () => { /* silently fail */ },
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    let cancelled = false;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Change 5: Detect touch to disable scroll zoom on mobile
    const isTouch = typeof window !== "undefined" && "ontouchstart" in window;

    async function initMap() {
      // Dynamically import to avoid SSR issues
      const maplibregl = (await import("maplibre-gl")).default;
      await import("maplibre-gl/dist/maplibre-gl.css");

      if (cancelled || !mapRef.current) return;

      const map = new maplibregl.Map({
        container: mapRef.current,
        style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [-4.0, 39.6],
        zoom: 5.2,
        interactive: true,
        scrollZoom: !isTouch,
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
              "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.5, 8, 1.5, 12, 2.5],
              "line-opacity": 0.6,
            },
          });

          map.addLayer({
            id: "province-hover",
            type: "fill",
            source: "provinces",
            paint: { "fill-color": "#1b4bd5", "fill-opacity": 0.15 },
            filter: ["==", "cod_prov", ""],
          });

          // Change 3: Province labels layer
          map.addLayer({
            id: "province-labels",
            type: "symbol",
            source: "provinces",
            layout: {
              "text-field": ["get", "nombre"],
              "text-font": ["Open Sans Semibold"],
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
              const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2; const cLat = (Math.min(...lats) + Math.max(...lats)) / 2; const span = Math.max(Math.max(...lngs) - Math.min(...lngs), Math.max(...lats) - Math.min(...lats)); const z = span > 3 ? 7 : span > 1.5 ? 8 : span > 0.5 ? 9 : 10; map.flyTo({ center: [cLng, cLat], zoom: z, duration: 1200, essential: true });
            }

            setSelected({ name: name ?? code, code, type: "province", href: `/provincias/${code}` });
            setSelectedData(null);
            // Fetch real data from multiple APIs in parallel
            Promise.allSettled([
              fetch(`/api/incidents?province=${encodeURIComponent(name ?? code)}&limit=1`).then((r) => r.json()),
              fetch(`/api/cameras?province=${encodeURIComponent(name ?? code)}&limit=1`).then((r) => r.json()),
              fetch(`/api/radars?province=${encodeURIComponent(name ?? code)}&limit=1`).then((r) => r.json()),
              fetch(`/api/gas-stations?province=${encodeURIComponent(name ?? code)}&limit=1`).then((r) => r.json()),
              fetch(`/api/chargers?province=${encodeURIComponent(name ?? code)}&limit=1`).then((r) => r.json()),
              fetch(`/api/weather?province=${encodeURIComponent(name ?? code)}`).then((r) => r.json()),
            ]).then(([inc, cam, rad, gas, ev, meteo]) => {
              setSelectedData({
                "Incidencias": inc.status === "fulfilled" ? (inc.value.count ?? inc.value.incidents?.length ?? 0) : 0,
                "Cámaras": cam.status === "fulfilled" ? (cam.value.count ?? 0) : 0,
                "Radares": rad.status === "fulfilled" ? (rad.value.count ?? 0) : 0,
                "Gasolineras": gas.status === "fulfilled" ? (gas.value.count ?? gas.value.total ?? 0) : 0,
                "Cargadores EV": ev.status === "fulfilled" ? (ev.value.totalCount ?? ev.value.count ?? 0) : 0,
                "Alertas meteo": meteo.status === "fulfilled" ? (meteo.value.count ?? 0) : 0,
              });
            }).catch(() => {});
            setMapFocused(true);
            map.setFilter("province-hover", ["==", "cod_prov", code]);
          });
        } catch {
          // Province boundaries optional — continue without them
        }

        // ── Territory polygons (Portugal, Andorra, Gibraltar) ──
        // Change 1: Fetch from /geo/territories.geojson instead of inline rectangles
        try {
          const terrRes = await fetch("/geo/territories.geojson");
          const terrData = await terrRes.json();
          if (cancelled) return;
          map.addSource("territories", { type: "geojson", data: terrData });
        } catch {
          // Fallback: empty source if file not available
          map.addSource("territories", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        }
        map.addLayer({ id: "territory-fill", type: "fill", source: "territories", paint: { "fill-color": "#1b4bd5", "fill-opacity": 0 } });
        map.addLayer({ id: "territory-outline", type: "line", source: "territories", paint: { "line-color": "#94b6ff", "line-width": 1.5, "line-opacity": 0.6, "line-dasharray": [4, 3] } });
        map.addLayer({ id: "territory-hover", type: "fill", source: "territories", paint: { "fill-color": "#1b4bd5", "fill-opacity": 0.12 }, filter: ["==", "name", ""] });
        map.on("mousemove", "territory-fill", (e) => { if (!e.features?.length) return; map.getCanvas().style.cursor = "pointer"; const n = e.features[0].properties?.name; if (n) { map.setFilter("territory-hover", ["==", "name", n]); setHoveredProvince(n); } });
        map.on("mouseleave", "territory-fill", () => { map.getCanvas().style.cursor = ""; map.setFilter("territory-hover", ["==", "name", ""]); setHoveredProvince(null); });
        map.on("click", "territory-fill", (e) => { e.originalEvent.stopPropagation(); if (!e.features?.length) return; const props = e.features[0].properties; if (!props?.name) return; const geo = e.features[0].geometry; if (geo.type === "Polygon") { const coords = geo.coordinates[0]; const lngs = coords.map((c: number[]) => c[0]); const lats = coords.map((c: number[]) => c[1]); map.flyTo({ center: [(Math.min(...lngs)+Math.max(...lngs))/2,(Math.min(...lats)+Math.max(...lats))/2], zoom: props.name === "Andorra" ? 11 : props.name === "Gibraltar" ? 14 : 7, duration: 1200, essential: true }); } setSelected({ name: props.name, code: props.slug, type: "country", href: props.slug }); setMapFocused(true); setSelectedData(null); if (props.dataUrl) { fetch(props.dataUrl).then(r=>r.json()).then(d=>{ if (props.slug==="/portugal") setSelectedData({"Gasolineras":d.count??d.total??"3.000+","Fuente":"DGEG","Meteo":"IPMA","Accidentes":"ANSR"}); else if (props.slug==="/andorra") setSelectedData({"Incidencias":d.incidents?.length??d.count??0,"Fuente":"Mobilitat","Cámaras":"En vivo"}); }).catch(()=>{}); } else { setSelectedData({"Territorio":"Británico","Frontera":"España","Acceso":"La Línea"}); } });

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

        // ── Traffic flow layer — live speed from DGT detectors ──
        try {
          const speedRes = await fetch("/api/roads/live-speed");
          const speedData = await speedRes.json();
          if (cancelled) return;

          if (speedData.success && speedData.data) {
            map.addSource("traffic-flow", { type: "geojson", data: speedData.data });

            // Color-coded dots showing traffic speed on roads
            map.addLayer({
              id: "traffic-flow",
              type: "circle",
              source: "traffic-flow",
              paint: {
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 8, 4, 12, 7],
                "circle-color": ["get", "color"], // pre-computed green/yellow/orange/red
                "circle-opacity": 0,
                "circle-opacity-transition": { duration: 1000, delay: 0 },
                "circle-stroke-width": 0.5,
                "circle-stroke-color": "rgba(255,255,255,0.5)",
                "circle-stroke-opacity": 0,
                "circle-stroke-opacity-transition": { duration: 1000, delay: 0 },
              },
            });

            // Change 6: Build road line segments from detector points
            const roadGroups: Record<string, Array<{lng: number; lat: number; color: string; km: number}>> = {};
            for (const feat of speedData.data.features) {
              const road = feat.properties.road;
              const km = feat.properties.kmPoint ?? 0;
              if (!road) continue;
              if (!roadGroups[road]) roadGroups[road] = [];
              roadGroups[road].push({
                lng: feat.geometry.coordinates[0],
                lat: feat.geometry.coordinates[1],
                color: feat.properties.color,
                km,
              });
            }

            const lineFeatures: object[] = [];
            for (const [, points] of Object.entries(roadGroups)) {
              if (points.length < 2) continue;
              points.sort((a, b) => a.km - b.km);
              for (let i = 0; i < points.length - 1; i++) {
                const a = points[i], b = points[i + 1];
                // Skip if points are too far apart (>50km gap = different road section)
                const dist = Math.sqrt((a.lng - b.lng) ** 2 + (a.lat - b.lat) ** 2);
                if (dist > 0.5) continue; // ~50km in degrees
                lineFeatures.push({
                  type: "Feature",
                  geometry: { type: "LineString", coordinates: [[a.lng, a.lat], [b.lng, b.lat]] },
                  properties: { color: a.color },
                });
              }
            }

            if (lineFeatures.length > 0) {
              map.addSource("traffic-lines", {
                type: "geojson",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                data: { type: "FeatureCollection", features: lineFeatures as any[] },
              });
              map.addLayer({
                id: "traffic-lines",
                type: "line",
                source: "traffic-lines",
                paint: {
                  "line-color": ["get", "color"],
                  "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2, 8, 4, 12, 6],
                  "line-opacity": 0,
                  "line-opacity-transition": { duration: 1000, delay: 0 },
                },
              }, "traffic-flow"); // Insert below circle dots

              setTimeout(() => {
                if (cancelled) return;
                map.setPaintProperty("traffic-lines", "line-opacity", 0.7);
              }, prefersReducedMotion ? 0 : 600);
            }

            // Reveal traffic flow
            setTimeout(() => {
              if (cancelled) return;
              map.setPaintProperty("traffic-flow", "circle-opacity", 0.85);
              map.setPaintProperty("traffic-flow", "circle-stroke-opacity", 0.85);

              // Change 2: Pulse congested dots
              let pulsePhase = 0;
              const pulseInterval = setInterval(() => {
                if (cancelled || !map.getLayer("traffic-flow")) { clearInterval(pulseInterval); return; }
                pulsePhase = (pulsePhase + 1) % 2;
                map.setPaintProperty("traffic-flow", "circle-opacity", pulsePhase === 0 ? 0.85 : 0.6);
              }, 2000);

              map.once("remove", () => clearInterval(pulseInterval));
            }, prefersReducedMotion ? 0 : 800);
          }
        } catch {
          // Traffic flow optional
        }

        // ── Important incidents — only HIGH/VERY_HIGH severity ──
        try {
          const incRes = await fetch("/api/incidents?limit=100");
          const incData = await incRes.json();
          if (cancelled) return;

          const incidents = Array.isArray(incData?.incidents) ? incData.incidents : [];
          // Filter to important incidents only (HIGH + VERY_HIGH)
          const importantIncidents = incidents.filter(
            (i: Record<string, unknown>) => i.severity === "HIGH" || i.severity === "VERY_HIGH"
          );

          const incGeoJSON = toGeoJSON(importantIncidents);

          map.addSource("alerts", { type: "geojson", data: incGeoJSON });

          // Pulsing alert circles for important incidents
          map.addLayer({
            id: "alerts-glow",
            type: "circle",
            source: "alerts",
            paint: {
              "circle-radius": 12,
              "circle-color": "#dc2626",
              "circle-opacity": 0,
              "circle-opacity-transition": { duration: 800, delay: 0 },
              "circle-blur": 0.8,
            },
          });

          map.addLayer({
            id: "alerts-dot",
            type: "circle",
            source: "alerts",
            paint: {
              "circle-radius": 4,
              "circle-color": "#dc2626",
              "circle-opacity": 0,
              "circle-opacity-transition": { duration: 800, delay: 0 },
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.5,
              "circle-stroke-opacity": 0,
              "circle-stroke-opacity-transition": { duration: 800, delay: 0 },
            },
          });

          // Change 4: Incident hover popups
          map.on("mousemove", "alerts-dot", (e) => {
            if (!e.features?.length) return;
            map.getCanvas().style.cursor = "pointer";
            const p = e.features[0].properties;
            setHoveredIncident({
              x: e.point.x,
              y: e.point.y,
              road: p?.roadNumber ?? p?.road ?? "Desconocida",
              type: p?.type ?? p?.detailedCauseType ?? "Incidencia",
              severity: p?.severity ?? "HIGH",
            });
          });
          map.on("mouseleave", "alerts-dot", () => {
            map.getCanvas().style.cursor = "";
            setHoveredIncident(null);
          });

          // Reveal alerts
          setTimeout(() => {
            if (cancelled) return;
            map.setPaintProperty("alerts-glow", "circle-opacity", 0.3);
            map.setPaintProperty("alerts-dot", "circle-opacity", 1);
            map.setPaintProperty("alerts-dot", "circle-stroke-opacity", 1);
            setLegendVisible(true);
          }, prefersReducedMotion ? 0 : 1500);
        } catch {
          setLegendVisible(true);
        }

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
    <section className="relative h-[60vh] md:h-[80vh] min-h-[420px] md:min-h-[580px] max-h-[760px] overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Full-width MapLibre background — light Positron style */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full opacity-90" />

      {/* Light gradient scrim — only at the bottom for text readability, fades when map is focused */}
      <div className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${mapFocused ? "opacity-0" : "opacity-100"}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-white/90 from-0% via-white/30 via-25% to-transparent dark:from-gray-950/90 dark:from-0% dark:via-gray-950/30 dark:via-25% dark:to-transparent" />
      </div>

      {/* Top bar — technical data feed look */}
      {/* Province hover tooltip */}
      {hoveredProvince && (
        <div className="absolute top-14 left-4 sm:left-6 lg:left-8 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pointer-events-none z-20 shadow-sm">
          <p className="text-sm font-heading font-semibold text-gray-900 dark:text-gray-100">{hoveredProvince}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Clic para ver tráfico en esta provincia</p>
        </div>
      )}

      {/* Change 4: Incident hover popup tooltip */}
      {hoveredIncident && (
        <div
          className="fixed z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg pointer-events-none"
          style={{ left: hoveredIncident.x + 12, top: hoveredIncident.y - 10 }}
        >
          <p className="text-xs font-heading font-semibold text-signal-red">{hoveredIncident.road}</p>
          <p className="text-[0.65rem] text-gray-500">{hoveredIncident.type} · {hoveredIncident.severity}</p>
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

      {/* Weather alerts panel */}
      {weatherVisible && !selected && (
        <div className="absolute top-14 right-4 sm:right-6 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-w-sm w-72 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-900/95">
            <p className="text-xs font-heading font-semibold text-gray-900 dark:text-gray-100">
              Alertas AEMET
              <span className="ml-1.5 font-data text-[0.6rem] text-gray-400 font-normal">{weatherAlerts.length}</span>
            </p>
            <button onClick={() => { setWeatherVisible(false); setWeatherAlerts([]); }} className="text-[0.6rem] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">Cerrar</button>
          </div>
          {weatherAlerts.length > 0 ? (
            <div className="px-4 py-2 space-y-1">
              {weatherAlerts.map((a, i) => {
                const sevColor = a.severity === "RED" || a.severity === "EXTREME" || a.severity === "HIGH" ? "bg-signal-red" : a.severity === "ORANGE" || a.severity === "MEDIUM" ? "bg-tl-amber-400" : "bg-tl-amber-300";
                return (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${sevColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{a.province}</p>
                      <p className="text-[0.6rem] text-gray-500 dark:text-gray-400">
                        {WEATHER_TYPE_ES[a.type] ?? a.type} · Alerta {WEATHER_SEV_ES[a.severity] ?? a.severity}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-gray-400">Sin alertas meteorológicas activas</p>
              <p className="text-[0.6rem] text-gray-300 dark:text-gray-600 mt-1">Fuente: AEMET</p>
            </div>
          )}
        </div>
      )}

      {/* Rich sidebar panel — province or territory details */}
      {selected && (
        <div className="absolute top-0 left-0 bottom-0 w-full sm:w-[340px] z-20 bg-white/97 dark:bg-gray-950/97 backdrop-blur-md border-r border-gray-200 dark:border-gray-700 shadow-2xl overflow-y-auto">
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
                  setMapFocused(false);
                  mapInstanceRef.current?.flyTo({ center: [-4.0, 39.6], zoom: 5.2, duration: 800 });
                  try { mapInstanceRef.current?.setFilter("province-hover", ["==", "cod_prov", ""]); } catch {}
                }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0 mt-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1"
              >
                Volver
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

            {/* Risk & traffic health (province only) */}
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

            {/* Quick links for the province */}
            <div className="space-y-1 mb-4">
              <p className="text-[0.6rem] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold mb-1.5">Secciones disponibles</p>
              {(selected.type === "province"
                ? [
                    { label: "Incidencias en vivo", href: `${selected.href}#incidencias` },
                    { label: "Cámaras DGT", href: `${selected.href}#camaras` },
                    { label: "Radares", href: `${selected.href}#radares` },
                    { label: "Gasolineras y precios", href: `${selected.href}#combustible` },
                    { label: "Cargadores EV", href: `${selected.href}#carga-ev` },
                    { label: "Meteorología", href: `${selected.href}#meteo` },
                    { label: "Carreteras", href: `${selected.href}#carreteras` },
                    { label: "Accidentalidad histórica", href: `${selected.href}#accidentes` },
                    { label: "Zonas de riesgo", href: `${selected.href}#riesgo` },
                  ]
                : selected.code === "/portugal"
                  ? [
                      { label: "Combustible Portugal", href: "/portugal/combustible" },
                      { label: "Meteorología IPMA", href: "/portugal" },
                      { label: "Accidentes ANSR", href: "/portugal" },
                    ]
                  : selected.code === "/andorra"
                    ? [
                        { label: "Incidencias Mobilitat", href: "/andorra" },
                        { label: "Cámaras en vivo", href: "/andorra" },
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

      {/* Quick access: off-screen territories + geolocation */}
      {/* Change 5: flex-row on mobile, flex-col on sm+ with overflow-x-auto */}
      <div className="absolute bottom-20 right-4 sm:right-6 z-20 flex flex-row sm:flex-col gap-1.5 overflow-x-auto">
        {/* Locate me */}
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
        {/* Change 7: Weather toggle button */}
        <button
          onClick={async () => {
            const map = mapInstanceRef.current;
            if (!map) return;
            if (weatherVisible) {
              if (map.getLayer("weather-zones")) map.removeLayer("weather-zones");
              if (map.getSource("weather-zones")) map.removeSource("weather-zones");
              setWeatherVisible(false);
            } else {
              try {
                const res = await fetch("/api/weather");
                const data = await res.json();
                const alerts = (data.alerts ?? []).slice(0, 8).map((a: Record<string, unknown>) => ({
                  province: String(a.provinceName ?? a.province ?? ""),
                  type: String(a.type ?? ""),
                  severity: String(a.severity ?? ""),
                  description: String(a.description ?? ""),
                }));
                setWeatherAlerts(alerts);
                setWeatherVisible(true);
              } catch {}
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all backdrop-blur-sm border shadow-sm ${
            weatherVisible
              ? "bg-tl-600 text-white border-tl-600"
              : "bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-tl-300"
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          Meteo
        </button>
        {/* Off-screen territories */}
        <button onClick={() => flyTo(-15.5, 28.1, 8)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-tl-300 transition-all shadow-sm">
          Canarias
        </button>
        <button onClick={() => flyTo(-5.34, 35.89, 13)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-tl-300 transition-all shadow-sm">
          Ceuta
        </button>
        <button onClick={() => flyTo(-2.95, 35.29, 13)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-tl-300 transition-all shadow-sm">
          Melilla
        </button>
      </div>
    </section>
  );
}
