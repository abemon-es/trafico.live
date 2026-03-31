import { Metadata } from "next";
import { Suspense } from "react";
import { EstadisticasContent } from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Estadísticas", href: "/estadisticas" },
        ]} />
      </div>
      <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">Cargando...</div>}>
        <EstadisticasPageContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
