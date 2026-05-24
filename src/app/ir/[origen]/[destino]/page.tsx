import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { ComparisonTable } from "@/components/multimodal/ComparisonTable";
import { Offers } from "@/components/multimodal/Offers";
import { getAllODPairs, getODPairBySlugs } from "@/lib/od-pairs";

// ISR: regenerate daily so static shell stays fresh.
export const revalidate = 86400;

interface PageProps {
  params: Promise<{ origen: string; destino: string }>;
}

// ---------------------------------------------------------------------------
// Static params — build all 2,450 OD pairs at compile time.
// ---------------------------------------------------------------------------
export function generateStaticParams() {
  return getAllODPairs().map((pair) => ({
    origen: pair.originSlug,
    destino: pair.destSlug,
  }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { origen, destino } = await params;
  const pair = getODPairBySlugs(origen, destino);

  if (!pair) {
    return { title: "Ruta no encontrada" };
  }

  const { originName, destName, straightKm } = pair;
  const title = `Cómo ir de ${originName} a ${destName} — Coche, tren, bus, avión`;
  const description =
    `Distancia en línea recta: ${straightKm} km. Compara tiempos, precios y emisiones ` +
    `de CO2 para viajar de ${originName} a ${destName} en coche, tren, bus o avión.`;
  const canonical = `https://trafico.live/ir/${origen}/${destino}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `Cómo ir de ${originName} a ${destName}`,
      description,
      url: canonical,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function IrODPage({ params }: PageProps) {
  const { origen, destino } = await params;
  const pair = getODPairBySlugs(origen, destino);

  if (!pair) notFound();

  const { originName, originProvince, destName, destProvince, straightKm } = pair;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Rutas interurbanas", href: "/ir" },
          { name: `${originName} → ${destName}`, href: `/ir/${origen}/${destino}` },
        ]}
      />

      {/* Hero */}
      <section className="space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight flex flex-wrap items-center gap-3">
          <span>{originName}</span>
          <ArrowRight className="w-7 h-7 text-tl-500 flex-shrink-0" aria-hidden />
          <span>{destName}</span>
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {originProvince} &rarr; {destProvince}
          <span className="mx-2 text-gray-300 dark:text-gray-700">|</span>
          <span className="font-mono text-tl-700 dark:text-tl-300 font-semibold">
            {straightKm} km
          </span>{" "}
          en línea recta
        </p>

        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
          {/* TODO(S4-T1.9): Replace with real-time travel time estimates from /api/ir */}
          Motor de rutas en preparacion — las secciones de abajo se rellenaran automaticamente en S4.
        </p>
      </section>

      {/* Comparison table (stub) */}
      <ComparisonTable origin={originName} destination={destName} />

      {/* Offers (stub — will consume T2.4 provider via HS6 in S4) */}
      {/* TODO(S4-T1.9): Pass real provider props once HS6 interface is published */}
      <Offers origin={originName} destination={destName} />

      <RelatedLinks
        title="Otras rutas populares"
        links={[
          {
            title: "Madrid → Barcelona",
            description: "621 km · la ruta más transitada de España.",
            href: "/ir/madrid/barcelona",
          },
          {
            title: "Madrid → Valencia",
            description: "302 km · AVE en 1h 38 min.",
            href: "/ir/madrid/valencia",
          },
          {
            title: "Madrid → Sevilla",
            description: "391 km · AVE en 2h 30 min.",
            href: "/ir/madrid/sevilla",
          },
          {
            title: "Barcelona → Valencia",
            description: "303 km · tren + bus frecuentes.",
            href: "/ir/barcelona/valencia",
          },
        ]}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `Cómo ir de ${originName} a ${destName}`,
            description: `Compara coche, tren, bus y avión para viajar de ${originName} a ${destName}. Distancia: ${straightKm} km.`,
            url: `https://trafico.live/ir/${origen}/${destino}`,
            publisher: {
              "@type": "Organization",
              name: "trafico.live",
              url: "https://trafico.live",
            },
          }),
        }}
      />
    </main>
  );
}
