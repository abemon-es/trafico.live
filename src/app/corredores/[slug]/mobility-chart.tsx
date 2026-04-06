"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MobilityDataPoint {
  date: string;
  tripCount: number;
  avgDistanceKm: number | null;
}

interface MobilityChartProps {
  data: MobilityDataPoint[];
  originCity: string;
  destCity: string;
}

export function MobilityChart({ data, originCity, destCity }: MobilityChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm">
        Sin datos de movilidad disponibles para este corredor
      </div>
    );
  }

  // Reverse to show chronological order (API returns desc)
  const chartData = [...data].reverse().map((d) => ({
    date: new Date(d.date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    }),
    viajes: d.tripCount,
  }));

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        Viajes diarios entre {originCity} y {destCity} (provincia a provincia)
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorViajes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-tl-500, #366cf8)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-tl-500, #366cf8)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            interval={Math.max(0, Math.floor(chartData.length / 8))}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "13px",
            }}
            formatter={(value: number | undefined) => [
              typeof value === "number"
                ? value.toLocaleString("es-ES")
                : "0",
              "Viajes",
            ]}
          />
          <Area
            type="monotone"
            dataKey="viajes"
            name="Viajes"
            stroke="var(--color-tl-500, #366cf8)"
            fillOpacity={1}
            fill="url(#colorViajes)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
