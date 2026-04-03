import type { Metadata } from "next";
import TransportePublicoContent from "./content";

export const metadata: Metadata = {
  title: "Transporte Público en España — Metro, Autobús, Tranvía | trafico.live",
  description:
    "Red de transporte público español. 15+ operadores de metro, autobús y tranvía con rutas, paradas y horarios GTFS.",
  openGraph: {
    title: "Transporte Público en España — Metro, Autobús, Tranvía",
    description:
      "15+ operadores de metro, autobús y tranvía en España. Rutas, paradas y horarios GTFS actualizados.",
    url: "https://trafico.live/transporte-publico",
  },
};

export default function TransportePublicoPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <a href="/" className="hover:text-[var(--tl-primary)]">
          Inicio
        </a>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-gray-100">Transporte Público</span>
      </nav>

      <TransportePublicoContent />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Transporte Público en España",
            description:
              "Red de transporte público español. Operadores de metro, autobús y tranvía con rutas, paradas y horarios GTFS.",
            url: "https://trafico.live/transporte-publico",
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
