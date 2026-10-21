import { TrendingDown } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationAccidents } from "@/lib/data/location-data";

interface AccidentsSectionProps {
  entity: GeoEntity;
  limit?: number;
  spokeHref?: string;
}

export async function AccidentsSection({
  entity,
  limit = 10,
  spokeHref,
}: AccidentsSectionProps) {
  const { items, total } = await getLocationAccidents(entity, limit);

  if (items.length === 0) return null;

  // Get latest year's aggregated data
  const years = [...new Set(items.map((i) => i.year))].sort((a, b) => b - a);
  const latestYear = years[0];
  const prevYear = years[1];

  const latestItems = items.filter((i) => i.year === latestYear);
  const prevItems = prevYear
    ? items.filter((i) => i.year === prevYear)
    : [];

  // Aggregate totals for latest year
  const latestTotals = latestItems.reduce(
    (acc, r) => ({
      accidents: acc.accidents + r.accidents,
      fatalities: acc.fatalities + r.fatalities,
      hospitalized: acc.hospitalized + r.hospitalized,
      vehiclesInvolved:
        acc.vehiclesInvolved + (r.vehiclesInvolved ?? 0),
      pedestrians: acc.pedestrians + (r.pedestrians ?? 0),
    }),
    {
      accidents: 0,
      fatalities: 0,
      hospitalized: 0,
      vehiclesInvolved: 0,
      pedestrians: 0,
    }
  );

  const prevTotals =
    prevItems.length > 0
      ? prevItems.reduce(
          (acc, r) => ({
            accidents: acc.accidents + r.accidents,
          }),
          { accidents: 0 }
        )
      : null;

  // Year-over-year change
  let yoyChange: number | null = null;
  if (prevTotals && prevTotals.accidents > 0) {
    yoyChange = Math.round(
      ((latestTotals.accidents - prevTotals.accidents) /
        prevTotals.accidents) *
        100
    );
  }

  return (
    <section
      id="accidentes"
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-tl-600 dark:text-tl-400" />
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100">
            Accidentes en {entity.name}
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" title="Datos estáticos"></span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-data">
          Datos {latestYear}
        </span>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-800">
          <p className="font-data text-2xl font-bold text-gray-900 dark:text-gray-100">
            {latestTotals.accidents.toLocaleString("es-ES")}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Accidentes</p>
          {yoyChange !== null && (
            <p
              className={`text-[10px] font-medium mt-1 ${
                yoyChange < 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {yoyChange > 0 ? "+" : ""}
              {yoyChange}% vs {prevYear}
            </p>
          )}
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center border border-red-100 dark:border-red-800">
          <p className="font-data text-2xl font-bold text-red-800 dark:text-red-200">
            {latestTotals.fatalities.toLocaleString("es-ES")}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Fallecidos</p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 text-center border border-orange-100 dark:border-orange-800">
          <p className="font-data text-2xl font-bold text-orange-800 dark:text-orange-200">
            {latestTotals.hospitalized.toLocaleString("es-ES")}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Hospitalizados</p>
        </div>

        {latestTotals.vehiclesInvolved > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center border border-blue-100 dark:border-blue-800">
            <p className="font-data text-2xl font-bold text-blue-800 dark:text-blue-200">
              {latestTotals.vehiclesInvolved.toLocaleString("es-ES")}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Vehículos</p>
          </div>
        )}

        {latestTotals.pedestrians > 0 && latestTotals.vehiclesInvolved === 0 && (
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 text-center border border-teal-100 dark:border-teal-800">
            <p className="font-data text-2xl font-bold text-teal-800 dark:text-teal-200">
              {latestTotals.pedestrians.toLocaleString("es-ES")}
            </p>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">Peatones</p>
          </div>
        )}
      </div>

      {/* Year breakdown table (if multiple years) */}
      {years.length > 1 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="pb-2 pr-3 font-medium font-data">Año</th>
                <th className="pb-2 pr-3 font-medium font-data text-right">
                  Accidentes
                </th>
                <th className="pb-2 pr-3 font-medium font-data text-right">
                  Fallecidos
                </th>
                <th className="pb-2 font-medium font-data text-right">
                  Hospitalizados
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {years.map((year) => {
                const yearItems = items.filter((i) => i.year === year);
                const totals = yearItems.reduce(
                  (acc, r) => ({
                    accidents: acc.accidents + r.accidents,
                    fatalities: acc.fatalities + r.fatalities,
                    hospitalized: acc.hospitalized + r.hospitalized,
                  }),
                  { accidents: 0, fatalities: 0, hospitalized: 0 }
                );
                return (
                  <tr key={year} className="text-gray-700 dark:text-gray-300">
                    <td className="py-2 pr-3 font-data font-semibold text-gray-900 dark:text-gray-100">
                      {year}
                    </td>
                    <td className="py-2 pr-3 font-data text-right">
                      {totals.accidents.toLocaleString("es-ES")}
                    </td>
                    <td className="py-2 pr-3 font-data text-right text-red-600 dark:text-red-400">
                      {totals.fatalities.toLocaleString("es-ES")}
                    </td>
                    <td className="py-2 font-data text-right text-orange-600 dark:text-orange-400">
                      {totals.hospitalized.toLocaleString("es-ES")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CTA */}
      {spokeHref && total > limit && (
        <a
          href={spokeHref}
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300 font-medium"
        >
          Ver estadísticas completas →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400 dark:text-gray-500">Fuente: DGT</p>
    </section>
  );
}
