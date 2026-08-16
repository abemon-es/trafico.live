import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import EstacionesTrenContent from "./content";
import LinkDirectory from "@/components/seo/LinkDirectory";

// The interactive catalogue below is client-rendered, so its station links do
// not exist in the HTML Googlebot parses. Revalidate daily and emit a
// server-rendered directory alongside it so the detail pages are actually
// reachable by a crawler.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Estaciones de tren en España — catálogo completo",
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

export default async function EstacionesTrenPage() {
  const stations = await prisma.railwayStation.findMany({
    where: { slug: { not: null } },
    select: { slug: true, name: true, provinceName: true },
    orderBy: { name: "asc" },
  });

  const directoryItems = stations
    .filter((s): s is typeof s & { slug: string } => Boolean(s.slug))
    .map((s) => ({
      href: `/trenes/estacion/${s.slug}`,
      label: s.name,
      group: s.provinceName,
    }));

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <nav className="text-sm text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 list-none p-0 m-0">
          <li>
            <Link href="/" className="hover:text-[var(--tl-primary)] transition-colors">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true" className="select-none">/</li>
          <li>
            <Link href="/trenes" className="hover:text-[var(--tl-primary)] transition-colors">
              Red Ferroviaria
            </Link>
          </li>
          <li aria-hidden="true" className="select-none">/</li>
          <li className="text-gray-900 dark:text-gray-100" aria-current="page">
            Estaciones
          </li>
        </ol>
      </nav>

      <EstacionesTrenContent />

      <LinkDirectory
        title="Todas las estaciones por provincia"
        description="Índice completo de estaciones ferroviarias, agrupadas por provincia."
        items={directoryItems}
      />

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
