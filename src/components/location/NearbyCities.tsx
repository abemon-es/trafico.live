import { MapPin } from "lucide-react";
import type { GeoEntity } from "@/lib/geo/types";
import { getLocationStats } from "@/lib/data/location-stats";
import {
  getNearbyMunicipalities,
  type NearbyCity,
} from "@/lib/data/nearby";

interface NearbyCitiesProps {
  entity: GeoEntity;
}

async function fetchNearbyCities(entity: GeoEntity): Promise<NearbyCity[]> {
  try {
    const result = await getNearbyMunicipalities(entity, 6);
    return result.cities;
  } catch {
    return [];
  }
}

function formatPopulation(pop: number): string {
  return pop.toLocaleString("es-ES");
}

function formatPrice(price: number | null): string {
  if (price == null) return "\u2014";
  return Number(price).toFixed(3);
}

function formatDistance(km: number): string {
  return `${Math.round(km)} km`;
}

function scoreColor(score: number | null): string {
  if (score == null) return "text-gray-400 dark:text-gray-500";
  return score >= 70 ? "text-signal-green" : "text-tl-amber-400";
}

export async function NearbyCities({ entity }: NearbyCitiesProps) {
  if (!entity.center) return null;

  const [cities, entityStats] = await Promise.all([
    fetchNearbyCities(entity),
    getLocationStats(
      entity.level === "municipality" || entity.level === "city"
        ? "municipality"
        : "province",
      entity.municipalityCode ?? entity.provinceCode ?? ""
    ),
  ]);

  if (cities.length === 0) return null;

  return (
    <section
      id="cercanas"
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />
        <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100">
          Ciudades cercanas
        </h2>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        Comparativa con municipios vecinos
      </p>

      {/* Table */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-800">
              <th className="text-left text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-[.12em] pb-2 pr-3">
                Ciudad
              </th>
              <th className="text-right text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-[.12em] pb-2 px-2">
                Dist.
              </th>
              <th className="text-right text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-[.12em] pb-2 px-2">
                Hab.
              </th>
              <th className="text-right text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-[.12em] pb-2 px-2">
                Incid.
              </th>
              <th className="text-right text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-[.12em] pb-2 px-2">
                Gasoil
              </th>
              <th className="text-right text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-[.12em] pb-2 pl-2">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {/* Current city row — highlighted */}
            <tr className="bg-tl-50/30 dark:bg-tl-900/20">
              <td className="py-2.5 pr-3 font-semibold text-tl-700 dark:text-tl-300">
                {entity.name} (actual)
              </td>
              <td className="py-2.5 px-2 text-right font-data text-gray-400 dark:text-gray-500">
                {"\u2014"}
              </td>
              <td className="py-2.5 px-2 text-right font-data">
                {entity.population
                  ? formatPopulation(entity.population)
                  : "\u2014"}
              </td>
              <td className="py-2.5 px-2 text-right font-data">
                {entityStats?.activeIncidentCount != null &&
                entityStats.activeIncidentCount > 0 ? (
                  <span className="font-bold text-tl-amber-500">
                    {entityStats.activeIncidentCount}
                  </span>
                ) : (
                  <span>{entityStats?.activeIncidentCount ?? "\u2014"}</span>
                )}
              </td>
              <td className="py-2.5 px-2 text-right font-data text-tl-amber-600 dark:text-tl-amber-400">
                {entityStats?.minDieselPrice != null
                  ? formatPrice(Number(entityStats.minDieselPrice))
                  : "\u2014"}
              </td>
              <td className="py-2.5 pl-2 text-right font-data text-gray-400 dark:text-gray-500">
                {"\u2014"}
              </td>
            </tr>

            {/* Nearby cities */}
            {cities.map((city) => (
              <tr key={city.slug}>
                <td className="py-2.5 pr-3">
                  <a
                    href={city.href}
                    className="text-tl-600 dark:text-tl-400 hover:underline font-medium"
                  >
                    {city.name}
                  </a>
                </td>
                <td className="py-2.5 px-2 text-right font-data text-gray-600 dark:text-gray-400">
                  {formatDistance(city.distance)}
                </td>
                <td className="py-2.5 px-2 text-right font-data text-gray-600 dark:text-gray-400">
                  {formatPopulation(city.population)}
                </td>
                <td className="py-2.5 px-2 text-right font-data">
                  {city.incidentCount != null && city.incidentCount > 0 ? (
                    <span className="font-bold text-tl-amber-500">
                      {city.incidentCount}
                    </span>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">
                      {city.incidentCount ?? "\u2014"}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-2 text-right font-data text-tl-amber-600 dark:text-tl-amber-400">
                  {formatPrice(city.minDieselPrice)}
                </td>
                <td
                  className={`py-2.5 pl-2 text-right font-data ${scoreColor(city.score)}`}
                >
                  {city.score ?? "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
