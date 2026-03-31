import { Metadata } from "next";
import CalculadoraContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Calculadora de Coste de Ruta — Combustible y Peajes",
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
    canonical: `${BASE_URL}/calculadora`,
  },
  openGraph: {
    title: "Calculadora de Coste de Ruta — Combustible y Peajes",
    description:
      "Introduce origen, destino y distancia para calcular al instante el coste real de tu viaje: combustible, peajes y CO₂.",
    type: "website",
    locale: "es_ES",
  },
};

export default function CalculadoraPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Calculadora de Ruta", href: "/calculadora" },
        ]} />
      </div>
      <CalculadoraContent />
    </>
  );
}
