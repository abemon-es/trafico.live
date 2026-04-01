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
  INVIVE: "bg-purple-100 text-purple-800",
  MOTORCYCLE: "bg-orange-100 text-orange-800",
  WILDLIFE: "bg-green-100 text-green-700",
  CAMINO: "bg-yellow-100 text-yellow-800",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-yellow-50 border-yellow-200 text-yellow-800",
  medium: "bg-orange-50 border-orange-200 text-orange-800",
  high: "bg-red-50 border-red-200 text-red-800",
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
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            {total} zona{total !== 1 ? "s" : ""} de riesgo en {entity.name}
          </h2>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 font-data">
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
                  RISK_TYPE_COLORS[zone.type] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {RISK_TYPE_LABELS[zone.type] ?? zone.type}
              </span>

              {/* Location */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-data font-medium truncate">
                  <span className="text-tl-700">{zone.road}</span>
                  <span className="text-gray-500 font-normal">
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
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
        >
          Ver las {total} zonas →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: DGT</p>
    </section>
  );
}
