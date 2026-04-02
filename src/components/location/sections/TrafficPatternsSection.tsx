import type { GeoEntity } from "@/lib/geo/types";
import { getDayOfWeekProfiles } from "@/lib/data/traffic-patterns";

// -----------------------------------------------------------------------
// Spanish day labels
// -----------------------------------------------------------------------

const DAY_SHORT: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mie",
  4: "Jue",
  5: "Vie",
  6: "Sab",
};

const DAY_FULL: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miercoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sabado",
};

// -----------------------------------------------------------------------
// Bar color helper (intensity-mapped)
// -----------------------------------------------------------------------

function barColor(intensity: number, globalMax: number): string {
  if (globalMax === 0) return "bg-tl-50";
  const ratio = intensity / globalMax;
  if (ratio < 0.2) return "bg-tl-50";
  if (ratio < 0.4) return "bg-tl-100";
  if (ratio < 0.6) return "bg-tl-200";
  if (ratio < 0.8) return "bg-tl-amber-200";
  return "bg-tl-amber-300";
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export async function TrafficPatternsSection({
  entity,
}: {
  entity: GeoEntity;
}) {
  const data = await getDayOfWeekProfiles(entity);

  if (!data) return null;

  // Calculate global max intensity across all days/hours
  let globalMax = 0;
  for (const day of data.days) {
    for (const h of day.hours) {
      if (h.avgIntensity > globalMax) globalMax = h.avgIntensity;
    }
  }

  if (globalMax === 0) return null;

  // Find the day with highest traffic (highest percentDiff)
  let peakDayIdx = 0;
  let peakDayDiff = -Infinity;
  let lowDayIdx = 0;
  let lowDayDiff = Infinity;
  let peakHour = 0;

  for (const day of data.days) {
    if (day.percentDiff > peakDayDiff) {
      peakDayDiff = day.percentDiff;
      peakDayIdx = day.dayOfWeek;
    }
    if (day.percentDiff < lowDayDiff) {
      lowDayDiff = day.percentDiff;
      lowDayIdx = day.dayOfWeek;
    }
  }

  // Find peak hour for the peak day
  const peakDayData = data.days.find((d) => d.dayOfWeek === peakDayIdx);
  if (peakDayData) {
    let maxH = 0;
    for (const h of peakDayData.hours) {
      if (h.avgIntensity > maxH) {
        maxH = h.avgIntensity;
        peakHour = h.hour;
      }
    }
  }

  // Reorder: Mon(1) through Sun(0)
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  const orderedDays = dayOrder
    .map((dow) => data.days.find((d) => d.dayOfWeek === dow))
    .filter(Boolean) as typeof data.days;

  return (
    <section
      id="patrones-trafico"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* A. Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-tl-100 text-tl-700 flex items-center justify-center text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-bold text-gray-900">
                Patrones de trafico
              </h2>
              <span className="w-2 h-2 rounded-full bg-tl-amber-400" />
            </div>
            <p className="text-xs text-gray-500">
              Perfil tipico por dia de la semana
            </p>
          </div>
        </div>
      </div>

      {/* B. 7-column grid of daily profiles */}
      <div className="grid grid-cols-7 gap-2">
        {orderedDays.map((day) => {
          const isHighlighted = day.dayOfWeek === peakDayIdx;
          // Ensure all 24 hours are represented
          const hourMap = new Map(day.hours.map((h) => [h.hour, h.avgIntensity]));

          return (
            <div
              key={day.dayOfWeek}
              className={`text-center ${
                isHighlighted
                  ? "border-2 border-tl-amber-200 rounded-lg p-1"
                  : "p-1"
              }`}
            >
              {/* Day label */}
              <p className="font-data text-[9px] text-gray-500 mb-1">
                {DAY_SHORT[day.dayOfWeek]}
              </p>

              {/* 24 mini bars */}
              <div className="flex items-end gap-[0.5px] h-[20px] justify-center">
                {Array.from({ length: 24 }, (_, h) => {
                  const intensity = hourMap.get(h) ?? 0;
                  const heightPct =
                    globalMax > 0
                      ? Math.max((intensity / globalMax) * 100, 2)
                      : 2;
                  return (
                    <div
                      key={h}
                      className={`w-[2px] rounded-t-[1px] ${barColor(intensity, globalMax)}`}
                      style={{ height: `${heightPct}%` }}
                      title={`${DAY_SHORT[day.dayOfWeek]} ${h}:00 — ${intensity} veh/h`}
                    />
                  );
                })}
              </div>

              {/* Percent difference badge */}
              <p
                className={`text-[9px] font-data mt-1 ${
                  day.percentDiff > 5
                    ? "text-tl-amber-500"
                    : day.percentDiff < -5
                      ? "text-signal-green"
                      : "text-gray-400"
                }`}
              >
                {day.percentDiff > 5
                  ? `+${day.percentDiff}%`
                  : day.percentDiff < -5
                    ? `${day.percentDiff}%`
                    : "Tipico"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Summary text */}
      <p className="text-[10px] text-gray-500 mt-3">
        {DAY_FULL[peakDayIdx]}: pico maximo a las {peakHour}:00 &middot;{" "}
        {DAY_FULL[lowDayIdx]}: {Math.abs(lowDayDiff)}% menos trafico que la
        media &middot; Cada barra = 1 hora (00–23)
      </p>

      {/* Attribution */}
      <p className="mt-5 text-[10px] text-gray-400">
        Fuente: Madrid Informo (sensores)
      </p>
    </section>
  );
}
