"use client";

import { fetcher } from "@/lib/fetcher";
import { useState } from "react";
import useSWR from "swr";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Types for different data modes
export interface YearlyDataPoint {
  year: number;
  accidents: number;
  fatalities: number;
  hospitalized?: number;
}

export interface DailyDataPoint {
  day: string;
  v16: number;
  incidents: number;
  historical?: number;
}

export interface HourlyDataPoint {
  time: string;
  v16: number;
  incidents: number;
  historical?: number;
}

interface TimeSeriesChartProps {
  yearlyData?: YearlyDataPoint[];
  dailyData?: DailyDataPoint[];
  hourlyData?: HourlyDataPoint[];
  mode?: "yearly" | "realtime";
  title?: string;
  isLoading?: boolean;
}

// Fetcher for SWR

// Day name abbreviations
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_SHORT = ["D", "L", "M", "X", "J", "V", "S"];

export function TimeSeriesChart({
  yearlyData,
  dailyData,
  hourlyData,
  mode = "realtime",
  title,
  isLoading = false,
}: TimeSeriesChartProps) {
  const [viewMode, setViewMode] = useState<"hourly" | "daily">("daily");

  // Fetch real daily data if no dailyData prop provided
  const shouldFetchDaily = mode === "realtime" && !dailyData;
  const { data: dailyApiData, isLoading: dailyLoading } = useSWR(
    shouldFetchDaily ? "/api/historico/daily?days=7" : null,
    fetcher,
    { refreshInterval: 300000 } // Refresh every 5 minutes
  );

  // Fetch real hourly data if no hourlyData prop provided
  const shouldFetchHourly = mode === "realtime" && !hourlyData;
  const { data: hourlyApiData, isLoading: hourlyLoading } = useSWR(
    shouldFetchHourly ? "/api/historico/hourly?days=7" : null,
    fetcher,
    { refreshInterval: 300000 }
  );

  // Transform API daily data to chart format
  const transformedDailyData: DailyDataPoint[] | undefined = dailyApiData?.success
    ? dailyApiData.data.dailyData.map((d: { date: string; v16Count: number; incidentCount: number }) => {
        const date = new Date(d.date);
        const dayOfWeek = date.getDay();
        return {
          day: DAY_NAMES[dayOfWeek],
          v16: d.v16Count,
          incidents: d.incidentCount,
        };
      })
    : undefined;

  // Transform API hourly data to chart format (last 48 hours from weekly pattern)
  const transformedHourlyData: HourlyDataPoint[] | undefined = hourlyApiData?.success
    ? hourlyApiData.data.hourlyAverages.map((h: { hour: number; avgCount: number; avgIncidentCount?: number }) => ({
        time: `${h.hour.toString().padStart(2, "0")}:00`,
        v16: h.avgCount,
        incidents: h.avgIncidentCount ?? 0,
      }))
    : undefined;

  // Determine which data to show based on mode
  const isYearlyMode = mode === "yearly" && yearlyData && yearlyData.length > 0;
  const effectiveLoading = isLoading || dailyLoading || hourlyLoading;

  if (effectiveLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title || "Evolución Temporal"}
          </h3>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Cargando datos...</div>
        </div>
      </div>
    );
  }

  // Yearly historical data mode
  if (isYearlyMode) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title || "Evolución Anual"}
          </h3>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={yearlyData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
              formatter={(value) => [typeof value === "number" ? value.toLocaleString("es-ES") : String(value), ""]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="accidents"
              name="Accidentes"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: "#ef4444", r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="fatalities"
              name="Fallecidos"
              stroke="#6b7280"
              strokeWidth={2}
              dot={{ fill: "#6b7280", r: 4 }}
              activeDot={{ r: 6 }}
            />
            {yearlyData[0]?.hospitalized !== undefined && (
              <Line
                type="monotone"
                dataKey="hospitalized"
                name="Hospitalizados"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ fill: "#f97316", r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Real-time mode (daily/hourly) - prefer API data, then props, then show empty
  const effectiveDailyData = dailyData || transformedDailyData || [];
  const effectiveHourlyData = hourlyData || transformedHourlyData || [];
  const realtimeData =
    viewMode === "hourly" ? effectiveHourlyData : effectiveDailyData;

  // Show message if no data
  const hasNoData = realtimeData.length === 0;

  if (hasNoData) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title || "Evolución Temporal (Últimos 7 días)"}
          </h3>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <div className="text-gray-400">Sin datos históricos disponibles</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title || "Evolución Temporal (Últimos 7 días)"}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("hourly")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === "hourly"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
            }`}
          >
            Horario
          </button>
          <button
            onClick={() => setViewMode("daily")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === "daily"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
            }`}
          >
            Diario
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={realtimeData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorV16" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={viewMode === "hourly" ? "time" : "day"}
            tick={{ fontSize: 12 }}
            interval={viewMode === "hourly" ? 11 : 0}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="v16"
            name="V16 Balizas"
            stroke="#ef4444"
            fillOpacity={1}
            fill="url(#colorV16)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="incidents"
            name="Incidencias"
            stroke="#f97316"
            fillOpacity={1}
            fill="url(#colorIncidents)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="historical"
            name="Prom. Histórico"
            stroke="#9ca3af"
            fill="transparent"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
