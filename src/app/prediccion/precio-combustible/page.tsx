/**
 * /prediccion/precio-combustible — Prediccion del precio del combustible en Espana
 *
 * Server component with revalidate = 3600 (1h).
 * Data: 194K+ CNMC records, 52 provinces, daily since 2016.
 */

import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  Fuel,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  MapPin,
  ArrowUp,
  ArrowDown,
  Info,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  StructuredData,
  generateDatasetSchema,
} from "@/components/seo/StructuredData";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { HistoryChart, SeasonalityChart } from "./fuel-charts";
import type { HistoryPoint, SeasonalityPoint } from "./fuel-charts";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = buildPageMetadata({
  title:
    "Prediccion del precio del combustible en Espana — Analisis y tendencias | trafico.live",
  description:
    "Analisis del precio de gasoleo y gasolina con datos CNMC desde 2016. Tendencias, estacionalidad, ranking por provincia y estimacion para el proximo mes.",
  path: "/prediccion/precio-combustible",
  keywords: [
    "precio combustible espana",
    "prediccion gasoleo",
    "prediccion gasolina",
    "tendencia precio combustible",
    "CNMC precios combustible",
    "gasoleo mas barato",
    "estacionalidad combustible",
  ],
});

// ---------------------------------------------------------------------------
// Month names
// ---------------------------------------------------------------------------

const MONTH_NAMES_FULL = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

interface NationalAvg {
  avgDiesel: number;
  avgGasolina: number;
  date: Date;
}

interface PriceOffset {
  diesel: number | null;
  gasolina: number | null;
}

interface TrendData {
  current: number;
  currentGasolina: number;
  d7: PriceOffset;
  d30: PriceOffset;
  d90: PriceOffset;
  y1: PriceOffset;
  dieselChange7d: number | null;
  dieselChange30d: number | null;
  dieselChange90d: number | null;
  dieselChange1y: number | null;
  gasolinaChange7d: number | null;
  gasolinaChange30d: number | null;
}

interface ProvinceRow {
  province: string;
  provinceName: string | null;
  priceGasoleoA: Prisma.Decimal | null;
  priceGasolina95: Prisma.Decimal | null;
  paiGasoleoA: Prisma.Decimal | null;
  paiGasolina95: Prisma.Decimal | null;
}

interface SeasonalityRow {
  month: number;
  avg_diesel: number;
  avg_gasolina: number;
}

interface HistoryRow {
  month: Date;
  diesel: number;
  gasolina: number;
}

function pctChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

async function getLatestDate(): Promise<Date | null> {
  const latest = await prisma.cNMCFuelPrice.findFirst({
    where: { priceGasoleoA: { not: null } },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  return latest?.date ?? null;
}

async function getNationalAverage(date: Date): Promise<NationalAvg | null> {
  const agg = await prisma.cNMCFuelPrice.aggregate({
    where: { date, priceGasoleoA: { not: null } },
    _avg: { priceGasoleoA: true, priceGasolina95: true },
  });

  if (!agg._avg.priceGasoleoA) return null;

  return {
    avgDiesel: Number(agg._avg.priceGasoleoA),
    avgGasolina: Number(agg._avg.priceGasolina95 ?? 0),
    date,
  };
}

async function getPriceAtOffset(
  latestDate: Date,
  daysAgo: number
): Promise<PriceOffset> {
  const target = new Date(latestDate);
  target.setDate(target.getDate() - daysAgo);
  // Find the closest date to the target (within 3 days)
  const lower = new Date(target);
  lower.setDate(lower.getDate() - 3);

  const row = await prisma.cNMCFuelPrice.findFirst({
    where: {
      priceGasoleoA: { not: null },
      date: { gte: lower, lte: target },
    },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (!row) return { diesel: null, gasolina: null };

  const agg = await prisma.cNMCFuelPrice.aggregate({
    where: { date: row.date, priceGasoleoA: { not: null } },
    _avg: { priceGasoleoA: true, priceGasolina95: true },
  });

  return {
    diesel: agg._avg.priceGasoleoA ? Number(agg._avg.priceGasoleoA) : null,
    gasolina: agg._avg.priceGasolina95 ? Number(agg._avg.priceGasolina95) : null,
  };
}

async function getTrends(
  latestDate: Date,
  currentDiesel: number,
  currentGasolina: number
): Promise<TrendData> {
  const [d7, d30, d90, y1] = await Promise.all([
    getPriceAtOffset(latestDate, 7),
    getPriceAtOffset(latestDate, 30),
    getPriceAtOffset(latestDate, 90),
    getPriceAtOffset(latestDate, 365),
  ]);

  return {
    current: currentDiesel,
    currentGasolina,
    d7,
    d30,
    d90,
    y1,
    dieselChange7d: pctChange(currentDiesel, d7.diesel),
    dieselChange30d: pctChange(currentDiesel, d30.diesel),
    dieselChange90d: pctChange(currentDiesel, d90.diesel),
    dieselChange1y: pctChange(currentDiesel, y1.diesel),
    gasolinaChange7d: pctChange(currentGasolina, d7.gasolina),
    gasolinaChange30d: pctChange(currentGasolina, d30.gasolina),
  };
}

async function getSeasonality(): Promise<SeasonalityPoint[]> {
  const rows = await prisma.$queryRaw<SeasonalityRow[]>`
    SELECT EXTRACT(MONTH FROM date)::int as month,
      ROUND(AVG("priceGasoleoA"::numeric), 3) as avg_diesel,
      ROUND(AVG("priceGasolina95"::numeric), 3) as avg_gasolina
    FROM "CNMCFuelPrice"
    WHERE "priceGasoleoA" IS NOT NULL
    GROUP BY month
    ORDER BY month
  `;

  return rows.map((r) => ({
    month: Number(r.month),
    avgDiesel: Number(r.avg_diesel),
    avgGasolina: Number(r.avg_gasolina),
  }));
}

async function getProvinceRanking(date: Date): Promise<ProvinceRow[]> {
  const rows = await prisma.cNMCFuelPrice.findMany({
    where: { date, priceGasoleoA: { not: null } },
    orderBy: { priceGasoleoA: "asc" },
    select: {
      province: true,
      provinceName: true,
      priceGasoleoA: true,
      priceGasolina95: true,
      paiGasoleoA: true,
      paiGasolina95: true,
    },
  });
  return rows;
}

async function getHistory(): Promise<HistoryPoint[]> {
  const rows = await prisma.$queryRaw<HistoryRow[]>`
    SELECT DATE_TRUNC('month', date) as month,
      ROUND(AVG("priceGasoleoA"::numeric), 3) as diesel,
      ROUND(AVG("priceGasolina95"::numeric), 3) as gasolina
    FROM "CNMCFuelPrice"
    WHERE date >= NOW() - INTERVAL '2 years'
      AND "priceGasoleoA" IS NOT NULL
    GROUP BY DATE_TRUNC('month', date)
    ORDER BY month
  `;

  return rows.map((r) => ({
    month: new Date(r.month).toISOString().slice(0, 7),
    diesel: Number(r.diesel),
    gasolina: Number(r.gasolina),
  }));
}

// ---------------------------------------------------------------------------
// Forecast (seasonal decomposition + trend overlay)
// ---------------------------------------------------------------------------

interface ForecastResult {
  monthName: string;
  estimatedDiesel: number;
  estimatedGasolina: number;
  confidenceRange: number; // percentage +/-
  direction: "up" | "down" | "stable";
}

function computeForecast(
  seasonality: SeasonalityPoint[],
  national: NationalAvg,
  trends: TrendData
): ForecastResult {
  const currentMonth = new Date().getMonth(); // 0-indexed
  const nextMonthIdx = (currentMonth + 1) % 12;

  const currentSeasonal = seasonality.find((s) => s.month === currentMonth + 1);
  const nextSeasonal = seasonality.find((s) => s.month === nextMonthIdx + 1);

  if (!currentSeasonal || !nextSeasonal) {
    return {
      monthName: MONTH_NAMES_FULL[nextMonthIdx],
      estimatedDiesel: national.avgDiesel,
      estimatedGasolina: national.avgGasolina,
      confidenceRange: 5,
      direction: "stable",
    };
  }

  // Seasonal factor: how much does price typically change from this month to next?
  const seasonalFactorDiesel =
    currentSeasonal.avgDiesel > 0
      ? nextSeasonal.avgDiesel / currentSeasonal.avgDiesel
      : 1;
  const seasonalFactorGasolina =
    currentSeasonal.avgGasolina > 0
      ? nextSeasonal.avgGasolina / currentSeasonal.avgGasolina
      : 1;

  // Apply seasonal factor to current price
  let estimatedDiesel = national.avgDiesel * seasonalFactorDiesel;
  let estimatedGasolina = national.avgGasolina * seasonalFactorGasolina;

  // Apply recent 30d trend overlay (half weight)
  const trendFactor30d =
    trends.dieselChange30d !== null ? 1 + (trends.dieselChange30d / 100) * 0.5 : 1;
  estimatedDiesel *= trendFactor30d;
  estimatedGasolina *= trendFactor30d;

  // Determine direction
  let direction: "up" | "down" | "stable" = "stable";
  const changePct =
    ((estimatedDiesel - national.avgDiesel) / national.avgDiesel) * 100;
  if (changePct > 0.5) direction = "up";
  else if (changePct < -0.5) direction = "down";

  // Confidence range: wider if recent trend is volatile
  const confidenceRange =
    Math.abs(trends.dieselChange30d ?? 0) > 3
      ? 4
      : Math.abs(trends.dieselChange30d ?? 0) > 1
        ? 3
        : 2;

  return {
    monthName: MONTH_NAMES_FULL[nextMonthIdx],
    estimatedDiesel: Math.round(estimatedDiesel * 1000) / 1000,
    estimatedGasolina: Math.round(estimatedGasolina * 1000) / 1000,
    confidenceRange,
    direction,
  };
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function TrendBadge({
  value,
  label,
}: {
  value: number | null;
  label: string;
}) {
  if (value === null) return null;
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.1;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={`inline-flex items-center gap-0.5 text-sm font-mono font-semibold ${
          isNeutral
            ? "text-gray-500"
            : isPositive
              ? "text-[var(--tl-danger)]"
              : "text-[var(--tl-success)]"
        }`}
      >
        {isPositive ? (
          <ArrowUp className="w-3.5 h-3.5" />
        ) : value < 0 ? (
          <ArrowDown className="w-3.5 h-3.5" />
        ) : null}
        {isPositive ? "+" : ""}
        {value.toFixed(2)}%
      </span>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  accent?: "amber" | "blue" | "green" | "red";
}) {
  const accentClasses = {
    amber:
      "bg-tl-amber-50 dark:bg-tl-amber-900/20 border-tl-amber-200 dark:border-tl-amber-800",
    blue: "bg-tl-50 dark:bg-tl-900/20 border-tl-200 dark:border-tl-800",
    green:
      "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${accent ? accentClasses[accent] : "bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"}`}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </span>
      </div>
      <p className="text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {sublabel}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function PrecioCombustiblePage() {
  // Fetch all data in parallel
  const latestDate = await getLatestDate();

  if (!latestDate) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Fuel className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Datos no disponibles
        </h1>
        <p className="text-gray-500 mt-2">
          No se encontraron datos de precios de combustible en la base de datos.
        </p>
      </div>
    );
  }

  const [national, provinceRanking, seasonality, history] = await Promise.all([
    getNationalAverage(latestDate),
    getProvinceRanking(latestDate),
    getSeasonality(),
    getHistory(),
  ]);

  if (!national) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Fuel className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Error al calcular la media nacional.</p>
      </div>
    );
  }

  const trends = await getTrends(latestDate, national.avgDiesel, national.avgGasolina);
  const forecast = computeForecast(seasonality, national, trends);

  // Find national avg for province diff calculation
  const nationalDiesel = national.avgDiesel;
  const nationalGasolina = national.avgGasolina;

  // Tax breakdown: use first province that has PAI data
  const taxProvince = provinceRanking.find(
    (p) => p.paiGasoleoA !== null && p.priceGasoleoA !== null
  );
  const taxDiesel = taxProvince
    ? {
        final: Number(taxProvince.priceGasoleoA),
        preTax: Number(taxProvince.paiGasoleoA),
        tax: Number(taxProvince.priceGasoleoA) - Number(taxProvince.paiGasoleoA),
      }
    : null;

  // Format date
  const dateStr = latestDate.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // "Should I fill up?" logic
  const shouldFillUp =
    trends.dieselChange7d !== null && trends.dieselChange7d > 0.3
      ? true
      : trends.dieselChange7d !== null && trends.dieselChange7d < -0.3
        ? false
        : null;

  return (
    <>
      <StructuredData
        data={generateDatasetSchema({
          name: "Prediccion del precio del combustible en Espana",
          description:
            "Analisis y prediccion de precios de gasoleo y gasolina en Espana. Datos historicos CNMC desde 2016, estacionalidad, tendencias y ranking provincial.",
          url: `${BASE_URL}/prediccion/precio-combustible`,
          keywords: [
            "precio combustible",
            "prediccion gasoleo",
            "gasolina 95",
            "CNMC",
            "tendencia precios",
          ],
          spatialCoverage: "Espana",
          temporalCoverage: "2016/..",
        })}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Prediccion", href: "/prediccion/precio-combustible" },
            {
              name: "Precio Combustible",
              href: "/prediccion/precio-combustible",
            },
          ]}
        />

        {/* ── Hero ────────────────────────────────────────────────── */}
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3 font-heading">
            Prediccion del precio del combustible
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl">
            Analisis de tendencias, estacionalidad y estimacion mensual basado
            en{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-200">
              194.000+ registros CNMC
            </span>{" "}
            desde 2016.
          </p>
        </header>

        {/* ── Current Prices ─────────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Precio del combustible hoy
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 capitalize">
            <Calendar className="w-4 h-4 inline -mt-0.5 mr-1" />
            {dateStr}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={
                <Fuel className="w-5 h-5 text-tl-amber-500 dark:text-tl-amber-400" />
              }
              label="Gasoleo A"
              value={`${national.avgDiesel.toFixed(3)} €/L`}
              sublabel="Media nacional"
              accent="amber"
            />
            <StatCard
              icon={
                <Fuel className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              }
              label="Gasolina 95"
              value={`${national.avgGasolina.toFixed(3)} €/L`}
              sublabel="Media nacional"
              accent="blue"
            />
            <div className="rounded-2xl border bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Tendencia (diesel)
                </span>
              </div>
              <div className="space-y-2">
                <TrendBadge value={trends.dieselChange7d} label="7 dias" />
                <TrendBadge value={trends.dieselChange30d} label="30 dias" />
                <TrendBadge value={trends.dieselChange1y} label="1 ano" />
              </div>
            </div>
            <div className="rounded-2xl border bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Tendencia (gasolina)
                </span>
              </div>
              <div className="space-y-2">
                <TrendBadge
                  value={trends.gasolinaChange7d}
                  label="7 dias"
                />
                <TrendBadge
                  value={trends.gasolinaChange30d}
                  label="30 dias"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Should I fill up today? ────────────────────────────── */}
        <section className="mb-10">
          <div
            className={`rounded-2xl border p-6 shadow-sm ${
              shouldFillUp === true
                ? "bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800"
                : shouldFillUp === false
                  ? "bg-tl-50 dark:bg-tl-900/15 border-tl-200 dark:border-tl-800"
                  : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                  shouldFillUp === true
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : shouldFillUp === false
                      ? "bg-tl-100 dark:bg-tl-900/30"
                      : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                {shouldFillUp === true ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                ) : shouldFillUp === false ? (
                  <Clock className="w-6 h-6 text-tl-600 dark:text-tl-400" />
                ) : (
                  <Info className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                  ¿Debo repostar hoy?
                </h2>
                {shouldFillUp === true ? (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      Si, es buen momento.
                    </strong>{" "}
                    El precio lleva una tendencia alcista en los ultimos 7 dias (
                    <span className="font-mono">
                      +{trends.dieselChange7d?.toFixed(2)}%
                    </span>
                    ). Repostar antes de que suba mas puede ahorrarte dinero.
                  </p>
                ) : shouldFillUp === false ? (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-tl-600 dark:text-tl-400">
                      Puedes esperar unos dias.
                    </strong>{" "}
                    El precio lleva una tendencia bajista en los ultimos 7 dias (
                    <span className="font-mono">
                      {trends.dieselChange7d?.toFixed(2)}%
                    </span>
                    ). Esperar puede darte un mejor precio.
                  </p>
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>El precio se mantiene estable.</strong> No hay una
                    tendencia clara en los ultimos 7 dias. Reposta cuando te
                    convenga.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Historical Chart ───────────────────────────────────── */}
        <section className="mb-10">
          <HistoryChart data={history} />
        </section>

        {/* ── Seasonality Chart ──────────────────────────────────── */}
        <section className="mb-10">
          <SeasonalityChart data={seasonality} />
        </section>

        {/* ── Province Ranking ───────────────────────────────────── */}
        <section className="mb-10">
          <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Ranking por provincia
                </h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Precio del gasoleo A y gasolina 95 por provincia. Las 5 mas
                baratas en verde, las 5 mas caras en rojo.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Provincia
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Gasoleo A
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Gasolina 95
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      vs Media
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {provinceRanking.map((row, idx) => {
                    const diesel = row.priceGasoleoA
                      ? Number(row.priceGasoleoA)
                      : null;
                    const gasolina = row.priceGasolina95
                      ? Number(row.priceGasolina95)
                      : null;
                    const diff =
                      diesel !== null
                        ? ((diesel - nationalDiesel) / nationalDiesel) * 100
                        : null;
                    const isCheap = idx < 5;
                    const isExpensive = idx >= provinceRanking.length - 5;

                    return (
                      <tr
                        key={row.province}
                        className={`transition-colors ${
                          isCheap
                            ? "bg-emerald-50/50 dark:bg-emerald-900/10"
                            : isExpensive
                              ? "bg-red-50/50 dark:bg-red-900/10"
                              : "hover:bg-gray-50 dark:hover:bg-gray-900/30"
                        }`}
                      >
                        <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                          {row.provinceName ?? row.province}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">
                          {diesel !== null ? `${diesel.toFixed(3)} €` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-700 dark:text-gray-300">
                          {gasolina !== null
                            ? `${gasolina.toFixed(3)} €`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {diff !== null && (
                            <span
                              className={`font-mono text-xs font-semibold ${
                                diff < -0.5
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : diff > 0.5
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-gray-500"
                              }`}
                            >
                              {diff > 0 ? "+" : ""}
                              {diff.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Forecast ───────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Estimacion para{" "}
                <span className="capitalize">{forecast.monthName}</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="rounded-xl bg-tl-amber-50 dark:bg-tl-amber-900/15 border border-tl-amber-200 dark:border-tl-amber-800 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Gasoleo A estimado
                </p>
                <p className="text-3xl font-mono font-bold text-gray-900 dark:text-gray-100">
                  {forecast.estimatedDiesel.toFixed(3)}{" "}
                  <span className="text-base font-normal text-gray-500">
                    €/L
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ±{forecast.confidenceRange}% de margen
                </p>
              </div>
              <div className="rounded-xl bg-tl-50 dark:bg-tl-900/15 border border-tl-200 dark:border-tl-800 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Gasolina 95 estimada
                </p>
                <p className="text-3xl font-mono font-bold text-gray-900 dark:text-gray-100">
                  {forecast.estimatedGasolina.toFixed(3)}{" "}
                  <span className="text-base font-normal text-gray-500">
                    €/L
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ±{forecast.confidenceRange}% de margen
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              {forecast.direction === "up" ? (
                <>
                  <ArrowUp className="w-4 h-4 text-red-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Tendencia alcista. Se espera un ligero incremento respecto al
                    mes actual.
                  </span>
                </>
              ) : forecast.direction === "down" ? (
                <>
                  <ArrowDown className="w-4 h-4 text-emerald-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Tendencia bajista. Se espera un ligero descenso respecto al
                    mes actual.
                  </span>
                </>
              ) : (
                <>
                  <Info className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Sin tendencia clara. El precio se mantendria en niveles
                    similares al mes actual.
                  </span>
                </>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Estimacion basada en el patron estacional historico + tendencia
              reciente. No es un modelo predictivo avanzado.
            </p>
          </div>
        </section>

        {/* ── Tax Breakdown ──────────────────────────────────────── */}
        {taxDiesel && (
          <section className="mb-10">
            <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Desglose de impuestos
                </h2>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                El precio final del combustible incluye impuestos especiales
                (Impuesto Especial de Hidrocarburos), IVA (21%) y otros
                recargos. El dato PAI (Precio Antes de Impuestos) es exclusivo
                de los datos CNMC.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
                    Precio final
                  </p>
                  <p className="text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
                    {taxDiesel.final.toFixed(3)} €
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
                    Antes de impuestos (PAI)
                  </p>
                  <p className="text-2xl font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {taxDiesel.preTax.toFixed(3)} €
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
                    Carga fiscal
                  </p>
                  <p className="text-2xl font-mono font-bold text-red-600 dark:text-red-400">
                    {taxDiesel.tax.toFixed(3)} €
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {((taxDiesel.tax / taxDiesel.final) * 100).toFixed(1)}% del
                    precio final
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-4">
                Ejemplo con datos de{" "}
                {taxProvince?.provinceName ?? taxProvince?.province} · Gasoleo A
              </p>
            </div>
          </section>
        )}

        {/* ── Attribution ────────────────────────────────────────── */}
        <footer className="text-center text-xs text-gray-400 dark:text-gray-500 py-4 border-t border-gray-100 dark:border-gray-800">
          <p>
            Fuente: CNMC (Comision Nacional de los Mercados y la Competencia) ·
            Precios diarios desde 2016
          </p>
          <p className="mt-1">
            Los datos se actualizan diariamente. La estimacion es orientativa y
            no constituye asesoramiento financiero.
          </p>
        </footer>
      </div>
    </>
  );
}
