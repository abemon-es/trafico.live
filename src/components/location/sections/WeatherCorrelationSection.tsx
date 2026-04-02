import type { GeoEntity } from "@/lib/geo/types";
import { getWeatherIncidentCorrelation } from "@/lib/data/location-analytics";
import { prisma } from "@/lib/db";
import { buildWeatherWhere } from "@/lib/geo/query-builders";

// -----------------------------------------------------------------------
// Month abbreviations (Spanish)
// -----------------------------------------------------------------------

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

const WEATHER_TYPE_LABELS: Record<string, string> = {
  RAIN: "lluvia",
  SNOW: "nieve",
  ICE: "hielo",
  FOG: "niebla",
  WIND: "viento",
  TEMPERATURE: "temperatura",
  STORM: "tormenta",
  COASTAL: "costero",
  OTHER: "otro",
};

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export async function WeatherCorrelationSection({
  entity,
}: {
  entity: GeoEntity;
}) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const weatherWhere = buildWeatherWhere(entity);

  const [correlation, recentAlerts] = await Promise.all([
    getWeatherIncidentCorrelation(entity),
    prisma.weatherAlert.findMany({
      where: {
        ...weatherWhere,
        startedAt: { gte: twelveMonthsAgo },
      },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        type: true,
        startedAt: true,
      },
    }),
  ]);

  // Return null if no useful data
  if (recentAlerts.length === 0 && correlation.totalAlerts === 0) return null;

  // -----------------------------------------------------------------------
  // Group alerts by month for the frequency chart
  // -----------------------------------------------------------------------

  const now = new Date();
  const monthCounts = new Map<string, number>();

  // Initialize all 12 months
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthCounts.set(key, 0);
  }

  for (const alert of recentAlerts) {
    const d = new Date(alert.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthCounts.has(key)) {
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    }
  }

  const monthEntries = Array.from(monthCounts.entries());
  const maxMonthAlerts = Math.max(...monthEntries.map(([, c]) => c), 1);

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Alert type breakdown
  const typeCounts = new Map<string, number>();
  for (const alert of recentAlerts) {
    typeCounts.set(alert.type, (typeCounts.get(alert.type) ?? 0) + 1);
  }
  const typeBreakdown = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // Bar color intensity
  function barColorClass(count: number): string {
    if (count === 0) return "bg-tl-sea-50";
    const ratio = count / maxMonthAlerts;
    return ratio > 0.6 ? "bg-tl-sea-200" : "bg-tl-sea-100";
  }

  return (
    <section
      id="meteorologia-historica"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* A. Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-tl-sea-50 text-tl-sea-500 flex items-center justify-center text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-gray-900">
              Meteorologia &middot; Analisis historico
            </h2>
            <p className="text-xs text-gray-500">
              {recentAlerts.length.toLocaleString("es-ES")} alertas en los
              ultimos 12 meses
            </p>
          </div>
        </div>
      </div>

      {/* B. Monthly alert frequency bar chart */}
      <div className="mb-5">
        <div className="flex items-end gap-[3px] h-[50px]">
          {monthEntries.map(([key, count]) => {
            const heightPct =
              maxMonthAlerts > 0
                ? Math.max((count / maxMonthAlerts) * 100, 2)
                : 2;
            const isCurrent = key === currentMonthKey;
            return (
              <div
                key={key}
                className="flex-1 flex flex-col items-center justify-end h-full"
              >
                <div
                  className={`w-full rounded-t-sm ${barColorClass(count)} ${
                    isCurrent ? "border-b-2 border-tl-sea-500" : ""
                  }`}
                  style={{ height: `${heightPct}%` }}
                  title={`${key}: ${count} alertas`}
                />
              </div>
            );
          })}
        </div>

        {/* Month labels */}
        <div className="flex gap-[3px] mt-1">
          {monthEntries.map(([key]) => {
            const monthIdx = parseInt(key.split("-")[1], 10) - 1;
            return (
              <div
                key={`label-${key}`}
                className="flex-1 text-center text-[8px] font-data text-gray-400"
              >
                {MONTH_ABBR[monthIdx]?.charAt(0) ?? ""}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <p className="text-[10px] text-gray-500 mt-2">
          Total 12m: {recentAlerts.length} alertas
          {typeBreakdown.length > 0 && (
            <>
              {" "}
              &middot; Tipo:{" "}
              {typeBreakdown.map(([type, count], i) => (
                <span key={type}>
                  {i > 0 && " \u00B7 "}
                  {count} {WEATHER_TYPE_LABELS[type] ?? type}
                </span>
              ))}
            </>
          )}
        </p>
      </div>

      {/* C. Weather-incident correlation card */}
      {correlation.totalAlerts > 0 && correlation.percentageIncrease !== 0 && (
        <div className="bg-tl-sea-50 rounded-xl p-4 border border-tl-sea-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-tl-sea-100">
              <span className="font-data text-lg font-extrabold text-tl-sea-500">
                +{correlation.percentageIncrease}%
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Dias con alerta meteo: +{correlation.percentageIncrease}%
                incidencias vs dias sin alerta
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Media{" "}
                <span className="font-data">
                  {correlation.avgIncidentsWithAlert}
                </span>{" "}
                incid./dia con alerta vs{" "}
                <span className="font-data">
                  {correlation.avgIncidentsWithout}
                </span>{" "}
                sin alerta
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attribution */}
      <p className="mt-5 text-[10px] text-gray-400">Fuente: AEMET, DGT</p>
    </section>
  );
}
