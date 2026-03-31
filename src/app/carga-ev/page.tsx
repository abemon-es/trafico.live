import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import CargaEVContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Cargadores de Vehículos Eléctricos",
  description:
    "Encuentra puntos de carga para vehículos eléctricos en España. Mapa de cargadores, potencia, tipos de conectores y operadores.",
  keywords: [
    "cargadores eléctricos",
    "puntos de carga",
    "vehículos eléctricos",
    "EV",
    "electrolineras",
    "carga rápida",
    "España",
  ],
  alternates: {
    canonical: `${BASE_URL}/carga-ev`,
  },
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Cargando puntos de carga...</span>
      </div>
    </div>
  );
}

export default function CargaEVPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Puntos de Recarga EV", href: "/carga-ev" },
          ]}
        />
        <Suspense fallback={<LoadingFallback />}>
          <CargaEVContent />
        </Suspense>
      </main>
    </div>
  );
}
