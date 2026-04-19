/**
 * /aviacao/aeroportos — Catálogo de aeroportos portugueses
 *
 * Lista 18 aeroportos PT (continental + Madeira + Açores) com links
 * para chegadas, partidas e info detalhada de cada um.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Plane, MapPin, ArrowRight, Info } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { PT_AIRPORTS, REGION_LABELS } from "@/lib/aviacao/pt-airports";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Aeroportos de Portugal — Chegadas e Partidas ao vivo | trafico.live",
  description:
    "Catálogo completo de aeroportos portugueses: Lisboa, Porto, Faro, Madeira e Açores. Chegadas e partidas ao vivo, código IATA/ICAO e informações operacionais.",
  keywords: [
    "aeroportos portugal",
    "lista aeroportos portugal",
    "aeroporto lisboa lis",
    "aeroporto porto opo",
    "aeroporto madeira fnc",
    "aeroporto faro fao",
    "ANA aeroportos",
  ],
  alternates: { canonical: `${BASE_URL}/aviacao/aeroportos` },
  openGraph: {
    title: "Aeroportos de Portugal — Catálogo ANA",
    description:
      "Catálogo de aeroportos portugueses: IATA/ICAO, região, chegadas e partidas ao vivo.",
    url: `${BASE_URL}/aviacao/aeroportos`,
    siteName: "trafico.live",
    locale: "pt_PT",
    type: "website",
  },
};

const REGION_ORDER: Array<"continental" | "madeira" | "acores"> = [
  "continental",
  "madeira",
  "acores",
];

export default function AeroportosListPage() {
  const byRegion = REGION_ORDER.map((region) => ({
    region,
    airports: PT_AIRPORTS.filter((a) => a.region === region),
  }));

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Aeroportos de Portugal — Catálogo completo",
    url: `${BASE_URL}/aviacao/aeroportos`,
    inLanguage: "pt",
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    hasPart: PT_AIRPORTS.map((a) => ({
      "@type": "Airport",
      name: a.name,
      iataCode: a.iata,
      url: `${BASE_URL}/aviacao/aeroportos/${a.iata.toLowerCase()}`,
    })),
  };

  return (
    <>
      <StructuredData data={collectionSchema} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Início", href: "/" },
            { name: "Aviação", href: "/aviacao" },
            { name: "Aeroportos", href: "/aviacao/aeroportos" },
          ]}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-10">
        {/* Hero */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-tl-50 dark:bg-tl-900/30 flex items-center justify-center">
              <Plane className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
              trafico.live · Aviação Portugal
            </span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Aeroportos de Portugal
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
            Catálogo completo de {PT_AIRPORTS.length} aeroportos portugueses — continental,
            Madeira e Açores. Chegadas e partidas ao vivo, código IATA e informações
            operacionais ANA.
          </p>
        </section>

        {/* By region */}
        {byRegion.map(({ region, airports }) => (
          <section key={region} className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-tl-500 dark:text-tl-400" />
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                {REGION_LABELS[region]}
              </h2>
              <span className="text-sm text-gray-400">{airports.length} aeroportos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {airports.map((airport) => (
                <div
                  key={airport.iata}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-3 hover:border-tl-300 dark:hover:border-tl-700 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold px-2.5 py-0.5 rounded-md bg-tl-100 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300">
                          {airport.iata}
                        </span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                          {airport.icao}
                        </span>
                        {airport.isAna && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-700 dark:text-tl-amber-300 border border-tl-amber-200 dark:border-tl-amber-800">
                            ANA
                          </span>
                        )}
                      </div>
                      <p className="font-heading font-bold text-gray-900 dark:text-gray-100 text-sm leading-snug">
                        {airport.namePt}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {airport.city}
                      </p>
                    </div>
                  </div>

                  {/* Action links */}
                  <div className="flex flex-col gap-1.5 mt-auto">
                    <Link
                      href={`/aviacao/aeroportos/${airport.iata.toLowerCase()}/chegadas`}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-tl-50 dark:bg-tl-900/20 hover:bg-tl-100 dark:hover:bg-tl-900/40 transition-colors text-sm font-medium text-tl-700 dark:text-tl-300"
                    >
                      <span>Chegadas</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/aviacao/aeroportos/${airport.iata.toLowerCase()}/partidas`}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      <span>Partidas</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/aviacao/aeroportos/${airport.iata.toLowerCase()}`}
                      className="text-xs text-center text-gray-400 hover:text-tl-600 dark:hover:text-tl-400 transition-colors mt-0.5 py-1"
                    >
                      Info detalhada →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Attribution */}
        <footer className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-4">
          <Info className="w-3 h-3 flex-shrink-0" />
          Fontes: ANA Aeroportos de Portugal, OpenSky Network (CC BY 4.0), OurAirports.
        </footer>
      </div>
    </>
  );
}
