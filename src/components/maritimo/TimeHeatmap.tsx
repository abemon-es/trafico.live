"use client";

/**
 * TimeHeatmap — day-of-week × hour-of-day temporal activity pattern
 *
 * Shows when this vessel is typically in port (based on PortCall arrivals
 * in the last 90d). Each cell = arrival count for that weekday+hour slot.
 */

interface TimeHeatmapProps {
  /** 24 rows (hour 0-23) × 7 cols (Mon=0 … Sun=6) */
  heatmap: number[][];
}

const DAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const HOUR_LABELS = ["00", "02", "04", "06", "08", "10", "12", "14", "16", "18", "20", "22"];

function cellColor(value: number, max: number): string {
  if (value === 0 || max === 0) return "bg-gray-50 dark:bg-gray-800/40";
  const intensity = value / max;
  if (intensity < 0.25) return "bg-tl-sea-100 dark:bg-tl-sea-900/30";
  if (intensity < 0.5) return "bg-tl-sea-300 dark:bg-tl-sea-700/50";
  if (intensity < 0.75) return "bg-tl-sea-500 dark:bg-tl-sea-600";
  return "bg-tl-sea-700 dark:bg-tl-sea-400";
}

export function TimeHeatmap({ heatmap }: TimeHeatmapProps) {
  const max = Math.max(...heatmap.flatMap((row) => row));

  const hasData = max > 0;

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sin datos de patron temporal disponibles (se necesitan escalas en los ultimos 90 dias).
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-tl-sea-100 dark:border-tl-sea-900/40 bg-white dark:bg-gray-900 p-6 overflow-x-auto">
      <div className="min-w-[360px]">
        {/* Day headers */}
        <div className="grid mb-1" style={{ gridTemplateColumns: "2rem repeat(7, 1fr)" }}>
          <div />
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Hour rows */}
        {heatmap.map((row, hour) => (
          <div
            key={hour}
            className="grid gap-0.5 mb-0.5"
            style={{ gridTemplateColumns: "2rem repeat(7, 1fr)" }}
          >
            {/* Hour label — only on even hours to reduce clutter */}
            <div className="flex items-center justify-end pr-1.5">
              {hour % 2 === 0 ? (
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                  {String(hour).padStart(2, "0")}h
                </span>
              ) : null}
            </div>

            {row.map((count, col) => (
              <div
                key={col}
                className={`h-5 rounded-sm transition-colors ${cellColor(count, max)}`}
                title={`${DAYS[col]} ${String(hour).padStart(2, "0")}:00 — ${count} escala${count !== 1 ? "s" : ""}`}
              />
            ))}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 justify-end">
          <span className="text-xs text-gray-400 dark:text-gray-500">Menor actividad</span>
          <div className="flex gap-1">
            {["bg-gray-50 dark:bg-gray-800/40", "bg-tl-sea-100 dark:bg-tl-sea-900/30", "bg-tl-sea-300 dark:bg-tl-sea-700/50", "bg-tl-sea-500 dark:bg-tl-sea-600", "bg-tl-sea-700 dark:bg-tl-sea-400"].map(
              (c, i) => (
                <div key={i} className={`w-4 h-4 rounded-sm ${c}`} />
              )
            )}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">Mayor actividad</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
          Hora de llegada a puerto — ultimos 90 dias
        </p>
      </div>
    </div>
  );
}
