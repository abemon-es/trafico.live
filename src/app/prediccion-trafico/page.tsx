import { Clock, TrendingUp, BarChart3, Map, GaugeCircle } from "lucide-react";
import PrediccionTraficoContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { StructuredData, generateDatasetSchema } from "@/components/seo/StructuredData";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata = buildPageMetadata({
  title: "Predicción de tráfico en Madrid — Mapa de calor por hora y día",
  description:
    "Consulta cuándo hay más tráfico en Madrid. Mapa de calor con la intensidad media por hora y día de la semana basado en datos reales de 6.100+ sensores.",
  path: "/prediccion-trafico",
  keywords: [
    "predicción tráfico",
    "mapa calor tráfico",
    "tráfico Madrid",
    "hora punta",
    "intensidad tráfico",
    "cuando hay tráfico",
  ],
});

export default function PrediccionTraficoPage() {
  return (
    <>
      <StructuredData
        data={generateDatasetSchema({
          name: "Predicción de tráfico en Madrid — Mapa de calor horario",
          description:
            "Mapa de calor de intensidad de tráfico en Madrid. Intensidad media y nivel de servicio por hora del día y día de la semana. Basado en datos de 6.100+ sensores del Ayuntamiento de Madrid.",
          url: `${BASE_URL}/prediccion-trafico`,
          keywords: ["predicción tráfico", "mapa calor", "hora punta", "Madrid", "sensores tráfico"],
          spatialCoverage: "Madrid, España",
        })}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Predicción de tráfico", href: "/prediccion-trafico" },
          ]}
        />
      </div>
      <PrediccionTraficoContent />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <RelatedLinks
          links={[
            {
              title: "Intensidad de tráfico (IMD)",
              description: "Intensidad media diaria en la red de carreteras del Estado",
              href: "/intensidad",
              icon: <TrendingUp className="w-5 h-5" />,
            },
            {
              title: "Estaciones de aforo",
              description: "Mapa interactivo con más de 14.000 puntos de aforo",
              href: "/estaciones-aforo",
              icon: <GaugeCircle className="w-5 h-5" />,
            },
            {
              title: "Estado del tráfico en tiempo real",
              description: "Incidencias y mapa de tráfico de España en directo",
              href: "/trafico",
              icon: <Map className="w-5 h-5" />,
            },
            {
              title: "Estadísticas de tráfico",
              description: "Histórico de siniestralidad y datos DGT",
              href: "/estadisticas",
              icon: <BarChart3 className="w-5 h-5" />,
            },
          ]}
        />
      </div>
    </>
  );
}
