"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import {
  Map as MapIcon,
  AlertTriangle,
  Camera,
  Route,
  Radar,
  Zap,
  Fuel,
  CloudRain,
  Ban,
  Monitor,
  ShieldAlert,
  Anchor,
  MapPin,
  History,
  Mountain,
  Activity,
  ArrowLeftRight,
  Moon,
  Volume2,
  CloudLightning,
  Brain,
  Navigation,
  Radio,
  Maximize2,
  ChevronRight,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const UnifiedMap = dynamic(
  () => import("@/components/map/UnifiedMap").then((m) => m.UnifiedMap),
  { ssr: false }
);

function MapLoading() {
  return (
    <div
      className="w-full bg-tl-50 dark:bg-gray-900 animate-pulse flex items-center justify-center"
      style={{ height: "calc(100vh - 120px)" }}
    >
      <div className="text-center">
        <MapIcon className="w-16 h-16 text-tl-200 dark:text-tl-800 mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Cargando mapa interactivo...</p>
      </div>
    </div>
  );
}

const FEATURE_PILLS = [
  { icon: AlertTriangle, label: "Incidencias" },
  { icon: Camera, label: "Cámaras" },
  { icon: Radar, label: "Radares" },
  { icon: Fuel, label: "Gasolineras" },
  { icon: Zap, label: "Cargadores EV" },
  { icon: CloudRain, label: "Meteo" },
  { icon: Ban, label: "ZBE" },
];

const FEATURE_CATEGORIES = [
  {
    title: "Datos de tráfico",
    items: [
      { icon: AlertTriangle, name: "Balizas V16", desc: "Emergencias activas en carretera con localización exacta" },
      { icon: AlertTriangle, name: "Incidencias", desc: "Accidentes, obras y cortes de DGT más 5 fuentes regionales" },
      { icon: Camera, name: "Cámaras DGT", desc: "Más de 1.500 cámaras con imagen en directo de toda la red" },
      { icon: Monitor, name: "Paneles PMV", desc: "Mensajes variables en tiempo real en autopistas y vías" },
    ],
  },
  {
    title: "Infraestructura",
    items: [
      { icon: Fuel, name: "Gasolineras", desc: "11.000+ estaciones con precios actualizados a diario" },
      { icon: Zap, name: "Cargadores EV", desc: "4.000+ puntos de recarga eléctrica en toda España" },
      { icon: Radar, name: "Radares", desc: "Radares fijos, de tramo, móviles y de semáforo" },
      { icon: Anchor, name: "Combustible marítimo", desc: "Precios de combustible en puertos deportivos" },
    ],
  },
  {
    title: "Análisis y entorno",
    items: [
      { icon: ShieldAlert, name: "Zonas de riesgo", desc: "Fauna, motoristas, ciclistas y peatones en puntos críticos" },
      { icon: Ban, name: "Zonas ZBE", desc: "Restricciones de bajas emisiones en ciudades" },
      { icon: CloudRain, name: "Alertas meteo", desc: "AEMET: lluvia, nieve, viento, niebla y fenómenos extremos" },
      { icon: MapPin, name: "Provincias", desc: "Datos agregados por provincia y comunidad autónoma" },
    ],
  },
];

const TOOLS = [
  { icon: History, name: "Timeline 24h", desc: "Reproduce incidencias de las últimas 24 horas", highlight: false },
  { icon: Brain, name: "AI Insights", desc: "Análisis inteligente de la zona al hacer zoom", highlight: true },
  { icon: ArrowLeftRight, name: "Comparador", desc: "Actual vs 1h / 6h / 12h / 24h / 48h / 7d atrás", highlight: true },
  { icon: Route, name: "Corredor", desc: "Datos km a km de una carretera nacional", highlight: true },
  { icon: Mountain, name: "Terreno 3D", desc: "Elevación con vista inclinada a 60°", highlight: false },
  { icon: Activity, name: "Flujo animado", desc: "Estado de cada tramo animado en tiempo real", highlight: false },
  { icon: CloudLightning, name: "Radar meteo", desc: "Overlay de precipitación sobre el mapa", highlight: false },
  { icon: Volume2, name: "Voz", desc: "Lee incidencias en voz alta sin mirar la pantalla", highlight: false },
  { icon: Moon, name: "Modo oscuro", desc: "Mapa nocturno Dark Matter para conducción", highlight: false },
  { icon: Navigation, name: "GPS", desc: "Tu ubicación en tiempo real centrada en el mapa", highlight: false },
  { icon: Radio, name: "LIVE push", desc: "Actualizaciones SSE sin necesidad de recargar", highlight: false },
];

const DATA_SOURCES = ["DGT", "AEMET", "SCT", "Euskadi", "Madrid", "Valencia", "MINETUR"];

function scrollToMap() {
  document.getElementById("mapa-interactivo")?.scrollIntoView({ behavior: "smooth" });
}

function openFullscreen() {
  const el = document.getElementById("mapa-interactivo");
  if (el && el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  }
}

export function MapaClient() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          {/* LIVE badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Datos en tiempo real
            </span>
          </div>

          {/* Headline + CTAs */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
                El mapa de tráfico más completo de España
              </h1>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                14 capas de datos en tiempo real de 6 fuentes oficiales
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={scrollToMap}
                className="inline-flex items-center gap-2 rounded-lg bg-tl-600 hover:bg-tl-700 active:bg-tl-800 text-white font-medium text-sm px-4 py-2.5 transition-colors"
              >
                <MapIcon className="w-4 h-4" />
                Abrir mapa interactivo
              </button>
              <button
                onClick={openFullscreen}
                className="inline-flex items-center gap-2 rounded-lg border border-tl-200 dark:border-tl-800 text-tl-700 dark:text-tl-400 hover:bg-tl-50 dark:hover:bg-tl-950 font-medium text-sm px-4 py-2.5 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
                Pantalla completa
              </button>
            </div>
          </div>

          {/* Feature pills row */}
          <div className="mt-6 -mx-4 sm:mx-0 overflow-x-auto">
            <div className="flex gap-2 px-4 sm:px-0 flex-nowrap sm:flex-wrap pb-1">
              {FEATURE_PILLS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={scrollToMap}
                  className="inline-flex items-center gap-1.5 flex-shrink-0 rounded-full border border-gray-200 dark:border-gray-700 bg-tl-50 dark:bg-gray-800 hover:border-tl-300 dark:hover:border-tl-700 hover:bg-tl-100 dark:hover:bg-tl-950 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 text-tl-500" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MAP SECTION ──────────────────────────────────────────── */}
      <section id="mapa-interactivo" className="px-2 sm:px-4 pt-3">
        <div className="max-w-7xl mx-auto mb-2 px-2 sm:px-0 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-tl-500" />
            Mapa interactivo
          </h2>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </span>
        </div>
        <Suspense fallback={<MapLoading />}>
          <UnifiedMap defaultHeight="calc(100vh - 120px)" showStats={true} />
        </Suspense>
      </section>

      {/* ── FEATURES GRID ────────────────────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 mt-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">
              14 capas de datos
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Toda la información que necesitas para conducir por España, en un solo mapa
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {FEATURE_CATEGORIES.map((cat) => (
              <div key={cat.title} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-tl-50 dark:bg-tl-950">
                  <h3 className="font-heading text-sm font-semibold text-tl-700 dark:text-tl-300">
                    {cat.title}
                  </h3>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {cat.items.map(({ icon: Icon, name, desc }) => (
                    <div
                      key={name}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                    >
                      <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-md bg-tl-50 dark:bg-tl-950 flex items-center justify-center group-hover:bg-tl-100 dark:group-hover:bg-tl-900 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-tl-600 dark:text-tl-400" />
                      </div>
                      <div>
                        <p className="font-heading text-sm font-semibold text-gray-900 dark:text-white">
                          {name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                          {desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOOLS SHOWCASE ───────────────────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">
              11 herramientas interactivas
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Análisis avanzado del tráfico, más allá de ver el mapa
            </p>
          </div>

          {/* Mobile: horizontal scroll; Desktop: grid */}
          <div className="-mx-4 sm:mx-0 overflow-x-auto sm:overflow-visible">
            <div className="flex gap-3 px-4 sm:px-0 pb-2 flex-nowrap sm:flex-wrap sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {TOOLS.map(({ icon: Icon, name, desc, highlight }) => (
                <div
                  key={name}
                  className={[
                    "flex-shrink-0 w-52 sm:w-auto flex flex-col gap-2 p-4 rounded-xl border transition-all duration-150",
                    "hover:shadow-md hover:-translate-y-0.5",
                    highlight
                      ? "border-tl-200 dark:border-tl-800 bg-tl-50 dark:bg-tl-950"
                      : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950",
                  ].join(" ")}
                >
                  <div className={[
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    highlight
                      ? "bg-tl-100 dark:bg-tl-900"
                      : "bg-white dark:bg-gray-800",
                  ].join(" ")}>
                    <Icon className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                  </div>
                  <div>
                    <p className="font-heading text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                      {name}
                      {highlight && (
                        <span className="text-[10px] font-medium text-tl-600 dark:text-tl-400 bg-tl-100 dark:bg-tl-900 px-1.5 py-0.5 rounded-full">
                          Pro
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── DATA SOURCES BAR ─────────────────────────────────────── */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 mr-1">
              Fuentes oficiales:
            </span>
            {DATA_SOURCES.map((source) => (
              <span
                key={source}
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400"
              >
                {source}
              </span>
            ))}
            <a
              href="/"
              className="ml-auto inline-flex items-center gap-1 text-xs text-tl-600 dark:text-tl-400 hover:underline"
            >
              Ver todos los datos
              <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>

      {/* ── STRUCTURED DATA ──────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Mapa Interactivo de Tráfico — trafico.live",
            description:
              "El mapa de tráfico más completo de España con 14 capas de datos en tiempo real",
            url: `${BASE_URL}/mapa`,
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
            author: {
              "@type": "Organization",
              name: "trafico.live",
              url: BASE_URL,
            },
          }),
        }}
      />
    </div>
  );
}
