"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface HourData {
  hour: number;
  intensity: number;
}

interface DowProfile {
  dow: number;
  label: string;
  hours: HourData[];
}

interface HourlyChartsProps {
  data: {
    weekdayHours: Array<{ hour: number; avg: number }>;
    weekendHours: Array<{ hour: number; avg: number }>;
    byDow: DowProfile[];
  };
}

function formatHour(h: number): string {
  return `${h.toString().padStart(2, "0")}:00`;
}

export function HourlyCharts({ data }: HourlyChartsProps) {
  // Merge weekday + weekend into single array for comparison chart
  const comparisonData = Array.from({ length: 24 }, (_, h) => ({
    hour: formatHour(h),
    "Laborable (L–V)": data.weekdayHours[h]?.avg ?? 0,
    "Fin de semana": data.weekendHours[h]?.avg ?? 0,
  }));

  // Per-day-of-week chart: 7 lines
  const dowChartData = Array.from({ length: 24 }, (_, h) => {
    const point: Record<string, number | string> = { hour: formatHour(h) };
    for (const dow of data.byDow) {
      point[dow.label] = dow.hours[h]?.intensity ?? 0;
    }
    return point;
  });

  const DOW_COLORS = [
    "#6366f1", // Dom
    "#0ea5e9", // Lun
    "#22c55e", // Mar
    "#f59e0b", // Mié
    "#f97316", // Jue
    "#ef4444", // Vie
    "#8b5cf6", // Sáb
  ];

  return (
    <>
      {/* Weekday vs Weekend comparison */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Laborable vs fin de semana
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Intensidad media en vehículos/hora promediada sobre todos los sensores de Madrid.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={comparisonData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradLV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradWE" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.15)" />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={3} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} width={40} />
            <Tooltip
              formatter={(value: number, name: string) => [`${value} veh/h`, name]}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Area
              type="monotone"
              dataKey="Laborable (L–V)"
              stroke="#0ea5e9"
              fill="url(#gradLV)"
              strokeWidth={2}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="Fin de semana"
              stroke="#f59e0b"
              fill="url(#gradWE)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Per day of week */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Perfil horario por día de la semana
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Intensidad media por hora para cada día de la semana (0 = domingo, 6 = sábado).
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dowChartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.15)" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [`${v} veh/h`]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((label, idx) => (
              <Area
                key={label}
                type="monotone"
                dataKey={label}
                stroke={DOW_COLORS[idx]}
                fill="none"
                strokeWidth={1.5}
                dot={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </section>
    </>
  );
}
