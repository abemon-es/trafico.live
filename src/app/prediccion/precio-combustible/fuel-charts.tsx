"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import type {
  ValueType,
  NameType,
  Payload,
} from "recharts/types/component/DefaultTooltipContent";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HistoryPoint {
  month: string; // "2024-06"
  diesel: number;
  gasolina: number;
}

export interface SeasonalityPoint {
  month: number; // 1-12
  avgDiesel: number;
  avgGasolina: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = {
  diesel: "#d97706", // tl-amber-500
  gasolina: "#1b4bd5", // tl-primary
};

const MONTH_NAMES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

// ---------------------------------------------------------------------------
// Custom tooltips
// ---------------------------------------------------------------------------

function HistoryTooltip(props: TooltipContentProps<ValueType, NameType>) {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;

  // label = "2024-06" -> "junio 2024"
  const d = new Date(String(label) + "-15");
  const formatted = d.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2 capitalize">
        {formatted}
      </p>
      {payload.map((entry: Payload<ValueType, NameType>) => {
        if (entry.value == null) return null;
        return (
          <div
            key={String(entry.dataKey)}
            className="flex items-center gap-2 mb-1"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {entry.name}:
            </span>
            <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
              {Number(entry.value).toFixed(3)}&nbsp;€/L
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SeasonalityTooltip(props: TooltipContentProps<ValueType, NameType>) {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {String(label)}
      </p>
      {payload.map((entry: Payload<ValueType, NameType>) => {
        if (entry.value == null) return null;
        return (
          <div
            key={String(entry.dataKey)}
            className="flex items-center gap-2 mb-1"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {entry.name}:
            </span>
            <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
              {Number(entry.value).toFixed(3)}&nbsp;€/L
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// History Chart (2-year monthly line chart)
// ---------------------------------------------------------------------------

export function HistoryChart({ data }: { data: HistoryPoint[] }) {
  if (!data.length) {
    return (
      <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <p className="text-gray-400 text-sm text-center py-16">
          No hay datos historicos disponibles.
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => {
    const dt = new Date(d.month + "-15");
    return {
      label: d.month,
      shortLabel: dt.toLocaleDateString("es-ES", {
        month: "short",
        year: "2-digit",
      }),
      diesel: d.diesel,
      gasolina: d.gasolina,
    };
  });

  return (
    <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">
        Evolucion del precio (ultimos 2 anos)
      </h2>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-gray-200)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="shortLabel"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `${v.toFixed(2)}€`}
            width={52}
          />
          <Tooltip
            content={(p) => (
              <HistoryTooltip
                {...(p as TooltipContentProps<ValueType, NameType>)}
              />
            )}
            cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}
          />
          <Legend
            formatter={(value: string) =>
              value === "diesel" ? "Gasoleo A" : "Gasolina 95"
            }
            wrapperStyle={{ fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="diesel"
            name="diesel"
            stroke={COLORS.diesel}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="gasolina"
            name="gasolina"
            stroke={COLORS.gasolina}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-400 mt-4 text-right">
        Medias mensuales nacionales · Fuente: CNMC
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seasonality Chart (12-month bar chart)
// ---------------------------------------------------------------------------

export function SeasonalityChart({ data }: { data: SeasonalityPoint[] }) {
  if (!data.length) {
    return (
      <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <p className="text-gray-400 text-sm text-center py-16">
          No hay datos de estacionalidad disponibles.
        </p>
      </div>
    );
  }

  // Find cheapest / most expensive months
  const dieselValues = data.map((d) => d.avgDiesel);
  const minDiesel = Math.min(...dieselValues);
  const maxDiesel = Math.max(...dieselValues);

  const chartData = data.map((d) => ({
    name: MONTH_NAMES[d.month - 1],
    diesel: d.avgDiesel,
    gasolina: d.avgGasolina,
    isCheapest: d.avgDiesel === minDiesel,
    isMostExpensive: d.avgDiesel === maxDiesel,
  }));

  return (
    <div className="bg-white dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
        Patron estacional del precio
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Media historica por mes (desde 2016). Identifica los meses mas baratos
        para repostar.
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-gray-200)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `${v.toFixed(2)}€`}
            width={52}
          />
          <Tooltip
            content={(p) => (
              <SeasonalityTooltip
                {...(p as TooltipContentProps<ValueType, NameType>)}
              />
            )}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Legend
            formatter={(value: string) =>
              value === "diesel" ? "Gasoleo A" : "Gasolina 95"
            }
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar
            dataKey="diesel"
            name="diesel"
            fill={COLORS.diesel}
            radius={[4, 4, 0, 0]}
            barSize={14}
          />
          <Bar
            dataKey="gasolina"
            name="gasolina"
            fill={COLORS.gasolina}
            radius={[4, 4, 0, 0]}
            barSize={14}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
        <span>
          Mes mas barato (diesel):{" "}
          <strong className="text-[var(--tl-success)]">
            {MONTH_NAMES[
              data[data.reduce((min, d, i, arr) => (d.avgDiesel < arr[min].avgDiesel ? i : min), 0)].month - 1
            ]}
          </strong>
        </span>
        <span>
          Mes mas caro (diesel):{" "}
          <strong className="text-[var(--tl-danger)]">
            {MONTH_NAMES[
              data[data.reduce((max, d, i, arr) => (d.avgDiesel > arr[max].avgDiesel ? i : max), 0)].month - 1
            ]}
          </strong>
        </span>
      </div>
    </div>
  );
}
