"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  avgIntensity: number;
  avgServiceLevel: number;
  sampleCount: number;
}

export interface TrafficHeatmapProps {
  data: HeatmapCell[];
  currentDayOfWeek?: number;
  currentHour?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Monday first — Sun (0) goes at end
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  0: "Dom",
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ---------------------------------------------------------------------------
// Color mapping by avgServiceLevel
// ---------------------------------------------------------------------------

function getCellBgClass(serviceLevel: number): string {
  if (serviceLevel < 0.5) return "bg-green-100 dark:bg-green-950";
  if (serviceLevel < 1.0) return "bg-green-300 dark:bg-green-800";
  if (serviceLevel < 1.5) return "bg-tl-amber-200 dark:bg-tl-amber-900";
  if (serviceLevel < 2.0) return "bg-tl-amber-400 dark:bg-tl-amber-700";
  if (serviceLevel < 2.5) return "bg-red-300 dark:bg-red-800";
  return "bg-red-500 dark:bg-red-700";
}

function getServiceLevelLabel(serviceLevel: number): string {
  if (serviceLevel < 0.5) return "fluido";
  if (serviceLevel < 1.5) return "lento";
  if (serviceLevel < 2.5) return "retenciones";
  return "congestión";
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipState {
  dayOfWeek: number;
  hour: number;
  avgIntensity: number;
  avgServiceLevel: number;
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TrafficHeatmap({ data, currentDayOfWeek, currentHour }: TrafficHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Build lookup map: "dow:hour" → cell
  const cellMap = new Map<string, HeatmapCell>();
  for (const cell of data) {
    cellMap.set(`${cell.dayOfWeek}:${cell.hour}`, cell);
  }

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    cell: HeatmapCell
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      ...cell,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div className="w-full">
      {/* Grid — overflow-x-auto for mobile */}
      <div className="overflow-x-auto">
        <div
          style={{ minWidth: "640px" }}
          className="relative"
        >
          {/* Column headers (hours) */}
          <div className="flex pl-10 mb-1">
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex-1 text-center text-[10px] text-gray-400 dark:text-gray-500 leading-none"
              >
                {h % 2 === 0 ? h : ""}
              </div>
            ))}
          </div>

          {/* Rows (days) */}
          {DAY_ORDER.map((dow) => (
            <div key={dow} className="flex items-center mb-0.5">
              {/* Row label */}
              <div className="w-10 flex-shrink-0 text-right pr-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                {DAY_LABELS[dow]}
              </div>

              {/* Cells */}
              {HOURS.map((hour) => {
                const key = `${dow}:${hour}`;
                const cell = cellMap.get(key);
                const isCurrent = dow === currentDayOfWeek && hour === currentHour;

                if (!cell) {
                  return (
                    <div
                      key={hour}
                      className="flex-1 h-6 mx-px rounded-sm bg-gray-100 dark:bg-gray-800 opacity-40"
                    />
                  );
                }

                return (
                  <div
                    key={hour}
                    className={[
                      "flex-1 h-6 mx-px rounded-sm cursor-default transition-opacity",
                      getCellBgClass(cell.avgServiceLevel),
                      isCurrent
                        ? "ring-2 ring-tl-500 ring-offset-1 dark:ring-offset-gray-900"
                        : "motion-safe:hover:opacity-80",
                    ].join(" ")}
                    onMouseEnter={(e) => handleMouseEnter(e, cell)}
                    onMouseLeave={handleMouseLeave}
                    aria-label={`${DAY_LABELS[dow]} ${hour}:00 — ${cell.avgIntensity.toLocaleString("es-ES")} veh/h — ${getServiceLevelLabel(cell.avgServiceLevel)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium text-gray-700 dark:text-gray-300">Nivel:</span>
        {[
          { label: "Fluido", bg: "bg-green-100 dark:bg-green-950" },
          { label: "Moderado", bg: "bg-green-300 dark:bg-green-800" },
          { label: "Lento", bg: "bg-tl-amber-200 dark:bg-tl-amber-900" },
          { label: "Retenciones", bg: "bg-tl-amber-400 dark:bg-tl-amber-700" },
          { label: "Congestionado", bg: "bg-red-300 dark:bg-red-800" },
          { label: "Muy congestionado", bg: "bg-red-500 dark:bg-red-700" },
        ].map(({ label, bg }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`inline-block w-3 h-3 rounded-sm ${bg}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Tooltip (fixed-position overlay) */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-semibold">
            {DAY_LABELS[tooltip.dayOfWeek]} {String(tooltip.hour).padStart(2, "0")}:00
          </p>
          <p>
            Intensidad:{" "}
            <span className="font-mono">
              {tooltip.avgIntensity.toLocaleString("es-ES")} veh/h
            </span>
          </p>
          <p>Nivel: {getServiceLevelLabel(tooltip.avgServiceLevel)}</p>
        </div>
      )}
    </div>
  );
}
