"use client";

/**
 * SpeedProfileChart — perfil de velocidad a lo largo del tiempo para un vuelo.
 * Usa Recharts LineChart con tiempo en X y velocidad en km/h en Y.
 */

import {
  LineChart,
  Line,
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
  velKmh: number | null;
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
  const vel = payload[0].value;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 shadow-lg text-xs">
      <p className="text-gray-400 mb-1">{formatTime(label)} UTC</p>
      <p className="font-mono font-bold text-tl-amber-500 dark:text-tl-amber-400">
        {vel !== null ? `${Math.round(vel).toLocaleString("es-ES")} km/h` : "—"}
      </p>
    </div>
  );
}

export function SpeedProfileChart({ positions }: Props) {
  const data: DataPoint[] = positions
    .filter((p) => p.velocity !== null && !p.onGround)
    .map((p) => ({
      t: p.createdAt.getTime(),
      velKmh: p.velocity !== null ? Math.round(p.velocity * 3.6) : null,
    }));

  if (data.length < 2) {
    return (
      <div className="text-center text-sm text-gray-400 py-6">
        Sin suficientes datos de velocidad para este vuelo.
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
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
            width={44}
            unit=" km/h"
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="velKmh"
            stroke="#d48139"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "#d48139" }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
        Velocidad en km/h · Solo posiciones en vuelo · Tiempo en UTC.
      </p>
    </div>
  );
}
