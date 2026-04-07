"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RainMultiplierItem {
  province: string;
  provinceName: string;
  rainAccidents: number;
  clearAccidents: number;
  rainFatalities: number;
  clearFatalities: number;
  multiplier: number;
}

export interface MonthlySeasonalityItem {
  month: number;
  weatherCondition: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const WEATHER_COLORS: Record<string, string> = {
  // Numeric codes (DGT microdata)
  "1": "var(--color-tl-amber-400, #d48139)",
  "2": "var(--color-tl-500, #366cf8)",
  "3": "#2563eb",
  "4": "#9ca3af",
  "5": "#94a3b8",
  "6": "#64748b",
  "7": "#6ee7b7",
  "999": "#d1d5db",
  // Legacy string keys
  clear: "var(--color-tl-amber-400, #d48139)",
  rain: "var(--color-tl-500, #366cf8)",
  fog: "#9ca3af",
  snow: "#94a3b8",
  hail: "#64748b",
  wind: "#6ee7b7",
  "buen tiempo": "var(--color-tl-amber-400, #d48139)",
  lluvia: "var(--color-tl-500, #366cf8)",
  niebla: "#9ca3af",
  nieve: "#94a3b8",
  granizo: "#64748b",
  viento: "#6ee7b7",
};

const WEATHER_LABELS: Record<string, string> = {
  // Numeric codes (DGT microdata)
  "1": "Buen tiempo",
  "2": "Lluvia debil",
  "3": "Lluvia fuerte",
  "4": "Niebla",
  "5": "Nieve",
  "6": "Granizo",
  "7": "Viento fuerte",
  "999": "Desconocido",
  // Legacy string keys
  clear: "Despejado",
  rain: "Lluvia",
  fog: "Niebla",
  snow: "Nieve",
  hail: "Granizo",
  wind: "Viento fuerte",
  "buen tiempo": "Despejado",
  lluvia: "Lluvia",
  niebla: "Niebla",
  nieve: "Nieve",
  granizo: "Granizo",
  viento: "Viento fuerte",
};

function getWeatherLabel(wc: string): string {
  return WEATHER_LABELS[wc] ?? WEATHER_LABELS[wc.toLowerCase()] ?? wc;
}

function getWeatherColor(wc: string): string {
  return WEATHER_COLORS[wc] ?? WEATHER_COLORS[wc.toLowerCase()] ?? "#6b7280";
}

// ---------------------------------------------------------------------------
// Custom Tooltips
// ---------------------------------------------------------------------------

function MultiplierTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: RainMultiplierItem;
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm max-w-xs">
      <p className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {d.provinceName}
      </p>
      <div className="space-y-1 text-gray-600 dark:text-gray-400">
        <p>
          <span className="inline-block w-3 h-3 rounded-full bg-tl-500 mr-1.5 align-middle" />
          Lluvia: <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{d.rainAccidents.toLocaleString("es-ES")}</span> accidentes
        </p>
        <p>
          <span className="inline-block w-3 h-3 rounded-full bg-tl-amber-400 mr-1.5 align-middle" />
          Despejado: <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{d.clearAccidents.toLocaleString("es-ES")}</span> accidentes
        </p>
        <p className="pt-1 border-t border-gray-100 dark:border-gray-700 font-semibold text-gray-900 dark:text-gray-100">
          Multiplicador: <span className="font-mono text-[var(--tl-danger)]">{d.multiplier}x</span>
        </p>
      </div>
    </div>
  );
}

function SeasonalityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((p) => (
          <p key={p.name} className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: p.color }}
            />
            {getWeatherLabel(p.name)}:{" "}
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
              {p.value.toLocaleString("es-ES")}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rain Multiplier Bar Chart (horizontal)
// ---------------------------------------------------------------------------

export function RainMultiplierChart({ data }: { data: RainMultiplierItem[] }) {
  if (data.length === 0) return null;

  // Show top 20 provinces for readability
  const chartData = data.slice(0, 20).reverse();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100 mb-4">
        Multiplicador de accidentes en lluvia por provincia
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Ratio de accidentes con lluvia vs. tiempo despejado. Valores superiores a 1.0 indican mayor riesgo relativo.
      </p>
      <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 32)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="var(--color-tl-100, #dde8ff)"
            strokeOpacity={0.5}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            domain={[0, "dataMax"]}
            tickFormatter={(v: number) => `${v}x`}
          />
          <YAxis
            type="category"
            dataKey="provinceName"
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            content={<MultiplierTooltip />}
            cursor={{ fill: "rgba(27, 75, 213, 0.04)" }}
          />
          <Bar
            dataKey="multiplier"
            fill="var(--color-tl-500, #366cf8)"
            radius={[0, 6, 6, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monthly Seasonality Stacked Bar Chart
// ---------------------------------------------------------------------------

export function MonthlySeasonalityChart({
  data,
  weatherConditions,
}: {
  data: MonthlySeasonalityItem[];
  weatherConditions: string[];
}) {
  if (data.length === 0) return null;

  // Pivot data: one object per month with weather conditions as keys
  const pivoted: Array<Record<string, string | number>> = MONTH_LABELS.map((label, i) => {
    const monthNum = i + 1;
    const row: Record<string, string | number> = { month: label };
    for (const wc of weatherConditions) {
      const match = data.find((d) => d.month === monthNum && d.weatherCondition === wc);
      row[wc] = match?.count ?? 0;
    }
    return row;
  });

  // Sort weather conditions by total volume (descending) for stacking order
  const sortedConditions = [...weatherConditions].sort((a, b) => {
    const totalA = data.filter((d) => d.weatherCondition === a).reduce((s, d) => s + d.count, 0);
    const totalB = data.filter((d) => d.weatherCondition === b).reduce((s, d) => s + d.count, 0);
    return totalB - totalA;
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100 mb-4">
        Estacionalidad mensual por condicion meteorologica
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Distribucion de accidentes por mes y tipo de tiempo atmosferico (2019-2023).
      </p>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={pivoted} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-tl-100, #dde8ff)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
            }
            width={48}
          />
          <Tooltip
            content={<SeasonalityTooltip />}
            cursor={{ fill: "rgba(27, 75, 213, 0.04)" }}
          />
          <Legend
            formatter={(value: string) => getWeatherLabel(value)}
            wrapperStyle={{ fontSize: 12 }}
          />
          {sortedConditions.map((wc) => (
            <Bar
              key={wc}
              dataKey={wc}
              stackId="weather"
              fill={getWeatherColor(wc)}
              radius={0}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
