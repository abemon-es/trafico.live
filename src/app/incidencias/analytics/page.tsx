import { Metadata } from "next";
import { IncidenciasAnalyticsClient } from "./AnalyticsClient";

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
  return <IncidenciasAnalyticsClient />;
}
