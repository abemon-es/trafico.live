import { Metadata } from "next";
import MejorHoraContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = "https://trafico.live";

export const metadata: Metadata = {
  title: "¿Cuál es la Mejor Hora para Viajar? — Análisis de Tráfico",
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
    title: "¿Cuál es la Mejor Hora para Viajar? — Análisis de Tráfico",
    description:
      "Mapa de calor de incidencias de tráfico por hora y día: descubre cuándo circular con mayor seguridad en las carreteras españolas.",
    type: "website",
    locale: "es_ES",
  },
};

export default function MejorHoraPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Mejor Hora para Viajar", href: "/mejor-hora" },
        ]} />
      </div>
      <MejorHoraContent />
    </>
  );
}
