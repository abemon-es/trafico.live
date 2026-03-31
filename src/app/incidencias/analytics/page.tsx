import { Metadata } from "next";
import { IncidenciasAnalyticsClient } from "./AnalyticsClient";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { AlertTriangle, BarChart3, MapPin, Route } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Análisis de Incidencias de Tráfico",
  description:
    "Patrones históricos de incidencias de tráfico en España: distribución por hora, día, carretera y provincia. Datos de los últimos 7, 30 y 90 días.",
  alternates: {
    canonical: `${BASE_URL}/incidencias/analytics`,
  },
};

export default function IncidenciasAnalyticsPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Incidencias", href: "/incidencias" },
          { name: "Analítica", href: "/incidencias/analytics" },
        ]} />
      </div>
      <IncidenciasAnalyticsClient />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <RelatedLinks links={[
          { title: "Incidencias en tiempo real", description: "Mapa y listado de incidencias activas en España", href: "/incidencias", icon: <AlertTriangle className="w-5 h-5" /> },
          { title: "Estadísticas de tráfico", description: "Datos históricos de siniestralidad vial", href: "/estadisticas", icon: <BarChart3 className="w-5 h-5" /> },
          { title: "Puntos negros de la DGT", description: "Tramos de concentración de accidentes", href: "/puntos-negros", icon: <MapPin className="w-5 h-5" /> },
          { title: "Carreteras de España", description: "Red viaria nacional por tipo y provincia", href: "/carreteras", icon: <Route className="w-5 h-5" /> },
        ]} />
      </div>
    </>
  );
}
