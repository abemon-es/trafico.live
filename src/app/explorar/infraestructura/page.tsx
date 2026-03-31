import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import InfraestructuraContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Infraestructura | Explorar",
  description: "Infraestructura de tráfico en España: cámaras, radares, cargadores de vehículos eléctricos y zonas de bajas emisiones.",
  alternates: { canonical: `${BASE_URL}/explorar/infraestructura` },
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Cargando infraestructura...</span>
      </div>
    </div>
  );
}

export default function InfraestructuraPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Explorar", href: "/explorar" },
          { name: "Infraestructura", href: "/explorar/infraestructura" },
        ]} />
      </div>
      <Suspense fallback={<LoadingFallback />}>
        <InfraestructuraContent />
      </Suspense>
    </>
  );
}
