import type { Metadata } from "next";
import TrainesContent from "./content";

export const metadata: Metadata = {
  title: "Red Ferroviaria de España — Mapa de trenes en tiempo real | trafico.live",
  description:
    "Mapa interactivo de la red ferroviaria española. Estaciones, líneas de Cercanías, AVE, Larga y Media Distancia. Alertas e incidencias en tiempo real de Renfe.",
  openGraph: {
    title: "Red Ferroviaria de España — Mapa de trenes en tiempo real",
    description:
      "Estaciones, líneas y alertas de la red ferroviaria española. Datos de Renfe actualizados cada 2 minutos.",
    url: "https://trafico.live/trenes",
  },
};

export default function TrenesPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <a href="/" className="hover:text-[var(--tl-primary)]">
          Inicio
        </a>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-gray-100">Red Ferroviaria</span>
      </nav>

      <TrainesContent />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Red Ferroviaria de España",
            description:
              "Mapa interactivo de estaciones, líneas y alertas de la red ferroviaria española.",
            url: "https://trafico.live/trenes",
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
