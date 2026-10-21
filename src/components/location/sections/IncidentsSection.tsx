import { AlertTriangle } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationIncidents } from "@/lib/data/location-data";

interface IncidentsSectionProps {
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

const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Bajo",
  MEDIUM: "Medio",
  HIGH: "Alto",
  VERY_HIGH: "Muy Alto",
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  ACCIDENT: "Accidente",
  ROADWORK: "Obras",
  CONGESTION: "Retención",
  HAZARD: "Peligro",
  VEHICLE_BREAKDOWN: "Avería",
  WEATHER: "Meteorología",
  EVENT: "Evento",
  CLOSURE: "Cierre",
  OTHER: "Otro",
};

export async function IncidentsSection({
  entity,
  limit = 10,
  spokeHref,
}: IncidentsSectionProps) {
  const { items, total, lastUpdated } = await getLocationIncidents(entity, limit);

  if (items.length === 0) return null;

  return (
    <section
      id="incidencias"
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-tl-600 dark:text-tl-400" />
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100">
            {total} incidencia{total !== 1 ? "s" : ""} en {entity.name}
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-signal-green shrink-0" title="Datos en tiempo real"></span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-data">
            Actualizado {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Incident list */}
      <div className="space-y-3">
        {items.map((incident) => (
          <div
            key={incident.id}
            className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
          >
            {/* Severity badge + type */}
            <div className="flex flex-col gap-1 min-w-[80px]">
              <span
                className={`inline-block text-[10px] px-2 py-0.5 rounded-full text-center ${
                  SEVERITY_COLORS[incident.severity] ?? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                {SEVERITY_LABELS[incident.severity] ?? incident.severity}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                {INCIDENT_TYPE_LABELS[incident.type] ?? incident.type}
              </span>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Road pill */}
              {incident.roadNumber && (
                <span className="inline-block text-xs font-data font-medium bg-tl-100 dark:bg-tl-900/30 text-tl-800 dark:text-tl-200 px-2 py-0.5 rounded mr-2">
                  {incident.roadNumber}
                  {incident.kmPoint != null &&
                    ` km ${Number(incident.kmPoint).toFixed(0)}`}
                </span>
              )}

              {/* Description */}
              {incident.description && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
                  {incident.description}
                </p>
              )}

              {/* Cause / management tags */}
              <div className="flex flex-wrap gap-1 mt-1">
                {incident.detailedCauseType && (
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                    {incident.detailedCauseType}
                  </span>
                )}
                {incident.managementType && (
                  <span className="text-[10px] bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                    {incident.managementType}
                  </span>
                )}
              </div>
            </div>

            {/* Timing */}
            <div className="text-right shrink-0 flex flex-col gap-1">
              <span className="text-xs text-gray-400 dark:text-gray-500 font-data">
                {formatRelativeTime(incident.startedAt)}
              </span>
              {incident.durationSecs != null && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-data">
                  {formatDuration(incident.durationSecs)}
                </span>
              )}
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
          Ver las {total} incidencias →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400 dark:text-gray-500">Fuente: DGT</p>
    </section>
  );
}
