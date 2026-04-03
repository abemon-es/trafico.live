import { GaugeCircle, MapPin, BarChart3, Route, Clock } from "lucide-react";
import IntensidadContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { StructuredData, generateDatasetSchema } from "@/components/seo/StructuredData";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 1800; // ISR: regenerate every 30 minutes (IMD data is annual)

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata = buildPageMetadata({
  title: "Intensidad de Tráfico (IMD) | Red de Carreteras del Estado",
  description:
    "Intensidad Media Diaria (IMD) del tráfico en la Red de Carreteras del Estado. Consulta datos por provincia, tipo de carretera y evolución anual. Datos oficiales del Ministerio de Transportes.",
  path: "/intensidad",
});

export default function IntensidadPage() {
  return (
    <>
      <StructuredData data={generateDatasetSchema({
        name: "Intensidad media diaria (IMD) de tráfico",
        description: "Intensidad Media Diaria (IMD) del tráfico en la Red de Carreteras del Estado. Datos por provincia, tipo de carretera y evolución anual. Fuente: Ministerio de Transportes.",
        url: `${BASE_URL}/intensidad`,
        keywords: ["IMD", "intensidad", "tráfico", "carreteras"],
        spatialCoverage: "España",
      })} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Intensidad de Tráfico", href: "/intensidad" },
        ]} />
      </div>
      <IntensidadContent />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <RelatedLinks links={[
          { title: "Predicción de tráfico", description: "Mapa de calor: cuándo hay más tráfico en Madrid por hora y día", href: "/prediccion-trafico", icon: <Clock className="w-5 h-5" /> },
          { title: "Estaciones de aforo", description: "Mapa interactivo con los 3.458 puntos de aforo nacionales", href: "/estaciones-aforo", icon: <GaugeCircle className="w-5 h-5" /> },
          { title: "Estado del tráfico en tiempo real", description: "Incidencias y mapa de tráfico de España", href: "/trafico", icon: <MapPin className="w-5 h-5" /> },
          { title: "Estadísticas de tráfico", description: "Histórico de siniestralidad y datos DGT", href: "/estadisticas", icon: <BarChart3 className="w-5 h-5" /> },
          { title: "Carreteras de España", description: "Red viaria nacional por tipo y provincia", href: "/carreteras", icon: <Route className="w-5 h-5" /> },
        ]} />
      </div>
    </>
  );
}
