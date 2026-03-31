import { Metadata } from "next";
import { Activity, BarChart3, Route, AlertTriangle } from "lucide-react";
import EstacionesAforoContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { StructuredData, generateDatasetSchema } from "@/components/seo/StructuredData";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Estaciones de Aforo | Mapa de la Red de Carreteras del Estado",
  description:
    "Mapa interactivo con las 3.458 estaciones de aforo de la Red de Carreteras del Estado. Consulta la Intensidad Media Diaria (IMD) por estación, carretera y provincia. Datos del Ministerio de Transportes.",
  alternates: { canonical: `${BASE_URL}/estaciones-aforo` },
  openGraph: {
    title: "Estaciones de Aforo — trafico.live",
    description:
      "Mapa de estaciones de aforo con datos IMD de la Red de Carreteras del Estado.",
    url: `${BASE_URL}/estaciones-aforo`,
    type: "website",
  },
};

export default function EstacionesAforoPage() {
  return (
    <>
      <StructuredData data={generateDatasetSchema({
        name: "Estaciones de aforo de tráfico en España",
        description: "Mapa interactivo con las estaciones de aforo de la Red de Carreteras del Estado. Datos de Intensidad Media Diaria (IMD) por estación, carretera y provincia.",
        url: `${BASE_URL}/estaciones-aforo`,
        keywords: ["estaciones aforo", "IMD", "intensidad media diaria", "conteo vehicular"],
        spatialCoverage: "España",
      })} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Estaciones de Aforo", href: "/estaciones-aforo" },
        ]} />
      </div>
      <EstacionesAforoContent />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <RelatedLinks links={[
          { title: "Intensidad de tráfico (IMD)", description: "Análisis de IMD por provincia, carretera y año", href: "/intensidad", icon: <Activity className="w-5 h-5" /> },
          { title: "Estadísticas de tráfico", description: "Datos históricos de siniestralidad vial", href: "/estadisticas", icon: <BarChart3 className="w-5 h-5" /> },
          { title: "Carreteras de España", description: "Red viaria nacional por tipo y provincia", href: "/carreteras", icon: <Route className="w-5 h-5" /> },
          { title: "Incidencias en tiempo real", description: "Cortes, obras y accidentes activos en España", href: "/incidencias", icon: <AlertTriangle className="w-5 h-5" /> },
        ]} />
      </div>
    </>
  );
}
