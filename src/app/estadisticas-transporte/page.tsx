import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import EstadisticasTransporteContent from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Estadísticas de Transporte en España — Series históricas | trafico.live",
  description:
    "Datos estadísticos de transporte de viajeros en España por modo: metro, autobús, ferrocarril, avión, marítimo y flujos de movilidad interprovincial. Fuentes: INE, CNMC, AENA, Ministerio de Transportes.",
  alternates: { canonical: `${BASE_URL}/estadisticas-transporte` },
  openGraph: {
    title: "Estadísticas de Transporte en España — Series históricas",
    description:
      "Series históricas de viajeros por metro, autobús, ferrocarril, avión y marítimo. Datos del INE, CNMC y AENA.",
    url: `${BASE_URL}/estadisticas-transporte`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Estadísticas de Transporte en España",
  description:
    "Datos estadísticos de transporte de viajeros en España por modo: metro, autobús, ferrocarril, avión, marítimo.",
  url: `${BASE_URL}/estadisticas-transporte`,
  publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
};

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Estadísticas de transporte de viajeros en España",
  description:
    "Series históricas de transporte de viajeros por modo (metro, autobús, ferrocarril, avión, marítimo). Fuentes: INE, CNMC, AENA.",
  url: `${BASE_URL}/estadisticas-transporte`,
  license: "https://creativecommons.org/licenses/by/4.0/",
  creator: { "@type": "Organization", name: "trafico.live" },
  isBasedOn: ["https://www.ine.es", "https://www.cnmc.es", "https://www.aena.es"],
  temporalCoverage: "2000/..",
  spatialCoverage: { "@type": "Place", name: "España" },
};

export default function EstadisticasTransportePage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <StructuredData data={webPageSchema} />
      <StructuredData data={datasetSchema} />
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Estadísticas de Transporte", href: "/estadisticas-transporte" },
        ]}
      />
      <EstadisticasTransporteContent />
    </main>
  );
}
