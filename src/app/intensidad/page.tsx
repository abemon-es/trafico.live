import { Metadata } from "next";
import IntensidadContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Intensidad de Tráfico (IMD) | Red de Carreteras del Estado",
  description:
    "Intensidad Media Diaria (IMD) del tráfico en la Red de Carreteras del Estado. Consulta datos por provincia, tipo de carretera y evolución anual. Datos oficiales del Ministerio de Transportes.",
  alternates: { canonical: `${BASE_URL}/intensidad` },
  openGraph: {
    title: "Intensidad de Tráfico (IMD) — trafico.live",
    description:
      "Análisis de la Intensidad Media Diaria del tráfico en las carreteras españolas: por provincia, tipo de vía y evolución temporal.",
    url: `${BASE_URL}/intensidad`,
    type: "website",
  },
};

export default function IntensidadPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Intensidad de Tráfico", href: "/intensidad" },
        ]} />
      </div>
      <IntensidadContent />
    </>
  );
}
