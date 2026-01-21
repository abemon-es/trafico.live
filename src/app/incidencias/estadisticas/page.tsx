import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { IncidentStatsContent } from "./content";

export const metadata: Metadata = {
  title: "Estadísticas de Incidencias | Tráfico España",
  description:
    "Análisis estadístico de incidencias de tráfico en España. Tendencias, patrones horarios, distribución por tipo y localización.",
  openGraph: {
    title: "Estadísticas de Incidencias de Tráfico",
    description:
      "Análisis completo de incidencias en carreteras españolas con datos en tiempo real de la DGT.",
  },
};

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Cargando estadísticas...</span>
      </div>
    </div>
  );
}

export default function IncidentStatsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <IncidentStatsContent />
    </Suspense>
  );
}
