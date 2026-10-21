import { Suspense } from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Loader2, Zap, Fuel, ShieldCheck, CircleDollarSign, MapPin, Leaf } from "lucide-react";
import CargaEVContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { StructuredData, generateDatasetSchema } from "@/components/seo/StructuredData";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const EV_CITIES = [
  { slug: "madrid", name: "Madrid" },
  { slug: "barcelona", name: "Barcelona" },
  { slug: "valencia", name: "Valencia" },
  { slug: "sevilla", name: "Sevilla" },
  { slug: "zaragoza", name: "Zaragoza" },
  { slug: "malaga", name: "Málaga" },
  { slug: "murcia", name: "Murcia" },
  { slug: "palma", name: "Palma" },
  { slug: "bilbao", name: "Bilbao" },
  { slug: "alicante", name: "Alicante" },
  { slug: "cordoba", name: "Córdoba" },
  { slug: "valladolid", name: "Valladolid" },
  { slug: "vigo", name: "Vigo" },
  { slug: "gijon", name: "Gijón" },
  { slug: "vitoria", name: "Vitoria" },
  { slug: "granada", name: "Granada" },
  { slug: "oviedo", name: "Oviedo" },
  { slug: "santander", name: "Santander" },
  { slug: "san-sebastian", name: "San Sebastián" },
  { slug: "pamplona", name: "Pamplona" },
];

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

        <Suspense fallback={<LoadingFallback />}>
          <CargaEVContent />
        </Suspense>
        {/* Every city page linked, and visible, in the server HTML: the content
            above loads its data in the browser. */}
        <section aria-labelledby="ev-cities-heading" className="mt-8">
          <h2 id="ev-cities-heading" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Electrolineras por ciudad
          </h2>
          <ul className="flex flex-wrap gap-2">
            {EV_CITIES.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/carga-ev/${city.slug}`}
                  className="inline-block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:border-tl-300 dark:hover:border-tl-700 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
                >
                  {city.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <RelatedLinks links={[
          { title: "Electrolineras en España", description: "Directorio completo de puntos de carga por provincia", href: "/carga-ev", icon: <Zap className="w-5 h-5" /> },
          { title: "Gasolineras más baratas", description: "Precios de carburante en tiempo real en toda España", href: "/gasolineras", icon: <Fuel className="w-5 h-5" /> },
          { title: "Zonas de Bajas Emisiones", description: "ZBE activas y restricciones de acceso por ciudad", href: "/zbe", icon: <ShieldCheck className="w-5 h-5" /> },
          { title: "¿Cuánto cuesta cargar un coche eléctrico?", description: "Comparativa de tarifas y coste por kWh en España", href: "/cuanto-cuesta-cargar", icon: <CircleDollarSign className="w-5 h-5" /> },
          { title: "Cargadores cerca de mí", description: "Puntos de carga EV próximos a tu ubicación", href: "/carga-ev/cerca", icon: <MapPin className="w-5 h-5" /> },
          { title: "Etiqueta ambiental", description: "Consulta el distintivo ambiental DGT de tu vehículo", href: "/etiqueta-ambiental", icon: <Leaf className="w-5 h-5" /> },
          { title: "Electrolineras Madrid", description: "Puntos de carga eléctrica en Madrid", href: "/carga-ev/madrid", icon: <Zap className="w-5 h-5" /> },
          { title: "Electrolineras Barcelona", description: "Puntos de carga eléctrica en Barcelona", href: "/carga-ev/barcelona", icon: <Zap className="w-5 h-5" /> },
        ]} />
      </main>
    </div>
  );
}
