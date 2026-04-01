import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  MapPin,
  Fuel,
  CloudRain,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  Car,
  BarChart3,
  Globe,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const dynamic = "force-dynamic"; // SSR on every request
export const revalidate = 0;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Portugal — Combustible, Alertas y Tráfico | trafico.live",
  description:
    "Precios de combustible en Portugal, alertas meteorológicas IPMA y estadísticas de accidentes. Compara precios entre España y Portugal.",
  alternates: {
    canonical: `${BASE_URL}/portugal`,
  },
  openGraph: {
    title: "Portugal — Combustible, Alertas y Tráfico | trafico.live",
    description:
      "Precios de combustible en Portugal, alertas meteorológicas IPMA y estadísticas de accidentes. Compara precios entre España y Portugal.",
    url: `${BASE_URL}/portugal`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Border provinces linking Spain → Portugal
// ---------------------------------------------------------------------------

const BORDER_PROVINCES = [
  { code: "36", name: "Pontevedra" },
  { code: "32", name: "Ourense" },
  { code: "49", name: "Zamora" },
  { code: "37", name: "Salamanca" },
  { code: "10", name: "Cáceres" },
  { code: "06", name: "Badajoz" },
  { code: "21", name: "Huelva" },
];

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function formatPrice(value: unknown): string {
  if (value == null) return "N/D";
  const n =
    typeof value === "object" && value !== null && "toNumber" in value
      ? (value as { toNumber: () => number }).toNumber()
      : Number(value);
  return `${n.toFixed(3)} €`;
}

function severityColor(severity: string): {
  badge: string;
  border: string;
} {
  switch (severity.toLowerCase()) {
    case "red":
      return {
        badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        border: "border-red-300 dark:border-red-800/50",
      };
    case "orange":
      return {
        badge:
          "bg-tl-amber-100 text-tl-amber-700 dark:bg-tl-amber-900/40 dark:text-tl-amber-300",
        border: "border-tl-amber-300 dark:border-tl-amber-800/50",
      };
    case "yellow":
      return {
        badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
        border: "border-yellow-300 dark:border-yellow-800/50",
      };
    default:
      return {
        badge: "bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300",
        border: "border-tl-sea-200 dark:border-tl-sea-800/50",
      };
  }
}

function severityLabel(s: string): string {
  const map: Record<string, string> = {
    red: "Roja",
    orange: "Naranja",
    yellow: "Amarilla",
    green: "Verde",
  };
  return map[s.toLowerCase()] ?? s;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getPortugalData() {
  const { unstable_noStore: noStore } = await import("next/cache");
  noStore();

  const [
    weatherAlerts,
    fuelStats,
    cheapestDiesel,
    accidentStats,
    stationCount,
  ] = await Promise.all([
    // Active IPMA weather alerts
    prisma.portugalWeatherAlert.findMany({
      where: { isActive: true },
      orderBy: [{ severity: "asc" }, { startedAt: "desc" }],
      take: 8,
      select: {
        id: true,
        type: true,
        severity: true,
        areaCode: true,
        areaName: true,
        startedAt: true,
        endedAt: true,
        description: true,
      },
    }),

    // Aggregate fuel prices across Portugal
    prisma.portugalGasStation.aggregate({
      _avg: {
        priceGasoleoSimples: true,
        priceGasolina95: true,
        priceGasolina98: true,
        priceGPL: true,
      },
      _min: {
        priceGasoleoSimples: true,
        priceGasolina95: true,
      },
      _count: { id: true },
    }),

    // Cheapest diesel station overall
    prisma.portugalGasStation.findFirst({
      where: { priceGasoleoSimples: { not: null } },
      orderBy: { priceGasoleoSimples: "asc" },
      select: {
        id: true,
        name: true,
        locality: true,
        district: true,
        brand: true,
        priceGasoleoSimples: true,
      },
    }),

    // Latest year accident totals across all districts
    prisma.portugalHistoricalAccidents.groupBy({
      by: ["year"],
      _sum: {
        accidents: true,
        fatalities: true,
        seriousInjury: true,
        minorInjury: true,
      },
      orderBy: { year: "desc" },
      take: 3,
    }),

    // Total station count
    prisma.portugalGasStation.count(),
  ]);

  return { weatherAlerts, fuelStats, cheapestDiesel, accidentStats, stationCount };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PortugalPage() {
  const { weatherAlerts, fuelStats, cheapestDiesel, accidentStats, stationCount } =
    await getPortugalData();

  const latestAccidentYear = accidentStats[0];

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Portugal — Combustible, Alertas Meteorológicas y Tráfico",
    description:
      "Portal de tráfico e información de viaje para Portugal: precios de combustible (DGEG), alertas meteorológicas (IPMA) y estadísticas de accidentes.",
    url: `${BASE_URL}/portugal`,
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
            "linear-gradient(135deg, var(--color-tl-600) 0%, var(--color-tl-500) 50%, var(--color-tl-400) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -bottom-12 -right-12 w-72 h-72 rounded-full opacity-10"
          style={{ background: "var(--color-tl-300)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-8 -left-8 w-48 h-48 rounded-full opacity-10"
          style={{ background: "var(--color-tl-200)" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-10 h-10 text-tl-200" />
            <span className="font-heading text-tl-200 text-sm font-semibold uppercase tracking-widest">
              trafico.live / Portugal
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Tráfico y combustible en Portugal
          </h1>
          <p className="text-tl-100 text-lg md:text-xl max-w-2xl leading-relaxed">
            Consulta los precios de combustible en más de{" "}
            <strong className="text-white">{stationCount.toLocaleString("es-ES")} estaciones</strong>{" "}
            portuguesas, alertas meteorológicas del IPMA y estadísticas de accidentes de la DGV.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/portugal/combustible"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              style={{
                background: "var(--color-tl-200)",
                color: "var(--color-tl-900)",
              }}
            >
              <Fuel className="w-4 h-4" />
              Ver combustible
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ---------------------------------------------------------------- */}
        {/* Quick stats                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Datos rápidos de Portugal">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {/* Stations */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-tl-200 dark:border-tl-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Fuel className="w-5 h-5 text-tl-500 dark:text-tl-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Estaciones</span>
              </div>
              <div className="font-data text-3xl font-bold text-tl-700 dark:text-tl-300">
                {stationCount.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">gasolineras DGEG</div>
            </div>

            {/* Avg diesel */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-tl-200 dark:border-tl-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Fuel className="w-5 h-5 text-tl-amber-500 dark:text-tl-amber-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Gasóleo medio</span>
              </div>
              <div className="font-data text-3xl font-bold text-tl-amber-700 dark:text-tl-amber-300">
                {formatPrice(fuelStats._avg.priceGasoleoSimples)}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">media nacional</div>
            </div>

            {/* Active alerts */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-tl-amber-200 dark:border-tl-amber-800/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-tl-amber-500 dark:text-tl-amber-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Alertas IPMA</span>
              </div>
              <div className="font-data text-3xl font-bold text-tl-amber-700 dark:text-tl-amber-300">
                {weatherAlerts.length}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">activas ahora</div>
            </div>

            {/* Latest year accidents */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-tl-200 dark:border-tl-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-5 h-5 text-tl-500 dark:text-tl-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Accidentes {latestAccidentYear?.year ?? "—"}
                </span>
              </div>
              <div className="font-data text-3xl font-bold text-tl-700 dark:text-tl-300">
                {latestAccidentYear?._sum?.accidents?.toLocaleString("es-ES") ?? "N/D"}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {latestAccidentYear?._sum?.fatalities ?? 0} fallecidos
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Sections grid                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Secciones de Portugal">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Información de Portugal
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            <Link
              href="/portugal/combustible"
              className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-tl-200 dark:border-tl-800/50 hover:border-tl-400 dark:hover:border-tl-600 hover:shadow-md transition-all"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-tl-100)" }}
              >
                <Fuel className="w-6 h-6 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Precios de Combustible
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Gasóleo, gasolina 95/98 y GPL en más de{" "}
                  {stationCount.toLocaleString("es-ES")} estaciones
                </p>
              </div>
              <div className="flex items-center gap-1 text-tl-600 dark:text-tl-400 text-sm font-medium group-hover:gap-2 transition-all">
                Ver precios <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            <div className="flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-tl-amber-200 dark:border-tl-amber-800/50">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-tl-amber-100)" }}
              >
                <CloudRain className="w-6 h-6 text-tl-amber-600 dark:text-tl-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Alertas Meteorológicas IPMA
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {weatherAlerts.length > 0
                    ? `${weatherAlerts.length} alerta${weatherAlerts.length !== 1 ? "s" : ""} activa${weatherAlerts.length !== 1 ? "s" : ""}`
                    : "Sin alertas activas"}
                </p>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">Fuente: IPMA</span>
            </div>

            <div className="flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-tl-200 dark:border-tl-800/50">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-tl-100)" }}
              >
                <BarChart3 className="w-6 h-6 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Accidentes de Tráfico
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Datos históricos de la DGV por distrito y año
                </p>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">Fuente: DGV Portugal</span>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Active weather alerts                                             */}
        {/* ---------------------------------------------------------------- */}
        {weatherAlerts.length > 0 && (
          <section aria-label="Alertas meteorológicas activas en Portugal">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Alertas IPMA activas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {weatherAlerts.map((alert) => {
                const colors = severityColor(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-4 bg-white dark:bg-gray-900 ${colors.border}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-heading font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {alert.type}
                      </span>
                      <span
                        className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors.badge}`}
                      >
                        {severityLabel(alert.severity)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {alert.areaName ?? alert.areaCode}
                    </p>
                    {alert.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">
                        {alert.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      Desde{" "}
                      {new Date(alert.startedAt).toLocaleString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Fuente: Instituto Português do Mar e da Atmosfera (IPMA)
            </p>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Fuel price summary                                                */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Resumen de precios de combustible en Portugal">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100">
              Combustible en Portugal
            </h2>
            <Link
              href="/portugal/combustible"
              className="text-sm text-tl-600 dark:text-tl-400 font-medium hover:underline flex items-center gap-1"
            >
              Ver detalle <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Gasóleo Simples", value: fuelStats._avg.priceGasoleoSimples, min: fuelStats._min.priceGasoleoSimples },
              { label: "Gasolina 95", value: fuelStats._avg.priceGasolina95, min: fuelStats._min.priceGasolina95 },
              { label: "Gasolina 98", value: fuelStats._avg.priceGasolina98, min: null },
              { label: "GPL", value: fuelStats._avg.priceGPL, min: null },
            ].map((fuel) => (
              <div
                key={fuel.label}
                className="rounded-xl border p-4 bg-white dark:bg-gray-900 border-tl-200 dark:border-tl-800/50"
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                  {fuel.label}
                </div>
                <div className="font-data text-2xl font-bold text-tl-700 dark:text-tl-300">
                  {formatPrice(fuel.value)}
                </div>
                {fuel.min != null && (
                  <div className="text-xs text-tl-500 dark:text-tl-400 mt-1">
                    Mínimo: {formatPrice(fuel.min)}
                  </div>
                )}
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">precio medio</div>
              </div>
            ))}
          </div>

          {cheapestDiesel && (
            <div className="rounded-xl border p-4 bg-tl-50 dark:bg-tl-950/30 border-tl-200 dark:border-tl-800/50">
              <div className="flex items-center gap-2 mb-1">
                <Fuel className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                <span className="text-sm font-semibold text-tl-700 dark:text-tl-300">
                  Estación más barata (Gasóleo)
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>{cheapestDiesel.name}</strong>
                {cheapestDiesel.locality ? ` · ${cheapestDiesel.locality}` : ""}
                {cheapestDiesel.district ? `, ${cheapestDiesel.district}` : ""}
                {cheapestDiesel.brand ? ` (${cheapestDiesel.brand})` : ""}
              </p>
              <p className="font-data text-xl font-bold text-tl-700 dark:text-tl-300 mt-1">
                {formatPrice(cheapestDiesel.priceGasoleoSimples)}
              </p>
            </div>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Fuente: Direção-Geral de Energia e Geologia (DGEG) · Actualizado 3 veces al día
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Historical accidents                                              */}
        {/* ---------------------------------------------------------------- */}
        {accidentStats.length > 0 && (
          <section aria-label="Accidentes de tráfico históricos en Portugal">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Accidentes de tráfico en Portugal
            </h2>
            <div className="overflow-x-auto rounded-xl border border-tl-200 dark:border-tl-800/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-tl-200 dark:border-tl-800/50 bg-tl-50 dark:bg-tl-950/30">
                    <th className="text-left px-4 py-3 font-heading font-semibold text-gray-700 dark:text-gray-300">
                      Año
                    </th>
                    <th className="text-right px-4 py-3 font-heading font-semibold text-gray-700 dark:text-gray-300">
                      Accidentes
                    </th>
                    <th className="text-right px-4 py-3 font-heading font-semibold text-gray-700 dark:text-gray-300">
                      Fallecidos
                    </th>
                    <th className="text-right px-4 py-3 font-heading font-semibold text-gray-700 dark:text-gray-300">
                      Heridos graves
                    </th>
                    <th className="text-right px-4 py-3 font-heading font-semibold text-gray-700 dark:text-gray-300">
                      Heridos leves
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accidentStats.map((row) => (
                    <tr
                      key={row.year}
                      className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-tl-50/50 dark:hover:bg-tl-950/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-data font-bold text-gray-900 dark:text-gray-100">
                        {row.year}
                      </td>
                      <td className="px-4 py-3 font-data text-right text-gray-700 dark:text-gray-300">
                        {row._sum.accidents?.toLocaleString("es-ES") ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-data text-right text-red-600 dark:text-red-400 font-semibold">
                        {row._sum.fatalities?.toLocaleString("es-ES") ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-data text-right text-tl-amber-700 dark:text-tl-amber-300">
                        {row._sum.seriousInjury?.toLocaleString("es-ES") ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-data text-right text-gray-500 dark:text-gray-400">
                        {row._sum.minorInjury?.toLocaleString("es-ES") ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Fuente: Direção Geral de Viação (DGV) Portugal · Datos históricos anuales por distrito
            </p>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Cross-border provinces                                            */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Provincias españolas fronterizas con Portugal">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Provincias fronterizas con Portugal
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Consulta la información de tráfico e incidencias en las provincias españolas que
            limitan con Portugal.
          </p>
          <div className="flex flex-wrap gap-3">
            {BORDER_PROVINCES.map((p) => (
              <Link
                key={p.code}
                href={`/provincias/${p.code}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors bg-white dark:bg-gray-900 border-tl-200 dark:border-tl-800/50 text-tl-700 dark:text-tl-300 hover:bg-tl-50 dark:hover:bg-tl-950/30 hover:border-tl-400 dark:hover:border-tl-600"
              >
                <MapPin className="w-3.5 h-3.5" />
                {p.name}
              </Link>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}
