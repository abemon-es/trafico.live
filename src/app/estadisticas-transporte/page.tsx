import type { Metadata } from "next";
import EstadisticasTransporteContent from "./content";

export const metadata: Metadata = {
  title: "Estadísticas de Transporte en España — Series históricas | trafico.live",
  description:
    "Datos estadísticos de transporte de viajeros en España por modo: metro, autobús, ferrocarril, avión, marítimo. Fuentes: INE, CNMC, AENA.",
  openGraph: {
    title: "Estadísticas de Transporte en España — Series históricas",
    description:
      "Series históricas de viajeros por metro, autobús, ferrocarril, avión y marítimo. Datos del INE, CNMC y AENA.",
    url: "https://trafico.live/estadisticas-transporte",
  },
};

export default function EstadisticasTransportePage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <a href="/" className="hover:text-[var(--tl-primary)]">
          Inicio
        </a>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-gray-100">Estadísticas</span>
      </nav>

      <EstadisticasTransporteContent />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: "Estadísticas de Transporte en España",
              description:
                "Datos estadísticos de transporte de viajeros en España por modo: metro, autobús, ferrocarril, avión, marítimo.",
              url: "https://trafico.live/estadisticas-transporte",
              publisher: {
                "@type": "Organization",
                name: "trafico.live",
                url: "https://trafico.live",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "Dataset",
              name: "Estadísticas de transporte de viajeros en España",
              description:
                "Series históricas de transporte de viajeros por modo (metro, autobús, ferrocarril, avión, marítimo). Fuentes: INE, CNMC, AENA.",
              url: "https://trafico.live/estadisticas-transporte",
              license: "https://creativecommons.org/licenses/by/4.0/",
              creator: {
                "@type": "Organization",
                name: "trafico.live",
              },
              isBasedOn: [
                "https://www.ine.es",
                "https://www.cnmc.es",
                "https://www.aena.es",
              ],
              temporalCoverage: "2000/..",
              spatialCoverage: {
                "@type": "Place",
                name: "España",
              },
            },
          ]),
        }}
      />
    </main>
  );
}
