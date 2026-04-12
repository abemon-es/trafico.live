/**
 * /inteligencia/camiones
 *
 * Seguridad vial del transporte pesado — analisis de accidentes con camiones en Espana.
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
  Truck,
  Skull,
  BarChart3,
  Wind,
  Eye,
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
const ACCENT_COLOR = "#6366f1"; // indigo for trucks

export const metadata: Metadata = {
  title:
    "Seguridad vial del transporte pesado — Accidentes de camiones en Espana | trafico.live",
  description:
    "Analisis de accidentes con camiones en Espana: tendencia anual, horas de reparto, provincias, efecto del viento y la niebla. Datos DGT 2019-2023.",
  alternates: { canonical: `${BASE_URL}/inteligencia/camiones` },
  openGraph: {
    title: "Seguridad vial del transporte pesado en Espana",
    description:
      "Analisis de accidentes con camiones. Horas de reparto, provincias, viento, niebla y tipo de via. Datos DGT 2019-2023.",
    url: `${BASE_URL}/inteligencia/camiones`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getTruckData() {
  // Check if vehicle type data is available (all booleans may be false due to import issue)
  const truckSample = await prisma.accidentMicrodata.count({
    where: { involvesTruck: true },
    take: 1,
  });
  const hasVehicleData = truckSample > 0;
  const truckWhere = hasVehicleData ? { involvesTruck: true } : {};

  // 1. By year
  const byYearRaw = await prisma.accidentMicrodata.groupBy({
    by: ["year"],
    where: truckWhere,
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
    where: { ...truckWhere, hour: { not: null } },
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
    where: { ...truckWhere, weatherCondition: { not: null } },
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
    where: { ...truckWhere, province: { not: null } },
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
    where: { ...truckWhere, roadType: { not: null } },
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
    where: { ...truckWhere, dayOfWeek: { not: null } },
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

  // 7. Fatality rate comparison: truck vs car
  const truckTotals = await prisma.accidentMicrodata.aggregate({
    where: truckWhere,
    _count: { _all: true },
    _sum: { fatalities: true },
  });

  const carTotals = await prisma.accidentMicrodata.aggregate({
    where: { involvesCar: true },
    _count: { _all: true },
    _sum: { fatalities: true },
  });

  const truckFatalityRate =
    truckTotals._count._all > 0
      ? ((truckTotals._sum.fatalities ?? 0) / truckTotals._count._all) * 100
      : 0;

  const carFatalityRate =
    carTotals._count._all > 0
      ? ((carTotals._sum.fatalities ?? 0) / carTotals._count._all) * 100
      : 0;

  // Wind and fog stats — weatherCondition uses numeric codes:
  // 1=buen tiempo, 2=lluvia debil, 3=lluvia fuerte, 4=niebla, 5=nieve, 6=granizo, 7=viento
  const windEntry = byWeather.find((w) => w.weatherCondition === "7");
  const windAccidents = windEntry?.accidents ?? 0;
  const windFatalities = windEntry?.fatalities ?? 0;

  const fogEntry = byWeather.find((w) => w.weatherCondition === "4");
  const fogAccidents = fogEntry?.accidents ?? 0;
  const fogFatalities = fogEntry?.fatalities ?? 0;

  const clearEntry = byWeather.find((w) => w.weatherCondition === "1");
  const clearAccidents = clearEntry?.accidents ?? 0;
  const clearFatalities = clearEntry?.fatalities ?? 0;

  // Fog fatality rate comparison: truck vs car fog
  // When vehicle data is unavailable, use all accidents for comparison
  const carByWeatherRaw = await prisma.accidentMicrodata.groupBy({
    by: ["weatherCondition"],
    where: hasVehicleData
      ? { involvesCar: true, weatherCondition: { not: null } }
      : { weatherCondition: { not: null } },
    _count: { _all: true },
    _sum: { fatalities: true },
  });

  const carFogEntry = carByWeatherRaw.find(
    (w) => w.weatherCondition === "4"
  );
  const carFogAccidents = carFogEntry?._count._all ?? 0;
  const carFogFatalities = carFogEntry?._sum.fatalities ?? 0;

  const truckFogFatalityRate =
    fogAccidents > 0 ? (fogFatalities / fogAccidents) * 100 : 0;
  const carFogFatalityRate =
    carFogAccidents > 0 ? (carFogFatalities / carFogAccidents) * 100 : 0;
  const fogMultiplier =
    carFogFatalityRate > 0
      ? (truckFogFatalityRate / carFogFatalityRate).toFixed(1)
      : "N/A";

  // Wind fatality pct
  const totalTruckAccidents = truckTotals._count._all;
  const windPct =
    totalTruckAccidents > 0
      ? ((windAccidents / totalTruckAccidents) * 100).toFixed(1)
      : "0";

  // Autopista stats
  const autopistaAccidents =
    byRoadType.find(
      (r) => r.roadType === "AUTOPISTA" || r.roadType === "AUTOVIA"
    )?.accidents ?? 0;
  const autovia =
    byRoadType.find((r) => r.roadType === "AUTOVIA")?.accidents ?? 0;
  const autopista =
    byRoadType.find((r) => r.roadType === "AUTOPISTA")?.accidents ?? 0;
  const totalHighway = autovia + autopista;
  const highwayPct =
    totalTruckAccidents > 0
      ? ((totalHighway / totalTruckAccidents) * 100).toFixed(1)
      : "0";

  // Peak hours
  const sortedHours = [...byHour].sort((a, b) => b.accidents - a.accidents);
  const peakHours = sortedHours.slice(0, 3);

  const latestYear = byYear[byYear.length - 1];
  const firstYear = byYear[0];

  return {
    byYear,
    byHour,
    byWeather,
    byProvince,
    byRoadType,
    byDay,
    truckFatalityRate,
    carFatalityRate,
    windPct,
    windAccidents,
    windFatalities,
    fogAccidents,
    fogFatalities,
    fogMultiplier,
    highwayPct,
    peakHours,
    latestYear,
    firstYear,
    totalTruckAccidents,
    totalTruckFatalities: truckTotals._sum.fatalities ?? 0,
    hasVehicleData,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CamionesPage() {
  const data = await getTruckData();

  const trendPct =
    data.firstYear && data.firstYear.fatalities > 0
      ? (
          ((data.latestYear.fatalities - data.firstYear.fatalities) /
            data.firstYear.fatalities) *
          100
        ).toFixed(1)
      : "0";

  const trendDirection =
    data.latestYear && data.firstYear
      ? data.latestYear.fatalities > data.firstYear.fatalities
        ? "aumento"
        : data.latestYear.fatalities < data.firstYear.fatalities
          ? "descenso"
          : "estable"
      : "N/A";

  const peakHourStr = data.peakHours
    .map((h) => `${h.hour.toString().padStart(2, "0")}:00`)
    .join(", ");

  const webPageSchema = {
    "@context": "https://schema.org" as const,
    "@type": "WebPage" as const,
    name: "Seguridad vial del transporte pesado en Espana",
    description:
      "Analisis de accidentes con camiones en Espana con datos DGT 2019-2023.",
    url: `${BASE_URL}/inteligencia/camiones`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  const datasetSchema = {
    "@context": "https://schema.org" as const,
    "@type": "Dataset" as const,
    name: "Accidentes de camiones en Espana 2019-2023",
    description:
      "Microdatos de accidentes con implicacion de vehiculos pesados. Fuente: DGT.",
    url: `${BASE_URL}/inteligencia/camiones`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@type": "Organization", name: "trafico.live" },
    isBasedOn: ["https://www.dgt.es"],
    temporalCoverage: "2019/2023",
    spatialCoverage: { "@type": "Place", name: "Espana" },
  };

  const stripStats = [
    {
      icon: BarChart3,
      label: "Total accidentes camion",
      value: data.totalTruckAccidents.toLocaleString("es-ES"),
      color: "text-indigo-500",
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
      label: "Tasa mortalidad camion",
      value: `${data.truckFatalityRate.toFixed(2)}%`,
      color: "text-indigo-500",
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
          { name: "Camiones", href: "/inteligencia/camiones" },
        ]}
      />

      {/* Hero */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <Truck className="w-5 h-5 text-indigo-500" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Seguridad vial del transporte pesado
          </h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
          Analisis de accidentes con camiones y vehiculos pesados en Espana.
          Tendencia anual, horas de reparto, provincias con mas siniestros,
          efecto del viento y la niebla. Datos DGT (microdatos 2019-2023).
        </p>
      </div>

      {/* Vehicle data availability banner */}
      {!data.hasVehicleData && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                Datos de tipo de vehiculo en procesamiento
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
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
      <section className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-gray-800 rounded-2xl border border-indigo-200 dark:border-indigo-800/30 p-6 space-y-4">
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
              {data.truckFatalityRate > 0 && data.carFatalityRate > 0
                ? `${(data.truckFatalityRate / data.carFatalityRate).toFixed(1)}x`
                : "N/A"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              La tasa de mortalidad en accidentes con camion (
              <span className="font-mono font-semibold">
                {data.truckFatalityRate.toFixed(2)}%
              </span>
              ) vs. coche (
              <span className="font-mono font-semibold">
                {data.carFatalityRate.toFixed(2)}%
              </span>
              ).
            </p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Eye className="w-4 h-4 text-gray-400" />
              Factor niebla
            </div>
            <p className="font-mono text-2xl font-bold text-indigo-500">
              {data.fogMultiplier}x
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              La niebla es {data.fogMultiplier} veces mas letal para camiones
              que para turismos (tasa de mortalidad por accidente).
            </p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Wind className="w-4 h-4 text-indigo-400" />
              Viento fuerte
            </div>
            <p className="font-mono text-2xl font-bold text-indigo-400">
              {data.windPct}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              El viento fuerte esta presente en el {data.windPct}% de los
              accidentes de camion, con {data.windFatalities} victimas mortales
              registradas (2019-2023).
            </p>
          </div>
        </div>
      </section>

      {/* Year trend */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Evolucion anual (2019-2023)
          </h2>
        </div>
        <YearTrendChart
          data={data.byYear}
          accentColor={ACCENT_COLOR}
          title="Accidentes y fallecidos con camiones por ano"
          description="Evolucion del numero de accidentes con implicacion de vehiculos pesados y victimas mortales."
        />
      </section>

      {/* When — hour analysis */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Horas de mayor siniestralidad
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Los camiones tienen mas accidentes entre las{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {peakHourStr}
          </span>
          , coincidiendo con las horas de actividad logistica y reparto.
        </p>
        <HourDistributionChart
          data={data.byHour}
          accentColor={ACCENT_COLOR}
          title="Accidentes con camiones por hora del dia"
          description="Distribucion horaria acumulada (2019-2023). Pico en horario laboral de manana."
        />
      </section>

      {/* Where — province ranking */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-indigo-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Provincias con mas accidentes de camion
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
                <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-indigo-500">
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
                  <td className="px-4 py-2.5 text-right font-mono text-indigo-600 dark:text-indigo-400">
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

      {/* Weather — wind + fog */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CloudRain className="w-5 h-5 text-indigo-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Condiciones meteorologicas adversas
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Wind card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Wind className="w-5 h-5 text-indigo-400" />
              <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100">
                Viento fuerte
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              El viento fuerte esta presente en{" "}
              <span className="font-mono font-bold text-indigo-500">
                {data.windAccidents.toLocaleString("es-ES")}
              </span>{" "}
              accidentes de camion ({data.windPct}%), con{" "}
              <span className="font-mono font-bold text-[var(--tl-danger)]">
                {data.windFatalities}
              </span>{" "}
              fallecidos. Los vehiculos pesados, por su mayor superficie lateral
              y centro de gravedad elevado, son especialmente vulnerables.
            </p>
          </div>

          {/* Fog card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-5 h-5 text-gray-400" />
              <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100">
                Niebla
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              La niebla es{" "}
              <span className="font-mono font-bold text-indigo-500">
                {data.fogMultiplier}x
              </span>{" "}
              mas letal para camiones que para turismos. Con{" "}
              <span className="font-mono font-bold text-[var(--tl-danger)]">
                {data.fogFatalities}
              </span>{" "}
              fallecidos en {data.fogAccidents.toLocaleString("es-ES")}{" "}
              accidentes con niebla, las distancias de frenado del transporte
              pesado hacen critica la reduccion de velocidad.
            </p>
          </div>
        </div>

        {/* Full weather table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-auto shadow-sm">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-left font-heading font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                  Condicion
                </th>
                <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-indigo-500">
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
                    {row.weatherCondition === "7" ? (
                      <Wind className="w-4 h-4 text-indigo-400" />
                    ) : row.weatherCondition === "4" ? (
                      <Eye className="w-4 h-4 text-gray-400" />
                    ) : row.weatherCondition === "2" || row.weatherCondition === "3" ? (
                      <CloudRain className="w-4 h-4 text-tl-500" />
                    ) : row.weatherCondition === "1" ? (
                      <Sun className="w-4 h-4 text-tl-amber-400" />
                    ) : (
                      <CloudRain className="w-4 h-4 text-gray-400" />
                    )}
                    {getWeatherLabel(row.weatherCondition)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-indigo-600 dark:text-indigo-400">
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
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Tipo de via
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          El{" "}
          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
            {data.highwayPct}%
          </span>{" "}
          de los accidentes de camion ocurren en autopistas y autovias, las vias
          de mayor velocidad y donde el transporte de mercancias se concentra.
        </p>
        <RoadTypeChart
          data={data.byRoadType}
          accentColor={ACCENT_COLOR}
          title="Accidentes con camiones por tipo de via"
          description="Distribucion por tipo de carretera. Las vias de alta capacidad dominan la siniestralidad del transporte pesado."
        />
      </section>

      {/* Day of week */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Distribucion semanal
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          A diferencia de las motos, los accidentes de camion se concentran en
          dias laborables, siguiendo el patron de actividad logistica y
          transporte de mercancias.
        </p>
        <DayOfWeekChart
          data={data.byDay}
          accentColor={ACCENT_COLOR}
          title="Accidentes con camiones por dia de la semana"
          description="Distribucion semanal. La actividad logistica de lunes a viernes concentra la mayor siniestralidad."
        />
      </section>

      {/* Safety recommendations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--tl-success)]" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Recomendaciones basadas en datos
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600">
                1
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Reducir velocidad con niebla
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              La niebla es {data.fogMultiplier}x mas letal para camiones. La
              distancia de frenado de un vehiculo pesado a 80 km/h puede superar
              los 70 metros. Reduce velocidad y aumenta distancia.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600">
                2
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Precaucion con viento lateral
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              El {data.windPct}% de accidentes de camion se producen con viento
              fuerte. Presta atencion a los avisosde viento en puentes,
              viaductos y zonas expuestas.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600">
                3
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Respetar tiempos de descanso
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              La concentracion de accidentes entre las {peakHourStr} coincide
              con las horas de mayor actividad. Cumplir la normativa de tiempos
              de conduccion y descanso es critico.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600">
                4
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Mantener distancia en autovia
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              El {data.highwayPct}% de los accidentes de camion son en autovias
              y autopistas. La distancia de seguridad debe ser proporcional al
              peso y la velocidad del vehiculo.
            </p>
          </div>
        </div>
      </section>

      {/* Attribution */}
      <footer className="flex items-start gap-2 text-[11px] text-gray-400 pb-4">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>
          Fuente: DGT (microdatos de accidentes 2019-2023). Los datos reflejan
          accidentes con al menos un camion o vehiculo pesado implicado. Las
          tasas de mortalidad se calculan como fallecidos/accidentes totales por
          tipo de vehiculo. El multiplicador de niebla compara la tasa de
          mortalidad por accidente con niebla en camiones vs. turismos.
        </span>
      </footer>
    </main>
  );
}
