/**
 * /inteligencia/hora-punta-y-accidentes
 *
 * Analisis de cuando es mas peligroso conducir en Espana.
 * 168-cell heatmap (hora x dia), picos de peligro, tipo de vehiculo por hora.
 * Datos: DGT microdatos de accidentes (2019-2023).
 */

import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Shield,
  Info,
  Skull,
  Car,
  Bike,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  AccidentHeatmap,
  VehicleByHourChart,
  type HeatmapCell,
  type VehicleHourRow,
} from "./heatmap";

export const revalidate = 86400; // Daily — historical data
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title:
    "Hora punta y accidentes — Cuando es mas peligroso conducir | trafico.live",
  description:
    "Analisis de los horarios mas peligrosos para conducir en Espana. Mapa de calor hora x dia de la semana, picos de peligrosidad y distribucion por tipo de vehiculo. Datos DGT 2019-2023.",
  alternates: {
    canonical: `${BASE_URL}/inteligencia/hora-punta-y-accidentes`,
  },
  openGraph: {
    title: "Hora punta y accidentes — Cuando es mas peligroso conducir",
    description:
      "Mapa de calor de accidentes por hora y dia de la semana en Espana. Datos DGT 2019-2023.",
    url: `${BASE_URL}/inteligencia/hora-punta-y-accidentes`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Day/hour label helpers
// ---------------------------------------------------------------------------

const DAY_FULL = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
];

function formatHourRange(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00 – ${String(hour + 1 === 24 ? 0 : hour + 1).padStart(2, "0")}:00`;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getHourAccidentData() {
  // 1. 168-cell heatmap (hour x dayOfWeek)
  const heatmapRaw = await prisma.accidentMicrodata.groupBy({
    by: ["hour", "dayOfWeek"],
    _count: { _all: true },
    _sum: { fatalities: true },
    where: {
      hour: { not: null },
      dayOfWeek: { not: null },
    },
  });

  const heatmap: HeatmapCell[] = heatmapRaw.map((r) => ({
    hour: r.hour ?? 0,
    dayOfWeek: r.dayOfWeek ?? 1,
    count: r._count._all,
    fatalities: r._sum.fatalities ?? 0,
  }));

  // 2. Peak danger cells (top 5 by fatality rate, min sample 50)
  const peakDanger = [...heatmap]
    .filter((h) => h.count >= 50)
    .map((h) => ({
      ...h,
      fatalityRate: h.count > 0 ? h.fatalities / h.count : 0,
    }))
    .sort((a, b) => b.fatalityRate - a.fatalityRate)
    .slice(0, 5);

  // Top 5 by absolute count
  const peakVolume = [...heatmap]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 3. Vehicle type by hour
  const vehicleHourRaw: Array<{
    hour: number;
    car: bigint;
    motorcycle: bigint;
    truck: bigint;
    bicycle: bigint;
    pedestrian: bigint;
  }> = await prisma.$queryRaw`
    SELECT hour,
           COUNT(*) FILTER (WHERE "involvesCar" = true)::bigint as car,
           COUNT(*) FILTER (WHERE "involvesMotorcycle" = true)::bigint as motorcycle,
           COUNT(*) FILTER (WHERE "involvesTruck" = true)::bigint as truck,
           COUNT(*) FILTER (WHERE "involvesBicycle" = true)::bigint as bicycle,
           COUNT(*) FILTER (WHERE "involvesPedestrian" = true)::bigint as pedestrian
    FROM "AccidentMicrodata"
    WHERE hour IS NOT NULL
    GROUP BY hour
    ORDER BY hour
  `;

  const vehicleByHour: VehicleHourRow[] = vehicleHourRaw.map((r) => ({
    hour: r.hour,
    car: Number(r.car),
    motorcycle: Number(r.motorcycle),
    truck: Number(r.truck),
    bicycle: Number(r.bicycle),
    pedestrian: Number(r.pedestrian),
  }));

  // 4. Summary stats
  const totalAccidents = await prisma.accidentMicrodata.count({
    where: { hour: { not: null } },
  });
  const totalFatalities = await prisma.accidentMicrodata.aggregate({
    _sum: { fatalities: true },
    where: { hour: { not: null } },
  });

  // Weekend vs weekday
  const weekendCount = heatmap
    .filter((h) => h.dayOfWeek >= 6)
    .reduce((s, h) => s + h.count, 0);
  const weekdayCount = heatmap
    .filter((h) => h.dayOfWeek < 6)
    .reduce((s, h) => s + h.count, 0);

  // Night (22-06) vs day
  const nightCount = heatmap
    .filter((h) => h.hour >= 22 || h.hour < 6)
    .reduce((s, h) => s + h.count, 0);
  const nightFatalities = heatmap
    .filter((h) => h.hour >= 22 || h.hour < 6)
    .reduce((s, h) => s + h.fatalities, 0);

  return {
    heatmap,
    peakDanger,
    peakVolume,
    vehicleByHour,
    totalAccidents,
    totalFatalities: totalFatalities._sum.fatalities ?? 0,
    weekendCount,
    weekdayCount,
    nightCount,
    nightFatalities,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function HoraPuntaYAccidentesPage() {
  const data = await getHourAccidentData();

  const nightPct =
    data.totalAccidents > 0
      ? ((data.nightCount / data.totalAccidents) * 100).toFixed(1)
      : "0";

  const nightFatalityRate =
    data.nightCount > 0
      ? ((data.nightFatalities / data.nightCount) * 100).toFixed(2)
      : "0";

  const totalFatalityRate =
    data.totalAccidents > 0
      ? ((data.totalFatalities / data.totalAccidents) * 100).toFixed(2)
      : "0";

  const weekendPct =
    data.totalAccidents > 0
      ? ((data.weekendCount / data.totalAccidents) * 100).toFixed(1)
      : "0";

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Hora punta y accidentes de trafico en Espana",
    description:
      "Analisis de los horarios mas peligrosos para conducir. Mapa de calor hora x dia de la semana. Datos DGT 2019-2023.",
    url: `${BASE_URL}/inteligencia/hora-punta-y-accidentes`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Distribucion horaria de accidentes de trafico en Espana",
    description:
      "Accidentes de trafico por hora y dia de la semana, tipo de vehiculo y tasa de mortalidad. Fuente: DGT microdatos.",
    url: `${BASE_URL}/inteligencia/hora-punta-y-accidentes`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@type": "Organization", name: "trafico.live" },
    isBasedOn: ["https://www.dgt.es"],
    temporalCoverage: "2019/2023",
    spatialCoverage: { "@type": "Place", name: "Espana" },
  };

  // Stats strip
  const stripStats = [
    {
      icon: BarChart3,
      label: "Total accidentes",
      value: data.totalAccidents.toLocaleString("es-ES"),
      color: "text-[var(--tl-primary)]",
    },
    {
      icon: Skull,
      label: "Victimas mortales",
      value: data.totalFatalities.toLocaleString("es-ES"),
      color: "text-[var(--tl-danger)]",
    },
    {
      icon: Clock,
      label: "% nocturno (22-06h)",
      value: `${nightPct}%`,
      color: "text-tl-500",
    },
    {
      icon: Car,
      label: "% fin de semana",
      value: `${weekendPct}%`,
      color: "text-tl-amber-400",
    },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <StructuredData data={webPageSchema} />
      <StructuredData data={datasetSchema} />
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          {
            name: "Inteligencia",
            href: "/inteligencia/hora-punta-y-accidentes",
          },
          {
            name: "Hora punta y accidentes",
            href: "/inteligencia/hora-punta-y-accidentes",
          },
        ]}
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-tl-amber-50 dark:bg-tl-amber-900/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-tl-amber-500" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Hora punta y accidentes
          </h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
          Cuando es mas peligroso conducir en Espana? Analisis de la
          distribucion horaria y semanal de accidentes de trafico con datos de la
          DGT (microdatos 2019-2023). Incluye picos de peligrosidad y
          distribucion por tipo de vehiculo.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stripStats.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
              <s.icon className="w-3.5 h-3.5" />
              <span>{s.label}</span>
            </div>
            <p
              className={`text-2xl font-heading font-bold font-mono ${s.color}`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Key findings */}
      <section className="bg-gradient-to-br from-tl-amber-50 to-white dark:from-tl-amber-900/10 dark:to-gray-800 rounded-2xl border border-tl-amber-200 dark:border-tl-amber-800/30 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[var(--tl-warning)]" />
          <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-gray-100">
            Hallazgos clave
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Night danger */}
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Clock className="w-4 h-4 text-[var(--tl-danger)]" />
              Peligro nocturno
            </div>
            <p className="font-mono text-2xl font-bold text-[var(--tl-danger)]">
              {nightFatalityRate}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Tasa de mortalidad entre las 22h y las 06h, frente al{" "}
              <span className="font-mono font-semibold">{totalFatalityRate}%</span>{" "}
              general. La noche es{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {(
                  Number(nightFatalityRate) / Math.max(Number(totalFatalityRate), 0.01)
                ).toFixed(1)}
                x
              </span>{" "}
              mas letal.
            </p>
          </div>

          {/* Peak volume */}
          {data.peakVolume[0] && (
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <TrendingUp className="w-4 h-4 text-[var(--tl-primary)]" />
                Mayor volumen
              </div>
              <p className="font-mono text-2xl font-bold text-[var(--tl-primary)]">
                {data.peakVolume[0].count.toLocaleString("es-ES")}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Accidentes los{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {DAY_FULL[data.peakVolume[0].dayOfWeek - 1]}
                </span>{" "}
                de {formatHourRange(data.peakVolume[0].hour)}: la franja con mas
                siniestros en toda la semana.
              </p>
            </div>
          )}

          {/* Weekend */}
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Shield className="w-4 h-4 text-tl-amber-400" />
              Fin de semana
            </div>
            <p className="font-mono text-2xl font-bold text-tl-amber-500">
              {weekendPct}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              De los accidentes ocurren en fin de semana (sabado y domingo),
              con solo 2 de 7 dias. Ratio:{" "}
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                {(Number(weekendPct) / (2 / 7 * 100) ).toFixed(2)}x
              </span>{" "}
              sobre lo esperado.
            </p>
          </div>
        </div>
      </section>

      {/* Heatmap */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--tl-primary)]" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Mapa de calor semanal
          </h2>
        </div>
        <AccidentHeatmap data={data.heatmap} />
      </section>

      {/* Peak danger table */}
      {data.peakDanger.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--tl-danger)]" />
            <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
              Top 5 franjas mas letales
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Franjas horarias con mayor tasa de mortalidad (victimas mortales /
            accidentes). Requiere un minimo de 50 accidentes.
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-auto shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-3 text-left font-heading font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-heading font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Dia
                  </th>
                  <th className="px-4 py-3 text-left font-heading font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Hora
                  </th>
                  <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-[var(--tl-primary)]">
                    Accidentes
                  </th>
                  <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-[var(--tl-danger)]">
                    Victimas
                  </th>
                  <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-[var(--tl-danger)]">
                    Tasa mort.
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.peakDanger.map((cell, i) => (
                  <tr
                    key={`${cell.dayOfWeek}-${cell.hour}`}
                    className={`border-b border-gray-50 dark:border-gray-700/50 ${
                      i % 2 === 0
                        ? "bg-white dark:bg-gray-800"
                        : "bg-gray-50/50 dark:bg-gray-800/60"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs font-bold font-mono text-[var(--tl-danger)]">
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                      {DAY_FULL[cell.dayOfWeek - 1]}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-700 dark:text-gray-300">
                      {formatHourRange(cell.hour)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-tl-600 dark:text-tl-400">
                      {cell.count.toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[var(--tl-danger)]">
                      {cell.fatalities.toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-[var(--tl-danger)]">
                      {(cell.fatalityRate * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Peak volume table */}
      {data.peakVolume.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[var(--tl-primary)]" />
            <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
              Top 5 franjas con mas accidentes
            </h2>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-auto shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-3 text-left font-heading font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-heading font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Dia
                  </th>
                  <th className="px-4 py-3 text-left font-heading font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Hora
                  </th>
                  <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-[var(--tl-primary)]">
                    Accidentes
                  </th>
                  <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-[var(--tl-danger)]">
                    Victimas
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.peakVolume.map((cell, i) => (
                  <tr
                    key={`vol-${cell.dayOfWeek}-${cell.hour}`}
                    className={`border-b border-gray-50 dark:border-gray-700/50 ${
                      i % 2 === 0
                        ? "bg-white dark:bg-gray-800"
                        : "bg-gray-50/50 dark:bg-gray-800/60"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span className="w-6 h-6 rounded-full bg-tl-100 dark:bg-tl-900/30 flex items-center justify-center text-xs font-bold font-mono text-[var(--tl-primary)]">
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                      {DAY_FULL[cell.dayOfWeek - 1]}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-700 dark:text-gray-300">
                      {formatHourRange(cell.hour)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-tl-600 dark:text-tl-400">
                      {cell.count.toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[var(--tl-danger)]">
                      {cell.fatalities.toLocaleString("es-ES")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Vehicle by hour */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Bike className="w-5 h-5 text-[var(--tl-primary)]" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Tipo de vehiculo por hora
          </h2>
        </div>
        <VehicleByHourChart data={data.vehicleByHour} />
      </section>

      {/* Attribution */}
      <footer className="flex items-start gap-2 text-[11px] text-gray-400 pb-4">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>
          Fuente: DGT (microdatos de accidentes 2019-2023). Hora y dia de la
          semana corresponden al momento del siniestro registrado por la DGT. La
          tasa de mortalidad es el porcentaje de accidentes con al menos una
          victima mortal.
        </span>
      </footer>
    </main>
  );
}
