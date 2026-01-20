"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Sample data for 7 days
const generateTimeSeriesData = () => {
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const data = [];

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h += 2) {
      // Simulate traffic patterns
      const baseV16 = 80 + Math.random() * 40;
      const baseIncidents = 30 + Math.random() * 20;

      // Rush hour peaks
      const rushHourMultiplier =
        (h >= 7 && h <= 9) || (h >= 17 && h <= 20) ? 1.5 : 1;

      // Weekend reduction
      const weekendMultiplier = d >= 5 ? 0.7 : 1;

      data.push({
        time: `${days[d]} ${h.toString().padStart(2, "0")}:00`,
        day: days[d],
        hour: h,
        v16: Math.round(baseV16 * rushHourMultiplier * weekendMultiplier),
        incidents: Math.round(baseIncidents * rushHourMultiplier * weekendMultiplier),
        historical: Math.round(75 * rushHourMultiplier * weekendMultiplier),
      });
    }
  }

  return data;
};

const timeSeriesData = generateTimeSeriesData();

// Aggregate to daily for daily view
const dailyData = [
  { day: "Lun", v16: 385, incidents: 142, historical: 350 },
  { day: "Mar", v16: 412, incidents: 156, historical: 350 },
  { day: "Mié", v16: 398, incidents: 148, historical: 350 },
  { day: "Jue", v16: 425, incidents: 162, historical: 350 },
  { day: "Vie", v16: 478, incidents: 185, historical: 380 },
  { day: "Sáb", v16: 312, incidents: 98, historical: 280 },
  { day: "Dom", v16: 289, incidents: 87, historical: 260 },
];

export function TimeSeriesChart() {
  const [viewMode, setViewMode] = useState<"hourly" | "daily">("daily");

  const data = viewMode === "hourly" ? timeSeriesData.slice(-48) : dailyData; // Last 48 hours or 7 days

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Evolución Temporal (Últimos 7 días)
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("hourly")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === "hourly"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Horario
          </button>
          <button
            onClick={() => setViewMode("daily")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === "daily"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Diario
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={data}
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
