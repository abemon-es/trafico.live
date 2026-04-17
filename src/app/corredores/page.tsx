import type { Metadata } from "next";
import Link from "next/link";
import { Car, Train, Plane, Route, Clock, ArrowRight, Ruler } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData, generateDatasetSchema } from "@/components/seo/StructuredData";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { CORRIDORS, hasAirConnection, hasRailConnection } from "@/lib/corridors";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Corredores de Transporte en Espana — Coche vs Tren vs Avion",
  description:
    "Compara los principales corredores de transporte en Espana: tiempo, coste, emisiones CO2 y condiciones en tiempo real. Madrid-Barcelona, Madrid-Sevilla, Madrid-Valencia y 9 rutas mas.",
  alternates: { canonical: `${BASE_URL}/corredores` },
  openGraph: {
    title: "Corredores de Transporte en Espana — Coche vs Tren vs Avion",
    description:
      "Comparativa multimodal de los 12 principales corredores de transporte espanoles. Datos de DGT, Renfe, CNMC y Ministerio de Transportes.",
    url: `${BASE_URL}/corredores`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export default function CorredoresPage() {
  return (
    <>
      <StructuredData
        data={generateDatasetSchema({
          name: "Corredores de transporte multimodal en Espana",
          description:
            "Comparativa de los principales corredores de transporte espanoles: carretera, tren y avion. Tiempo, coste, CO2 y datos en tiempo real.",
          url: `${BASE_URL}/corredores`,
          keywords: [
            "corredores transporte",
            "comparativa coche tren avion",
            "Madrid Barcelona",
            "Madrid Sevilla",
          ],
          spatialCoverage: "Espana",
        })}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Corredores de Transporte", href: "/corredores" },
          ]}
        />

        {/* Hero */}
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
            Corredores de Transporte
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl">
            Compara las principales rutas entre ciudades espanolas: tiempo de viaje, coste
            estimado, emisiones de CO<sub>2</sub> y condiciones en tiempo real por carretera,
            tren y avion.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-tl-50 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800">
              <Route className="w-4 h-4" />
              {CORRIDORS.length} corredores
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <Car className="w-4 h-4" />
              Carretera
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <Train className="w-4 h-4" />
              Tren
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <Plane className="w-4 h-4" />
              Avion
            </span>
          </div>
        </header>

        {/* Corridor grid */}
        <section aria-label="Lista de corredores">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CORRIDORS.map((corridor) => {
              const hasRail = hasRailConnection(corridor);
              const hasAir = hasAirConnection(corridor);

              return (
                <Link
                  key={corridor.slug}
                  href={`/corredores/${corridor.slug}`}
                  className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-lg hover:border-tl-300 dark:hover:border-tl-700 transition-all"
                >
                  {/* Name */}
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors">
                      {corridor.name}
                    </h2>
                    <ArrowRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-tl-500 transition-colors flex-shrink-0 mt-0.5" />
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5" />
                      <span className="font-mono font-medium">{corridor.distance}</span> km
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-mono font-medium">{formatTime(corridor.driveTime)}</span>
                    </span>
                  </div>

                  {/* Mode badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-tl-amber-50 dark:bg-tl-amber-900/30 text-tl-amber-700 dark:text-tl-amber-300">
                      <Car className="w-3 h-3" />
                      Coche
                    </span>
                    {hasRail && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-tl-50 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300">
                        <Train className="w-3 h-3" />
                        {corridor.trainBrands!.join(", ")}
                      </span>
                    )}
                    {hasAir && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-tl-sea-50 dark:bg-tl-sea-900/30 text-tl-sea-700 dark:text-tl-sea-300">
                        <Plane className="w-3 h-3" />
                        {corridor.origin.iata} — {corridor.destination.iata}
                      </span>
                    )}
                  </div>

                  {/* Roads */}
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                    Carreteras: {corridor.roads.join(", ")}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Data attribution */}
        <p className="text-xs text-gray-400 dark:text-gray-600">
          Fuentes: DGT, Renfe, CNMC, AENA, Ministerio de Transportes. Tiempos de referencia
          sin trafico. Costes estimados con consumo medio 7 L/100km.
        </p>

        <RelatedLinks
          links={[
            {
              title: "Estado del trafico",
              description: "Incidencias en tiempo real en la red viaria espanola",
              href: "/trafico",
              icon: <Car className="w-5 h-5" />,
            },
            {
              title: "Red ferroviaria",
              description: "Mapa de trenes en tiempo real, estaciones y lineas",
              href: "/trenes",
              icon: <Train className="w-5 h-5" />,
            },
            {
              title: "Aviacion",
              description: "Aeropuertos AENA y posiciones de aeronaves en vivo",
              href: "/aviacion",
              icon: <Plane className="w-5 h-5" />,
            },
            {
              title: "Carreteras",
              description: "Red viaria nacional por tipo y provincia",
              href: "/carreteras",
              icon: <Route className="w-5 h-5" />,
            },
          ]}
        />
      </main>
    </>
  );
}
