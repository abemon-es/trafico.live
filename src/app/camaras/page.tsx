import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { CamarasContent } from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Cámaras de Tráfico",
  description:
    "Visualiza en tiempo real las más de 500 cámaras de tráfico de la DGT en las carreteras españolas. Busca por carretera o provincia.",
  openGraph: {
    title: "Cámaras de Tráfico DGT en Tiempo Real — España",
    description:
      "Visualiza en tiempo real las más de 500 cámaras de tráfico de la DGT en las carreteras españolas. Busca por carretera o provincia.",
    url: `${BASE_URL}/camaras`,
    type: "website",
    locale: "es_ES",
  },
  alternates: {
    canonical: `${BASE_URL}/camaras`,
  },
};

function CamarasLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Cargando cámaras...</span>
      </div>
    </div>
  );
}

export default function CamarasPage() {
  return (
    <>
      {/* Server-rendered header — H1 present in initial HTML, crawlable without JS */}
      <div className="bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Cámaras de Tráfico
          </h1>
          <p className="mt-2 mb-6 text-gray-600 dark:text-gray-400 max-w-3xl">
            Imágenes en tiempo real de las cámaras de la DGT instaladas en
            autopistas, autovías y carreteras nacionales de toda España. Busca por
            carretera, kilómetro o provincia.
          </p>
          <h2 className="sr-only">Buscar y filtrar cámaras DGT por provincia y carretera</h2>
        </div>
      </div>

      {/* Client component with interactive search, filters, and live camera grid */}
      <Suspense fallback={<CamarasLoading />}>
        <CamarasContent />
      </Suspense>
    </>
  );
}
