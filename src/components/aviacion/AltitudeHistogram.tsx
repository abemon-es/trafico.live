"use client";

/**
 * AltitudeHistogram — histograma de altitudes de la aeronave en vuelo.
 * Usa Recharts BarChart para mostrar la distribución de altitudes en metros
 * en bins de 1000m.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AltitudeBin } from "@/lib/aviacion/flight-grouping";

interface Props {
  bins: AltitudeBin[];
}

function formatAlt(m: number): string {
  if (m >= 1000) return `${m / 1000}k m`;
  return `${m} m`;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const count = payload[0].value;
  const altFloor = label ?? 0;
  const altCeil = altFloor + 1000;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 shadow-lg text-xs">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
        {altFloor.toLocaleString("es-ES")} – {altCeil.toLocaleString("es-ES")} m
      </p>
      <p className="text-gray-600 dark:text-gray-400">
        <span className="font-mono font-bold text-tl-600 dark:text-tl-400">{count}</span>{" "}
        posiciones
      </p>
    </div>
  );
}

export function AltitudeHistogram({ bins }: Props) {
  if (bins.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Sin datos de altitud suficientes.
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={bins} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
          <XAxis
            dataKey="altitudeM"
            tickFormatter={formatAlt}
            tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(27,75,213,0.08)" }} />
          <Bar
            dataKey="count"
            fill="#366cf8"
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
        Bins de 1 000 m · Solo posiciones en vuelo (excluye en tierra) · Altitudes en metros.
      </p>
    </div>
  );
}
