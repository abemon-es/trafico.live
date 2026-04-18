import type { Metadata } from "next";
import Link from "next/link";
import { Navigation, ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Radiografía por carretera — IMD, accidentes y radares",
  description:
    "Elige una vía nacional para ver su perfil detallado: tráfico medio diario, accidentes históricos, radares, cámaras y tramos críticos.",
  alternates: { canonical: `${BASE_URL}/inteligencia/radiografia-carretera` },
};

const FEATURED_ROADS = [
  { code: "A-1", name: "Autovía del Norte (Madrid-Burgos-Irún)" },
  { code: "A-2", name: "Autovía del Nordeste (Madrid-Zaragoza-Barcelona)" },
  { code: "A-3", name: "Autovía del Este (Madrid-Valencia)" },
  { code: "A-4", name: "Autovía del Sur (Madrid-Córdoba-Sevilla-Cádiz)" },
  { code: "A-5", name: "Autovía del Suroeste (Madrid-Badajoz)" },
  { code: "A-6", name: "Autovía del Noroeste (Madrid-A Coruña)" },
  { code: "A-7", name: "Autovía del Mediterráneo (Algeciras-Barcelona)" },
  { code: "A-8", name: "Autovía del Cantábrico (Irún-Santander-Oviedo-Baamonde)" },
  { code: "AP-7", name: "Autopista del Mediterráneo (La Jonquera-Algeciras)" },
  { code: "AP-1", name: "Autopista del Norte (Burgos-Armiñón)" },
  { code: "AP-6", name: "Autopista del Noroeste (Villalba-Adanero)" },
  { code: "AP-9", name: "Autopista del Atlántico (Tuy-Ferrol)" },
  { code: "N-I", name: "Carretera Nacional I (Madrid-Irún)" },
  { code: "N-II", name: "Carretera Nacional II (Madrid-La Jonquera)" },
  { code: "N-III", name: "Carretera Nacional III (Madrid-Valencia)" },
  { code: "N-IV", name: "Carretera Nacional IV (Madrid-Cádiz)" },
  { code: "M-30", name: "Circunvalación M-30 Madrid" },
  { code: "M-40", name: "Circunvalación M-40 Madrid" },
];

export default function RadiografiaCarreteraIndexPage() {
  const breadcrumbs = [
    { name: "Inicio", href: "/" },
    { name: "Inteligencia", href: "/inteligencia" },
    { name: "Radiografía por carretera", href: "/inteligencia/radiografia-carretera" },
  ];

  return (
    <>
      <Breadcrumbs items={breadcrumbs} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-3">
            <Navigation className="w-4 h-4" /> Radiografía por carretera
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-ink-900 dark:text-gray-50 mb-3">
            Elige una carretera
          </h1>
          <p className="text-lg text-ink-700 dark:text-gray-300 max-w-3xl">
            Un panel único por cada gran vía con IMD por tramo, accidentes
            históricos (DGT 2019-2023), radares, cámaras DGT, limite de
            velocidad, peajes (si aplica) y estaciones de servicio cercanas.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {FEATURED_ROADS.map((r) => (
            <Link
              key={r.code}
              href={`/inteligencia/radiografia-carretera/${r.code}`}
              className="group flex flex-col gap-1 rounded-xl border border-ink-200 dark:border-gray-800 p-4 hover:border-tl-500 dark:hover:border-tl-500 transition-colors"
            >
              <span className="font-data text-lg font-bold text-tl-600 dark:text-tl-400">
                {r.code}
              </span>
              <span className="text-sm text-ink-700 dark:text-gray-300 group-hover:text-ink-900 dark:group-hover:text-gray-100">
                {r.name}
              </span>
              <ArrowRight className="w-4 h-4 text-ink-400 self-end mt-auto group-hover:text-tl-600" />
            </Link>
          ))}
        </section>

        <section className="mt-10 pt-8 border-t border-ink-200 dark:border-gray-800">
          <p className="text-sm text-ink-600 dark:text-gray-400">
            ¿No encuentras tu carretera? Navega el catálogo completo en{" "}
            <Link href="/carreteras" className="text-tl-600 dark:text-tl-400 hover:underline">
              /carreteras
            </Link>{" "}
            o el análisis de accidentes en{" "}
            <Link href="/analisis/carreteras" className="text-tl-600 dark:text-tl-400 hover:underline">
              /analisis/carreteras
            </Link>
            .
          </p>
        </section>
      </main>
    </>
  );
}
