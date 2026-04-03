import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import TransportePublicoContent from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Transporte Público en España — Metro, Autobús, Tranvía | trafico.live",
  description:
    "Red de transporte público español. 15+ operadores de metro, autobús y tranvía con rutas, paradas y horarios GTFS.",
  alternates: { canonical: `${BASE_URL}/transporte-publico` },
  openGraph: {
    title: "Transporte Público en España — Metro, Autobús, Tranvía",
    description:
      "15+ operadores de metro, autobús y tranvía en España. Rutas, paradas y horarios GTFS actualizados.",
    url: `${BASE_URL}/transporte-publico`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Transporte Público en España",
  description:
    "Red de transporte público español. Operadores de metro, autobús y tranvía con rutas, paradas y horarios GTFS.",
  url: `${BASE_URL}/transporte-publico`,
  publisher: {
    "@type": "Organization",
    name: "trafico.live",
    url: BASE_URL,
  },
};

export default function TransportePublicoPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <StructuredData data={webPageSchema} />
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Transporte Público", href: "/transporte-publico" },
        ]}
      />
      <TransportePublicoContent />
    </main>
  );
}
