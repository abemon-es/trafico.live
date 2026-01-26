import { Metadata } from "next";
import { Suspense } from "react";
import { EstadisticasContent } from "./content";

export const metadata: Metadata = {
  title: "Estadísticas de Tráfico en España | Tráfico España",
  description:
    "Estadísticas históricas de siniestralidad vial en España. Datos de accidentes, víctimas y tendencias desde 2015 hasta la actualidad. Fuente: DGT en Cifras.",
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
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Cargando...</div>}>
      <EstadisticasPageContent searchParams={searchParams} />
    </Suspense>
  );
}
