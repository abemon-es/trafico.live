import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { IncidentStatsContent } from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Estadísticas de Incidencias | Tráfico España",
  description:
    "Análisis estadístico de incidencias de tráfico en España. Tendencias, patrones horarios, distribución por tipo y localización.",
  openGraph: {
    title: "Estadísticas de Incidencias de Tráfico",
    description:
      "Análisis completo de incidencias en carreteras españolas con datos en tiempo real de la DGT.",
  },
  alternates: {
    canonical: `${BASE_URL}/incidencias/estadisticas`,
  },
};

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Cargando estadísticas...</span>
      </div>
    </div>
  );
}

export default function IncidentStatsPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Incidencias", href: "/incidencias" },
          { name: "Estadísticas", href: "/incidencias/estadisticas" },
        ]} />
      </div>
      <Suspense fallback={<LoadingState />}>
        <IncidentStatsContent />
      </Suspense>
    </>
  );
}
