"use client";

/**
 * AltitudeProfileChart — perfil de altitud a lo largo del tiempo para un vuelo.
 * Usa Recharts AreaChart con tiempo en X y altitud en metros en Y.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RawPosition } from "@/lib/aviacion/flight-grouping";

interface Props {
  positions: RawPosition[];
}

interface DataPoint {
  t: number;
  altM: number | null;
  label: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null;
  const altM = payload[0].value;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 shadow-lg text-xs">
      <p className="text-gray-400 mb-1">{formatTime(label)} UTC</p>
      <p className="font-mono font-bold text-tl-600 dark:text-tl-400">
        {altM !== null ? `${Math.round(altM).toLocaleString("es-ES")} m` : "—"}
      </p>
    </div>
  );
}

export function AltitudeProfileChart({ positions }: Props) {
  const data: DataPoint[] = positions
    .filter((p) => p.altitude !== null)
    .map((p) => ({
      t: p.createdAt.getTime(),
      altM: p.altitude !== null ? Math.round(p.altitude * 0.3048) : null,
      label: formatTime(p.createdAt.getTime()),
    }));

  if (data.length < 2) {
    return (
      <div className="text-center text-sm text-gray-400 py-6">
        Sin suficientes datos de altitud para este vuelo.
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="altGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#366cf8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#366cf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatTime}
            tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
            axisLine={false}
            tickLine={false}
            scale="time"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            unit="m"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="altM"
            stroke="#366cf8"
            strokeWidth={1.5}
            fill="url(#altGrad)"
            dot={false}
            activeDot={{ r: 3, fill: "#366cf8" }}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
        Altitud en metros (MSL) · Tiempo en UTC.
      </p>
    </div>
  );
}
