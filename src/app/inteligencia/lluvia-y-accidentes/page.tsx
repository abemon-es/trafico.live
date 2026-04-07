/**
 * /inteligencia/lluvia-y-accidentes
 *
 * Analisis de la correlacion entre lluvia y accidentes de trafico en Espana.
 * Datos: DGT microdatos de accidentes (2019-2023) + condicion meteorologica.
 */

import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  CloudRain,
  Sun,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Shield,
  Info,
  Droplets,
  Skull,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";
import {
  RainMultiplierChart,
  MonthlySeasonalityChart,
  type RainMultiplierItem,
  type MonthlySeasonalityItem,
} from "./charts";

export const revalidate = 86400; // Daily — historical data
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title:
    "Lluvia y accidentes de trafico en Espana — Analisis por provincia | trafico.live",
  description:
    "Analisis de la correlacion entre la lluvia y los accidentes de trafico en Espana. Multiplicador de riesgo por provincia, estacionalidad mensual y condiciones meteorologicas. Datos DGT 2019-2023.",
  alternates: { canonical: `${BASE_URL}/inteligencia/lluvia-y-accidentes` },
  openGraph: {
    title: "Lluvia y accidentes de trafico en Espana",
    description:
      "Cuanto aumentan los accidentes cuando llueve? Analisis por provincia con datos DGT (2019-2023).",
    url: `${BASE_URL}/inteligencia/lluvia-y-accidentes`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getRainAccidentData() {
  // 1. Accidents by province x weatherCondition
  const byProvinceWeather = await prisma.accidentMicrodata.groupBy({
    by: ["province", "weatherCondition"],
    _count: { _all: true },
    _sum: { fatalities: true, hospitalized: true },
    where: {
      weatherCondition: { not: null },
      province: { not: null },
    },
  });

  // Build province rain multiplier table
  const provinceMap = new Map<
    string,
    {
      rain: number;
      clear: number;
      rainFatalities: number;
      clearFatalities: number;
      name: string;
    }
  >();

  for (const row of byProvinceWeather) {
    const prov = row.province ?? "";
    if (!prov) continue;
    if (!provinceMap.has(prov)) {
      provinceMap.set(prov, {
        rain: 0,
        clear: 0,
        rainFatalities: 0,
        clearFatalities: 0,
        name: PROVINCE_NAMES[prov] ?? prov,
      });
    }
    const entry = provinceMap.get(prov)!;
    const wc = (row.weatherCondition ?? "").toLowerCase();
    if (
      wc === "rain" ||
      wc === "lluvia" ||
      wc.includes("rain") ||
      wc.includes("lluv")
    ) {
      entry.rain += row._count._all;
      entry.rainFatalities += row._sum.fatalities ?? 0;
    } else if (
      wc === "clear" ||
      wc === "buen tiempo" ||
      wc.includes("clear") ||
      wc.includes("buen")
    ) {
      entry.clear += row._count._all;
      entry.clearFatalities += row._sum.fatalities ?? 0;
    }
  }

  const rainMultiplier: RainMultiplierItem[] = Array.from(provinceMap.entries())
    .filter(([, v]) => v.clear > 0 && v.rain > 0)
    .map(([code, v]) => ({
      province: code,
      provinceName: v.name,
      rainAccidents: v.rain,
      clearAccidents: v.clear,
      rainFatalities: v.rainFatalities,
      clearFatalities: v.clearFatalities,
      multiplier: Number((v.rain / v.clear).toFixed(2)),
    }))
    .sort((a, b) => b.multiplier - a.multiplier);

  // 2. Monthly seasonality
  const monthlyRaw: Array<{
    month: number;
    weather_condition: string;
    count: bigint;
  }> = await prisma.$queryRaw`
    SELECT EXTRACT(MONTH FROM date)::int as month,
           "weatherCondition" as weather_condition,
           COUNT(*)::bigint as count
    FROM "AccidentMicrodata"
    WHERE date IS NOT NULL AND "weatherCondition" IS NOT NULL
    GROUP BY month, "weatherCondition"
    ORDER BY month
  `;

  const monthlySeasonality: MonthlySeasonalityItem[] = monthlyRaw.map((r) => ({
    month: r.month,
    weatherCondition: r.weather_condition,
    count: Number(r.count),
  }));

  // Distinct weather conditions
  const weatherConditions = [
    ...new Set(monthlySeasonality.map((m) => m.weatherCondition)),
  ];

  // 3. Weather totals for stats strip
  const weatherTotals = new Map<string, number>();
  for (const row of byProvinceWeather) {
    const wc = row.weatherCondition ?? "";
    weatherTotals.set(wc, (weatherTotals.get(wc) ?? 0) + row._count._all);
  }

  // 4. Overall totals
  const totalAccidents = await prisma.accidentMicrodata.count({
    where: { weatherCondition: { not: null } },
  });
  const totalRainAccidents = Array.from(weatherTotals.entries())
    .filter(
      ([wc]) =>
        wc.toLowerCase().includes("rain") ||
        wc.toLowerCase().includes("lluv")
    )
    .reduce((s, [, c]) => s + c, 0);

  const totalFatalities = await prisma.accidentMicrodata.aggregate({
    _sum: { fatalities: true },
    where: { weatherCondition: { not: null } },
  });

  return {
    rainMultiplier,
    monthlySeasonality,
    weatherConditions,
    totalAccidents,
    totalRainAccidents,
    totalFatalities: totalFatalities._sum.fatalities ?? 0,
    provinces: rainMultiplier.length,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function LluviaYAccidentesPage() {
  const data = await getRainAccidentData();

  // Find the province with the highest rain multiplier for the key insight
  const topProvince = data.rainMultiplier[0];
  const avgMultiplier =
    data.rainMultiplier.length > 0
      ? (
          data.rainMultiplier.reduce((s, p) => s + p.multiplier, 0) /
          data.rainMultiplier.length
        ).toFixed(2)
      : "0";

  const rainPct =
    data.totalAccidents > 0
      ? ((data.totalRainAccidents / data.totalAccidents) * 100).toFixed(1)
      : "0";

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Lluvia y accidentes de trafico en Espana",
    description:
      "Analisis de la correlacion entre lluvia y accidentes de trafico por provincia. Datos DGT 2019-2023.",
    url: `${BASE_URL}/inteligencia/lluvia-y-accidentes`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Correlacion lluvia-accidentes de trafico en Espana",
    description:
      "Analisis de accidentes de trafico por condicion meteorologica y provincia. Fuentes: DGT (microdatos), AEMET.",
    url: `${BASE_URL}/inteligencia/lluvia-y-accidentes`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@type": "Organization", name: "trafico.live" },
    isBasedOn: ["https://www.dgt.es", "https://www.aemet.es"],
    temporalCoverage: "2019/2023",
    spatialCoverage: { "@type": "Place", name: "Espana" },
  };

  // Stats strip data
  const stripStats = [
    {
      icon: BarChart3,
      label: "Total accidentes",
      value: data.totalAccidents.toLocaleString("es-ES"),
      color: "text-[var(--tl-primary)]",
    },
    {
      icon: CloudRain,
      label: "Accidentes con lluvia",
      value: data.totalRainAccidents.toLocaleString("es-ES"),
      color: "text-tl-500",
    },
    {
      icon: Droplets,
      label: "% con lluvia",
      value: `${rainPct}%`,
      color: "text-tl-500",
    },
    {
      icon: Skull,
      label: "Victimas mortales",
      value: data.totalFatalities.toLocaleString("es-ES"),
      color: "text-[var(--tl-danger)]",
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
            name: "Lluvia y accidentes",
            href: "/inteligencia/lluvia-y-accidentes",
          },
        ]}
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-tl-50 dark:bg-tl-900/30 flex items-center justify-center">
            <CloudRain className="w-5 h-5 text-[var(--tl-primary)]" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Lluvia y accidentes de trafico
          </h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
          Analisis de como las precipitaciones afectan a la siniestralidad vial
          en Espana. Datos de la DGT (microdatos de accidentes 2019-2023) cruzados
          con las condiciones meteorologicas registradas.
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
      {topProvince && (
        <section className="bg-gradient-to-br from-tl-50 to-white dark:from-tl-900/20 dark:to-gray-800 rounded-2xl border border-tl-200 dark:border-tl-800/30 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--tl-warning)]" />
            <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-gray-100">
              Hallazgos clave
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <TrendingUp className="w-4 h-4 text-[var(--tl-danger)]" />
                Mayor incremento
              </div>
              <p className="font-mono text-2xl font-bold text-[var(--tl-danger)]">
                {topProvince.multiplier}x
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                En <span className="font-semibold text-gray-900 dark:text-gray-100">{topProvince.provinceName}</span>,
                los accidentes con lluvia son {topProvince.multiplier}x mas
                frecuentes que con tiempo despejado.
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Shield className="w-4 h-4 text-[var(--tl-primary)]" />
                Media nacional
              </div>
              <p className="font-mono text-2xl font-bold text-[var(--tl-primary)]">
                {avgMultiplier}x
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                De media, el riesgo de accidente aumenta un{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {((Number(avgMultiplier) - 1) * 100).toFixed(0)}%
                </span>{" "}
                en dias de lluvia.
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Sun className="w-4 h-4 text-tl-amber-400" />
                Provincias analizadas
              </div>
              <p className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.provinces}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Provincias con datos suficientes de accidentes en lluvia y
                tiempo despejado para calcular el multiplicador.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Rain multiplier chart */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CloudRain className="w-5 h-5 text-[var(--tl-primary)]" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Multiplicador de riesgo por provincia
          </h2>
        </div>
        <RainMultiplierChart data={data.rainMultiplier} />
      </section>

      {/* Province table */}
      {data.rainMultiplier.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--tl-primary)]" />
            <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
              Tabla comparativa por provincia
            </h2>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-auto shadow-sm">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-3 text-left font-heading font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Provincia
                  </th>
                  <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-tl-500">
                    Con lluvia
                  </th>
                  <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-tl-amber-400">
                    Despejado
                  </th>
                  <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-[var(--tl-danger)]">
                    Multiplicador
                  </th>
                  <th className="px-4 py-3 text-right font-heading font-semibold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Victimas lluvia
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rainMultiplier.map((row, i) => (
                  <tr
                    key={row.province}
                    className={`border-b border-gray-50 dark:border-gray-700/50 ${
                      i % 2 === 0
                        ? "bg-white dark:bg-gray-800"
                        : "bg-gray-50/50 dark:bg-gray-800/60"
                    }`}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                      {row.provinceName}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-tl-600 dark:text-tl-400">
                      {row.rainAccidents.toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700 dark:text-gray-300">
                      {row.clearAccidents.toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-bold ${
                          row.multiplier >= 1.5
                            ? "text-[var(--tl-danger)]"
                            : row.multiplier >= 1.0
                              ? "text-[var(--tl-warning)]"
                              : "text-[var(--tl-success)]"
                        }`}
                      >
                        {row.multiplier}x
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400">
                      {row.rainFatalities.toLocaleString("es-ES")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Monthly seasonality chart */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[var(--tl-primary)]" />
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100">
            Estacionalidad mensual
          </h2>
        </div>
        <MonthlySeasonalityChart
          data={data.monthlySeasonality}
          weatherConditions={data.weatherConditions}
        />
      </section>

      {/* Attribution */}
      <footer className="flex items-start gap-2 text-[11px] text-gray-400 pb-4">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>
          Fuente: DGT (microdatos de accidentes 2019-2023), AEMET (registros
          climaticos). Los multiplicadores representan la ratio de accidentes
          registrados con lluvia frente a tiempo despejado. No ajustan por
          exposicion (km recorridos) ni por frecuencia de dias lluviosos.
        </span>
      </footer>
    </main>
  );
}
