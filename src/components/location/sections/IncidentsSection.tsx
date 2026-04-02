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
  LOW: "bg-yellow-100 text-yellow-800",
  MEDIUM: "bg-orange-100 text-orange-800",
  HIGH: "bg-red-100 text-red-800",
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
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            {total} incidencia{total !== 1 ? "s" : ""} en {entity.name}
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-signal-green shrink-0" title="Datos en tiempo real"></span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 font-data">
            Actualizado {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Incident list */}
      <div className="space-y-3">
        {items.map((incident) => (
          <div
            key={incident.id}
            className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
          >
            {/* Severity badge + type */}
            <div className="flex flex-col gap-1 min-w-[80px]">
              <span
                className={`inline-block text-[10px] px-2 py-0.5 rounded-full text-center ${
                  SEVERITY_COLORS[incident.severity] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {SEVERITY_LABELS[incident.severity] ?? incident.severity}
              </span>
              <span className="text-[10px] text-gray-500 text-center">
                {INCIDENT_TYPE_LABELS[incident.type] ?? incident.type}
              </span>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Road pill */}
              {incident.roadNumber && (
                <span className="inline-block text-xs font-data font-medium bg-tl-100 text-tl-800 px-2 py-0.5 rounded mr-2">
                  {incident.roadNumber}
                  {incident.kmPoint != null &&
                    ` km ${Number(incident.kmPoint).toFixed(0)}`}
                </span>
              )}

              {/* Description */}
              {incident.description && (
                <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                  {incident.description}
                </p>
              )}

              {/* Cause / management tags */}
              <div className="flex flex-wrap gap-1 mt-1">
                {incident.detailedCauseType && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                    {incident.detailedCauseType}
                  </span>
                )}
                {incident.managementType && (
                  <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                    {incident.managementType}
                  </span>
                )}
              </div>
            </div>

            {/* Timing */}
            <div className="text-right shrink-0 flex flex-col gap-1">
              <span className="text-xs text-gray-400 font-data">
                {formatRelativeTime(incident.startedAt)}
              </span>
              {incident.durationSecs != null && (
                <span className="text-[10px] text-gray-400 font-data">
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
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
        >
          Ver las {total} incidencias →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: DGT</p>
    </section>
  );
}
