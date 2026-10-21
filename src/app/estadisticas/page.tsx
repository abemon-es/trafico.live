import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ShieldAlert, AlertTriangle, GaugeCircle, Activity, BarChart2 } from "lucide-react";
import { EstadisticasContent } from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { StructuredData, generateDatasetSchema } from "@/components/seo/StructuredData";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Estadísticas de Tráfico en España | Tráfico España",
  description:
    "Estadísticas históricas de siniestralidad vial en España. Datos de accidentes, víctimas y tendencias desde 2015 hasta la actualidad. Fuente: DGT en Cifras.",
  alternates: {
    canonical: `${BASE_URL}/estadisticas`,
  },
  openGraph: {
    title: "Estadísticas de Tráfico en España",
    description: "Análisis histórico de siniestralidad vial con datos oficiales de la DGT",
  },
};

// Three province pages, linked visibly here; all 52 are on
// /estadisticas/accidentes. Slugs as the route resolves them, from the official
// name («Valencia/València»).
const PROVINCE_ACCIDENT_LINKS = [
  { href: "/estadisticas/accidentes/madrid", name: "Accidentes en Madrid" },
  { href: "/estadisticas/accidentes/barcelona", name: "Accidentes en Barcelona" },
  { href: "/estadisticas/accidentes/valenciavalencia", name: "Accidentes en Valencia" },
];

function EstadisticasPageContent({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  return <EstadisticasContent initialTab={searchParams.tab} />;
}

export default function EstadisticasPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  return (
    <>
      <StructuredData data={generateDatasetSchema({
        name: "Estadísticas de tráfico en España",
        description: "Estadísticas históricas de siniestralidad vial en España. Datos de accidentes, víctimas y tendencias desde 2015 hasta la actualidad. Fuente: DGT en Cifras.",
        url: `${BASE_URL}/estadisticas`,
        keywords: ["estadísticas", "accidentes", "siniestralidad", "V16"],
        spatialCoverage: "España",
      })} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Estadísticas", href: "/estadisticas" },
        ]} />
      </div>

      <h2 className="sr-only">Estadísticas de accidentes y siniestralidad vial en España</h2>

      <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">Cargando...</div>}>
        <EstadisticasPageContent searchParams={searchParams} />
      </Suspense>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <section aria-labelledby="province-accidents-heading" className="mt-8">
          <h2 id="province-accidents-heading" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Accidentes por provincia
          </h2>
          <ul className="flex flex-wrap gap-2">
            {PROVINCE_ACCIDENT_LINKS.map(({ href, name }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:border-tl-300 dark:hover:border-tl-700 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <RelatedLinks links={[
          { title: "Estadísticas de accidentes", description: "Histórico de siniestralidad vial por año y comunidad", href: "/estadisticas/accidentes", icon: <ShieldAlert className="w-5 h-5" /> },
          { title: "Incidencias en tiempo real", description: "Cortes, obras y accidentes activos en España", href: "/incidencias", icon: <AlertTriangle className="w-5 h-5" /> },
          { title: "Estaciones de aforo", description: "IMD y aforos de la Red de Carreteras del Estado", href: "/estaciones-aforo", icon: <GaugeCircle className="w-5 h-5" /> },
          { title: "Intensidad de tráfico (IMD)", description: "Datos de intensidad media diaria por carretera", href: "/intensidad", icon: <Activity className="w-5 h-5" /> },
          { title: "Estadísticas de incidencias", description: "Análisis estadístico de incidencias por tipo y zona", href: "/incidencias/analytics", icon: <BarChart2 className="w-5 h-5" /> },
        ]} />
      </div>
    </>
  );
}
