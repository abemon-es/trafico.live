import type { GeoEntity } from "@/lib/geo/types";
import {
  getIncidentHeatmap,
  getMonthlyIncidentTrend,
  getWeatherIncidentCorrelation,
} from "@/lib/data/location-analytics";

// -----------------------------------------------------------------------
// Spanish day/month labels
// -----------------------------------------------------------------------

const DAY_LABELS: Record<number, string> = {
  1: "L",
  2: "M",
  3: "X",
  4: "J",
  5: "V",
  6: "S",
  0: "D",
};

const DAY_NAMES_ES: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miercoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sabado",
  0: "Domingo",
};

const MONTH_ABBR = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const MONTH_LETTERS = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

// -----------------------------------------------------------------------
// Heatmap cell color helper
// -----------------------------------------------------------------------

function heatmapCellClasses(count: number): {
  className: string;
  style?: React.CSSProperties;
} {
  if (count === 0) return { className: "bg-tl-50" };
  if (count <= 2) return { className: "bg-tl-100" };
  if (count <= 4) return { className: "bg-tl-200" };
  if (count <= 6) return { className: "bg-tl-amber-200" };
  if (count <= 8) return { className: "", style: { background: "#eca66e" } };
  return { className: "bg-signal-red text-white" };
}

// -----------------------------------------------------------------------
// Day ordering: Monday(1) through Sunday(0)
// -----------------------------------------------------------------------

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export async function IntelligenceSection({
  entity,
}: {
  entity: GeoEntity;
}) {
  const [heatmap, monthlyTrend, weatherCorrelation] = await Promise.all([
    getIncidentHeatmap(entity),
    getMonthlyIncidentTrend(entity),
    getWeatherIncidentCorrelation(entity),
  ]);

  if (heatmap.total === 0) return null;

  // Build a lookup map for heatmap cells: key = "day-hour"
  const cellMap = new Map<string, number>();
  for (const cell of heatmap.cells) {
    cellMap.set(`${cell.day}-${cell.hour}`, cell.count);
  }

  // Peak period calculation
  const peakDayName = DAY_NAMES_ES[heatmap.peakDay] ?? "—";
  const peakHourEnd = Math.min(heatmap.peakHour + 2, 23);
  const peakPercentage =
    heatmap.total > 0
      ? Math.round((heatmap.peakCount / heatmap.total) * 100)
      : 0;

  // Seasonality from monthly trend
  let lowestMonth = "";
  let highestMonth = "";
  let lowestCount = Infinity;
  let highestCount = 0;
  let seasonalityDiff = 0;

  for (const m of monthlyTrend.months) {
    if (m.count < lowestCount) {
      lowestCount = m.count;
      const monthIdx = parseInt(m.month.split("-")[1], 10) - 1;
      lowestMonth = MONTH_ABBR[monthIdx] ?? m.month;
    }
    if (m.count > highestCount) {
      highestCount = m.count;
      const monthIdx = parseInt(m.month.split("-")[1], 10) - 1;
      highestMonth = MONTH_ABBR[monthIdx] ?? m.month;
    }
  }

  if (highestCount > 0 && lowestCount < Infinity) {
    seasonalityDiff = Math.round(
      ((lowestCount - highestCount) / highestCount) * 100
    );
  }

  // Monthly trend bar heights
  const maxMonthCount = Math.max(...monthlyTrend.months.map((m) => m.count), 1);
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Current month trend vs previous year
  const currentMonthData = monthlyTrend.months.find(
    (m) => m.month === currentMonthKey
  );
  const currentMonthTrend =
    currentMonthData?.prevYearCount && currentMonthData.prevYearCount > 0
      ? Math.round(
          ((currentMonthData.count - currentMonthData.prevYearCount) /
            currentMonthData.prevYearCount) *
            100
        )
      : null;

  return (
    <section
      id="inteligencia"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* A. Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-tl-100 text-tl-700 flex items-center justify-center text-sm">
            🧠
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-bold text-gray-900">
                Inteligencia de trafico
              </h2>
              <span className="w-2 h-2 rounded-full bg-tl-amber-400" />
            </div>
            <p className="text-xs text-gray-500">
              Analisis de {heatmap.total.toLocaleString("es-ES")} incidencias
              &middot; Ultimos 12 meses
            </p>
          </div>
        </div>
      </div>

      {/* B. 24x7 Heatmap */}
      <div className="mb-6">
        <p className="text-xs font-medium text-gray-600 mb-2">
          Mapa de calor &middot; Incidencias por hora y dia
        </p>

        <div
          className="overflow-x-auto"
          style={{
            display: "grid",
            gridTemplateColumns: "32px repeat(24, 1fr)",
            gap: "1px",
          }}
        >
          {/* Hour headers */}
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={`h-${h}`}
              className="text-[8px] font-data text-gray-400 text-center"
            >
              {h}
            </div>
          ))}

          {/* Data rows */}
          {DAY_ORDER.map((day) => (
            <>
              <div
                key={`label-${day}`}
                className="font-data text-[9px] text-gray-500 flex items-center"
              >
                {DAY_LABELS[day]}
              </div>
              {Array.from({ length: 24 }, (_, hour) => {
                const count = cellMap.get(`${day}-${hour}`) ?? 0;
                const { className, style } = heatmapCellClasses(count);
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={`min-h-[18px] rounded-[3px] flex items-center justify-center text-[8px] font-data hover:scale-110 transition ${className}`}
                    style={style}
                    title={`${DAY_LABELS[day]} ${hour}:00 — ${count} incidencias`}
                  >
                    {count >= 9 ? count : ""}
                  </div>
                );
              })}
            </>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1 mt-2">
          <span className="text-[8px] text-gray-400 mr-1">Menos</span>
          <div className="w-3 h-3 rounded-[2px] bg-tl-50" />
          <div className="w-3 h-3 rounded-[2px] bg-tl-100" />
          <div className="w-3 h-3 rounded-[2px] bg-tl-200" />
          <div className="w-3 h-3 rounded-[2px] bg-tl-amber-200" />
          <div
            className="w-3 h-3 rounded-[2px]"
            style={{ background: "#eca66e" }}
          />
          <div className="w-3 h-3 rounded-[2px] bg-signal-red" />
          <span className="text-[8px] text-gray-400 ml-1">Mas</span>
        </div>
      </div>

      {/* C. Cross-correlation insight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {/* 1. Peak period */}
        <div className="border-l-3 border-signal-red rounded-r-xl p-3 bg-signal-red/5">
          <p className="text-xs font-semibold text-gray-900">Periodo pico</p>
          <p className="text-sm font-data font-bold text-gray-800 mt-1">
            {peakDayName} {heatmap.peakHour}:00–{peakHourEnd}:00
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            Concentra el {peakPercentage}% de todas las incidencias semanales
          </p>
          <div className="h-[4px] bg-gray-100 rounded-full mt-2">
            <div
              className="h-full bg-signal-red rounded-full"
              style={{ width: `${Math.min(peakPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* 2. Weather correlation */}
        {weatherCorrelation.totalAlerts > 0 && (
          <div className="border-l-3 border-tl-sea-500 rounded-r-xl p-3 bg-tl-sea-50">
            <p className="text-xs font-semibold text-gray-900">
              Correlacion meteorologica
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-data text-sm font-bold text-gray-700">
                {weatherCorrelation.avgIncidentsWithout}
              </span>
              <span className="text-gray-400">&rarr;</span>
              <span className="font-data text-sm font-bold text-tl-sea-500">
                {weatherCorrelation.avgIncidentsWithAlert}
              </span>
              <span className="text-[10px] text-tl-sea-500 font-semibold">
                +{weatherCorrelation.percentageIncrease}%
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Lluvia &rarr; +{weatherCorrelation.percentageIncrease}% incidencias
              &middot; Basado en {weatherCorrelation.totalAlerts} alertas
            </p>
          </div>
        )}

        {/* 3. Road hotspot */}
        <div className="border-l-3 border-tl-amber-500 rounded-r-xl p-3 bg-tl-amber-50">
          <p className="text-xs font-semibold text-gray-900">Punto critico</p>
          <p className="text-sm font-data text-gray-700 mt-1">
            Zona con mayor concentracion de incidencias
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            Datos en mejora continua con geolocalizacion de incidentes
          </p>
        </div>

        {/* 4. Seasonality */}
        {monthlyTrend.months.length > 0 && (
          <div className="border-l-3 border-tl-600 rounded-r-xl p-3 bg-tl-50">
            <p className="text-xs font-semibold text-gray-900">Estacionalidad</p>
            <p className="text-sm font-data font-bold text-gray-800 mt-1">
              {lowestMonth}: {seasonalityDiff}% vs {highestMonth}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              {lowestMonth} registra menos incidencias que {highestMonth}
            </p>
          </div>
        )}
      </div>

      {/* D. Monthly incident trend */}
      {monthlyTrend.months.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-3">
            Tendencia mensual &middot; Incidencias
          </p>

          <div className="flex items-end gap-[3px] h-[60px]">
            {monthlyTrend.months.map((m) => {
              const heightPct =
                maxMonthCount > 0
                  ? Math.max((m.count / maxMonthCount) * 100, 2)
                  : 2;
              const isCurrent = m.month === currentMonthKey;
              return (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center justify-end h-full"
                >
                  <div
                    className={`w-full rounded-t-sm ${
                      isCurrent
                        ? "bg-tl-amber-200 border-b-2 border-tl-amber-500"
                        : "bg-tl-100"
                    }`}
                    style={{ height: `${heightPct}%` }}
                    title={`${m.month}: ${m.count} incidencias`}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex gap-[3px] mt-1">
            {monthlyTrend.months.map((m) => {
              const monthIdx = parseInt(m.month.split("-")[1], 10) - 1;
              return (
                <div
                  key={`label-${m.month}`}
                  className="flex-1 text-center text-[8px] font-data text-gray-400"
                >
                  {MONTH_LETTERS[monthIdx]}
                </div>
              );
            })}
          </div>

          {currentMonthData && (
            <p className="text-[10px] text-gray-500 mt-2">
              {MONTH_ABBR[now.getMonth()]} {now.getFullYear()}:{" "}
              {currentMonthData.count.toLocaleString("es-ES")} incidencias
              {currentMonthTrend !== null && (
                <>
                  {" "}
                  &middot;{" "}
                  <span
                    className={
                      currentMonthTrend < 0 ? "text-signal-green" : "text-signal-red"
                    }
                  >
                    {currentMonthTrend > 0 ? "+" : ""}
                    {currentMonthTrend}%
                  </span>{" "}
                  vs {MONTH_ABBR[now.getMonth()]} {now.getFullYear() - 1}
                </>
              )}
            </p>
          )}
        </div>
      )}

      {/* Attribution */}
      <p className="mt-5 text-[10px] text-gray-400">Fuente: DGT, AEMET</p>
    </section>
  );
}
