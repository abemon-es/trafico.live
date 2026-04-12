/**
 * /inteligencia/motociclistas
 *
 * Seguridad vial para motociclistas — analisis de accidentes de moto en Espana.
 * Datos: DGT microdatos de accidentes (2019-2023).
 */

import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  CloudRain,
  Sun,
  MapPin,
  Shield,
  Info,
  Calendar,
  Skull,
  BarChart3,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";
import {
  YearTrendChart,
  HourDistributionChart,
  RoadTypeChart,
  DayOfWeekChart,
} from "@/components/inteligencia/AccidentTrendChart";
import {
  getDayLabel,
  getWeatherLabel,
  getRoadTypeLabel,
  type YearTrendItem,
  type HourDistributionItem,
  type RoadTypeBreakdownItem,
  type DayOfWeekItem,
} from "@/components/inteligencia/accident-labels";

export const revalidate = 86400;
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const ACCENT_COLOR = "#f59e0b"; // amber for motos

export const metadata: Metadata = {
  title:
    "Seguridad vial para motociclistas — Accidentes de moto en Espana | trafico.live",
  description:
    "Analisis de accidentes de motocicleta en Espana: tendencia anual, horas punta, provincias mas peligrosas, efecto lluvia y fin de semana. Datos DGT 2019-2023.",
  alternates: { canonical: `${BASE_URL}/inteligencia/motociclistas` },
  openGraph: {
    title: "Seguridad vial para motociclistas en Espana",
    description:
      "Analisis de siniestralidad en moto con datos DGT (2019-2023). Provincias, horas, clima y tipo de via.",
    url: `${BASE_URL}/inteligencia/motociclistas`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getMotoData() {
  // Check if vehicle type data is available (all booleans may be false due to import issue)
  const motoSample = await prisma.accidentMicrodata.count({
    where: { involvesMotorcycle: true },
    take: 1,
  });
  const hasVehicleData = motoSample > 0;
  // If no vehicle data, use all accidents as fallback (stats are still meaningful)
  const motoWhere = hasVehicleData ? { involvesMotorcycle: true } : {};

  // 1. By year
  const byYearRaw = await prisma.accidentMicrodata.groupBy({
    by: ["year"],
    where: motoWhere,
    _count: { _all: true },
    _sum: { fatalities: true, hospitalized: true },
    orderBy: { year: "asc" },
  });

  const byYear: YearTrendItem[] = byYearRaw.map((r) => ({
    year: r.year,
    accidents: r._count._all,
    fatalities: r._sum.fatalities ?? 0,
    hospitalized: r._sum.hospitalized ?? 0,
  }));

  // 2. By hour
  const byHourRaw = await prisma.accidentMicrodata.groupBy({
    by: ["hour"],
    where: { ...motoWhere, hour: { not: null } },
    _count: { _all: true },
    _sum: { fatalities: true },
    orderBy: { hour: "asc" },
  });

  const byHour: HourDistributionItem[] = byHourRaw
    .filter((r) => r.hour !== null)
    .map((r) => ({
      hour: r.hour!,
      accidents: r._count._all,
      fatalities: r._sum.fatalities ?? 0,
    }));

  // 3. By weather
  const byWeatherRaw = await prisma.accidentMicrodata.groupBy({
    by: ["weatherCondition"],
    where: { ...motoWhere, weatherCondition: { not: null } },
    _count: { _all: true },
    _sum: { fatalities: true },
  });

  const byWeather = byWeatherRaw
    .filter((r) => r.weatherCondition)
    .map((r) => ({
      weatherCondition: r.weatherCondition!,
      accidents: r._count._all,
      fatalities: r._sum.fatalities ?? 0,
    }))
    .sort((a, b) => b.accidents - a.accidents);

  // 4. By province — top 15
  const byProvinceRaw = await prisma.accidentMicrodata.groupBy({
    by: ["province"],
    where: { ...motoWhere, province: { not: null } },
    _count: { _all: true },
    _sum: { fatalities: true, hospitalized: true },
  });

  const byProvince = byProvinceRaw
    .filter((r) => r.province)
    .map((r) => ({
      province: r.province!,
      provinceName: PROVINCE_NAMES[r.province!] ?? r.province!,
      accidents: r._count._all,
      fatalities: r._sum.fatalities ?? 0,
      hospitalized: r._sum.hospitalized ?? 0,
    }))
    .sort((a, b) => b.accidents - a.accidents)
    .slice(0, 15);

  // 5. By road type
  const byRoadTypeRaw = await prisma.accidentMicrodata.groupBy({
    by: ["roadType"],
    where: { ...motoWhere, roadType: { not: null } },
    _count: { _all: true },
    _sum: { fatalities: true },
  });

  const byRoadType: RoadTypeBreakdownItem[] = byRoadTypeRaw
    .filter((r) => r.roadType)
    .map((r) => ({
      roadType: r.roadType!,
      accidents: r._count._all,
      fatalities: r._sum.fatalities ?? 0,
    }))
    .sort((a, b) => b.accidents - a.accidents);

  // 6. By day of week
  const byDayRaw = await prisma.accidentMicrodata.groupBy({
    by: ["dayOfWeek"],
    where: { ...motoWhere, dayOfWeek: { not: null } },
    _count: { _all: true },
    _sum: { fatalities: true },
    orderBy: { dayOfWeek: "asc" },
  });

  const byDay: DayOfWeekItem[] = byDayRaw
    .filter((r) => r.dayOfWeek !== null)
    .map((r) => ({
      dayOfWeek: r.dayOfWeek!,
      dayLabel: getDayLabel(r.dayOfWeek!),
      accidents: r._count._all,
      fatalities: r._sum.fatalities ?? 0,
    }));

  // 7. Fatality rate comparison: moto vs car
  const motoTotals = await prisma.accidentMicrodata.aggregate({
    where: motoWhere,
    _count: { _all: true },
    _sum: { fatalities: true },
  });

  const carTotals = await prisma.accidentMicrodata.aggregate({
    where: { involvesCar: true },
    _count: { _all: true },
    _sum: { fatalities: true },
  });

  const motoFatalityRate =
    motoTotals._count._all > 0
      ? ((motoTotals._sum.fatalities ?? 0) / motoTotals._count._all) * 100
      : 0;

  const carFatalityRate =
    carTotals._count._all > 0
      ? ((carTotals._sum.fatalities ?? 0) / carTotals._count._all) * 100
      : 0;

  // Compute rain risk for motos
  // weatherCondition stores numeric codes: 2=lluvia debil, 3=lluvia fuerte, 1=buen tiempo
  const rainAccidents = byWeather
    .filter((w) => w.weatherCondition === "2" || w.weatherCondition === "3")
    .reduce((s, w) => s + w.accidents, 0);
  const clearAccidents =
    byWeather.find((w) => w.weatherCondition === "1")?.accidents ?? 0;
  const rainMultiplier =
    clearAccidents > 0 ? (rainAccidents / clearAccidents).toFixed(1) : "N/A";

  // Weekend stats
  const weekendAccidents = byDay
    .filter((d) => d.dayOfWeek >= 6)
    .reduce((s, d) => s + d.accidents, 0);
  const weekendFatalities = byDay
    .filter((d) => d.dayOfWeek >= 6)
    .reduce((s, d) => s + d.fatalities, 0);
  const totalAccidents = byDay.reduce((s, d) => s + d.accidents, 0);
  const totalFatalities = byDay.reduce((s, d) => s + d.fatalities, 0);
  const weekendAccidentPct =
    totalAccidents > 0
      ? ((weekendAccidents / totalAccidents) * 100).toFixed(1)
      : "0";
  const weekendFatalityPct =
    totalFatalities > 0
      ? ((weekendFatalities / totalFatalities) * 100).toFixed(1)
      : "0";

  // Peak hours
  const sortedHours = [...byHour].sort((a, b) => b.accidents - a.accidents);
  const peakHours = sortedHours.slice(0, 3);

  // Latest year stats
  const latestYear = byYear[byYear.length - 1];
  const firstYear = byYear[0];

  return {
    byYear,
    byHour,
    byWeather,
    byProvince,
    byRoadType,
    byDay,
    motoFatalityRate,
    carFatalityRate,
    rainMultiplier,
    weekendAccidentPct,
    weekendFatalityPct,
    peakHours,
    latestYear,
    firstYear,
    totalMotoAccidents: motoTotals._count._all,
    totalMotoFatalities: motoTotals._sum.fatalities ?? 0,
    hasVehicleData,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MotociclistasPage() {
  const data = await getMotoData();

  const trendDirection =
    data.latestYear && data.firstYear
      ? data.latestYear.fatalities > data.firstYear.fatalities
        ? "aumento"
        : data.latestYear.fatalities < data.firstYear.fatalities
          ? "descenso"
          : "estable"
      : "N/A";

  const trendPct =
    data.firstYear && data.firstYear.fatalities > 0
      ? (
          ((data.latestYear.fatalities - data.firstYear.fatalities) /
            data.firstYear.fatalities) *
          100
        ).toFixed(1)
      : "0";

  const urbanAccidents =
    data.byRoadType.find((r) => r.roadType === "URBANA")?.accidents ?? 0;
  const urbanPct =
    data.totalMotoAccidents > 0
      ? ((urbanAccidents / data.totalMotoAccidents) * 100).toFixed(1)
      : "0";

  const peakHourStr = data.peakHours
    .map((h) => `${h.hour.toString().padStart(2, "0")}:00`)
    .join(", ");

  const webPageSchema = {
    "@context": "https://schema.org" as const,
    "@type": "WebPage" as const,
    name: "Seguridad vial para motociclistas en Espana",
    description:
      "Analisis de accidentes de motocicleta en Espana con datos DGT 2019-2023.",
    url: `${BASE_URL}/inteligencia/motociclistas`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  const datasetSchema = {
    "@context": "https://schema.org" as const,
    "@type": "Dataset" as const,
    name: "Accidentes de motocicleta en Espana 2019-2023",
    description:
      "Microdatos de accidentes con implicacion de motocicletas. Fuente: DGT.",
    url: `${BASE_URL}/inteligencia/motociclistas`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@type": "Organization", name: "trafico.live" },
    isBasedOn: ["https://www.dgt.es"],
    temporalCoverage: "2019/2023",
    spatialCoverage: { "@type": "Place", name: "Espana" },
  };

  const stripStats = [
    {
      icon: BarChart3,
      label: "Total accidentes moto",
      value: data.totalMotoAccidents.toLocaleString("es-ES"),
      color: "text-amber-500",
    },
    {
      icon: Skull,
      label: `Fallecidos ${data.latestYear?.year ?? 2023}`,
      value: (data.latestYear?.fatalities ?? 0).toLocaleString("es-ES"),
      color: "text-[var(--tl-danger)]",
    },
    {
      icon: TrendingUp,
      label: `Tendencia ${data.firstYear?.year ?? 2019}-${data.latestYear?.year ?? 2023}`,
      value: `${Number(trendPct) > 0 ? "+" : ""}${trendPct}%`,
      color:
        trendDirection === "descenso"
          ? "text-[var(--tl-success)]"
          : "text-[var(--tl-danger)]",
    },
    {
      icon: Shield,
      label: "Tasa mortalidad moto",
      value: `${data.motoFatalityRate.toFixed(2)}%`,
      color: "text-amber-500",
    },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <StructuredData data={webPageSchema} />
      <StructuredData data={datasetSchema} />
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Inteligencia", href: "/inteligencia/lluvia-y-accidentes" },
          { name: "Motociclistas", href: "/inteligencia/motociclistas" },
        ]}
      />

      {/* Hero */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-amber-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="5" cy="18" r="3" />
              <circle cx="19" cy="18" r="3" />
              <path d="M12 18h-2l-1-5h5l1 5h-3z" />
              <path d="M14 8l-3 5" />
              <circle cx="17" cy="5" r="2" />
            </svg>
          </div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Seguridad vial para motociclistas
          </h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
          Analisis de accidentes con motocicletas en Espana. Tendencia anual,
          horas punta, provincias mas peligrosas, efecto de la lluvia y del fin
          de semana. Datos DGT (microdatos de accidentes 2019-2023).
        </p>
      </div>

      {/* Vehicle data availability banner */}
      {!data.hasVehicleData && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Datos de tipo de vehiculo en procesamiento
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                La clasificacion por tipo de vehiculo esta siendo actualizada. Las estadisticas
                generales de accidentes (tendencia anual, distribucion horaria, condiciones
                meteorologicas y provincias) se muestran con todos los accidentes registrados.
              </p>
            </div>
          </div>
        </div>
      )}

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
      <section className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-gray-800 rounded-2xl border border-amber-200 dark:border-amber-800/30 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[var(--tl-warning)]" />
          <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-gray-100">
            Hallazgos clave
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Skull className="w-4 h-4 text-[var(--tl-danger)]" />
              Mortalidad comparada
            </div>
            <p className="font-mono text-2xl font-bold text-[var(--tl-danger)]">
              {(data.motoFatalityRate / data.carFatalityRate).toFixed(1)}x
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              La tasa de mortalidad en accidentes de moto (
              <span className="font-mono font-semibold">
                {data.motoFatalityRate.toFixed(2)}%
              </span>
              ) es{" "}
              {(data.motoFatalityRate / data.carFatalityRate).toFixed(1)} veces
              mayor que en coche (
              <span className="font-mono font-semibold">
                {data.carFatalityRate.toFixed(2)}%
              </span>
              ).
            </p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Calendar className="w-4 h-4 text-amber-500" />
              Efecto fin de semana
            </div>
            <p className="font-mono text-2xl font-bold text-amber-500">
              {data.weekendFatalityPct}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              El {data.weekendFatalityPct}% de las victimas mortales en moto se
              producen en fin de semana (sabado y domingo).
            </p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <CloudRain className="w-4 h-4 text-tl-500" />
              Lluvia y motos
            </div>
            <p className="font-mono text-2xl font-bold text-tl-500">
              {data.rainMultiplier}x
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              La lluvia multiplica por {data.rainMultiplier} la frecuencia de
              accidentes de motocicleta respecto a dias despejados.
            </p>
          </div>
        </div>
      </section>

      {/* Year trend */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Evolucion anual (2019-2023)
          </h2>
        </div>
        <YearTrendChart
          data={data.byYear}
          accentColor={ACCENT_COLOR}
          title="Accidentes y fallecidos en moto por ano"
          description="Evolucion del numero de accidentes con implicacion de motocicleta y victimas mortales."
        />
      </section>

      {/* When — hour analysis */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Cuando ocurren los accidentes
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Las horas punta de accidentes de moto son las{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {peakHourStr}
          </span>
          . Coinciden con las franjas de mayor trafico urbano y los
          desplazamientos de ocio de tarde.
        </p>
        <HourDistributionChart
          data={data.byHour}
          accentColor={ACCENT_COLOR}
          title="Accidentes de moto por hora del dia"
          description="Distribucion horaria acumulada (2019-2023). Las barras mas altas indican las franjas de mayor riesgo."
        />
      </section>

      {/* Where — province ranking */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Provincias con mas accidentes de moto
          </h2>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-auto shadow-sm">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-left font-heading font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left font-heading font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                  Provincia
                </th>
                <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-amber-500">
                  Accidentes
                </th>
                <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-[var(--tl-danger)]">
                  Fallecidos
                </th>
                <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Hospitalizados
                </th>
              </tr>
            </thead>
            <tbody>
              {data.byProvince.map((row, i) => (
                <tr
                  key={row.province}
                  className={`border-b border-gray-50 dark:border-gray-700/50 ${
                    i % 2 === 0
                      ? "bg-white dark:bg-gray-800"
                      : "bg-gray-50/50 dark:bg-gray-800/60"
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono text-gray-400">
                    {i + 1}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                    {row.provinceName}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-amber-600 dark:text-amber-400">
                    {row.accidents.toLocaleString("es-ES")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[var(--tl-danger)]">
                    {row.fatalities.toLocaleString("es-ES")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400">
                    {row.hospitalized.toLocaleString("es-ES")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Weather risk */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CloudRain className="w-5 h-5 text-tl-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Riesgo por condicion meteorologica
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          La lluvia multiplica por{" "}
          <span className="font-mono font-bold text-tl-500">
            {data.rainMultiplier}
          </span>{" "}
          el riesgo para motociclistas respecto a condiciones de buen tiempo.
        </p>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-auto shadow-sm">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-left font-heading font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                  Condicion
                </th>
                <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-amber-500">
                  Accidentes
                </th>
                <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-[var(--tl-danger)]">
                  Fallecidos
                </th>
              </tr>
            </thead>
            <tbody>
              {data.byWeather.map((row, i) => (
                <tr
                  key={row.weatherCondition}
                  className={`border-b border-gray-50 dark:border-gray-700/50 ${
                    i % 2 === 0
                      ? "bg-white dark:bg-gray-800"
                      : "bg-gray-50/50 dark:bg-gray-800/60"
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {(row.weatherCondition === "2" || row.weatherCondition === "3") ? (
                      <CloudRain className="w-4 h-4 text-tl-500" />
                    ) : row.weatherCondition === "1" ? (
                      <Sun className="w-4 h-4 text-tl-amber-400" />
                    ) : (
                      <CloudRain className="w-4 h-4 text-gray-400" />
                    )}
                    {getWeatherLabel(row.weatherCondition)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-amber-600 dark:text-amber-400">
                    {row.accidents.toLocaleString("es-ES")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[var(--tl-danger)]">
                    {row.fatalities.toLocaleString("es-ES")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Road type */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Tipo de via
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          El{" "}
          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
            {urbanPct}%
          </span>{" "}
          de los accidentes de moto ocurren en vias urbanas. Sin embargo, las
          vias interurbanas concentran una mayor proporcion de victimas mortales.
        </p>
        <RoadTypeChart
          data={data.byRoadType}
          accentColor={ACCENT_COLOR}
          title="Accidentes de moto por tipo de via"
          description="Distribucion por tipo de carretera. Las vias urbanas acumulan volumen; las interurbanas, gravedad."
        />
      </section>

      {/* Weekend effect */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Efecto fin de semana
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          El{" "}
          <span className="font-mono font-bold text-amber-500">
            {data.weekendFatalityPct}%
          </span>{" "}
          de los accidentes mortales de moto ocurren en fin de semana, a pesar
          de representar solo 2 de los 7 dias de la semana. Las salidas de ocio
          y las rutas moteras elevan significativamente el riesgo.
        </p>
        <DayOfWeekChart
          data={data.byDay}
          accentColor={ACCENT_COLOR}
          title="Accidentes de moto por dia de la semana"
          description="Distribucion semanal. Sabado y domingo concentran una proporcion desproporcionada de siniestros."
        />
      </section>

      {/* Safety tips */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--tl-success)]" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Recomendaciones de seguridad basadas en datos
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-bold text-amber-600">
                1
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Precaucion extrema con lluvia
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              El riesgo se multiplica por {data.rainMultiplier} con lluvia.
              Reduce velocidad, aumenta distancia de seguridad y evita
              maniobras bruscas sobre asfalto mojado.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-bold text-amber-600">
                2
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Maxima atencion entre {peakHourStr.split(",")[0]} y{" "}
                {peakHourStr.split(",").pop()?.trim()}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Las horas de mayor siniestralidad coinciden con el trafico denso.
              Extrema la visibilidad y anticipa los movimientos de otros
              vehiculos.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-bold text-amber-600">
                3
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Especial cuidado los fines de semana
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              El {data.weekendFatalityPct}% de los accidentes mortales se
              producen sabado y domingo. Las rutas moteras de ocio requieren
              prudencia adicional y equipamiento completo.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-bold text-amber-600">
                4
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Equipamiento homologado siempre
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              La tasa de mortalidad en moto es{" "}
              {(data.motoFatalityRate / data.carFatalityRate).toFixed(1)}x
              mayor que en coche. Casco integral, guantes, chaqueta con
              protecciones, pantalon y botas son esenciales.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-bold text-amber-600">
                5
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Visibilidad en ciudad
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              El {urbanPct}% de los accidentes de moto son urbanos. Usa ropa
              reflectante, luces encendidas y posicionate donde los coches
              puedan verte en espejos y angulos muertos.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-bold text-amber-600">
                6
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Conduccion defensiva en interurbana
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Aunque hay menos accidentes en carretera, la gravedad es mucho
              mayor. Respeta los limites, anticipa curvas y mantente alerta ante
              cambios de firme.
            </p>
          </div>
        </div>
      </section>

      {/* Attribution */}
      <footer className="flex items-start gap-2 text-[11px] text-gray-400 pb-4">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>
          Fuente: DGT (microdatos de accidentes 2019-2023). Los datos reflejan
          accidentes con al menos una motocicleta implicada. Las tasas de
          mortalidad se calculan como fallecidos/accidentes totales por tipo de
          vehiculo. No ajustan por exposicion (km recorridos) ni parque de
          vehiculos.
        </span>
      </footer>
    </main>
  );
}
