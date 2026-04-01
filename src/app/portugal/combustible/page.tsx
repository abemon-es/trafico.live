import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  Fuel,
  MapPin,
  TrendingDown,
  Globe,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Precios combustible Portugal Hoy — Gasóleo y Gasolina",
  description:
    "Precios actualizados de gasóleo y gasolina en Portugal. Compara estaciones, distritos y marcas. Datos de la DGEG.",
  alternates: {
    canonical: `${BASE_URL}/portugal/combustible`,
  },
  openGraph: {
    title: "Precios combustible Portugal — Gasóleo y Gasolina actualizados",
    description:
      "Precios actualizados de gasóleo y gasolina en Portugal. Compara por distrito y marca. Datos DGEG.",
    url: `${BASE_URL}/portugal/combustible`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(value: unknown): string {
  if (value == null) return "N/D";
  const n =
    typeof value === "object" && value !== null && "toNumber" in value
      ? (value as { toNumber: () => number }).toNumber()
      : Number(value);
  return `${n.toFixed(3)} €`;
}

function diff(pt: unknown, es: unknown): { text: string; positive: boolean } | null {
  if (pt == null || es == null) return null;
  const ptN =
    typeof pt === "object" && pt !== null && "toNumber" in pt
      ? (pt as { toNumber: () => number }).toNumber()
      : Number(pt);
  const esN =
    typeof es === "object" && es !== null && "toNumber" in es
      ? (es as { toNumber: () => number }).toNumber()
      : Number(es);
  const delta = ptN - esN;
  return {
    text: `${delta > 0 ? "+" : ""}${delta.toFixed(3)} € vs España`,
    positive: delta < 0,
  };
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getPortugalFuelData() {
  const { unstable_noStore: noStore } = await import("next/cache");
  noStore();

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const [
    nationalStats,
    spainStats,
    cheapestDiesel,
    cheapestGas95,
    byDistrict,
    byBrand,
    stationCount,
  ] = await Promise.all([
    // Portugal national averages
    prisma.portugalGasStation.aggregate({
      _avg: {
        priceGasoleoSimples: true,
        priceGasoleoEspecial: true,
        priceGasolina95: true,
        priceGasolina95Especial: true,
        priceGasolina98: true,
        priceGasolina98Especial: true,
        priceGPL: true,
        priceGNC: true,
      },
      _min: {
        priceGasoleoSimples: true,
        priceGasolina95: true,
        priceGasolina98: true,
        priceGPL: true,
      },
      _max: {
        priceGasoleoSimples: true,
        priceGasolina95: true,
      },
      _count: { id: true },
    }),

    // Spanish national stats for comparison
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: today },
      select: { avgGasoleoA: true, avgGasolina95: true, avgGasolina98: true },
    }),

    // Cheapest 10 diesel stations
    prisma.portugalGasStation.findMany({
      where: { priceGasoleoSimples: { not: null } },
      orderBy: { priceGasoleoSimples: "asc" },
      take: 10,
      select: {
        id: true,
        name: true,
        locality: true,
        district: true,
        brand: true,
        priceGasoleoSimples: true,
        is24h: true,
      },
    }),

    // Cheapest 10 gasolina 95 stations
    prisma.portugalGasStation.findMany({
      where: { priceGasolina95: { not: null } },
      orderBy: { priceGasolina95: "asc" },
      take: 10,
      select: {
        id: true,
        name: true,
        locality: true,
        district: true,
        brand: true,
        priceGasolina95: true,
        is24h: true,
      },
    }),

    // Average prices by district
    prisma.portugalGasStation.groupBy({
      by: ["district"],
      where: {
        district: { not: null },
        priceGasoleoSimples: { not: null },
      },
      _avg: {
        priceGasoleoSimples: true,
        priceGasolina95: true,
        priceGasolina98: true,
      },
      _count: { id: true },
      orderBy: { _avg: { priceGasoleoSimples: "asc" } },
    }),

    // Average prices by brand (top 12 by count)
    prisma.portugalGasStation.groupBy({
      by: ["brand"],
      where: {
        brand: { not: null },
        priceGasoleoSimples: { not: null },
      },
      _avg: {
        priceGasoleoSimples: true,
        priceGasolina95: true,
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 12,
    }),

    prisma.portugalGasStation.count(),
  ]);

  return {
    nationalStats,
    spainStats,
    cheapestDiesel,
    cheapestGas95,
    byDistrict,
    byBrand,
    stationCount,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PortugalCombustiblePage() {
  const {
    nationalStats,
    spainStats,
    cheapestDiesel,
    cheapestGas95,
    byDistrict,
    byBrand,
    stationCount,
  } = await getPortugalFuelData();

  const avgDieselDiff = diff(nationalStats._avg.priceGasoleoSimples, spainStats?.avgGasoleoA);
  const avgGas95Diff = diff(nationalStats._avg.priceGasolina95, spainStats?.avgGasolina95);

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Precios Combustible Portugal — Gasóleo y Gasolina",
    description:
      "Precios actualizados de combustible en Portugal por estación, distrito y marca. Datos de la DGEG.",
    url: `${BASE_URL}/portugal/combustible`,
    inLanguage: "es",
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  return (
    <>
      <StructuredData data={webPageSchema} />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Portugal", href: "/portugal" },
            { name: "Combustible", href: "/portugal/combustible" },
          ]}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--color-tl-amber-600) 0%, var(--color-tl-amber-500) 60%, var(--color-tl-amber-400) 100%)",
        }}
      >
        <div className="relative max-w-7xl mx-auto px-4 py-14 md:py-16">
          <div className="flex items-center gap-3 mb-3">
            <Fuel className="w-9 h-9 text-tl-amber-200" />
            <span className="font-heading text-tl-amber-200 text-sm font-semibold uppercase tracking-widest">
              trafico.live / Portugal / Combustible
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
            Precios de Combustible en Portugal
          </h1>
          <p className="text-tl-amber-100 text-lg max-w-2xl leading-relaxed">
            Datos de la DGEG para{" "}
            <strong className="text-white">{stationCount.toLocaleString("es-ES")} estaciones</strong>.
            Actualizado 3 veces al día.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ---------------------------------------------------------------- */}
        {/* National averages                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Precios medios nacionales en Portugal">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Medias nacionales
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Gasóleo Simples",
                avg: nationalStats._avg.priceGasoleoSimples,
                min: nationalStats._min.priceGasoleoSimples,
                max: nationalStats._max.priceGasoleoSimples,
                comparison: avgDieselDiff,
              },
              {
                label: "Gasolina 95",
                avg: nationalStats._avg.priceGasolina95,
                min: nationalStats._min.priceGasolina95,
                max: nationalStats._max.priceGasolina95,
                comparison: avgGas95Diff,
              },
              {
                label: "Gasolina 98",
                avg: nationalStats._avg.priceGasolina98,
                min: nationalStats._min.priceGasolina98,
                max: null,
                comparison: null,
              },
              {
                label: "GPL",
                avg: nationalStats._avg.priceGPL,
                min: nationalStats._min.priceGPL,
                max: null,
                comparison: null,
              },
            ].map((fuel) => (
              <div
                key={fuel.label}
                className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-tl-amber-200 dark:border-tl-amber-800/50"
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-3">
                  {fuel.label}
                </div>
                <div className="font-data text-3xl font-bold text-tl-amber-700 dark:text-tl-amber-300">
                  {fmt(fuel.avg)}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Min: {fmt(fuel.min)}
                  {fuel.max != null && ` · Máx: ${fmt(fuel.max)}`}
                </div>
                {fuel.comparison && (
                  <div
                    className={`text-xs mt-2 font-semibold ${
                      fuel.comparison.positive
                        ? "text-tl-500 dark:text-tl-400"
                        : "text-tl-amber-600 dark:text-tl-amber-400"
                    }`}
                  >
                    {fuel.comparison.text}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Spain comparison banner */}
          {spainStats && (
            <div className="mt-4 rounded-xl border p-4 bg-tl-50 dark:bg-tl-950/30 border-tl-200 dark:border-tl-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                <span className="text-sm font-semibold text-tl-700 dark:text-tl-300">
                  Comparativa con España (media hoy)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gasóleo A (España)</div>
                  <div className="font-data font-bold text-gray-800 dark:text-gray-200">
                    {fmt(spainStats.avgGasoleoA)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gasolina 95 (España)</div>
                  <div className="font-data font-bold text-gray-800 dark:text-gray-200">
                    {fmt(spainStats.avgGasolina95)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gasolina 98 (España)</div>
                  <div className="font-data font-bold text-gray-800 dark:text-gray-200">
                    {fmt(spainStats.avgGasolina98)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Cheapest stations grid                                            */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Estaciones más baratas de Portugal">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Estaciones más baratas
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Gasóleo */}
            <div>
              <h3 className="font-heading font-semibold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-tl-500" />
                Gasóleo Simples
              </h3>
              <div className="rounded-xl border border-tl-200 dark:border-tl-800/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-tl-50 dark:bg-tl-950/30 border-b border-tl-200 dark:border-tl-800/50">
                      <th className="text-left px-3 py-2 font-heading font-semibold text-gray-600 dark:text-gray-400">
                        Estación
                      </th>
                      <th className="text-right px-3 py-2 font-heading font-semibold text-gray-600 dark:text-gray-400">
                        Precio
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cheapestDiesel.map((s, i) => (
                      <tr
                        key={s.id}
                        className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-tl-50/50 dark:hover:bg-tl-950/20 transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-start gap-2">
                            <span className="font-data text-xs text-gray-400 dark:text-gray-500 w-4 shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div>
                              <div className="font-medium text-gray-800 dark:text-gray-200 leading-tight">
                                {s.name}
                              </div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />
                                {s.locality ?? s.district ?? "—"}
                                {s.brand ? ` · ${s.brand}` : ""}
                                {s.is24h && (
                                  <span className="ml-1 px-1.5 py-0.5 rounded bg-tl-100 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300 text-xs">
                                    24h
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-data font-bold text-tl-amber-700 dark:text-tl-amber-300 whitespace-nowrap">
                          {fmt(s.priceGasoleoSimples)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gasolina 95 */}
            <div>
              <h3 className="font-heading font-semibold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-tl-500" />
                Gasolina 95
              </h3>
              <div className="rounded-xl border border-tl-200 dark:border-tl-800/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-tl-50 dark:bg-tl-950/30 border-b border-tl-200 dark:border-tl-800/50">
                      <th className="text-left px-3 py-2 font-heading font-semibold text-gray-600 dark:text-gray-400">
                        Estación
                      </th>
                      <th className="text-right px-3 py-2 font-heading font-semibold text-gray-600 dark:text-gray-400">
                        Precio
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cheapestGas95.map((s, i) => (
                      <tr
                        key={s.id}
                        className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-tl-50/50 dark:hover:bg-tl-950/20 transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-start gap-2">
                            <span className="font-data text-xs text-gray-400 dark:text-gray-500 w-4 shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div>
                              <div className="font-medium text-gray-800 dark:text-gray-200 leading-tight">
                                {s.name}
                              </div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />
                                {s.locality ?? s.district ?? "—"}
                                {s.brand ? ` · ${s.brand}` : ""}
                                {s.is24h && (
                                  <span className="ml-1 px-1.5 py-0.5 rounded bg-tl-100 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300 text-xs">
                                    24h
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-data font-bold text-tl-amber-700 dark:text-tl-amber-300 whitespace-nowrap">
                          {fmt(s.priceGasolina95)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* By district                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Precio medio de combustible por distrito en Portugal">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Por distrito
          </h2>
          <div className="rounded-xl border border-tl-200 dark:border-tl-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-tl-50 dark:bg-tl-950/30 border-b border-tl-200 dark:border-tl-800/50">
                    <th className="text-left px-4 py-3 font-heading font-semibold text-gray-700 dark:text-gray-300">
                      Distrito
                    </th>
                    <th className="text-right px-4 py-3 font-heading font-semibold text-gray-700 dark:text-gray-300">
                      Gasóleo
                    </th>
                    <th className="text-right px-4 py-3 font-heading font-semibold text-gray-700 dark:text-gray-300">
                      Gasolina 95
                    </th>
                    <th className="text-right px-4 py-3 font-heading font-semibold text-gray-700 dark:text-gray-300">
                      Gasolina 98
                    </th>
                    <th className="text-right px-4 py-3 font-heading font-semibold text-gray-700 dark:text-gray-300">
                      Estaciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byDistrict.map((row) => (
                    <tr
                      key={row.district ?? "unknown"}
                      className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-tl-50/50 dark:hover:bg-tl-950/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        {row.district ?? "Sin clasificar"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-data text-tl-amber-700 dark:text-tl-amber-300 font-semibold">
                        {fmt(row._avg.priceGasoleoSimples)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-data text-gray-700 dark:text-gray-300">
                        {fmt(row._avg.priceGasolina95)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-data text-gray-500 dark:text-gray-400">
                        {fmt(row._avg.priceGasolina98)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-data text-gray-400 dark:text-gray-500">
                        {row._count.id.toLocaleString("es-ES")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* By brand                                                          */}
        {/* ---------------------------------------------------------------- */}
        {byBrand.length > 0 && (
          <section aria-label="Precio medio de combustible por marca en Portugal">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Por marca
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {byBrand.map((row) => (
                <div
                  key={row.brand ?? "otras"}
                  className="rounded-xl border p-4 bg-white dark:bg-gray-900 border-tl-200 dark:border-tl-800/50"
                >
                  <div className="text-sm font-heading font-semibold text-gray-800 dark:text-gray-200 mb-2 truncate">
                    {row.brand ?? "Otras"}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">Gasóleo</span>
                      <span className="font-data text-sm font-bold text-tl-amber-700 dark:text-tl-amber-300">
                        {fmt(row._avg.priceGasoleoSimples)}
                      </span>
                    </div>
                    {row._avg.priceGasolina95 != null && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">G95</span>
                        <span className="font-data text-sm font-bold text-gray-700 dark:text-gray-300">
                          {fmt(row._avg.priceGasolina95)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    <BarChart3 className="w-3 h-3 inline mr-1" />
                    {row._count.id} estaciones
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Attribution & back link */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Fuente: Direção-Geral de Energia e Geologia (DGEG) · Precios en EUR ·
            Actualizado 3 veces al día
          </p>
          <Link
            href="/portugal"
            className="text-sm text-tl-600 dark:text-tl-400 hover:underline flex items-center gap-1 font-medium"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Volver a Portugal
          </Link>
        </div>

      </div>
    </>
  );
}
