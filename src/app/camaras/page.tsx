import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { CamarasContent } from "./content";

export const metadata: Metadata = {
  title: "Cámaras de Tráfico",
  description:
    "Visualiza en tiempo real las más de 500 cámaras de tráfico de la DGT en las carreteras españolas. Busca por carretera o provincia.",
};

function CamarasLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500">
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
