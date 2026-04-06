"use client";

import { useState, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeatmapCell {
  hour: number;
  dayOfWeek: number;
  count: number;
  fatalities: number;
}

export interface VehicleHourRow {
  hour: number;
  car: number;
  motorcycle: number;
  truck: number;
  bicycle: number;
  pedestrian: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const DAY_FULL = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Green → Yellow → Red color scale (OKLCH-compatible hex)
function getHeatColor(value: number, min: number, max: number): string {
  if (max === min) return "#e5e7eb";
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // 5-stop gradient: dark green → green → yellow → orange → red
  if (t < 0.25) {
    const p = t / 0.25;
    return interpolateColor("#059669", "#34d399", p);
  } else if (t < 0.5) {
    const p = (t - 0.25) / 0.25;
    return interpolateColor("#34d399", "#fbbf24", p);
  } else if (t < 0.75) {
    const p = (t - 0.5) / 0.25;
    return interpolateColor("#fbbf24", "#f97316", p);
  } else {
    const p = (t - 0.75) / 0.25;
    return interpolateColor("#f97316", "#dc2626", p);
  }
}

function interpolateColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Vehicle type colors
// ---------------------------------------------------------------------------

const VEHICLE_COLORS: Record<string, { color: string; label: string }> = {
  car: { color: "var(--color-tl-500, #366cf8)", label: "Turismos" },
  motorcycle: { color: "var(--color-tl-amber-400, #d48139)", label: "Motos" },
  truck: { color: "#6b7280", label: "Camiones" },
  bicycle: { color: "var(--color-tl-success, #059669)", label: "Bicicletas" },
  pedestrian: {
    color: "var(--color-tl-danger, #dc2626)",
    label: "Peatones",
  },
};

// ---------------------------------------------------------------------------
// Heatmap Component
// ---------------------------------------------------------------------------

export function AccidentHeatmap({ data }: { data: HeatmapCell[] }) {
  const [tooltip, setTooltip] = useState<{
    cell: HeatmapCell;
    x: number;
    y: number;
  } | null>(null);

  const [mode, setMode] = useState<"count" | "fatalities">("count");

  // Build lookup map
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const cell of data) {
      map.set(`${cell.dayOfWeek}-${cell.hour}`, cell);
    }
    return map;
  }, [data]);

  // Min/max for color scaling
  const { min, max } = useMemo(() => {
    const values = data.map((c) => (mode === "count" ? c.count : c.fatalities));
    return {
      min: Math.min(...values, 0),
      max: Math.max(...values, 1),
    };
  }, [data, mode]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100">
            Mapa de calor: hora x dia de la semana
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            168 celdas mostrando la distribucion de {mode === "count" ? "accidentes" : "victimas mortales"} por franja horaria y dia.
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
          <button
            onClick={() => setMode("count")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === "count"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Accidentes
          </button>
          <button
            onClick={() => setMode("fatalities")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === "fatalities"
                ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Victimas mortales
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="min-w-[700px]">
          {/* Hour labels header */}
          <div className="flex">
            <div className="w-12 shrink-0" />
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex-1 text-center text-[10px] font-mono text-gray-400 pb-1"
              >
                {String(h).padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* Rows: one per day */}
          {DAY_LABELS.map((day, dayIdx) => {
            const dayOfWeek = dayIdx + 1;
            return (
              <div key={day} className="flex items-center">
                <div className="w-12 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 pr-2 text-right">
                  {day}
                </div>
                {HOURS.map((hour) => {
                  const cell = cellMap.get(`${dayOfWeek}-${hour}`);
                  const value = cell
                    ? mode === "count"
                      ? cell.count
                      : cell.fatalities
                    : 0;
                  const bgColor = value > 0 ? getHeatColor(value, min, max) : "#f3f4f6";

                  return (
                    <div
                      key={hour}
                      className="flex-1 aspect-square m-[1px] rounded-sm cursor-pointer transition-transform hover:scale-125 hover:z-10 relative"
                      style={{ backgroundColor: bgColor }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        if (cell) {
                          setTooltip({
                            cell,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      title={
                        cell
                          ? `${DAY_FULL[dayIdx]} ${String(hour).padStart(2, "0")}:00 — ${cell.count.toLocaleString("es-ES")} accidentes, ${cell.fatalities} victimas`
                          : `${DAY_FULL[dayIdx]} ${String(hour).padStart(2, "0")}:00 — Sin datos`
                      }
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <span className="text-[10px] text-gray-400">Menor</span>
        <div className="flex h-3 rounded-full overflow-hidden">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="w-3"
              style={{
                backgroundColor: getHeatColor(i, 0, 19),
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-gray-400">Mayor</span>
      </div>

      {/* Tooltip overlay */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm whitespace-nowrap">
            <p className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {DAY_FULL[tooltip.cell.dayOfWeek - 1]}{" "}
              {String(tooltip.cell.hour).padStart(2, "0")}:00
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Accidentes:{" "}
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                {tooltip.cell.count.toLocaleString("es-ES")}
              </span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Victimas:{" "}
              <span className="font-mono font-semibold text-[var(--tl-danger)]">
                {tooltip.cell.fatalities.toLocaleString("es-ES")}
              </span>
            </p>
            {tooltip.cell.count > 0 && (
              <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                Tasa de mortalidad:{" "}
                <span className="font-mono">
                  {((tooltip.cell.fatalities / tooltip.cell.count) * 100).toFixed(2)}%
                </span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vehicle Type by Hour Chart (CSS bars)
// ---------------------------------------------------------------------------

export function VehicleByHourChart({ data }: { data: VehicleHourRow[] }) {
  if (data.length === 0) return null;

  const vehicleTypes = Object.keys(VEHICLE_COLORS) as Array<keyof typeof VEHICLE_COLORS>;

  // Find max per vehicle type for scaling
  const maxValues: Record<string, number> = {};
  for (const vt of vehicleTypes) {
    maxValues[vt] = Math.max(...data.map((d) => d[vt as keyof VehicleHourRow] as number), 1);
  }

  const [activeVehicle, setActiveVehicle] = useState<string | null>(null);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm">
      <h3 className="font-heading font-bold text-gray-900 dark:text-gray-100 mb-1">
        Tipo de vehiculo por hora del dia
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Las motos tienen su pico en horas diferentes a los camiones. Selecciona
        un tipo de vehiculo para destacarlo.
      </p>

      {/* Vehicle type selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {vehicleTypes.map((vt) => {
          const cfg = VEHICLE_COLORS[vt];
          const isActive = activeVehicle === null || activeVehicle === vt;
          return (
            <button
              key={vt}
              onClick={() =>
                setActiveVehicle(activeVehicle === vt ? null : vt)
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isActive
                  ? "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: cfg.color,
                  opacity: isActive ? 1 : 0.3,
                }}
              />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Hour bars */}
      <div className="space-y-1">
        {data.map((row) => {
          const visibleTypes =
            activeVehicle !== null ? [activeVehicle] : vehicleTypes;
          const total = visibleTypes.reduce(
            (s, vt) => s + (row[vt as keyof VehicleHourRow] as number),
            0
          );
          const maxTotal = Math.max(
            ...data.map((d) =>
              visibleTypes.reduce(
                (s, vt) => s + (d[vt as keyof VehicleHourRow] as number),
                0
              )
            ),
            1
          );

          return (
            <div key={row.hour} className="flex items-center gap-2">
              <span className="w-8 text-right text-[11px] font-mono text-gray-400 shrink-0">
                {String(row.hour).padStart(2, "0")}h
              </span>
              <div className="flex-1 flex h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                {visibleTypes.map((vt) => {
                  const value = row[vt as keyof VehicleHourRow] as number;
                  const width = maxTotal > 0 ? (value / maxTotal) * 100 : 0;
                  const cfg = VEHICLE_COLORS[vt];
                  return (
                    <div
                      key={vt}
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${width}%`,
                        backgroundColor: cfg.color,
                      }}
                      title={`${cfg.label}: ${value.toLocaleString("es-ES")}`}
                    />
                  );
                })}
              </div>
              <span className="w-16 text-right text-[11px] font-mono text-gray-500 dark:text-gray-400 shrink-0">
                {total.toLocaleString("es-ES")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
