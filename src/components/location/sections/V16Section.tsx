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
  LOW: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
  MEDIUM: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200",
  HIGH: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
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
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-tl-600 dark:text-tl-400" />
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100">
            {total} baliza{total !== 1 ? "s" : ""} V16 en {entity.name}
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-signal-green shrink-0" title="Datos en tiempo real"></span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-data">
            Actualizado {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Active count badge */}
      {activeCount > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-full text-sm font-medium">
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
                ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800"
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
                  <span className="text-xs font-data font-semibold bg-tl-100 dark:bg-tl-900/30 text-tl-800 dark:text-tl-200 px-2 py-0.5 rounded">
                    {beacon.roadNumber}
                    {beacon.kmPoint != null &&
                      ` km ${Number(beacon.kmPoint).toFixed(0)}`}
                  </span>
                )}
                {/* Severity badge */}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    SEVERITY_COLORS[beacon.severity] ??
                    "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {beacon.severity}
                </span>
              </div>

              {/* Description */}
              {beacon.description && (
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {beacon.description}
                </p>
              )}

              {/* Metadata row */}
              <div className="flex flex-wrap gap-2 mt-1">
                {beacon.carriageway && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    Calzada: {beacon.carriageway}
                  </span>
                )}
                {beacon.mobilityType && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {MOBILITY_LABELS[beacon.mobilityType] ?? beacon.mobilityType}
                  </span>
                )}
                {beacon.durationSecs != null && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-data">
                    {formatDuration(beacon.durationSecs)}
                  </span>
                )}
              </div>
            </div>

            {/* Time */}
            <div className="text-right shrink-0">
              <span className="text-xs text-gray-400 dark:text-gray-500 font-data">
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
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300 font-medium"
        >
          Ver las {total} balizas →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400 dark:text-gray-500">Fuente: DGT</p>
    </section>
  );
}
