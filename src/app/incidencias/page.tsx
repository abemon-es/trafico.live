import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { IncidenciasContent } from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const metadata: Metadata = {
  title: "Incidencias de Tráfico",
  description:
    "Mapa en tiempo real de incidencias en las carreteras españolas. Cortes de carretera, obras, accidentes y condiciones meteorológicas adversas.",
  openGraph: {
    title: "Incidencias de Tráfico en Tiempo Real — España",
    description:
      "Mapa en tiempo real de incidencias en las carreteras españolas. Cortes de carretera, obras, accidentes y condiciones meteorológicas adversas.",
    url: "https://trafico.live/incidencias",
    type: "website",
    locale: "es_ES",
  },
  alternates: {
    canonical: "https://trafico.live/incidencias",
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

      {/* Client component with interactive map, filters, and live SWR data */}
      <Suspense fallback={<IncidenciasLoading />}>
        <IncidenciasContent />
      </Suspense>
    </>
  );
}
