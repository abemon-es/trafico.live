import { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData, generateWebPageSchema, generateDatasetSchema } from "@/components/seo/StructuredData";
import { HistoricoContent } from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Histórico de Precios de Combustible en España — CNMC | trafico.live",
  description:
    "Consulta la evolución histórica de los precios de gasolina y gasóleo en España desde 2016. Datos oficiales de la CNMC por provincia y tipo de combustible.",
  alternates: {
    canonical: `${BASE_URL}/gasolineras/historico`,
  },
  openGraph: {
    title: "Histórico de Precios de Combustible en España — CNMC",
    description:
      "Evolución de precios de gasolina 95, gasolina 98, gasóleo A, gasóleo B y GLP desde 2016 por provincia. Datos CNMC.",
    url: `${BASE_URL}/gasolineras/historico`,
    type: "website",
    locale: "es_ES",
    images: [`${BASE_URL}/og-image.webp`],
  },
  twitter: {
    card: "summary_large_image",
    title: "Histórico de Precios de Combustible en España",
    description: "Evolución de precios desde 2016 — datos oficiales CNMC.",
    images: [`${BASE_URL}/og-image.webp`],
  },
};

const webPageSchemas = generateWebPageSchema({
  title: "Histórico de Precios de Combustible en España — CNMC",
  description:
    "Consulta la evolución histórica de los precios de gasolina y gasóleo en España desde 2016. Datos oficiales de la CNMC por provincia y tipo de combustible.",
  url: `${BASE_URL}/gasolineras/historico`,
  breadcrumbs: [
    { name: "Inicio", url: `${BASE_URL}/` },
    { name: "Gasolineras", url: `${BASE_URL}/gasolineras` },
    { name: "Histórico de precios", url: `${BASE_URL}/gasolineras/historico` },
  ],
});

const datasetSchema = generateDatasetSchema({
  name: "Histórico de Precios de Combustible en España",
  description:
    "Precios diarios provinciales de gasolina 95, gasolina 98, gasóleo A, gasóleo B y GLP en España desde 2016, con y sin impuestos (PAI).",
  url: `${BASE_URL}/gasolineras/historico`,
  keywords: [
    "precio gasolina histórico",
    "precio gasóleo histórico",
    "combustible España",
    "CNMC precios carburante",
    "evolución precio gasolina",
  ],
  spatialCoverage: "España",
  temporalCoverage: "2016/..",
});

export default function HistoricoPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <StructuredData data={[...webPageSchemas, datasetSchema]} />

      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Gasolineras", href: "/gasolineras" },
          { name: "Histórico de precios", href: "/gasolineras/historico" },
        ]}
      />

      <HistoricoContent />
    </div>
  );
}
