"use client";

import { Suspense, useRef } from "react";
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
  ChevronDown,
  Radio,
} from "lucide-react";

const UnifiedMap = dynamic(
  () => import("@/components/map/UnifiedMap").then((m) => m.UnifiedMap),
  { ssr: false }
);

function MapLoading() {
  return (
    <div className="w-full h-[70vh] bg-gray-100 dark:bg-gray-900 animate-pulse flex items-center justify-center rounded-2xl">
      <MapIcon className="w-16 h-16 text-gray-300" />
    </div>
  );
}

const DATA_LAYERS = [
  { icon: AlertTriangle, name: "Balizas V16", desc: "Emergencias activas en carretera detectadas por dispositivos V16", color: "text-red-500" },
  { icon: AlertTriangle, name: "Incidencias", desc: "Accidentes, obras, cortes y retenciones de la DGT y 5 fuentes regionales", color: "text-orange-500" },
  { icon: Camera, name: "Cámaras DGT", desc: "Más de 1.500 cámaras de tráfico con imagen en directo", color: "text-blue-500" },
  { icon: Route, name: "Red de autovías", desc: "Autopistas, autovías y carreteras nacionales con identificador", color: "text-cyan-500" },
  { icon: Radar, name: "Radares", desc: "Radares fijos, de tramo, móviles y semáforos foto-rojo", color: "text-yellow-500" },
  { icon: CloudRain, name: "Alertas meteo", desc: "Avisos de AEMET por provincia: lluvia, nieve, viento, niebla", color: "text-blue-400" },
  { icon: Zap, name: "Cargadores EV", desc: "Más de 4.000 puntos de recarga eléctrica con potencia y conectores", color: "text-green-500" },
  { icon: Fuel, name: "Gasolineras", desc: "11.000+ estaciones con precios actualizados 3 veces al día", color: "text-orange-400" },
  { icon: Anchor, name: "Estaciones marítimas", desc: "Combustible en puertos con precios de gasóleo y gasolina", color: "text-blue-500" },
  { icon: Monitor, name: "Paneles variables", desc: "Mensajes PMV en tiempo real con aviso luminoso cuando hay mensaje", color: "text-cyan-400" },
  { icon: ShieldAlert, name: "Zonas de riesgo", desc: "Tramos peligrosos: fauna, motoristas, ciclistas, peatones", color: "text-red-400" },
  { icon: Ban, name: "Zonas ZBE", desc: "Zonas de bajas emisiones con restricciones, horarios y multas", color: "text-purple-500" },
  { icon: MapPin, name: "Provincias", desc: "Navegación rápida a datos de cualquier provincia de España", color: "text-indigo-500" },
  { icon: CloudLightning, name: "Radar meteorológico", desc: "Overlay de precipitación en tiempo real sobre el mapa", color: "text-violet-500" },
];

const TOOLS = [
  { icon: History, name: "Línea temporal", desc: "Reproduce las últimas 24 horas de incidencias con play/pause y histograma" },
  { icon: Mountain, name: "Terreno 3D", desc: "Activa la elevación del terreno con tiles de AWS y vista inclinada a 60°" },
  { icon: Route, name: "Vista corredor", desc: "Selecciona una carretera y ve todos los datos ordenados por kilómetro" },
  { icon: Activity, name: "Flujo de tráfico", desc: "Líneas animadas verde/amarillo/rojo que muestran el estado de cada tramo" },
  { icon: ArrowLeftRight, name: "Comparador temporal", desc: "Pantalla dividida: estado actual vs hace 1h, 6h, 12h, 24h, 48h o 7 días" },
  { icon: CloudLightning, name: "Radar meteo", desc: "Overlay de precipitación en tiempo real de OpenWeatherMap" },
  { icon: Volume2, name: "Alertas de voz", desc: "El mapa lee en voz alta las nuevas incidencias en español" },
  { icon: Moon, name: "Modo oscuro", desc: "Cambia a CARTO Dark Matter para conducción nocturna" },
  { icon: Brain, name: "AI Insights", desc: "Panel inteligente que aparece al hacer zoom con análisis de la zona" },
  { icon: Navigation, name: "Mi ubicación", desc: "Localización GPS con seguimiento en tiempo real" },
  { icon: Radio, name: "Tiempo real", desc: "Conexión SSE push — los datos se actualizan sin recargar la página" },
];

export function MapaClient() {
  const mapRef = useRef<HTMLDivElement>(null);

  const scrollToMap = () => {
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-tl-50 via-white to-white dark:from-tl-950 dark:via-gray-950 dark:to-gray-950 pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 text-sm font-medium mb-6">
            <Radio className="w-4 h-4" />
            <span>Datos en tiempo real — 14 capas activas</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
            El mapa de tráfico más{" "}
            <span className="text-tl-600 dark:text-tl-400">completo</span> de España
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Incidencias, radares, cámaras DGT, gasolineras con precios, cargadores eléctricos,
            alertas meteorológicas, terreno 3D, flujo de tráfico animado y mucho más.
            Todo en un solo mapa interactivo.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={scrollToMap}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-tl-600 hover:bg-tl-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-tl-600/25 hover:shadow-tl-600/40"
            >
              <MapIcon className="w-5 h-5" />
              Explorar el mapa
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3 text-tl-600 dark:text-tl-400 hover:bg-tl-50 dark:hover:bg-tl-900/20 rounded-xl font-medium transition-colors"
            >
              Ver todas las funciones
            </a>
          </div>

          {/* Stats bar */}
          <div className="mt-12 flex items-center justify-center gap-8 sm:gap-12 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 dark:text-white">14</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Capas de datos</div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-800" />
            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 dark:text-white">11</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Herramientas</div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-800" />
            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 dark:text-white">6+</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Fuentes oficiales</div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-800" />
            <div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-tl-600 dark:text-tl-400">LIVE</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Tiempo real</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Map */}
      <section ref={mapRef} className="px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="max-w-7xl mx-auto">
          <Suspense fallback={<MapLoading />}>
            <UnifiedMap defaultHeight="70vh" showStats={true} />
          </Suspense>
        </div>
      </section>

      {/* Data Layers */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              14 capas de datos en un solo mapa
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Agregamos datos de la DGT, AEMET, Ministerio de Transportes, SCT, Euskadi, Madrid y Valencia
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DATA_LAYERS.map((layer) => (
              <div
                key={layer.name}
                className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-tl-200 dark:hover:border-tl-800 transition-colors"
              >
                <layer.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${layer.color}`} />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{layer.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{layer.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Tools */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              11 herramientas interactivas
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Mucho más que un mapa estático. Reproduce, compara, analiza y escucha el tráfico
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-xl bg-tl-100 dark:bg-tl-900/30 flex items-center justify-center mb-4">
                  <tool.icon className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                </div>
                <h3 className="font-heading font-semibold text-gray-900 dark:text-white">{tool.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{tool.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Datos oficiales, actualizados cada minuto
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12">
            Todos los datos provienen de fuentes gubernamentales verificadas
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {["DGT", "AEMET", "MITMA", "SCT Catalunya", "Euskadi", "Madrid EMT", "Valencia", "MINETUR"].map((src) => (
              <span
                key={src}
                className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              >
                {src}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-tl-600 dark:bg-tl-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl font-bold text-white">
            Empieza a explorar ahora
          </h2>
          <p className="mt-4 text-tl-100 text-lg">
            Sin registro, sin coste. Datos abiertos del Gobierno de España.
          </p>
          <button
            onClick={scrollToMap}
            className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 bg-white text-tl-700 rounded-xl font-semibold text-lg transition-all hover:bg-tl-50 shadow-lg"
          >
            <MapIcon className="w-5 h-5" />
            Abrir el mapa
          </button>
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
            url: "https://trafico.live/mapa",
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
            },
            author: {
              "@type": "Organization",
              name: "trafico.live",
              url: "https://trafico.live",
            },
          }),
        }}
      />
    </div>
  );
}
