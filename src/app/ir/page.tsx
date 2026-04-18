import type { Metadata } from "next";
import { Map, Train, Bus, Plane, Car } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { ODInput } from "@/components/multimodal/ODInput";

export const metadata: Metadata = {
  title: "Cómo ir a cualquier parte de España — Rutas multimodal | trafico.live",
  description:
    "Planifica tu viaje entre ciudades españolas: coche, tren, bus y avión. Compara tiempos, precios y emisiones de CO2 en un solo lugar.",
  openGraph: {
    title: "Cómo ir a cualquier parte de España — trafico.live",
    description:
      "Rutas multimodal entre ciudades. Coche, tren, bus y avión con datos en tiempo real.",
    url: "https://trafico.live/ir",
  },
  alternates: {
    canonical: "https://trafico.live/ir",
  },
};

const RELATED_LINKS = [
  {
    title: "Trenes en directo",
    description: "Posiciones GPS y retrasos de la flota Renfe en tiempo real.",
    href: "/trenes",
    icon: <Train className="w-4 h-4" />,
  },
  {
    title: "Transporte público",
    description: "Metro, bus y tranvía en las principales ciudades.",
    href: "/transporte-publico",
    icon: <Bus className="w-4 h-4" />,
  },
  {
    title: "Aviación",
    description: "Vuelos y aeropuertos AENA en tiempo real.",
    href: "/aviacion",
    icon: <Plane className="w-4 h-4" />,
  },
  {
    title: "Calculadora de ruta",
    description: "Calcula el coste de combustible de tu viaje en coche.",
    href: "/calculadora",
    icon: <Car className="w-4 h-4" />,
  },
];

const FAQ = [
  {
    q: "¿Qué es /ir?",
    a: "Es el meta-buscador de rutas interurbanas de trafico.live. Compara cómo ir de una ciudad a otra en coche, tren, bus o avión con tiempos, precios estimados y emisiones de CO2 en un solo vistazo.",
  },
  {
    q: "¿Cubre toda España?",
    a: "Sí. El motor incluye las 50 ciudades más pobladas del país (y sus combinaciones), con datos de DGT, Renfe, operadores de bus y aeropuertos AENA.",
  },
  {
    q: "¿Con qué frecuencia se actualizan los datos?",
    a: "Los datos de tráfico y trenes se actualizan cada 2-5 minutos. Los precios de bus y avión tienen una latencia de 24 horas.",
  },
];

export default function IrPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-12">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Rutas interurbanas", href: "/ir" },
        ]}
      />

      {/* Hero */}
      <section className="space-y-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tl-50 dark:bg-tl-900/30 border border-tl-200 dark:border-tl-800 text-tl-700 dark:text-tl-300 text-xs font-semibold uppercase tracking-wider">
          <Map className="w-3.5 h-3.5" aria-hidden />
          Rutas multimodal
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight">
          ¿Cómo llegar a cualquier{" "}
          <span className="text-tl-600 dark:text-tl-400">parte de España?</span>
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
          Compara coche, tren, bus y avión — tiempos, precios y emisiones de CO2 entre las 50 ciudades mas pobladas del pais.
        </p>

        {/* OD search form */}
        <div className="flex justify-center">
          {/* S4: wire to /api/ir */}
          <ODInput />
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Ejemplo:{" "}
          <a href="/ir/madrid/barcelona" className="text-tl-600 dark:text-tl-400 hover:underline">
            Madrid → Barcelona
          </a>
          {", "}
          <a href="/ir/sevilla/malaga" className="text-tl-600 dark:text-tl-400 hover:underline">
            Sevilla → Málaga
          </a>
          {", "}
          <a href="/ir/bilbao/donostia" className="text-tl-600 dark:text-tl-400 hover:underline">
            Bilbao → Donostia
          </a>
        </p>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="space-y-4">
        <h2
          id="faq-heading"
          className="font-display text-xl font-bold text-gray-900 dark:text-gray-100"
        >
          Preguntas frecuentes
        </h2>
        <dl className="space-y-4">
          {FAQ.map(({ q, a }) => (
            <div
              key={q}
              className="rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4"
            >
              <dt className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{q}</dt>
              <dd className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <RelatedLinks links={RELATED_LINKS} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Cómo ir a cualquier parte de España — Rutas multimodal",
            description:
              "Meta-buscador de rutas interurbanas. Coche, tren, bus y avión.",
            url: "https://trafico.live/ir",
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
