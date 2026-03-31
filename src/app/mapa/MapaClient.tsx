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
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const UnifiedMap = dynamic(
  () => import("@/components/map/UnifiedMap").then((m) => m.UnifiedMap),
  { ssr: false }
);

function MapLoading() {
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-900 animate-pulse flex items-center justify-center" style={{ height: "calc(100vh - 64px)" }}>
      <div className="text-center">
        <MapIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Cargando mapa interactivo...</p>
      </div>
    </div>
  );
}

const DATA_LAYERS = [
  { icon: AlertTriangle, name: "Balizas V16", desc: "Emergencias activas en carretera", color: "text-red-500" },
  { icon: AlertTriangle, name: "Incidencias", desc: "Accidentes, obras, cortes — DGT + 5 fuentes regionales", color: "text-orange-500" },
  { icon: Camera, name: "Cámaras DGT", desc: "1.500+ cámaras con imagen en directo", color: "text-blue-500" },
  { icon: Route, name: "Red viaria", desc: "Autopistas, autovías y nacionales", color: "text-cyan-500" },
  { icon: Radar, name: "Radares", desc: "Fijos, tramo, móviles y semáforos", color: "text-yellow-500" },
  { icon: CloudRain, name: "Alertas meteo", desc: "AEMET: lluvia, nieve, viento, niebla", color: "text-blue-400" },
  { icon: Zap, name: "Cargadores EV", desc: "4.000+ puntos de recarga eléctrica", color: "text-green-500" },
  { icon: Fuel, name: "Gasolineras", desc: "11.000+ con precios actualizados", color: "text-orange-400" },
  { icon: Anchor, name: "Marítimas", desc: "Combustible en puertos", color: "text-blue-500" },
  { icon: Monitor, name: "Paneles PMV", desc: "Mensajes variables en tiempo real", color: "text-cyan-400" },
  { icon: ShieldAlert, name: "Zonas riesgo", desc: "Fauna, motos, ciclistas, peatones", color: "text-red-400" },
  { icon: Ban, name: "Zonas ZBE", desc: "Bajas emisiones con restricciones", color: "text-purple-500" },
  { icon: MapPin, name: "Provincias", desc: "Datos por provincia", color: "text-indigo-500" },
  { icon: CloudLightning, name: "Radar meteo", desc: "Precipitación en tiempo real", color: "text-violet-500" },
];

const TOOLS = [
  { icon: History, name: "Timeline 24h", desc: "Reproduce incidencias de las últimas 24 horas" },
  { icon: Mountain, name: "Terreno 3D", desc: "Elevación con vista inclinada a 60°" },
  { icon: Route, name: "Corredor", desc: "Datos km a km de una carretera" },
  { icon: Activity, name: "Flujo", desc: "Estado de cada tramo animado" },
  { icon: ArrowLeftRight, name: "Comparador", desc: "Actual vs 1h/6h/12h/24h/48h/7d atrás" },
  { icon: CloudLightning, name: "Radar meteo", desc: "Overlay de precipitación" },
  { icon: Volume2, name: "Voz", desc: "Lee incidencias en voz alta" },
  { icon: Moon, name: "Oscuro", desc: "Mapa nocturno Dark Matter" },
  { icon: Brain, name: "AI Insights", desc: "Análisis de zona al hacer zoom" },
  { icon: Navigation, name: "GPS", desc: "Tu ubicación en tiempo real" },
  { icon: Radio, name: "LIVE", desc: "Push SSE sin recargar" },
];

export function MapaClient() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact header banner */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-tl-600 flex items-center justify-center">
              <MapIcon className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold text-gray-900 dark:text-white leading-tight">
                Mapa Interactivo de Tráfico
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                14 capas de datos en tiempo real de toda España
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
            <span>DGT + AEMET + 4 fuentes</span>
          </div>
        </div>
      </div>

      {/* THE MAP — full viewport */}
      <main className="px-2 sm:px-4 pt-2">
        <Suspense fallback={<MapLoading />}>
          <UnifiedMap defaultHeight="calc(100vh - 120px)" showStats={true} />
        </Suspense>
      </main>

      {/* Below the map: feature info for SEO + users who scroll */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 mt-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white mb-6">
            14 capas de datos
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {DATA_LAYERS.map((layer) => (
              <div
                key={layer.name}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-xs"
              >
                <layer.icon className={`w-4 h-4 flex-shrink-0 ${layer.color}`} />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{layer.name}</span>
                  <p className="text-gray-400 leading-tight mt-0.5">{layer.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white mb-6">
            11 herramientas interactivas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="flex items-start gap-2.5 p-3 rounded-lg border border-gray-100 dark:border-gray-800"
              >
                <tool.icon className="w-4 h-4 text-tl-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-sm text-gray-900 dark:text-white">{tool.name}</span>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{tool.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Mapa Interactivo de Tráfico — trafico.live",
            description: "El mapa de tráfico más completo de España con 14 capas de datos en tiempo real",
            url: `${BASE_URL}/mapa`,
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
            author: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
          }),
        }}
      />
    </div>
  );
}
