"use client";

import { useMemo } from "react";
import useSWR from "swr";
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
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Calendar,
  Loader2,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Sun,
  Moon,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

// ─── Types ─────────────────────────────────────────────────────────────────

interface HourEntry {
  hour: number;
  count: number;
}

interface DayEntry {
  day: string;
  count: number;
}

interface AnalyticsData {
  incidentsByHour: HourEntry[];
  incidentsByDay: DayEntry[];
  totalHistoric: number;
  periodDays: number;
  generatedAt: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const DAYS_ORDER = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── FAQ data ───────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    question: "¿Cuál es la mejor hora para viajar y evitar el tráfico en España?",
    answer:
      "Las horas con menos incidencias de tráfico en España suelen ser entre las 3:00 y las 6:00 de la madrugada. Si viajas de día, los primeros tramos de la mañana (6:00–8:00) y las primeras horas de la tarde (15:00–16:00) registran menos incidencias que las horas punta.",
  },
  {
    question: "¿Qué horas punta de tráfico debo evitar en carretera?",
    answer:
      "Las horas punta en carretera en España se concentran en dos franjas: la mañana (7:00–9:00 h) y la tarde-noche (17:00–20:00 h). Los viernes por la tarde y el domingo por la tarde registran los picos más altos de la semana, especialmente en accesos a grandes ciudades.",
  },
  {
    question: "¿Qué día de la semana tiene menos tráfico en las carreteras españolas?",
    answer:
      "Según el análisis de incidencias de tráfico, el martes y el miércoles suelen ser los días con menor número de incidencias en las carreteras españolas. Los viernes, sábados y domingos concentran la mayor parte del tráfico de largo recorrido y registran más incidencias.",
  },
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-ES");
}

/**
 * Returns Tailwind classes based on intensity (0–1).
 * Green → Yellow → Orange → Red
 */
function heatmapColorClass(intensity: number): string {
  if (intensity < 0.2) return "bg-emerald-100 text-emerald-800";
  if (intensity < 0.4) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800";
  if (intensity < 0.65) return "bg-orange-200 text-orange-900";
  return "bg-red-300 text-red-900";
}

function heatmapBarFill(intensity: number): string {
  if (intensity < 0.2) return "#10b981";
  if (intensity < 0.4) return "#f59e0b";
  if (intensity < 0.65) return "#f97316";
  return "#ef4444";
}

function formatHourRange(hours: number[]): string {
  if (!hours.length) return "";
  const ranges: string[] = [];
  let start = hours[0];
  let prev = hours[0];
  for (let i = 1; i <= hours.length; i++) {
    const cur = hours[i];
    if (cur !== prev + 1) {
      ranges.push(
        start === prev
          ? formatHour(start)
          : `${formatHour(start)}–${formatHour(prev)}`
      );
      start = cur;
    }
    prev = cur;
  }
  return ranges.join(", ");
}

// ─── Insights derivation ────────────────────────────────────────────────────

interface Insights {
  bestHours: number[];
  worstHours: number[];
  bestDay: string;
  worstDay: string;
  bestDayCount: number;
  worstDayCount: number;
}

function deriveInsights(data: AnalyticsData): Insights {
  const sortedHours = [...data.incidentsByHour].sort((a, b) => a.count - b.count);
  const bestHours = sortedHours
    .slice(0, 4)
    .map((h) => h.hour)
    .sort((a, b) => a - b);
  const worstHours = sortedHours
    .slice(-4)
    .map((h) => h.hour)
    .sort((a, b) => a - b);

  const orderedDays = DAYS_ORDER.map(
    (name) =>
      data.incidentsByDay.find((d) => d.day === name) ?? { day: name, count: 0 }
  );

  const bestDayEntry = [...orderedDays].sort((a, b) => a.count - b.count)[0];
  const worstDayEntry = [...orderedDays].sort((a, b) => b.count - a.count)[0];

  return {
    bestHours,
    worstHours,
    bestDay: bestDayEntry?.day ?? "Martes",
    worstDay: worstDayEntry?.day ?? "Viernes",
    bestDayCount: bestDayEntry?.count ?? 0,
    worstDayCount: worstDayEntry?.count ?? 0,
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{children}</h2>;
}

function CustomBarTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string | number;
  labelFormatter?: (l: string | number) => string;
}) {
  if (!active || !payload?.length) return null;
  const displayLabel = labelFormatter ? labelFormatter(label ?? "") : String(label ?? "");
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-700 dark:text-gray-300">{displayLabel}</p>
      <p className="text-tl-600 dark:text-tl-400 font-semibold">
        {formatNumber(payload[0].value)} incidencias
      </p>
    </div>
  );
}

// Heatmap grid

const TIME_BLOCKS = [
  { label: "Madrugada", range: "0–5 h", hours: [0, 1, 2, 3, 4, 5] },
  { label: "Mañana", range: "6–11 h", hours: [6, 7, 8, 9, 10, 11] },
  { label: "Mediodía", range: "12–17 h", hours: [12, 13, 14, 15, 16, 17] },
  { label: "Tarde-Noche", range: "18–23 h", hours: [18, 19, 20, 21, 22, 23] },
];

function HourlyHeatmap({ data }: { data: HourEntry[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-4">
      {TIME_BLOCKS.map((block) => (
        <div key={block.label}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-28 shrink-0">
              {block.label}
            </span>
            <span className="text-xs text-gray-400">{block.range}</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {block.hours.map((h) => {
              const entry = data.find((d) => d.hour === h) ?? { hour: h, count: 0 };
              const intensity = entry.count / max;
              return (
                <div
                  key={h}
                  className={`rounded-lg p-2 text-center transition-all cursor-default ${heatmapColorClass(
                    intensity
                  )}`}
                  title={`${formatHour(h)}: ${formatNumber(entry.count)} incidencias`}
                >
                  <div className="text-xs font-bold leading-none">
                    {String(h).padStart(2, "0")}h
                  </div>
                  <div className="text-xs mt-1 font-semibold leading-none">
                    {entry.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-400">Menos incidencias</span>
        <div className="flex gap-1">
          {[
            "bg-emerald-100",
            "bg-yellow-100 dark:bg-yellow-900/30",
            "bg-orange-200",
            "bg-red-300",
          ].map((c) => (
            <div key={c} className={`w-6 h-3 rounded ${c}`} />
          ))}
        </div>
        <span className="text-xs text-gray-400">Más incidencias</span>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MejorHoraContent() {
  const { data, error, isLoading } = useSWR<AnalyticsData>(
    "/api/incidents/analytics?days=30",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300_000, // 5 min
    }
  );

  const insights = useMemo(() => {
    if (!data) return null;
    return deriveInsights(data);
  }, [data]);

  // Re-order days Mon→Sun for the bar chart
  const orderedDayData = useMemo(() => {
    if (!data) return [];
    return DAYS_ORDER.map(
      (name) =>
        data.incidentsByDay.find((d) => d.day === name) ?? {
          day: name,
          count: 0,
        }
    );
  }, [data]);

  const maxDayCount = useMemo(
    () => Math.max(...orderedDayData.map((d) => d.count), 1),
    [orderedDayData]
  );

  const maxHourCount = useMemo(
    () =>
      data ? Math.max(...data.incidentsByHour.map((d) => d.count), 1) : 1,
    [data]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Herramientas", href: "/calculadora" },
            { name: "Mejor Hora para Viajar", href: "/mejor-hora" },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-tl-50 dark:bg-tl-900/20 rounded-xl shrink-0">
              <Clock className="w-8 h-8 text-tl-600 dark:text-tl-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                Mejor Hora para Viajar
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-base leading-relaxed max-w-2xl">
                Análisis de incidencias de los últimos 30 días para ayudarte a elegir
                el momento óptimo para circular por las carreteras españolas. Los datos
                se actualizan cada 5 minutos.
              </p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin text-tl-600 dark:text-tl-400 mb-4" />
            <p>Cargando análisis de tráfico...</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <AlertTriangle className="w-10 h-10 mb-4" />
            <p className="font-medium">No se pudieron cargar los datos</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Inténtalo de nuevo en unos momentos.
            </p>
          </div>
        )}

        {data && insights && !isLoading && (
          <div className="space-y-6">
            {/* ── Callout cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Best hours */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex gap-4">
                <div className="p-2.5 bg-emerald-100 rounded-lg shrink-0 h-fit">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">
                    Mejor momento para salir
                  </p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-snug">
                    {formatHourRange(insights.bestHours)}
                  </p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Estas horas registran el menor número de incidencias en los
                    últimos 30 días.
                  </p>
                </div>
              </div>

              {/* Worst hours */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-5 flex gap-4">
                <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-lg shrink-0 h-fit">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">
                    Horas punta — evítalas
                  </p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-snug">
                    {formatHourRange(insights.worstHours)}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Máxima concentración de accidentes, obras y atascos en estas
                    franjas horarias.
                  </p>
                </div>
              </div>
            </div>

            {/* Day callout row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-4 flex items-center gap-4">
                <TrendingDown className="w-8 h-8 text-tl-600 dark:text-tl-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-tl-500 uppercase tracking-wide">
                    Día con menos incidencias
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                    {insights.bestDay}
                  </p>
                  <p className="text-sm text-tl-700 dark:text-tl-300">
                    {formatNumber(insights.bestDayCount)} incidencias (30 días)
                  </p>
                </div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-xl p-4 flex items-center gap-4">
                <TrendingUp className="w-8 h-8 text-orange-500 dark:text-orange-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-wide">
                    Día con más incidencias
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                    {insights.worstDay}
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    {formatNumber(insights.worstDayCount)} incidencias (30 días)
                  </p>
                </div>
              </div>
            </div>

            {/* ── Heatmap grid ── */}
            <SectionCard>
              <SectionTitle>
                <span className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-yellow-500" />
                  Mapa de calor por hora del día
                </span>
              </SectionTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Cada celda muestra el número de incidencias que comenzaron en esa
                franja horaria durante los últimos 30 días.{" "}
                <span className="text-emerald-700 font-medium">Verde</span> = pocas
                incidencias ·{" "}
                <span className="text-red-600 dark:text-red-400 font-medium">Rojo</span> = muchas
                incidencias.
              </p>
              <HourlyHeatmap data={data.incidentsByHour} />
            </SectionCard>

            {/* ── Hourly bar chart ── */}
            <SectionCard>
              <SectionTitle>
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  Incidencias por hora del día
                </span>
              </SectionTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Distribución detallada de las{" "}
                {formatNumber(data.totalHistoric)} incidencias registradas en los
                últimos 30 días según la hora de inicio.
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={data.incidentsByHour}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(h: number) =>
                      `${String(h).padStart(2, "0")}h`
                    }
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    interval={1}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} width={42} />
                  <Tooltip
                    content={(props) => (
                      <CustomBarTooltip
                        active={props.active}
                        payload={
                          props.payload as Array<{ value: number }> | undefined
                        }
                        label={props.label}
                        labelFormatter={(l) => formatHour(Number(l))}
                      />
                    )}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={32}>
                    {data.incidentsByHour.map((entry) => (
                      <Cell
                        key={`h-${entry.hour}`}
                        fill={heatmapBarFill(entry.count / maxHourCount)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* ── Day-of-week bar chart ── */}
            <SectionCard>
              <SectionTitle>
                <span className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  Comparativa por día de la semana
                </span>
              </SectionTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Días con mayor y menor concentración de incidencias en los
                últimos 30 días. Los colores indican el nivel de riesgo relativo.
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={orderedDayData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickFormatter={(d: string) => d.slice(0, 3)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} width={42} />
                  <Tooltip
                    content={(props) => (
                      <CustomBarTooltip
                        active={props.active}
                        payload={
                          props.payload as Array<{ value: number }> | undefined
                        }
                        label={props.label}
                      />
                    )}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={48}>
                    {orderedDayData.map((entry) => (
                      <Cell
                        key={`d-${entry.day}`}
                        fill={heatmapBarFill(entry.count / maxDayCount)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Day mini-grid */}
              <div className="mt-4 grid grid-cols-7 gap-1 text-center">
                {orderedDayData.map((d) => {
                  const intensity = d.count / maxDayCount;
                  const isWorst = d.day === insights.worstDay;
                  const isBest = d.day === insights.bestDay;
                  return (
                    <div
                      key={d.day}
                      className={`rounded-lg py-2 px-1 text-xs ${heatmapColorClass(
                        intensity
                      )} ${isWorst ? "ring-2 ring-red-400" : ""} ${
                        isBest ? "ring-2 ring-emerald-400" : ""
                      }`}
                      title={`${d.day}: ${formatNumber(d.count)} incidencias`}
                    >
                      <div className="font-bold">{d.day.slice(0, 3)}</div>
                      <div className="mt-0.5">{d.count}</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-emerald-400" />
                  Mejor día
                </span>
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-red-400" />
                  Peor día
                </span>
              </p>
            </SectionCard>

            {/* ── Recommendations ── */}
            <SectionCard>
              <SectionTitle>
                <span className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Recomendaciones basadas en los datos
                </span>
              </SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: <Moon className="w-5 h-5 text-indigo-500" />,
                    title: "Madrugada: circulación libre",
                    text: "Las horas entre las 3:00 y las 6:00 registran el tráfico más fluido. Ideal para trayectos largos si puedes adaptar el horario.",
                  },
                  {
                    icon: <Sun className="w-5 h-5 text-yellow-500" />,
                    title: "Media mañana: ventana tranquila",
                    text: "Después del pico de las 8:00, entre las 9:30 y las 11:30 el tráfico se reduce notablemente hasta el mediodía.",
                  },
                  {
                    icon: <AlertTriangle className="w-5 h-5 text-orange-500 dark:text-orange-400" />,
                    title: "Evita las horas punta urbanas",
                    text: `Las franjas ${formatHourRange(
                      insights.worstHours
                    )} concentran el mayor número de accidentes y atascos. Retrasa o adelanta tu salida siempre que sea posible.`,
                  },
                  {
                    icon: <Calendar className="w-5 h-5 text-tl-500" />,
                    title: `${insights.bestDay}: el mejor día de la semana`,
                    text: `El ${insights.bestDay.toLowerCase()} registra un ${Math.round(
                      ((insights.worstDayCount - insights.bestDayCount) /
                        insights.worstDayCount) *
                        100
                    )}% menos de incidencias que el ${insights.worstDay.toLowerCase()}, el peor día de la semana.`,
                  },
                  {
                    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
                    title: "Consulta el estado en tiempo real",
                    text: "Antes de salir, revisa el mapa de incidencias en directo para conocer el estado exacto de tu ruta.",
                  },
                  {
                    icon: <TrendingDown className="w-5 h-5 text-teal-500" />,
                    title: "Operaciones especiales: anticípate",
                    text: "Durante festivos y operaciones DGT el tráfico se dispara. Consulta el calendario de operaciones especiales para planificar con antelación.",
                  },
                ].map((tip) => (
                  <div
                    key={tip.title}
                    className="flex gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800"
                  >
                    <div className="shrink-0 mt-0.5">{tip.icon}</div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                        {tip.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                        {tip.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* ── FAQ ── */}
            <SectionCard>
              <SectionTitle>Preguntas frecuentes sobre horas punta de tráfico</SectionTitle>
              <div className="space-y-4 divide-y divide-gray-100">
                {FAQ_ITEMS.map((faq) => (
                  <details key={faq.question} className="group pt-4 first:pt-0">
                    <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                      <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                        {faq.question}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </SectionCard>

            {/* Footer note */}
            <p className="text-xs text-gray-400 text-center pb-2">
              Datos basados en incidencias de los últimos 30 días registradas por
              DGT, SCT, Euskadi y Madrid.
              {data.generatedAt
                ? ` Actualizado: ${new Date(data.generatedAt).toLocaleString(
                    "es-ES"
                  )}.`
                : ""}
            </p>
          </div>
        )}

        {/* Related links — always visible */}
        <RelatedLinks
          title="Más herramientas de tráfico"
          links={[
            {
              href: "/incidencias",
              title: "Incidencias en tiempo real",
              description:
                "Consulta todos los accidentes, obras y atascos activos ahora mismo.",
              icon: <AlertTriangle className="w-5 h-5" />,
            },
            {
              href: "/operaciones",
              title: "Operaciones especiales DGT",
              description:
                "Calendario de operaciones de tráfico en festivos y vacaciones.",
              icon: <Calendar className="w-5 h-5" />,
            },
            {
              href: "/calculadora",
              title: "Calculadora de ruta",
              description:
                "Calcula el coste en combustible y peajes de tu próximo viaje.",
              icon: <TrendingDown className="w-5 h-5" />,
            },
            {
              href: "/carreteras",
              title: "Carreteras de España",
              description:
                "Estado, estadísticas e incidencias por carretera.",
              icon: <ChevronRight className="w-5 h-5" />,
            },
          ]}
        />
      </main>
    </div>
  );
}
