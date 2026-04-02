import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import LineasContent from "./content";

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: "Líneas y marcas de tren en España | trafico.live",
  description:
    "Catálogo completo de líneas ferroviarias en España: AVE, Alvia, Avant, Cercanías, Rodalies, Media Distancia y más. Consulta origen, destino y paradas de cada línea de Renfe.",
  path: "/trenes/lineas",
  keywords: [
    "líneas tren España",
    "AVE líneas",
    "Cercanías líneas",
    "Renfe marcas",
    "Alvia rutas",
    "Avant líneas",
    "Media Distancia",
    "Rodalies",
    "trenes España",
  ],
  changeFrequency: "weekly",
});

export default function LineasPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Red Ferroviaria", href: "/trenes" },
            { name: "Líneas", href: "/trenes/lineas" },
          ]}
        />

        <LineasContent />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "Líneas de tren en España",
              description:
                "Catálogo de líneas ferroviarias operadas por Renfe en España, incluyendo AVE, Cercanías, Media Distancia y otros servicios.",
              url: "https://trafico.live/trenes/lineas",
              publisher: {
                "@type": "Organization",
                name: "trafico.live",
                url: "https://trafico.live",
              },
            }),
          }}
        />
      </main>
    </div>
  );
}
