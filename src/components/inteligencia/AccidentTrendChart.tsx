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

// Pure label utilities and types live in accident-labels.ts (no "use client")
// so server components can import them without crossing the RSC boundary.
// Imported here for local use and re-exported for convenience.
import {
  type YearTrendItem,
  type HourDistributionItem,
  type ProvinceRankingItem,
  type WeatherBreakdownItem,
  type RoadTypeBreakdownItem,
  type DayOfWeekItem,
  type LightConditionItem,
  getDayLabel,
  getRoadTypeLabel,
  getWeatherLabel,
  getLightLabel,
  isRainWeather,
  isClearWeather,
  isFogWeather,
  isWindWeather,
  getWeatherIconType,
} from "./accident-labels";

export type {
  YearTrendItem,
  HourDistributionItem,
  ProvinceRankingItem,
  WeatherBreakdownItem,
  RoadTypeBreakdownItem,
  DayOfWeekItem,
  LightConditionItem,
};
export {
  getDayLabel,
  getRoadTypeLabel,
  getWeatherLabel,
  getLightLabel,
  isRainWeather,
  isClearWeather,
  isFogWeather,
  isWindWeather,
  getWeatherIconType,
};

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
