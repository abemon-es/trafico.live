"use client";

/**
 * FlightPatternHeatmap — mapa de calor día-de-semana × hora UTC de vuelos.
 * Visualiza cuándo suele volar la aeronave a lo largo de la semana.
 */

import type { HeatmapCell } from "@/lib/aviacion/flight-grouping";

interface Props {
  cells: HeatmapCell[];
}

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function cellColor(count: number, max: number): string {
  if (count === 0) return "bg-gray-100 dark:bg-gray-800/60";
  const intensity = count / max;
  if (intensity < 0.2) return "bg-tl-100 dark:bg-tl-900/30";
  if (intensity < 0.4) return "bg-tl-200 dark:bg-tl-800/50";
  if (intensity < 0.6) return "bg-tl-400 dark:bg-tl-600";
  if (intensity < 0.8) return "bg-tl-500 dark:bg-tl-500";
  return "bg-tl-600 dark:bg-tl-400";
}

export function FlightPatternHeatmap({ cells }: Props) {
  const max = Math.max(...cells.map((c) => c.count), 1);

  if (max === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Sin datos de patrones de vuelo.
      </div>
    );
  }

  // Build 7×24 grid: rows=days, cols=hours
  const grid: HeatmapCell[][] = Array.from({ length: 7 }, (_, dow) =>
    Array.from({ length: 24 }, (_, h) => {
      const cell = cells.find((c) => c.dayOfWeek === dow && c.hour === h);
      return cell ?? { dayOfWeek: dow, hour: h, count: 0 };
    })
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        {/* Hour labels */}
        <div className="flex pl-9 mb-1">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-gray-400">
              {h % 3 === 0 ? `${h}h` : ""}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="space-y-0.5">
          {grid.map((row, dow) => (
            <div key={dow} className="flex items-center gap-0.5">
              <span className="w-8 text-[10px] text-gray-500 dark:text-gray-400 text-right pr-1.5 flex-shrink-0">
                {DAY_LABELS[dow]}
              </span>
              {row.map((cell) => (
                <div
                  key={`${cell.dayOfWeek}-${cell.hour}`}
                  className={`flex-1 h-5 rounded-sm transition-colors ${cellColor(cell.count, max)}`}
                  title={
                    cell.count > 0
                      ? `${DAY_LABELS[dow]} ${cell.hour}:00 UTC — ${cell.count} vuelo${cell.count !== 1 ? "s" : ""}`
                      : undefined
                  }
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-[10px] text-gray-400">Menos</span>
          {[0, 0.25, 0.5, 0.75, 1].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-sm ${cellColor(Math.round(i * max), max)}`}
            />
          ))}
          <span className="text-[10px] text-gray-400">Más</span>
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
          Horas en UTC. Cada celda = número de vuelos iniciados en ese bloque horario.
        </p>
      </div>
    </div>
  );
}
