import { ShieldAlert } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationRiskZones } from "@/lib/data/location-data";

interface RiskZonesSectionProps {
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

const RISK_TYPE_LABELS: Record<string, string> = {
  INVIVE: "Control velocidad",
  MOTORCYCLE: "Moto",
  WILDLIFE: "Fauna",
  CAMINO: "Camino de Santiago",
};

const RISK_TYPE_COLORS: Record<string, string> = {
  INVIVE: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200",
  MOTORCYCLE: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200",
  WILDLIFE: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  CAMINO: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200",
  medium: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200",
  high: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
};

export async function RiskZonesSection({
  entity,
  limit = 10,
  spokeHref,
}: RiskZonesSectionProps) {
  const { items, total, lastUpdated } = await getLocationRiskZones(
    entity,
    limit
  );

  if (items.length === 0) return null;

  return (
    <section
      id="zonas-riesgo"
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-tl-600 dark:text-tl-400" />
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100">
            {total} zona{total !== 1 ? "s" : ""} de riesgo en {entity.name}
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" title="Datos estáticos"></span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-data">
            Actualizado {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Risk zone list */}
      <div className="space-y-2">
        {items.map((zone) => {
          const severityKey = zone.severity?.toLowerCase() ?? "medium";
          const severityStyle =
            SEVERITY_COLORS[severityKey] ?? SEVERITY_COLORS.medium;

          return (
            <div
              key={zone.id}
              className={`flex gap-3 items-center p-3 rounded-xl border ${severityStyle}`}
            >
              {/* Type badge */}
              <span
                className={`shrink-0 text-[10px] font-medium px-2 py-1 rounded-full ${
                  RISK_TYPE_COLORS[zone.type] ?? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                {RISK_TYPE_LABELS[zone.type] ?? zone.type}
              </span>

              {/* Location */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-data font-medium truncate">
                  <span className="text-tl-700 dark:text-tl-300">{zone.road}</span>
                  <span className="text-gray-500 dark:text-gray-400 font-normal">
                    {" "}
                    km {zone.fromKm.toFixed(0)}–{zone.toKm.toFixed(0)}
                  </span>
                </p>
                {zone.description && (
                  <p className="text-xs opacity-75 mt-0.5 truncate">
                    {zone.description}
                  </p>
                )}
              </div>

              {/* Severity label */}
              {zone.severity && (
                <span className="shrink-0 text-[10px] font-semibold capitalize">
                  {zone.severity}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {spokeHref && total > limit && (
        <a
          href={spokeHref}
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300 font-medium"
        >
          Ver las {total} zonas →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400 dark:text-gray-500">Fuente: DGT</p>
    </section>
  );
}
