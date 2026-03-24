import { Metadata } from "next";
import MejorHoraContent from "./content";

const BASE_URL = "https://trafico.live";

export const metadata: Metadata = {
  title: "¿Cuál es la Mejor Hora para Viajar? — Análisis de Tráfico | trafico.live",
  description:
    "Descubre la mejor hora para viajar en coche y evitar el tráfico en España. Análisis de incidencias por hora y día de la semana basado en datos reales de los últimos 30 días.",
  keywords: [
    "mejor hora para viajar",
    "horas punta tráfico",
    "cuándo salir de viaje",
    "evitar tráfico carretera",
    "hora menos tráfico españa",
    "tráfico hora punta",
    "mejor día viajar coche",
    "análisis tráfico horario",
  ],
  alternates: {
    canonical: `${BASE_URL}/mejor-hora`,
  },
  openGraph: {
    title: "¿Cuál es la Mejor Hora para Viajar? — Análisis de Tráfico | trafico.live",
    description:
      "Mapa de calor de incidencias de tráfico por hora y día: descubre cuándo circular con mayor seguridad en las carreteras españolas.",
    type: "website",
    locale: "es_ES",
  },
};

export default function MejorHoraPage() {
  return <MejorHoraContent />;
}
