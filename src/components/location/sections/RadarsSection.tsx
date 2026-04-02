import { Radar } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationRadars } from "@/lib/data/location-data";

interface RadarsSectionProps {
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

const RADAR_TYPE_LABELS: Record<string, string> = {
  FIXED: "Fijo",
  SECTION: "Tramo",
  MOBILE_ZONE: "Zona móvil",
  TRAFFIC_LIGHT: "Semáforo",
};

const RADAR_TYPE_COLORS: Record<string, string> = {
  FIXED: "bg-red-100 text-red-800",
  SECTION: "bg-orange-100 text-orange-800",
  MOBILE_ZONE: "bg-yellow-100 text-yellow-800",
  TRAFFIC_LIGHT: "bg-blue-100 text-blue-800",
};

const DIRECTION_LABELS: Record<string, string> = {
  ASCENDING: "Creciente",
  DESCENDING: "Decreciente",
  BOTH: "Ambos",
  UNKNOWN: "—",
};

export async function RadarsSection({
  entity,
  limit = 10,
  spokeHref,
}: RadarsSectionProps) {
  const { items, total, lastUpdated } = await getLocationRadars(entity, limit);

  if (items.length === 0) return null;

  return (
    <section
      id="radares"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radar className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            {total} radar{total !== 1 ? "es" : ""} en {entity.name}
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" title="Datos estáticos"></span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 font-data">
            Actualizado {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="pb-2 pr-3 font-medium">Vía</th>
              <th className="pb-2 pr-3 font-medium font-data">Km</th>
              <th className="pb-2 pr-3 font-medium">Tipo</th>
              <th className="pb-2 pr-3 font-medium font-data">Límite</th>
              <th className="pb-2 font-medium">Sentido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((radar) => (
              <tr key={radar.id} className="text-gray-700">
                <td className="py-2 pr-3 font-data font-medium text-tl-700">
                  {radar.roadNumber}
                </td>
                <td className="py-2 pr-3 font-data text-gray-600">
                  {Number(radar.kmPoint).toFixed(1)}
                </td>
                <td className="py-2 pr-3">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full ${
                      RADAR_TYPE_COLORS[radar.type] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {RADAR_TYPE_LABELS[radar.type] ?? radar.type}
                  </span>
                </td>
                <td className="py-2 pr-3 font-data font-semibold">
                  {radar.speedLimit != null ? (
                    <span className="text-red-700">{radar.speedLimit} km/h</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-2 text-xs text-gray-500">
                  {radar.direction
                    ? (DIRECTION_LABELS[radar.direction] ?? radar.direction)
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
          Ver los {total} radares →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: DGT</p>
    </section>
  );
}
