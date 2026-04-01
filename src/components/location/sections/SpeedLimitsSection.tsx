import { Gauge } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationSpeedLimits } from "@/lib/data/location-data";

interface SpeedLimitsSectionProps {
  entity: GeoEntity;
  limit?: number;
  spokeHref?: string;
}

function formatRelativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

const SPEED_LIMIT_TYPE_LABELS: Record<string, string> = {
  GENERAL: "General",
  URBAN: "Urbano",
  RESIDENTIAL: "Residencial",
  SCHOOL: "Escolar",
  WORK_ZONE: "Obras",
  WEATHER: "Meteo",
  VARIABLE: "Variable",
  TUNNEL: "Túnel",
  BRIDGE: "Puente",
};

const DIRECTION_LABELS: Record<string, string> = {
  ASCENDING: "Creciente",
  DESCENDING: "Decreciente",
  BOTH: "Ambos",
  UNKNOWN: "—",
};

// Group speed limits by value for summary
function buildSummary(items: { speedLimit: number }[]): Record<number, number> {
  return items.reduce<Record<number, number>>((acc, item) => {
    acc[item.speedLimit] = (acc[item.speedLimit] ?? 0) + 1;
    return acc;
  }, {});
}

export async function SpeedLimitsSection({
  entity,
  limit = 10,
  spokeHref,
}: SpeedLimitsSectionProps) {
  const { items, total, lastUpdated } = await getLocationSpeedLimits(
    entity,
    limit
  );

  if (items.length === 0) return null;

  const summary = buildSummary(items);
  const sortedSpeeds = Object.keys(summary)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <section
      id="limites-velocidad"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            {total} límite{total !== 1 ? "s" : ""} de velocidad en {entity.name}
          </h2>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 font-data">
            Actualizado {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Speed breakdown chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {sortedSpeeds.map((speed) => (
          <div
            key={speed}
            className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <span className="font-data font-bold text-tl-700">{speed}</span>
            <span className="text-xs text-gray-500">km/h</span>
            <span className="text-[10px] text-gray-400 ml-1">
              ×{summary[speed]}
            </span>
          </div>
        ))}
      </div>

      {/* Segment table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="pb-2 pr-3 font-medium">Vía</th>
              <th className="pb-2 pr-3 font-medium font-data">Tramo km</th>
              <th className="pb-2 pr-3 font-medium font-data text-right">
                Límite
              </th>
              <th className="pb-2 pr-3 font-medium">Tipo</th>
              <th className="pb-2 font-medium">Sentido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((sl) => (
              <tr key={sl.id} className="text-gray-700">
                <td className="py-2 pr-3 font-data font-semibold text-tl-700">
                  {sl.roadNumber}
                </td>
                <td className="py-2 pr-3 font-data text-gray-600">
                  {Number(sl.kmStart).toFixed(0)}–{Number(sl.kmEnd).toFixed(0)}
                </td>
                <td className="py-2 pr-3 font-data font-bold text-right text-red-700">
                  {sl.speedLimit}
                </td>
                <td className="py-2 pr-3 text-xs text-gray-500">
                  {SPEED_LIMIT_TYPE_LABELS[sl.speedLimitType] ??
                    sl.speedLimitType}
                </td>
                <td className="py-2 text-xs text-gray-500">
                  {sl.direction
                    ? (DIRECTION_LABELS[sl.direction] ?? sl.direction)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CTA */}
      {spokeHref && total > limit && (
        <a
          href={spokeHref}
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
        >
          Ver los {total} segmentos →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: DGT</p>
    </section>
  );
}
