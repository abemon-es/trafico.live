import type { Metadata } from "next";
import EstacionesTrenContent from "./content";

export const metadata: Metadata = {
  title: "Estaciones de tren en España — catálogo completo | trafico.live",
  description:
    "Directorio completo de estaciones de tren en España: Cercanías, AVE, Larga Distancia, Media Distancia y trenes regionales. Busca por nombre, red o provincia.",
  openGraph: {
    title: "Estaciones de tren en España — catálogo completo",
    description:
      "Directorio de estaciones ferroviarias en España. Cercanías, AVE, Larga Distancia, Media Distancia. Busca por nombre, red o provincia.",
    url: "https://trafico.live/trenes/estaciones",
  },
  alternates: {
    canonical: "https://trafico.live/trenes/estaciones",
  },
};

export default function EstacionesTrenPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <nav className="text-sm text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 list-none p-0 m-0">
          <li>
            <a href="/" className="hover:text-[var(--tl-primary)] transition-colors">
              Inicio
            </a>
          </li>
          <li aria-hidden="true" className="select-none">/</li>
          <li>
            <a href="/trenes" className="hover:text-[var(--tl-primary)] transition-colors">
              Red Ferroviaria
            </a>
          </li>
          <li aria-hidden="true" className="select-none">/</li>
          <li className="text-gray-900 dark:text-gray-100" aria-current="page">
            Estaciones
          </li>
        </ol>
      </nav>

      <EstacionesTrenContent />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Estaciones de tren en España",
            description:
              "Catálogo de estaciones ferroviarias en España: Cercanías, AVE, Larga Distancia, Media Distancia y trenes regionales.",
            url: "https://trafico.live/trenes/estaciones",
            publisher: {
              "@type": "Organization",
              name: "trafico.live",
              url: "https://trafico.live",
            },
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Inicio",
                item: "https://trafico.live",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Red Ferroviaria",
                item: "https://trafico.live/trenes",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: "Estaciones",
                item: "https://trafico.live/trenes/estaciones",
              },
            ],
          }),
        }}
      />
    </main>
  );
}
