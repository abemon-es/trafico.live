"use client";

import { useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Loader2, TrendingUp, TrendingDown, Minus, Info, ExternalLink, BarChart3, Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { fetcher } from "@/lib/fetcher";
import { TrafficHeatmap, type HeatmapCell } from "@/components/charts/TrafficHeatmap";

// ---------------------------------------------------------------------------
// Types from the API
// ---------------------------------------------------------------------------

interface HeatmapResponse {
  success: boolean;
  data: {
    heatmap: HeatmapCell[];
    metadata: {
      sensorCount: number;
      source: string;
      lastUpdated: string;
    };
  };
}

interface ComparisonResponse {
  success: boolean;
  data: {
    current: {
      avgIntensity: number;
      avgServiceLevel: number;
      sensorCount: number;
      recordedAt: string;
    } | null;
    predicted: {
      avgIntensity: number;
      avgServiceLevel: number;
      sampleCount: number;
    } | null;
    deviation: {
      intensityPercent: number;
      serviceLevelDelta: number;
      label: string;
    } | null;
    context: {
      dayOfWeek: number;
      hour: number;
      madridTime: string;
    };
  };
}

interface ForecastHour {
  hour: number;
  dayOfWeek: number;
  avgIntensity: number | null;
  avgServiceLevel: number | null;
  confidence: number;
}

interface ForecastResponse {
  success: boolean;
  data: {
    forecast: ForecastHour[];
    currentDeviation: number;
    requestedHours: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatN(n: number): string {
  return n.toLocaleString("es-ES");
}

function padH(h: number): string {
  return String(h).padStart(2, "0") + ":00";
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_FULL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function serviceLevelDotClass(sl: number | null): string {
  if (sl === null) return "bg-gray-300 dark:bg-gray-600";
  if (sl < 0.5) return "bg-green-500";
  if (sl < 1.0) return "bg-green-400";
  if (sl < 1.5) return "bg-tl-amber-400";
  if (sl < 2.0) return "bg-tl-amber-500";
  if (sl < 2.5) return "bg-red-400";
  return "bg-red-600";
}

function serviceLevelLabel(sl: number | null): string {
  if (sl === null) return "—";
  if (sl < 0.5) return "fluido";
  if (sl < 1.5) return "lento";
  if (sl < 2.5) return "retenciones";
  return "congestión";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DeviationBanner({ data }: { data: ComparisonResponse["data"] }) {
  if (!data.current || !data.deviation) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
        No hay datos en tiempo real disponibles en este momento.{" "}
        <Link href="/intensidad" className="text-tl-600 dark:text-tl-400 hover:underline">
          Ver datos históricos
        </Link>
      </div>
    );
  }

  const pct = data.deviation.intensityPercent;
  const label = data.deviation.label;
  const absPct = Math.abs(pct);

  // Only show banner if deviation is significant (>10%)
  if (absPct < 10) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 flex items-center gap-3">
        <Minus className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <p className="text-sm text-gray-700 dark:text-gray-300">
          El tráfico está{" "}
          <span className="font-semibold">dentro de la normalidad</span> para este
          momento del día.
        </p>
        <Link
          href="/intensidad"
          className="ml-auto text-xs text-tl-600 dark:text-tl-400 hover:underline flex items-center gap-1 flex-shrink-0"
        >
          <ExternalLink className="w-3 h-3" /> Datos en directo
        </Link>
      </div>
    );
  }

  const isBelow = pct < 0;
  const isMuch = label === "much_above_normal" || (isBelow && absPct >= 20);

  const colorClasses = isBelow
    ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300"
    : isMuch
    ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
    : "border-tl-amber-200 dark:border-tl-amber-800 bg-tl-amber-50 dark:bg-tl-amber-950/30 text-tl-amber-800 dark:text-tl-amber-300";

  const Icon = isBelow ? TrendingDown : TrendingUp;

  return (
    <div className={`rounded-xl border px-5 py-4 flex items-center gap-3 ${colorClasses}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="text-sm font-medium">
        El tráfico está un{" "}
        <span className="font-bold font-mono">{absPct.toFixed(0)}%</span>{" "}
        {isBelow ? "por debajo" : "por encima"} de lo normal ahora mismo.
      </p>
      <Link
        href="/intensidad"
        className="ml-auto text-xs hover:underline flex items-center gap-1 flex-shrink-0 opacity-80"
      >
        <ExternalLink className="w-3 h-3" /> Ver en directo
      </Link>
    </div>
  );
}

function ForecastStrip({ forecast }: { forecast: ForecastHour[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {forecast.map((item, idx) => (
        <div
          key={idx}
          className="flex-shrink-0 flex flex-col items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 min-w-[72px]"
        >
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {DAY_NAMES[item.dayOfWeek]}
          </span>
          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
            {padH(item.hour)}
          </span>
          <span
            className={`w-2.5 h-2.5 rounded-full ${serviceLevelDotClass(item.avgServiceLevel)}`}
            title={serviceLevelLabel(item.avgServiceLevel)}
          />
          <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
            {item.avgIntensity != null ? formatN(item.avgIntensity) : "—"}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            veh/h
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hourly distribution types + charts
// ---------------------------------------------------------------------------

interface HourlyProfile {
  hour: number;
  avgIntensity: number;
  sampleCount: number;
}

interface IncidentProfile {
  hour: number;
  incidentCount: number;
  relativeIntensity: number;
}

interface DayOfWeekEntry {
  dayOfWeek: number;
  avgIntensity: number | null;
  incidentCount: number;
}

interface DistribucionResponse {
  success: boolean;
  data: {
    sensorProfiles: HourlyProfile[];
    incidentProfiles: IncidentProfile[];
    dayOfWeekPattern: DayOfWeekEntry[];
  };
}

function intensityColor(intensity: number, peak: number): string {
  const ratio = intensity / peak;
  if (ratio < 0.3) return "var(--color-tl-300)";
  if (ratio < 0.5) return "var(--color-tl-400)";
  if (ratio < 0.7) return "var(--tl-amber-400)";
  if (ratio < 0.85) return "var(--tl-amber-500)";
  return "var(--color-red-500, #ef4444)";
}

function HourlyDistributionChart({ profiles, currentHour }: { profiles: HourlyProfile[]; currentHour: number }) {
  const peak = Math.max(...profiles.map((p) => p.avgIntensity));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={profiles} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200, #e5e7eb)" vertical={false} />
        <XAxis
          dataKey="hour"
          tickFormatter={(h: number) => `${String(h).padStart(2, "0")}h`}
          tick={{ fontSize: 11, fill: "var(--color-gray-500, #6b7280)" }}
          interval={2}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-gray-500, #6b7280)" }}
          tickFormatter={(v: number) => v.toLocaleString("es-ES")}
        />
        <Tooltip
          formatter={(value: number) => [value.toLocaleString("es-ES") + " veh/h", "Intensidad media"]}
          labelFormatter={(h: number) => `${String(h).padStart(2, "0")}:00`}
          contentStyle={{
            backgroundColor: "var(--color-gray-900, #111827)",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="avgIntensity" radius={[4, 4, 0, 0]}>
          {profiles.map((entry) => (
            <Cell
              key={entry.hour}
              fill={intensityColor(entry.avgIntensity, peak)}
              stroke={entry.hour === currentHour ? "#fff" : "none"}
              strokeWidth={entry.hour === currentHour ? 2 : 0}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DayOfWeekChart({ data }: { data: DayOfWeekEntry[] }) {
  const chartData = data.map((d) => ({
    ...d,
    dayLabel: DAY_NAMES[d.dayOfWeek],
    dayFull: DAY_NAMES_FULL[d.dayOfWeek],
  }));
  const peak = Math.max(...chartData.map((d) => d.incidentCount));

  const DOW_COLORS = [
    "var(--color-tl-300)", // Dom
    "var(--color-tl-500)", // Lun
    "var(--color-tl-500)", // Mar
    "var(--color-tl-500)", // Mié
    "var(--tl-amber-500)",  // Jue
    "var(--tl-amber-500)",  // Vie
    "var(--color-tl-300)", // Sáb
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200, #e5e7eb)" vertical={false} />
        <XAxis
          dataKey="dayLabel"
          tick={{ fontSize: 12, fill: "var(--color-gray-500, #6b7280)" }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-gray-500, #6b7280)" }}
          tickFormatter={(v: number) => (v / 1000).toFixed(0) + "K"}
        />
        <Tooltip
          formatter={(value: number) => [value.toLocaleString("es-ES") + " incidencias", "Total acumulado"]}
          labelFormatter={(_: string, payload: Array<{ payload?: { dayFull?: string } }>) =>
            payload?.[0]?.payload?.dayFull ?? ""
          }
          contentStyle={{
            backgroundColor: "var(--color-gray-900, #111827)",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="incidentCount" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={DOW_COLORS[entry.dayOfWeek] ?? "var(--color-tl-400)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface SummaryStats {
  worstHour: { hour: number; dayOfWeek: number; avgServiceLevel: number } | null;
  bestHour: { hour: number; dayOfWeek: number; avgServiceLevel: number } | null;
  busiestDay: { dayOfWeek: number; avgIntensity: number } | null;
  calmestDay: { dayOfWeek: number; avgIntensity: number } | null;
}

function deriveSummaryStats(heatmap: HeatmapCell[]): SummaryStats {
  if (!heatmap || heatmap.length === 0) {
    return { worstHour: null, bestHour: null, busiestDay: null, calmestDay: null };
  }

  // Worst and best individual cells
  let worst = heatmap[0];
  let best = heatmap[0];
  for (const cell of heatmap) {
    if ((cell.avgServiceLevel ?? 0) > (worst.avgServiceLevel ?? 0)) worst = cell;
    if ((cell.avgServiceLevel ?? 0) < (best.avgServiceLevel ?? 0)) best = cell;
  }

  // Busiest / calmest day (aggregate avg intensity across all hours)
  const byDay = new Map<number, { totalIntensity: number; count: number }>();
  for (const cell of heatmap) {
    const existing = byDay.get(cell.dayOfWeek) ?? { totalIntensity: 0, count: 0 };
    byDay.set(cell.dayOfWeek, {
      totalIntensity: existing.totalIntensity + cell.avgIntensity,
      count: existing.count + 1,
    });
  }
  const dayAverages = Array.from(byDay.entries()).map(([dow, { totalIntensity, count }]) => ({
    dayOfWeek: dow,
    avgIntensity: Math.round(totalIntensity / count),
  }));

  let busiest = dayAverages[0];
  let calmest = dayAverages[0];
  for (const d of dayAverages) {
    if (d.avgIntensity > busiest.avgIntensity) busiest = d;
    if (d.avgIntensity < calmest.avgIntensity) calmest = d;
  }

  return {
    worstHour: { hour: worst.hour, dayOfWeek: worst.dayOfWeek, avgServiceLevel: worst.avgServiceLevel },
    bestHour: { hour: best.hour, dayOfWeek: best.dayOfWeek, avgServiceLevel: best.avgServiceLevel },
    busiestDay: busiest,
    calmestDay: calmest,
  };
}

// ---------------------------------------------------------------------------
// Main content component
// ---------------------------------------------------------------------------

export default function PrediccionTraficoContent() {
  const { data: heatmapData, isLoading: loadingHeatmap } = useSWR<HeatmapResponse>(
    "/api/trafico/prediccion?mode=heatmap",
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: comparisonData, isLoading: loadingComparison } = useSWR<ComparisonResponse>(
    "/api/trafico/prediccion?mode=comparison",
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60_000 }
  );

  const { data: forecastData, isLoading: loadingForecast } = useSWR<ForecastResponse>(
    "/api/trafico/prediccion?mode=forecast&hours=6",
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300_000 }
  );

  const { data: distribucionData } = useSWR<DistribucionResponse>(
    "/api/trafico/distribucion-horaria",
    fetcher,
    { revalidateOnFocus: false }
  );

  // Current time for heatmap highlight
  const now = useMemo(() => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
    return { dayOfWeek: d.getDay(), hour: d.getHours() };
  }, []);

  const heatmap: HeatmapCell[] = heatmapData?.data?.heatmap ?? [];
  const sensorCount = heatmapData?.data?.metadata?.sensorCount ?? 6117;
  const forecast: ForecastHour[] = forecastData?.data?.forecast ?? [];
  const summary = useMemo(() => deriveSummaryStats(heatmap), [heatmap]);

  const isLoading = loadingHeatmap && loadingComparison && loadingForecast;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
          Predicción de tráfico en Madrid
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Mapa de calor de intensidad media por hora y día de la semana basado en datos
          reales de{" "}
          <span className="font-semibold font-mono text-gray-700 dark:text-gray-300">
            {formatN(sensorCount)}
          </span>{" "}
          sensores del Ayuntamiento de Madrid.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-tl-500" />
        </div>
      ) : (
        <>
          {/* "Ahora mismo" banner */}
          <div className="mb-6">
            {comparisonData?.data ? (
              <DeviationBanner data={comparisonData.data} />
            ) : (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                Cargando datos en tiempo real...
              </div>
            )}
          </div>

          {/* Forecast strip */}
          {forecast.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-tl-500" />
                Previsión próximas horas
              </h2>
              <ForecastStrip forecast={forecast} />
            </section>
          )}

          {/* Heatmap */}
          {heatmap.length > 0 && (
            <section className="mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Mapa de calor semanal
              </h2>
              <TrafficHeatmap
                data={heatmap}
                currentDayOfWeek={now.dayOfWeek}
                currentHour={now.hour}
              />
            </section>
          )}

          {/* Summary stats */}
          {(summary.worstHour || summary.busiestDay) && (
            <section className="mb-8">
              <h2 className="text-lg font-heading font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Patrones destacados
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {summary.worstHour && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Peor hora semanal
                    </p>
                    <p className="text-xl font-heading font-bold font-mono text-red-600 dark:text-red-400">
                      {padH(summary.worstHour.hour)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {DAY_NAMES_FULL[summary.worstHour.dayOfWeek]}
                    </p>
                  </div>
                )}
                {summary.bestHour && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Mejor hora semanal
                    </p>
                    <p className="text-xl font-heading font-bold font-mono text-green-600 dark:text-green-400">
                      {padH(summary.bestHour.hour)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {DAY_NAMES_FULL[summary.bestHour.dayOfWeek]}
                    </p>
                  </div>
                )}
                {summary.busiestDay && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Día más transitado
                    </p>
                    <p className="text-xl font-heading font-bold text-tl-amber-600 dark:text-tl-amber-400">
                      {DAY_NAMES_FULL[summary.busiestDay.dayOfWeek]}
                    </p>
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {formatN(summary.busiestDay.avgIntensity)} veh/h media
                    </p>
                  </div>
                )}
                {summary.calmestDay && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Día más tranquilo
                    </p>
                    <p className="text-xl font-heading font-bold text-green-600 dark:text-green-400">
                      {DAY_NAMES_FULL[summary.calmestDay.dayOfWeek]}
                    </p>
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {formatN(summary.calmestDay.avgIntensity)} veh/h media
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* Attribution */}
      <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
        <Info className="w-3 h-3 flex-shrink-0" />
        Datos: Ayuntamiento de Madrid (informo.madrid.es). Actualización cada 5 minutos.
      </p>
    </div>
  );
}
