import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import InfraestructuraContent from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Infraestructura | Explorar",
  description: "Infraestructura de tráfico en España: cámaras, radares, cargadores de vehículos eléctricos y zonas de bajas emisiones.",
  alternates: { canonical: `${BASE_URL}/explorar/infraestructura` },
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Cargando infraestructura...</span>
      </div>
    </div>
  );
}

export default function InfraestructuraPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InfraestructuraContent />
    </Suspense>
  );
}
