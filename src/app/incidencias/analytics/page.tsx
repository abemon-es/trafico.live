import { Metadata } from "next";
import { IncidenciasAnalyticsClient } from "./AnalyticsClient";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

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
    </>
  );
}
