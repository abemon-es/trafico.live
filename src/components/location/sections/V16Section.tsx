import { Radio } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationV16 } from "@/lib/data/location-data";

interface V16SectionProps {
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

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "bg-yellow-100 text-yellow-800",
  MEDIUM: "bg-orange-100 text-orange-800",
  HIGH: "bg-red-100 text-red-800",
  VERY_HIGH: "bg-red-200 text-red-900 font-semibold",
};

const MOBILITY_LABELS: Record<string, string> = {
  MOBILE: "Móvil",
  STATIONARY: "Estacionado",
  UNKNOWN: "—",
};

export async function V16Section({
  entity,
  limit = 10,
  spokeHref,
}: V16SectionProps) {
  const { items, total, lastUpdated } = await getLocationV16(entity, limit);

  if (items.length === 0) return null;

  const activeCount = items.filter((b) => b.isActive).length;

  return (
    <section
      id="balizas-v16"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            {total} baliza{total !== 1 ? "s" : ""} V16 en {entity.name}
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-signal-green shrink-0" title="Datos en tiempo real"></span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 font-data">
            Actualizado {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Active count badge */}
      {activeCount > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full text-sm font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            {activeCount} activa{activeCount !== 1 ? "s" : ""} ahora
          </span>
        </div>
      )}

      {/* Beacon list */}
      <div className="space-y-3">
        {items.map((beacon) => (
          <div
            key={beacon.id}
            className={`flex gap-3 p-3 rounded-xl border ${
              beacon.isActive
                ? "bg-orange-50 border-orange-200"
                : "bg-gray-50 border-gray-100"
            }`}
          >
            {/* Status dot */}
            <div className="flex flex-col items-center justify-start pt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  beacon.isActive
                    ? "bg-orange-500 animate-pulse"
                    : "bg-gray-300"
                }`}
              />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              {/* Road + km */}
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                {beacon.roadNumber && (
                  <span className="text-xs font-data font-semibold bg-tl-100 text-tl-800 px-2 py-0.5 rounded">
                    {beacon.roadNumber}
                    {beacon.kmPoint != null &&
                      ` km ${Number(beacon.kmPoint).toFixed(0)}`}
                  </span>
                )}
                {/* Severity badge */}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    SEVERITY_COLORS[beacon.severity] ??
                    "bg-gray-100 text-gray-700"
                  }`}
                >
                  {beacon.severity}
                </span>
              </div>

              {/* Description */}
              {beacon.description && (
                <p className="text-sm text-gray-700 line-clamp-2">
                  {beacon.description}
                </p>
              )}

              {/* Metadata row */}
              <div className="flex flex-wrap gap-2 mt-1">
                {beacon.carriageway && (
                  <span className="text-[10px] text-gray-500">
                    Calzada: {beacon.carriageway}
                  </span>
                )}
                {beacon.mobilityType && (
                  <span className="text-[10px] text-gray-500">
                    {MOBILITY_LABELS[beacon.mobilityType] ?? beacon.mobilityType}
                  </span>
                )}
                {beacon.durationSecs != null && (
                  <span className="text-[10px] text-gray-500 font-data">
                    {formatDuration(beacon.durationSecs)}
                  </span>
                )}
              </div>
            </div>

            {/* Time */}
            <div className="text-right shrink-0">
              <span className="text-xs text-gray-400 font-data">
                {formatRelativeTime(beacon.activatedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {spokeHref && total > limit && (
        <a
          href={spokeHref}
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
        >
          Ver las {total} balizas →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: DGT</p>
    </section>
  );
}
