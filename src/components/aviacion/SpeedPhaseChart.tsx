"use client";

/**
 * SpeedPhaseChart — gráfico de barras con velocidad media por fase de vuelo.
 * Fases: ascenso (vertical rate > 1.5 m/s), crucero, descenso (< -1.5 m/s).
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SpeedPhase } from "@/lib/aviacion/flight-grouping";

interface Props {
  phases: SpeedPhase[];
}

const PHASE_COLORS: Record<SpeedPhase["phase"], string> = {
  ascenso: "#34d399",
  crucero: "#366cf8",
  descenso: "#f87171",
};

const PHASE_LABELS: Record<SpeedPhase["phase"], string> = {
  ascenso: "Ascenso",
  crucero: "Crucero",
  descenso: "Descenso",
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: SpeedPhase }>;
  label?: string;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 shadow-lg text-xs">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
        {PHASE_LABELS[d.phase]}
      </p>
      <p className="text-gray-600 dark:text-gray-400">
        <span className="font-mono font-bold" style={{ color: PHASE_COLORS[d.phase] }}>
          {d.avgKmh.toLocaleString("es-ES")}
        </span>{" "}
        km/h media
      </p>
      <p className="text-gray-400 mt-0.5">
        {d.sampleCount} posiciones
      </p>
    </div>
  );
}

export function SpeedPhaseChart({ phases }: Props) {
  if (phases.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Sin datos de velocidad por fase.
      </div>
    );
  }

  const data = phases.map((p) => ({
    ...p,
    label: PHASE_LABELS[p.phase],
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v: number) => `${v}`}
            unit=" km/h"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(27,75,213,0.08)" }} />
          <Bar dataKey="avgKmh" radius={[4, 4, 0, 0]} maxBarSize={60}>
            {data.map((entry) => (
              <Cell key={entry.phase} fill={PHASE_COLORS[entry.phase]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
        Clasificación por tasa vertical: ascenso &gt;1.5 m/s, descenso &lt;−1.5 m/s, crucero = resto.
      </p>
    </div>
  );
}
