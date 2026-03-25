import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { IncidenciasContent } from "./content";

export const metadata: Metadata = {
  title: "Incidencias de Tráfico",
  description:
    "Mapa en tiempo real de incidencias en las carreteras españolas. Cortes de carretera, obras, accidentes y condiciones meteorológicas adversas.",
  alternates: {
    canonical: "/incidencias",
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
    <Suspense fallback={<IncidenciasLoading />}>
      <IncidenciasContent />
    </Suspense>
  );
}
