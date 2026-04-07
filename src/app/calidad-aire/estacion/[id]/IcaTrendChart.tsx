"use client";

/**
 * ICA trend chart — last 24h readings for a station.
 * Client component using Recharts (already in project deps).
 */

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface TrendDataPoint {
  time: string;
  ica: number;
  no2: number | null;
  pm10: number | null;
  pm25: number | null;
  o3: number | null;
}

interface IcaTrendChartProps {
  data: TrendDataPoint[];
}

const ICA_COLORS: Record<number, string> = {
  1: "#059669",
  2: "#84cc16",
  3: "#eab308",
  4: "#f97316",
  5: "#dc2626",
};

function getIcaColor(ica: number): string {
  return ICA_COLORS[ica] ?? "#6b7280";
}

function getIcaLabel(ica: number): string {
  const labels: Record<number, string> = {
    1: "Buena",
    2: "Razonablemente buena",
    3: "Regular",
    4: "Desfavorable",
    5: "Muy desfavorable",
  };
  return labels[ica] ?? `ICA ${ica}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: TrendDataPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const ica = data.ica;

  return (
    <div className="rounded-lg border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-lg p-3 text-xs">
      <div className="font-mono text-gray-500 dark:text-gray-400 mb-1.5">{label}</div>
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: getIcaColor(ica) }}
        />
        <span className="font-bold text-gray-900 dark:text-gray-100">
          ICA {ica} — {getIcaLabel(ica)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-600 dark:text-gray-400">
        {data.no2 != null && <div>NO&#x2082;: <span className="font-mono font-semibold">{data.no2.toFixed(1)}</span></div>}
        {data.pm10 != null && <div>PM10: <span className="font-mono font-semibold">{data.pm10.toFixed(1)}</span></div>}
        {data.pm25 != null && <div>PM2.5: <span className="font-mono font-semibold">{data.pm25.toFixed(1)}</span></div>}
        {data.o3 != null && <div>O&#x2083;: <span className="font-mono font-semibold">{data.o3.toFixed(1)}</span></div>}
      </div>
    </div>
  );
}

export function IcaTrendChart({ data }: IcaTrendChartProps) {
  if (data.length === 0) return null;

  // Determine dominant ICA color (most frequent)
  const icaCounts: Record<number, number> = {};
  for (const d of data) {
    if (d.ica > 0) icaCounts[d.ica] = (icaCounts[d.ica] ?? 0) + 1;
  }
  const dominantIca = Object.entries(icaCounts).sort(([, a], [, b]) => b - a)[0];
  const chartColor = dominantIca ? getIcaColor(Number(dominantIca[0])) : "#059669";

  return (
    <div className="rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 p-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="icaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              className="fill-gray-500 dark:fill-gray-400"
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 10 }}
              className="fill-gray-500 dark:fill-gray-400"
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="stepAfter"
              dataKey="ica"
              stroke={chartColor}
              strokeWidth={2}
              fill="url(#icaGradient)"
              dot={false}
              activeDot={{ r: 4, stroke: chartColor, strokeWidth: 2, fill: "white" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {[1, 2, 3, 4, 5].map((level) => (
          <div key={level} className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getIcaColor(level) }} />
            {level} {getIcaLabel(level)}
          </div>
        ))}
      </div>
    </div>
  );
}
