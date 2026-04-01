import { Suspense } from "react";
import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
import { Loader2, MapPin, Video, Route, Car, BarChart2, BarChart3, CloudLightning, AlertOctagon } from "lucide-react";
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
            por la DGT, SCT, Euskadi, Madrid y Valencia.
          </p>
          <h2 className="sr-only">Mapa y listado de incidencias activas en carreteras de España</h2>
        </div>
      </div>

      {/* SSR analytics links — visible to crawlers, placed before client Suspense */}
      <div className="bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 flex flex-wrap gap-3">
          <Link
            href="/incidencias/estadisticas"
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

      {/* Server-rendered city traffic links for SEO — visually hidden, fully crawlable */}
      <nav aria-label="Tráfico por ciudad" className="sr-only">
        <ul>
          {[
            { city: "madrid", label: "Tráfico en Madrid" },
            { city: "barcelona", label: "Tráfico en Barcelona" },
            { city: "valencia", label: "Tráfico en Valencia" },
            { city: "sevilla", label: "Tráfico en Sevilla" },
            { city: "malaga", label: "Tráfico en Málaga" },
            { city: "zaragoza", label: "Tráfico en Zaragoza" },
            { city: "bilbao", label: "Tráfico en Bilbao" },
            { city: "alicante", label: "Tráfico en Alicante" },
            { city: "murcia", label: "Tráfico en Murcia" },
            { city: "granada", label: "Tráfico en Granada" },
          ].map(({ city, label }) => (
            <li key={city}>
              <Link href={`/trafico/${city}`}>{label}</Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* SSR crawlable related-page links — hidden from sighted users, indexed by crawlers */}
      <nav aria-hidden="true" className="sr-only" tabIndex={-1}>
        <div>
          <a href="/incidencias/estadisticas" tabIndex={-1}>Estadísticas de incidencias</a>
          <a href="/cortes-trafico" tabIndex={-1}>Cortes de tráfico</a>
          <a href="/restricciones" tabIndex={-1}>Restricciones</a>
          <a href="/atascos" tabIndex={-1}>Atascos</a>
          <a href="/alertas-meteo" tabIndex={-1}>Alertas meteorológicas</a>
          <a href="/trafico/madrid" tabIndex={-1}>Tráfico Madrid</a>
          <a href="/trafico/barcelona" tabIndex={-1}>Tráfico Barcelona</a>
          <a href="/trafico/valencia" tabIndex={-1}>Tráfico Valencia</a>
          <a href="/operaciones" tabIndex={-1}>Operaciones DGT</a>
          <a href="/puntos-negros" tabIndex={-1}>Puntos negros</a>
        </div>
      </nav>

      {/* Client component with interactive map, filters, and live SWR data */}
      <Suspense fallback={<IncidenciasLoading />}>
        <IncidenciasContent />
      </Suspense>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <RelatedLinks links={[
          { title: "Estado del tráfico en tiempo real", description: "Mapa interactivo con todas las capas de datos", href: "/trafico", icon: <MapPin className="w-5 h-5" /> },
          { title: "Cámaras DGT", description: "Imágenes en vivo de las principales carreteras", href: "/camaras", icon: <Video className="w-5 h-5" /> },
          { title: "Carreteras de España", description: "Red viaria nacional por tipo y provincia", href: "/carreteras", icon: <Route className="w-5 h-5" /> },
          { title: "Atascos y retenciones", description: "Puntos negros de tráfico y vías saturadas", href: "/atascos", icon: <Car className="w-5 h-5" /> },
          { title: "Estadísticas de incidencias", description: "Tendencias y patrones históricos de incidencias", href: "/incidencias/estadisticas", icon: <BarChart2 className="w-5 h-5" /> },
          { title: "Análisis de incidencias", description: "Distribución horaria, por día y carretera", href: "/incidencias/analytics", icon: <BarChart3 className="w-5 h-5" /> },
          { title: "Cortes de tráfico", description: "Cortes de carretera activos en España", href: "/cortes-trafico", icon: <AlertOctagon className="w-5 h-5" /> },
          { title: "Alertas meteorológicas", description: "Alertas AEMET que afectan a la circulación", href: "/alertas-meteo", icon: <CloudLightning className="w-5 h-5" /> },
        ]} />
      </div>
    </>
  );
}
