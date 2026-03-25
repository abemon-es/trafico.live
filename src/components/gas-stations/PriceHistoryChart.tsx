"use client";

import { useState } from "react";
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
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PriceDataPoint {
  date: string;
  avgGasoleoA?: number;
  avgGasolina95?: number;
  avgGasolina98?: number;
  minGasoleoA?: number;
  maxGasoleoA?: number;
  minGasolina95?: number;
  maxGasolina95?: number;
}

interface PriceHistoryChartProps {
  data: PriceDataPoint[];
  title?: string;
  showMinMax?: boolean;
  height?: number;
}

type TimeRange = "7d" | "30d" | "90d" | "365d";

export function PriceHistoryChart({
  data,
  title = "Evolución de precios",
  showMinMax = false,
  height = 300,
}: PriceHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [selectedFuels, setSelectedFuels] = useState({
    gasoleoA: true,
    gasolina95: true,
    gasolina98: false,
  });

  // Filter data by time range
  const now = new Date();
  const rangeMs: Record<TimeRange, number> = {
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
    "365d": 365 * 24 * 60 * 60 * 1000,
  };

  const filteredData = data.filter((d) => {
    const date = new Date(d.date);
    return now.getTime() - date.getTime() <= rangeMs[timeRange];
  });

  // Calculate trends
  const calculateTrend = (fuel: "avgGasoleoA" | "avgGasolina95" | "avgGasolina98") => {
    if (filteredData.length < 2) return null;

    const firstValid = filteredData.find((d) => d[fuel] != null)?.[fuel];
    const lastValid = [...filteredData].reverse().find((d) => d[fuel] != null)?.[fuel];

    if (firstValid == null || lastValid == null) return null;

    const change = lastValid - firstValid;
    const percentChange = (change / firstValid) * 100;

    return {
      direction: change > 0.001 ? "up" : change < -0.001 ? "down" : "flat",
      change: change.toFixed(3),
      percentChange: percentChange.toFixed(1),
    };
  };

  const trends = {
    gasoleoA: calculateTrend("avgGasoleoA"),
    gasolina95: calculateTrend("avgGasolina95"),
    gasolina98: calculateTrend("avgGasolina98"),
  };

  const TrendIcon = ({ direction }: { direction: string }) => {
    if (direction === "up") return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (direction === "down") return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  };

  const formatPrice = (value: number) => `${value.toFixed(3)}€`;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>

        {/* Time range selector */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
          {(["7d", "30d", "90d", "365d"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`
                px-3 py-1 text-xs font-medium rounded-md transition-colors
                ${timeRange === range
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100"
                }
              `}
            >
              {range === "7d" && "7 días"}
              {range === "30d" && "30 días"}
              {range === "90d" && "90 días"}
              {range === "365d" && "1 año"}
            </button>
          ))}
        </div>
      </div>

      {/* Fuel toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setSelectedFuels((f) => ({ ...f, gasoleoA: !f.gasoleoA }))}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
            ${selectedFuels.gasoleoA
              ? "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300 border border-tl-amber-200 dark:border-tl-amber-800"
              : "bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800"
            }
          `}
        >
          <span className="w-2 h-2 rounded-full bg-tl-amber-50 dark:bg-tl-amber-900/200" />
          Gasóleo A
          {trends.gasoleoA && <TrendIcon direction={trends.gasoleoA.direction} />}
        </button>
        <button
          onClick={() => setSelectedFuels((f) => ({ ...f, gasolina95: !f.gasolina95 }))}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
            ${selectedFuels.gasolina95
              ? "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800"
              : "bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800"
            }
          `}
        >
          <span className="w-2 h-2 rounded-full bg-tl-50 dark:bg-tl-900/200" />
          Gasolina 95
          {trends.gasolina95 && <TrendIcon direction={trends.gasolina95.direction} />}
        </button>
        <button
          onClick={() => setSelectedFuels((f) => ({ ...f, gasolina98: !f.gasolina98 }))}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
            ${selectedFuels.gasolina98
              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200"
              : "bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800"
            }
          `}
        >
          <span className="w-2 h-2 rounded-full bg-purple-50 dark:bg-purple-900/200" />
          Gasolina 98
          {trends.gasolina98 && <TrendIcon direction={trends.gasolina98.direction} />}
        </button>
      </div>

      {/* Chart */}
      {filteredData.length > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={filteredData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              tickFormatter={formatPrice}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
              domain={["auto", "auto"]}
              width={60}
            />
            <Tooltip
              formatter={(value, name) => {
                const numValue = typeof value === "number" ? value : 0;
                const strName = String(name);
                return [
                  formatPrice(numValue),
                  strName === "avgGasoleoA"
                    ? "Gasóleo A"
                    : strName === "avgGasolina95"
                    ? "Gasolina 95"
                    : "Gasolina 98",
                ];
              }}
              labelFormatter={(label: string) =>
                new Date(label).toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              }
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Legend
              formatter={(value: string) =>
                value === "avgGasoleoA"
                  ? "Gasóleo A"
                  : value === "avgGasolina95"
                  ? "Gasolina 95"
                  : "Gasolina 98"
              }
            />

            {selectedFuels.gasoleoA && (
              <Line
                type="monotone"
                dataKey="avgGasoleoA"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            {selectedFuels.gasolina95 && (
              <Line
                type="monotone"
                dataKey="avgGasolina95"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            {selectedFuels.gasolina98 && (
              <Line
                type="monotone"
                dataKey="avgGasolina98"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
          No hay datos disponibles para el período seleccionado
        </div>
      )}

      {/* Trend summary */}
      {filteredData.length > 1 && (
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {selectedFuels.gasoleoA && trends.gasoleoA && (
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gasóleo A</div>
              <div
                className={`text-sm font-medium ${
                  trends.gasoleoA.direction === "up"
                    ? "text-red-600 dark:text-red-400"
                    : trends.gasoleoA.direction === "down"
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {trends.gasoleoA.direction === "up" ? "+" : ""}
                {trends.gasoleoA.change}€ ({trends.gasoleoA.percentChange}%)
              </div>
            </div>
          )}
          {selectedFuels.gasolina95 && trends.gasolina95 && (
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gasolina 95</div>
              <div
                className={`text-sm font-medium ${
                  trends.gasolina95.direction === "up"
                    ? "text-red-600 dark:text-red-400"
                    : trends.gasolina95.direction === "down"
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {trends.gasolina95.direction === "up" ? "+" : ""}
                {trends.gasolina95.change}€ ({trends.gasolina95.percentChange}%)
              </div>
            </div>
          )}
          {selectedFuels.gasolina98 && trends.gasolina98 && (
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gasolina 98</div>
              <div
                className={`text-sm font-medium ${
                  trends.gasolina98.direction === "up"
                    ? "text-red-600 dark:text-red-400"
                    : trends.gasolina98.direction === "down"
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {trends.gasolina98.direction === "up" ? "+" : ""}
                {trends.gasolina98.change}€ ({trends.gasolina98.percentChange}%)
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
