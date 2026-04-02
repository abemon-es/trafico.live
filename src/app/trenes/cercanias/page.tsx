import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import CercaniasContent from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Cercanías de España — 12 redes | trafico.live",
  description:
    "Mapa y directorio de las 12 redes de Cercanías de España: Madrid, Barcelona, Valencia, Sevilla, Málaga, Bilbao, Asturias, Santander, Cádiz, Murcia/Alicante, Zaragoza y San Sebastián. Estaciones, líneas y alertas en tiempo real.",
  keywords: [
    "Cercanías España",
    "trenes de cercanías",
    "Renfe Cercanías",
    "estaciones cercanías",
    "líneas cercanías",
    "transporte ferroviario urbano",
  ],
  alternates: {
    canonical: `${BASE_URL}/trenes/cercanias`,
  },
  openGraph: {
    title: "Cercanías de España — 12 redes | trafico.live",
    description:
      "Las 12 redes de Cercanías de España: estaciones, líneas y alertas en tiempo real de Renfe.",
    url: `${BASE_URL}/trenes/cercanias`,
    images: [`${BASE_URL}/og-image.webp`],
  },
};

export default function CercaniasPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Red Ferroviaria", href: "/trenes" },
          { name: "Cercanías", href: "/trenes/cercanias" },
        ]}
      />

      <CercaniasContent />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Cercanías de España — 12 redes",
            description:
              "Directorio de las 12 redes de Cercanías de España con estaciones, líneas y alertas.",
            url: `${BASE_URL}/trenes/cercanias`,
            publisher: {
              "@type": "Organization",
              name: "trafico.live",
              url: BASE_URL,
            },
          }),
        }}
      />
    </main>
  );
}
