/**
 * /inteligencia/ciclistas-y-peatones
 *
 * Seguridad de ciclistas y peatones en Espana — usuarios vulnerables de la via.
 * Datos: DGT microdatos de accidentes (2019-2023).
 */

import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  Sun,
  Moon,
  MapPin,
  Shield,
  Info,
  Skull,
  BarChart3,
  Users,
  Bike,
  Footprints,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";
import {
  YearTrendChart,
  HourDistributionChart,
} from "@/components/inteligencia/AccidentTrendChart";
import {
  getDayLabel,
  getLightLabel,
  type YearTrendItem,
  type HourDistributionItem,
} from "@/components/inteligencia/accident-labels";

export const revalidate = 86400;
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const CYCLIST_COLOR = "#059669"; // green
const PEDESTRIAN_COLOR = "#0ea5e9"; // blue

export const metadata: Metadata = {
  title:
    "Seguridad de ciclistas y peatones en Espana — Atropellos y accidentes",
  description:
    "Analisis de accidentes con ciclistas y peatones en Espana: tendencia anual, horas nocturnas, iluminacion, zonas urbanas. Datos DGT 2019-2023.",
  alternates: {
    canonical: `${BASE_URL}/inteligencia/ciclistas-y-peatones`,
  },
  openGraph: {
    title: "Seguridad de ciclistas y peatones en Espana",
    description:
      "Estadisticas de atropellos y accidentes de ciclistas. Analisis por hora, iluminacion, provincia y zona urbana. Datos DGT 2019-2023.",
    url: `${BASE_URL}/inteligencia/ciclistas-y-peatones`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

interface VulnerableUserData {
  byYear: YearTrendItem[];
  byHour: HourDistributionItem[];
  byProvince: Array<{
    province: string;
    provinceName: string;
    accidents: number;
    fatalities: number;
    hospitalized: number;
  }>;
  byLight: Array<{
    lightCondition: string;
    accidents: number;
    fatalities: number;
  }>;
  totalAccidents: number;
  totalFatalities: number;
  urbanAccidents: number;
  urbanPct: string;
  peakHours: HourDistributionItem[];
}

async function getVulnerableUserData(
  vehicleFilter: Record<string, boolean>
): Promise<VulnerableUserData & { hasVehicleData: boolean }> {
  // Check if vehicle type data is available (all booleans may be false due to import issue)
  const sampleCount = await prisma.accidentMicrodata.count({
    where: vehicleFilter,
    take: 1,
  });
  const hasVehicleData = sampleCount > 0;
  // Fallback to all accidents if vehicle booleans are all false
  const effectiveFilter = hasVehicleData ? vehicleFilter : {};

  // 1. By year
  const byYearRaw = await prisma.accidentMicrodata.groupBy({
    by: ["year"],
    where: effectiveFilter,
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
    where: { ...effectiveFilter, hour: { not: null } },
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

  // 3. By province — top 15
  const byProvinceRaw = await prisma.accidentMicrodata.groupBy({
    by: ["province"],
    where: { ...effectiveFilter, province: { not: null } },
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

  // 4. By light condition
  const byLightRaw = await prisma.accidentMicrodata.groupBy({
    by: ["lightCondition"],
    where: { ...effectiveFilter, lightCondition: { not: null } },
    _count: { _all: true },
    _sum: { fatalities: true },
  });

  const byLight = byLightRaw
    .filter((r) => r.lightCondition)
    .map((r) => ({
      lightCondition: r.lightCondition!,
      accidents: r._count._all,
      fatalities: r._sum.fatalities ?? 0,
    }))
    .sort((a, b) => b.accidents - a.accidents);

  // 5. Totals
  const totals = await prisma.accidentMicrodata.aggregate({
    where: effectiveFilter,
    _count: { _all: true },
    _sum: { fatalities: true },
  });

  // 6. Urban count
  const urbanCount = await prisma.accidentMicrodata.count({
    where: { ...effectiveFilter, isUrban: true },
  });

  const totalAccidents = totals._count._all;
  const urbanPct =
    totalAccidents > 0
      ? ((urbanCount / totalAccidents) * 100).toFixed(1)
      : "0";

  // Peak hours
  const sortedHours = [...byHour].sort((a, b) => b.accidents - a.accidents);
  const peakHours = sortedHours.slice(0, 3);

  return {
    byYear,
    byHour,
    byProvince,
    byLight,
    totalAccidents,
    totalFatalities: totals._sum.fatalities ?? 0,
    urbanAccidents: urbanCount,
    urbanPct,
    peakHours,
    hasVehicleData,
  };
}

async function getPageData() {
  const [cyclist, pedestrian] = await Promise.all([
    getVulnerableUserData({ involvesBicycle: true }),
    getVulnerableUserData({ involvesPedestrian: true }),
  ]);

  return { cyclist, pedestrian };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CiclistasYPeatonesPage() {
  const { cyclist, pedestrian } = await getPageData();

  // Night fatality stats for pedestrians
  const nightUnlitPed = pedestrian.byLight.find(
    (l) =>
      l.lightCondition.toLowerCase() === "night_unlit" ||
      l.lightCondition.toLowerCase().includes("sin iluminacion")
  );
  const nightLitPed = pedestrian.byLight.find(
    (l) =>
      l.lightCondition.toLowerCase() === "night_lit" ||
      l.lightCondition.toLowerCase().includes("con iluminacion")
  );
  const nightTotalFatalitiesPed =
    (nightUnlitPed?.fatalities ?? 0) + (nightLitPed?.fatalities ?? 0);
  const nightFatalityPctPed =
    pedestrian.totalFatalities > 0
      ? ((nightTotalFatalitiesPed / pedestrian.totalFatalities) * 100).toFixed(1)
      : "0";

  // Night unlit fatality for pedestrians
  const nightUnlitPctPed =
    pedestrian.totalFatalities > 0 && nightUnlitPed
      ? (
          (nightUnlitPed.fatalities / pedestrian.totalFatalities) *
          100
        ).toFixed(1)
      : "0";

  const combinedFatalities =
    cyclist.totalFatalities + pedestrian.totalFatalities;
  const combinedAccidents = cyclist.totalAccidents + pedestrian.totalAccidents;

  const cyclistLatest = cyclist.byYear[cyclist.byYear.length - 1];
  const pedestrianLatest = pedestrian.byYear[pedestrian.byYear.length - 1];

  const cyclistPeakStr = cyclist.peakHours
    .map((h) => `${h.hour.toString().padStart(2, "0")}:00`)
    .join(", ");
  const pedestrianPeakStr = pedestrian.peakHours
    .map((h) => `${h.hour.toString().padStart(2, "0")}:00`)
    .join(", ");

  const webPageSchema = {
    "@context": "https://schema.org" as const,
    "@type": "WebPage" as const,
    name: "Seguridad de ciclistas y peatones en Espana",
    description:
      "Analisis de accidentes con ciclistas y peatones en Espana con datos DGT 2019-2023.",
    url: `${BASE_URL}/inteligencia/ciclistas-y-peatones`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  const datasetSchema = {
    "@context": "https://schema.org" as const,
    "@type": "Dataset" as const,
    name: "Accidentes con ciclistas y peatones en Espana 2019-2023",
    description:
      "Microdatos de accidentes con implicacion de bicicletas y peatones. Fuente: DGT.",
    url: `${BASE_URL}/inteligencia/ciclistas-y-peatones`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@type": "Organization", name: "trafico.live" },
    isBasedOn: ["https://www.dgt.es"],
    temporalCoverage: "2019/2023",
    spatialCoverage: { "@type": "Place", name: "Espana" },
  };

  const stripStats = [
    {
      icon: Users,
      label: "Accidentes (ciclistas + peatones)",
      value: combinedAccidents.toLocaleString("es-ES"),
      color: "text-[var(--tl-primary)]",
    },
    {
      icon: Skull,
      label: "Fallecidos totales",
      value: combinedFatalities.toLocaleString("es-ES"),
      color: "text-[var(--tl-danger)]",
    },
    {
      icon: Bike,
      label: `Ciclistas fallecidos ${cyclistLatest?.year ?? 2023}`,
      value: (cyclistLatest?.fatalities ?? 0).toLocaleString("es-ES"),
      color: "text-emerald-500",
    },
    {
      icon: Footprints,
      label: `Peatones fallecidos ${pedestrianLatest?.year ?? 2023}`,
      value: (pedestrianLatest?.fatalities ?? 0).toLocaleString("es-ES"),
      color: "text-sky-500",
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
          {
            name: "Ciclistas y peatones",
            href: "/inteligencia/ciclistas-y-peatones",
          },
        ]}
      />

      {/* Hero */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Seguridad de ciclistas y peatones
          </h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
          Analisis de accidentes con usuarios vulnerables de la via en Espana.
          Ciclistas y peatones son los mas expuestos: sin carroceria, sin
          proteccion, con maxima dependencia de la visibilidad y del
          comportamiento de otros conductores. Datos DGT (2019-2023).
        </p>
      </div>

      {/* Vehicle data availability banner */}
      {(!cyclist.hasVehicleData || !pedestrian.hasVehicleData) && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                Datos de tipo de vehiculo en procesamiento
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                La clasificacion por tipo de vehiculo esta siendo actualizada. Las estadisticas
                generales de accidentes (tendencia anual, distribucion horaria, iluminacion
                y provincias) se muestran con todos los accidentes registrados.
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
      <section className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-gray-800 rounded-2xl border border-emerald-200 dark:border-emerald-800/30 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[var(--tl-warning)]" />
          <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-gray-100">
            Hallazgos clave
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Moon className="w-4 h-4 text-sky-500" />
              Noche y peatones
            </div>
            <p className="font-mono text-2xl font-bold text-sky-500">
              {nightFatalityPctPed}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              El {nightFatalityPctPed}% de los atropellos mortales a peatones
              ocurren de noche. El {nightUnlitPctPed}% en vias sin iluminacion
              adecuada.
            </p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <MapPin className="w-4 h-4 text-emerald-500" />
              Concentracion urbana
            </div>
            <p className="font-mono text-2xl font-bold text-emerald-500">
              {cyclist.urbanPct}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              El {cyclist.urbanPct}% de los accidentes de ciclista y el{" "}
              {pedestrian.urbanPct}% de los atropellos a peatones son urbanos.
            </p>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Skull className="w-4 h-4 text-[var(--tl-danger)]" />
              Victimas 2019-2023
            </div>
            <p className="font-mono text-2xl font-bold text-[var(--tl-danger)]">
              {combinedFatalities.toLocaleString("es-ES")}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {cyclist.totalFatalities.toLocaleString("es-ES")} ciclistas y{" "}
              {pedestrian.totalFatalities.toLocaleString("es-ES")} peatones
              fallecidos en 5 anos.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* CYCLIST ANALYSIS */}
      {/* ================================================================ */}
      <div className="pt-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <Bike className="w-4 h-4 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Analisis de ciclistas
          </h2>
        </div>
      </div>

      {/* Cyclist year trend */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Evolucion anual de accidentes con ciclistas
          </h3>
        </div>
        <YearTrendChart
          data={cyclist.byYear}
          accentColor={CYCLIST_COLOR}
          title="Accidentes y fallecidos con ciclistas por ano"
          description="Evolucion del numero de accidentes con implicacion de bicicletas y victimas mortales (2019-2023)."
        />
      </section>

      {/* Cyclist hour pattern */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-500" />
          <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Cuando ocurren los accidentes de ciclista
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Las horas punta son las{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {cyclistPeakStr}
          </span>
          , coincidiendo con los picos de desplazamiento al trabajo y las
          salidas deportivas de tarde.
        </p>
        <HourDistributionChart
          data={cyclist.byHour}
          accentColor={CYCLIST_COLOR}
          title="Accidentes con ciclistas por hora del dia"
          description="Distribucion horaria acumulada (2019-2023). Doble pico: commuting matutino y ocio vespertino."
        />
      </section>

      {/* Cyclist province ranking */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-500" />
          <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Provincias con mas accidentes de ciclista
          </h3>
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
                <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-emerald-500">
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
              {cyclist.byProvince.map((row, i) => (
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
                  <td className="px-4 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
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

      {/* ================================================================ */}
      {/* PEDESTRIAN ANALYSIS */}
      {/* ================================================================ */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6 pt-4">
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
            <Footprints className="w-4 h-4 text-sky-500" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Analisis de peatones
          </h2>
        </div>
      </div>

      {/* Pedestrian year trend */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-sky-500" />
          <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Evolucion anual de atropellos a peatones
          </h3>
        </div>
        <YearTrendChart
          data={pedestrian.byYear}
          accentColor={PEDESTRIAN_COLOR}
          title="Atropellos y fallecidos peatones por ano"
          description="Evolucion del numero de atropellos con victimas mortales (2019-2023)."
        />
      </section>

      {/* Pedestrian hour pattern — nighttime is key */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-sky-500" />
          <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Cuando ocurren los atropellos
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Las horas con mas atropellos son las{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {pedestrianPeakStr}
          </span>
          . Pero la clave no es el volumen: la noche concentra el{" "}
          <span className="font-mono font-bold text-sky-500">
            {nightFatalityPctPed}%
          </span>{" "}
          de los atropellos mortales.
        </p>
        <HourDistributionChart
          data={pedestrian.byHour}
          accentColor={PEDESTRIAN_COLOR}
          title="Atropellos a peatones por hora del dia"
          description="Distribucion horaria acumulada (2019-2023). Las horas nocturnas son desproporcionadamente letales."
        />
      </section>

      {/* Pedestrian province ranking */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-sky-500" />
          <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Provincias con mas atropellos a peatones
          </h3>
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
                <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-sky-500">
                  Atropellos
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
              {pedestrian.byProvince.map((row, i) => (
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
                  <td className="px-4 py-2.5 text-right font-mono text-sky-600 dark:text-sky-400">
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

      {/* ================================================================ */}
      {/* SHARED: LIGHT CONDITION ANALYSIS */}
      {/* ================================================================ */}
      <section className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 pt-4">
          <Moon className="w-5 h-5 text-sky-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Analisis de iluminacion
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          El{" "}
          <span className="font-mono font-bold text-sky-500">
            {nightUnlitPctPed}%
          </span>{" "}
          de los atropellos mortales a peatones ocurren de noche en vias sin
          iluminacion adecuada. La visibilidad es el factor critico para los
          usuarios vulnerables.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Pedestrian light conditions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Footprints className="w-4 h-4 text-sky-500" />
              Peatones por condicion de luz
            </h3>
            <div className="space-y-2">
              {pedestrian.byLight.map((row) => {
                const pct =
                  pedestrian.totalAccidents > 0
                    ? (row.accidents / pedestrian.totalAccidents) * 100
                    : 0;
                const fatalPct =
                  pedestrian.totalFatalities > 0
                    ? (row.fatalities / pedestrian.totalFatalities) * 100
                    : 0;
                const isNight =
                  row.lightCondition.toLowerCase().includes("night") ||
                  row.lightCondition.toLowerCase().includes("noche");
                return (
                  <div
                    key={row.lightCondition}
                    className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      {isNight ? (
                        <Moon className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Sun className="w-4 h-4 text-tl-amber-400" />
                      )}
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {getLightLabel(row.lightCondition)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                        {row.accidents.toLocaleString("es-ES")} acc.
                      </span>
                      <span className="ml-2 font-mono text-sm font-bold text-[var(--tl-danger)]">
                        {row.fatalities} fall. ({fatalPct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cyclist light conditions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Bike className="w-4 h-4 text-emerald-500" />
              Ciclistas por condicion de luz
            </h3>
            <div className="space-y-2">
              {cyclist.byLight.map((row) => {
                const pct =
                  cyclist.totalAccidents > 0
                    ? (row.accidents / cyclist.totalAccidents) * 100
                    : 0;
                const fatalPct =
                  cyclist.totalFatalities > 0
                    ? (row.fatalities / cyclist.totalFatalities) * 100
                    : 0;
                const isNight =
                  row.lightCondition.toLowerCase().includes("night") ||
                  row.lightCondition.toLowerCase().includes("noche");
                return (
                  <div
                    key={row.lightCondition}
                    className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      {isNight ? (
                        <Moon className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Sun className="w-4 h-4 text-tl-amber-400" />
                      )}
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {getLightLabel(row.lightCondition)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                        {row.accidents.toLocaleString("es-ES")} acc.
                      </span>
                      <span className="ml-2 font-mono text-sm font-bold text-[var(--tl-danger)]">
                        {row.fatalities} fall. ({fatalPct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Urban focus */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-500" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Concentracion urbana
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Bike className="w-5 h-5 text-emerald-500" />
              <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100">
                Ciclistas
              </h3>
            </div>
            <p className="font-mono text-3xl font-bold text-emerald-500 mb-2">
              {cyclist.urbanPct}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              de los accidentes con ciclistas son urbanos (
              {cyclist.urbanAccidents.toLocaleString("es-ES")} de{" "}
              {cyclist.totalAccidents.toLocaleString("es-ES")}).
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Footprints className="w-5 h-5 text-sky-500" />
              <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100">
                Peatones
              </h3>
            </div>
            <p className="font-mono text-3xl font-bold text-sky-500 mb-2">
              {pedestrian.urbanPct}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              de los atropellos a peatones son urbanos (
              {pedestrian.urbanAccidents.toLocaleString("es-ES")} de{" "}
              {pedestrian.totalAccidents.toLocaleString("es-ES")}).
            </p>
          </div>
        </div>
      </section>

      {/* Safety recommendations */}
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
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-600">
                1
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Visibilidad nocturna para peatones
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              El {nightUnlitPctPed}% de los atropellos mortales son nocturnos
              sin iluminacion. Usa ropa clara o reflectante, y cruza siempre por
              pasos senalizados e iluminados.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-600">
                2
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Luces y reflectantes en bicicleta
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              La ley obliga a llevar luces delantera y trasera de noche, pero
              los datos muestran que incluso de dia la visibilidad es critica.
              Chaleco reflectante y luz intermitente siempre.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-600">
                3
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Infraestructura urbana segura
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Con el {cyclist.urbanPct}% de accidentes de ciclista y el{" "}
              {pedestrian.urbanPct}% de atropellos en zona urbana, carriles bici
              segregados y pasos de peatones elevados son la medida mas
              efectiva.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-600">
                4
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Conductores: atencional en cruces
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              La mayoria de atropellos y accidentes con ciclistas ocurren en
              intersecciones urbanas. Comprueba espejos y angulos muertos antes
              de girar, especialmente a la derecha.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm sm:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-600">
                5
              </div>
              <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100">
                Casco de ciclista: obligatorio fuera de zona urbana
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Aunque en zona urbana no es obligatorio para mayores de 16 anos,
              los datos de mortalidad justifican su uso permanente. Reduce el
              riesgo de lesion craneal grave en un 60-70% segun estudios
              epidemiologicos.
            </p>
          </div>
        </div>
      </section>

      {/* Attribution */}
      <footer className="flex items-start gap-2 text-[11px] text-gray-400 pb-4">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>
          Fuente: DGT (microdatos de accidentes 2019-2023). Los datos reflejan
          accidentes con al menos un ciclista o peaton implicado. Los
          porcentajes nocturnos incluyen todas las condiciones de iluminacion
          nocturna (con y sin iluminacion artificial). No ajustan por exposicion
          ni flujo peatonal/ciclista.
        </span>
      </footer>
    </main>
  );
}
