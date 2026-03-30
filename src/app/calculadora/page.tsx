import { Metadata } from "next";
import CalculadoraContent from "./content";

export const metadata: Metadata = {
  title: "Calculadora de Coste de Ruta — Combustible y Peajes | trafico.live",
  description:
    "Calcula el coste de tu viaje en coche: combustible (gasolina, diésel, eléctrico), peajes y emisiones de CO₂. Comparativa instantánea por tipo de combustible.",
  keywords: [
    "calculadora ruta",
    "coste viaje coche",
    "precio peaje autopista",
    "calculadora combustible",
    "gasto gasolina viaje",
    "cuánto cuesta ir en coche",
    "calculadora gasolina",
    "coste ruta españa",
  ],
  alternates: {
    canonical: "https://trafico.live/calculadora",
  },
  openGraph: {
    title: "Calculadora de Coste de Ruta — Combustible y Peajes | trafico.live",
    description:
      "Introduce origen, destino y distancia para calcular al instante el coste real de tu viaje: combustible, peajes y CO₂.",
    type: "website",
    locale: "es_ES",
  },
};

export default function CalculadoraPage() {
  return <CalculadoraContent />;
}
