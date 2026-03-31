"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle,
  Users,
  TrendingDown,
  TrendingUp,
  Activity,
  ChevronDown,
} from "lucide-react";
import { provinceSlug } from "@/lib/geo/slugify";
import type { ProvinceDataPoint } from "@/components/map/ProvinceHeatmap";

// Dynamic import for ProvinceHeatmap — no SSR
const ProvinceHeatmap = dynamic(
  () =>
    import("@/components/map/ProvinceHeatmap").then((m) => m.ProvinceHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] bg-gray-100 dark:bg-gray-900 animate-pulse rounded-xl flex items-center justify-center">
        <span className="text-sm text-gray-400">Cargando mapa...</span>
      </div>
    ),
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface YearlyRow {
  year: number;
  accidents: number;
  fatalities: number;
  hospitalized: number;
}

interface ProvinceRow {
  province: string;
  provinceName: string | null;
  accidents: number;
  fatalities: number;
  hospitalized: number;
  rate: number;
  ratePer100k: number;
}

interface AccidentesClientProps {
  yearly: YearlyRow[];
  byProvince: ProvinceRow[];
  totals: { year: number; accidents: number; fatalities: number; hospitalized: number };
  fatalityRate: string;
  yoyAccidents: string | null;
  latestYear: number;
  availableYears: number[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString("es-ES");
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-data font-bold text-gray-900 dark:text-gray-50 tabular-nums">
            {value}
          </p>
          {sub && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-tl-50 dark:bg-tl-900/20 flex items-center justify-center flex-shrink-0 ml-3">
          <Icon className="w-5 h-5 text-tl-600 dark:text-tl-400" />
        </div>
      </div>
      {trendLabel && (
        <div
          className={`mt-3 flex items-center gap-1 text-xs font-medium ${
            trend === "down"
              ? "text-emerald-600 dark:text-emerald-400"
              : trend === "up"
              ? "text-red-600 dark:text-red-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {trend === "down" ? (
            <TrendingDown className="w-3.5 h-3.5" />
          ) : trend === "up" ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : null}
          {trendLabel}
        </div>
      )}
    </div>
  );
}

// Custom tooltip for Recharts
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600 dark:text-gray-400">{p.name}:</span>
          <span className="font-data font-semibold text-gray-900 dark:text-gray-100">
            {formatNumber(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AccidentesClient({
  yearly,
  byProvince,
  totals,
  fatalityRate,
  yoyAccidents,
  latestYear,
  availableYears,
}: AccidentesClientProps) {
  const [selectedYear, setSelectedYear] = useState<number>(latestYear);
  const [choroplethMetric, setChoroplethMetric] = useState<
    "accidents" | "fatalities" | "ratePer100k"
  >("accidents");

  // When year changes, fetch province data from the API
  const [provinceData, setProvinceData] = useState<ProvinceRow[]>(byProvince);
  const [provinceLoading, setProvinceLoading] = useState(false);

  const handleYearChange = useCallback(
    async (year: number) => {
      setSelectedYear(year);
      if (year === latestYear) {
        setProvinceData(byProvince);
        return;
      }
      setProvinceLoading(true);
      try {
        const res = await fetch(`/api/historical/stats?year=${year}`);
        const json = await res.json();
        if (json.success && json.data?.byProvince) {
          setProvinceData(json.data.byProvince);
        }
      } catch {
        // silently fail — keep existing data
      } finally {
        setProvinceLoading(false);
      }
    },
    [latestYear, byProvince]
  );

  // Build choropleth data from current province data
  const choroplethData: ProvinceDataPoint[] = provinceData.map((p) => {
    const val =
      choroplethMetric === "accidents"
        ? p.accidents
        : choroplethMetric === "fatalities"
        ? p.fatalities
        : p.ratePer100k;

    return {
      province: p.province,
      value: val,
      label:
        choroplethMetric === "ratePer100k"
          ? `${val.toFixed(2)} / 100k hab.`
          : formatNumber(val),
    };
  });

  const metricLabel =
    choroplethMetric === "accidents"
      ? "Accidentes"
      : choroplethMetric === "fatalities"
      ? "Víctimas mortales"
      : "Mortalidad por 100k hab.";

  // YoY trend
  const yoyNum = yoyAccidents ? parseFloat(yoyAccidents) : null;
  const yoyTrend =
    yoyNum === null ? "neutral" : yoyNum < 0 ? "down" : "up";

  return (
    <div className="space-y-10">

      {/* ── 1. Key stats cards ────────────────────────────────────────────── */}
      <section aria-labelledby="stats-heading">
        <h2
          id="stats-heading"
          className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4"
        >
          Cifras del año {latestYear}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Accidentes con víctimas"
            value={formatNumber(totals.accidents)}
            sub={`Año ${latestYear}`}
            icon={AlertTriangle}
            trend={yoyTrend}
            trendLabel={
              yoyAccidents
                ? `${yoyNum! > 0 ? "+" : ""}${yoyAccidents}% vs ${latestYear - 1}`
                : undefined
            }
          />
          <StatCard
            title="Víctimas mortales"
            value={formatNumber(totals.fatalities)}
            sub="Fallecidos en 30 días o en el acto"
            icon={Users}
          />
          <StatCard
            title="Heridos hospitalizados"
            value={formatNumber(totals.hospitalized)}
            sub="Ingreso hospitalario"
            icon={Activity}
          />
          <StatCard
            title="Tasa de mortalidad"
            value={`${fatalityRate}%`}
            sub="Fallecidos por cada 100 accidentes"
            icon={TrendingDown}
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Fuente: DGT en Cifras · Datos anuales consolidados
        </p>
      </section>

      {/* ── 2. Year-over-year trend chart ─────────────────────────────────── */}
      <section aria-labelledby="trend-heading">
        <h2
          id="trend-heading"
          className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4"
        >
          Evolución histórica de la siniestralidad
        </h2>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={yearly}
              margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(156,163,175,0.2)"
              />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: "currentColor" }}
                tickLine={false}
                axisLine={false}
              />
              {/* Left axis: accidents */}
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "currentColor" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
                width={48}
              />
              {/* Right axis: fatalities */}
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "currentColor" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                }
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="accidents"
                name="Accidentes"
                stroke="#366cf8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#366cf8", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="fatalities"
                name="Víctimas mortales"
                stroke="#dc2626"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#dc2626", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="hospitalized"
                name="Heridos hospitalizados"
                stroke="#d48139"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-right">
            Fuente: DGT en Cifras
          </p>
        </div>
      </section>

      {/* ── 3. Province choropleth ─────────────────────────────────────────── */}
      <section aria-labelledby="mapa-heading">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2
            id="mapa-heading"
            className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100"
          >
            Mapa por provincia
          </h2>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Year selector */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 pr-8 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-tl-500 cursor-pointer"
              >
                {availableYears
                  .slice()
                  .reverse()
                  .map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* Metric selector */}
            <div className="relative">
              <select
                value={choroplethMetric}
                onChange={(e) =>
                  setChoroplethMetric(
                    e.target.value as "accidents" | "fatalities" | "ratePer100k"
                  )
                }
                className="appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 pr-8 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-tl-500 cursor-pointer"
              >
                <option value="accidents">Accidentes</option>
                <option value="fatalities">Víctimas mortales</option>
                <option value="ratePer100k">Mortalidad / 100k hab.</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <ProvinceHeatmap
          data={choroplethData}
          metric={`${metricLabel} — ${selectedYear}`}
          colorScale={["#fef9c3", "#7f1d1d"]}
          height="480px"
          isLoading={provinceLoading}
        />
      </section>

      {/* ── 4. Province ranking table ─────────────────────────────────────── */}
      <section aria-labelledby="ranking-heading">
        <h2
          id="ranking-heading"
          className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4"
        >
          Ranking de provincias — {selectedYear}
        </h2>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Provincia
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Accidentes
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Víctimas mortales
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Heridos hosp.
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tasa mortalidad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {provinceData.slice(0, 20).map((p, i) => (
                  <tr
                    key={p.province}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-data text-gray-400 dark:text-gray-500 text-xs">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      <Link
                        href={`/estadisticas/accidentes/${provinceSlug(p.provinceName ?? p.province)}`}
                        className="text-tl-600 dark:text-tl-400 hover:underline hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
                      >
                        {p.provinceName ?? p.province}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-data tabular-nums text-gray-700 dark:text-gray-300">
                      {formatNumber(p.accidents)}
                    </td>
                    <td className="px-4 py-3 text-right font-data tabular-nums text-red-600 dark:text-red-400 font-semibold">
                      {formatNumber(p.fatalities)}
                    </td>
                    <td className="px-4 py-3 text-right font-data tabular-nums text-tl-amber-600 dark:text-tl-amber-400">
                      {formatNumber(p.hospitalized)}
                    </td>
                    <td className="px-4 py-3 text-right font-data tabular-nums text-gray-600 dark:text-gray-400">
                      {p.rate.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Top 20 provincias por número de accidentes · Fuente: DGT en Cifras ·{" "}
              Tasa de mortalidad = fallecidos / accidentes × 100
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
