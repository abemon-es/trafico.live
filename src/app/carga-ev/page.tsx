import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2, Zap, Fuel, ShieldCheck, CircleDollarSign, MapPin, Leaf } from "lucide-react";
import CargaEVContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { StructuredData, generateDatasetSchema } from "@/components/seo/StructuredData";

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
        <StructuredData data={generateDatasetSchema({
          name: "Puntos de carga para vehículos eléctricos en España",
          description: "Directorio de puntos de carga para vehículos eléctricos en España. Incluye potencia, tipos de conectores y operadores.",
          url: `${BASE_URL}/carga-ev`,
          keywords: ["carga", "EV", "electrolineras", "puntos de carga"],
          spatialCoverage: "España",
        })} />
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Puntos de Recarga EV", href: "/carga-ev" },
          ]}
        />

        {/* Server-rendered subpage links for SEO — visually hidden, fully crawlable */}
        <h2 className="sr-only">Puntos de carga para vehículos eléctricos en España</h2>
        <nav aria-hidden="true" className="sr-only" tabIndex={-1}>
          <div>
            <a href="/carga-ev/cerca" tabIndex={-1}>Cargadores eléctricos cerca de mí</a>
            <a href="/electrolineras" tabIndex={-1}>Electrolineras en España</a>
            <a href="/electrolineras/madrid" tabIndex={-1}>Electrolineras en Madrid</a>
            <a href="/electrolineras/barcelona" tabIndex={-1}>Electrolineras en Barcelona</a>
            <a href="/electrolineras/valencia" tabIndex={-1}>Electrolineras en Valencia</a>
            <a href="/cuanto-cuesta-cargar" tabIndex={-1}>¿Cuánto cuesta cargar un coche eléctrico?</a>
            <a href="/etiqueta-ambiental" tabIndex={-1}>Etiqueta ambiental DGT</a>
          </div>
        </nav>

        <Suspense fallback={<LoadingFallback />}>
          <CargaEVContent />
        </Suspense>
        <RelatedLinks links={[
          { title: "Electrolineras en España", description: "Directorio completo de puntos de carga por provincia", href: "/electrolineras", icon: <Zap className="w-5 h-5" /> },
          { title: "Gasolineras más baratas", description: "Precios de carburante en tiempo real en toda España", href: "/gasolineras", icon: <Fuel className="w-5 h-5" /> },
          { title: "Zonas de Bajas Emisiones", description: "ZBE activas y restricciones de acceso por ciudad", href: "/zbe", icon: <ShieldCheck className="w-5 h-5" /> },
          { title: "¿Cuánto cuesta cargar un coche eléctrico?", description: "Comparativa de tarifas y coste por kWh en España", href: "/cuanto-cuesta-cargar", icon: <CircleDollarSign className="w-5 h-5" /> },
          { title: "Cargadores cerca de mí", description: "Puntos de carga EV próximos a tu ubicación", href: "/carga-ev/cerca", icon: <MapPin className="w-5 h-5" /> },
          { title: "Etiqueta ambiental", description: "Consulta el distintivo ambiental DGT de tu vehículo", href: "/etiqueta-ambiental", icon: <Leaf className="w-5 h-5" /> },
          { title: "Electrolineras Madrid", description: "Puntos de carga eléctrica en Madrid", href: "/electrolineras/madrid", icon: <Zap className="w-5 h-5" /> },
          { title: "Electrolineras Barcelona", description: "Puntos de carga eléctrica en Barcelona", href: "/electrolineras/barcelona", icon: <Zap className="w-5 h-5" /> },
        ]} />
      </main>
    </div>
  );
}
