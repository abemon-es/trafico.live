import { Suspense } from "react";
import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
import { Loader2, MapPin, Video, Route, Car, BarChart2, BarChart3, CloudLightning, AlertOctagon, Ban } from "lucide-react";
import Link from "next/link";
import { IncidenciasContent } from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

export const metadata: Metadata = {
  title: "Incidencias de Tráfico",
  description:
    "Mapa en tiempo real de incidencias en las carreteras españolas. Cortes de carretera, obras, accidentes y condiciones meteorológicas adversas.",
  openGraph: {
    title: "Incidencias de Tráfico en Tiempo Real — España",
    description:
      "Mapa en tiempo real de incidencias en las carreteras españolas. Cortes de carretera, obras, accidentes y condiciones meteorológicas adversas.",
    url: `${BASE_URL}/incidencias`,
    type: "website",
    locale: "es_ES",
  },
  alternates: {
    canonical: `${BASE_URL}/incidencias`,
  },
};

// The ten city pages, linked visibly in the server HTML: the content above
// loads its data in the browser.
const TRAFFIC_CITY_LINKS = [
  { city: "madrid", name: "Madrid" },
  { city: "barcelona", name: "Barcelona" },
  { city: "valencia", name: "Valencia" },
  { city: "sevilla", name: "Sevilla" },
  { city: "malaga", name: "Málaga" },
  { city: "zaragoza", name: "Zaragoza" },
  { city: "bilbao", name: "Bilbao" },
  { city: "alicante", name: "Alicante" },
  { city: "murcia", name: "Murcia" },
  { city: "granada", name: "Granada" },
];

function IncidenciasLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Cargando incidencias...</span>
      </div>
    </div>
  );
}

export default function IncidenciasPage() {
  return (
    <>
      {/* Server-rendered header — H1 is immediately in the HTML, visible to crawlers */}
      <div className="bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-0">
          <Breadcrumbs items={[
            { name: "Inicio", href: "/" },
            { name: "Incidencias", href: "/incidencias" },
          ]} />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Incidencias de Tráfico
          </h1>
          <p className="mt-1 mb-4 text-gray-600 dark:text-gray-400 max-w-3xl">
            Mapa en tiempo real de incidencias en las carreteras españolas. Consulta cortes
            de carretera, retenciones, obras, accidentes y alertas meteorológicas reportadas
            por la DGT, SCT, Euskadi, la Junta de Castilla y León (situadas con sus puntos
            kilométricos, IDECyL), Madrid y Valencia.
          </p>
          <h2 className="sr-only">Mapa y listado de incidencias activas en carreteras de España</h2>
        </div>
      </div>

      {/* SSR analytics links — visible to crawlers, placed before client Suspense */}
      <div className="bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 flex flex-wrap gap-3">
          <Link
            href="/incidencias/analytics"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
          >
            <BarChart2 className="w-4 h-4 text-tl-600 dark:text-tl-400" />
            Estadísticas de incidencias
          </Link>
          <Link
            href="/incidencias/analytics"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-tl-600 dark:text-tl-400" />
            Análisis de incidencias
          </Link>
        </div>
      </div>

      {/* Client component with interactive map, filters, and live SWR data */}
      <Suspense fallback={<IncidenciasLoading />}>
        <IncidenciasContent />
      </Suspense>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <section aria-labelledby="city-traffic-heading" className="mt-8">
          <h2 id="city-traffic-heading" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Tráfico por ciudad
          </h2>
          <ul className="flex flex-wrap gap-2">
            {TRAFFIC_CITY_LINKS.map(({ city, name }) => (
              <li key={city}>
                <Link
                  href={`/trafico/${city}`}
                  className="inline-block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:border-tl-300 dark:hover:border-tl-700 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <RelatedLinks links={[
          { title: "Estado del tráfico en tiempo real", description: "Mapa interactivo con todas las capas de datos", href: "/trafico", icon: <MapPin className="w-5 h-5" /> },
          { title: "Cámaras DGT", description: "Imágenes en vivo de las principales carreteras", href: "/camaras", icon: <Video className="w-5 h-5" /> },
          { title: "Carreteras de España", description: "Red viaria nacional por tipo y provincia", href: "/carreteras", icon: <Route className="w-5 h-5" /> },
          { title: "Atascos y retenciones", description: "Puntos negros de tráfico y vías saturadas", href: "/atascos", icon: <Car className="w-5 h-5" /> },
          { title: "Estadísticas de incidencias", description: "Tendencias y patrones históricos de incidencias", href: "/incidencias/analytics", icon: <BarChart2 className="w-5 h-5" /> },
          { title: "Restricciones de circulación", description: "Restricciones a camiones y vehículos por fecha y carretera", href: "/restricciones", icon: <Ban className="w-5 h-5" /> },
          { title: "Cortes de tráfico", description: "Cortes de carretera activos en España", href: "/cortes-trafico", icon: <AlertOctagon className="w-5 h-5" /> },
          { title: "Alertas meteorológicas", description: "Alertas AEMET que afectan a la circulación", href: "/alertas-meteo", icon: <CloudLightning className="w-5 h-5" /> },
        ]} />
      </div>
    </>
  );
}
