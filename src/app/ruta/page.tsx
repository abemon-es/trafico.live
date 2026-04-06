import type { Metadata } from "next";
import RutaContent from "./content";

export const metadata: Metadata = {
  title: "Calcular Ruta — trafico.live",
  description:
    "Calcula la mejor ruta en coche por España y Portugal. Distancia, tiempo estimado e indicaciones paso a paso con datos de tráfico en tiempo real.",
  openGraph: {
    title: "Calcular Ruta — trafico.live",
    description: "Planificador de rutas para España y Portugal con tráfico en tiempo real.",
    url: "https://trafico.live/ruta",
  },
};

export default function RutaPage() {
  return <RutaContent />;
}
