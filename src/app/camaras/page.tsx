import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { CamarasContent } from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Cámaras de Tráfico",
  description:
    "Visualiza en tiempo real las más de 500 cámaras de tráfico de la DGT en las carreteras españolas. Busca por carretera o provincia.",
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
    <Suspense fallback={<CamarasLoading />}>
      <CamarasContent />
    </Suspense>
  );
}
