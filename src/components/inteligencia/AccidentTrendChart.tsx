"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface YearTrendItem {
  year: number;
  accidents: number;
  fatalities: number;
  hospitalized: number;
}

export interface HourDistributionItem {
  hour: number;
  accidents: number;
  fatalities: number;
}

export interface ProvinceRankingItem {
  province: string;
  provinceName: string;
  accidents: number;
  fatalities: number;
  hospitalized: number;
}

export interface WeatherBreakdownItem {
  weatherCondition: string;
  accidents: number;
  fatalities: number;
}

export interface RoadTypeBreakdownItem {
  roadType: string;
  accidents: number;
  fatalities: number;
}

export interface DayOfWeekItem {
  dayOfWeek: number;
  dayLabel: string;
  accidents: number;
  fatalities: number;
}

export interface LightConditionItem {
  lightCondition: string;
  accidents: number;
  fatalities: number;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const DAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miercoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sabado",
  7: "Domingo",
};

const ROAD_TYPE_LABELS: Record<string, string> = {
  AUTOPISTA: "Autopista",
  AUTOVIA: "Autovia",
  NACIONAL: "Nacional",
  COMARCAL: "Comarcal",
  PROVINCIAL: "Provincial",
  URBANA: "Urbana",
  OTHER: "Otros",
};

const WEATHER_LABELS: Record<string, string> = {
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

const LIGHT_LABELS: Record<string, string> = {
  daylight: "Luz diurna",
  twilight: "Crepusculo",
  night_lit: "Noche con iluminacion",
  night_unlit: "Noche sin iluminacion",
};

export function getDayLabel(day: number): string {
  return DAY_LABELS[day] ?? `Dia ${day}`;
}

export function getRoadTypeLabel(rt: string): string {
  return ROAD_TYPE_LABELS[rt] ?? rt;
}

export function getWeatherLabel(wc: string): string {
  return WEATHER_LABELS[wc.toLowerCase()] ?? wc;
}

export function getLightLabel(lc: string): string {
  return LIGHT_LABELS[lc.toLowerCase()] ?? lc;
}

// ---------------------------------------------------------------------------
// Custom Tooltips
// ---------------------------------------------------------------------------

function GenericTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (name: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((p) => (
          <p
            key={p.name}
            className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5"
          >
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: p.color }}
            />
            {formatter ? formatter(p.name) : p.name}:{" "}
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
// Year Trend Line Chart
// ---------------------------------------------------------------------------

export function YearTrendChart({
  data,
  accentColor = "var(--color-tl-500, #366cf8)",
  title,
  description,
}: {
  data: YearTrendItem[];
  accentColor?: string;
  title: string;
  description: string;
}) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {description}
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-tl-100, #dde8ff)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)
            }
            width={48}
          />
          <Tooltip
            content={
              <GenericTooltip
                formatter={(n) =>
                  n === "accidents"
                    ? "Accidentes"
                    : n === "fatalities"
                      ? "Fallecidos"
                      : "Hospitalizados"
                }
              />
            }
            cursor={{ stroke: accentColor, strokeDasharray: "3 3" }}
          />
          <Legend
            formatter={(value: string) =>
              value === "accidents"
                ? "Accidentes"
                : value === "fatalities"
                  ? "Fallecidos"
                  : "Hospitalizados"
            }
            wrapperStyle={{ fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="accidents"
            stroke={accentColor}
            strokeWidth={2.5}
            dot={{ r: 4, fill: accentColor }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="fatalities"
            stroke="var(--tl-danger, #dc2626)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--tl-danger, #dc2626)" }}
            strokeDasharray="6 3"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hour Distribution Bar Chart
// ---------------------------------------------------------------------------

export function HourDistributionChart({
  data,
  accentColor = "var(--color-tl-500, #366cf8)",
  title,
  description,
}: {
  data: HourDistributionItem[];
  accentColor?: string;
  title: string;
  description: string;
}) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    ...d,
    hourLabel: `${d.hour.toString().padStart(2, "0")}:00`,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {description}
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-tl-100, #dde8ff)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="hourLabel"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)
            }
            width={48}
          />
          <Tooltip
            content={
              <GenericTooltip
                formatter={(n) =>
                  n === "accidents" ? "Accidentes" : "Fallecidos"
                }
              />
            }
            cursor={{ fill: "rgba(27, 75, 213, 0.04)" }}
          />
          <Bar
            dataKey="accidents"
            fill={accentColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Road Type Horizontal Bar Chart
// ---------------------------------------------------------------------------

export function RoadTypeChart({
  data,
  accentColor = "var(--color-tl-500, #366cf8)",
  title,
  description,
}: {
  data: RoadTypeBreakdownItem[];
  accentColor?: string;
  title: string;
  description: string;
}) {
  if (data.length === 0) return null;

  const chartData = data
    .map((d) => ({
      ...d,
      roadTypeLabel: getRoadTypeLabel(d.roadType),
    }))
    .sort((a, b) => b.accidents - a.accidents);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {description}
      </p>
      <ResponsiveContainer
        width="100%"
        height={Math.max(200, chartData.length * 40)}
      >
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
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
            }
          />
          <YAxis
            type="category"
            dataKey="roadTypeLabel"
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            content={
              <GenericTooltip
                formatter={(n) =>
                  n === "accidents" ? "Accidentes" : "Fallecidos"
                }
              />
            }
            cursor={{ fill: "rgba(27, 75, 213, 0.04)" }}
          />
          <Legend
            formatter={(value: string) =>
              value === "accidents" ? "Accidentes" : "Fallecidos"
            }
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar
            dataKey="accidents"
            fill={accentColor}
            radius={[0, 6, 6, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="fatalities"
            fill="var(--tl-danger, #dc2626)"
            radius={[0, 6, 6, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day of Week Chart
// ---------------------------------------------------------------------------

export function DayOfWeekChart({
  data,
  accentColor = "var(--color-tl-500, #366cf8)",
  title,
  description,
}: {
  data: DayOfWeekItem[];
  accentColor?: string;
  title: string;
  description: string;
}) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100 mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {description}
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-tl-100, #dde8ff)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="dayLabel"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)
            }
            width={48}
          />
          <Tooltip
            content={
              <GenericTooltip
                formatter={(n) =>
                  n === "accidents"
                    ? "Accidentes"
                    : n === "fatalities"
                      ? "Fallecidos"
                      : n
                }
              />
            }
            cursor={{ fill: "rgba(27, 75, 213, 0.04)" }}
          />
          <Legend
            formatter={(value: string) =>
              value === "accidents"
                ? "Accidentes"
                : value === "fatalities"
                  ? "Fallecidos"
                  : value
            }
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar
            dataKey="accidents"
            fill={accentColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Bar
            dataKey="fatalities"
            fill="var(--tl-danger, #dc2626)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
