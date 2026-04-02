import { Zap } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationEVChargers } from "@/lib/data/location-data";

interface EVChargersSectionProps {
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

const CHARGER_TYPE_LABELS: Record<string, string> = {
  AC_TYPE1: "AC Tipo 1",
  AC_TYPE2: "AC Tipo 2",
  DC_CHADEMO: "CHAdeMO",
  DC_CCS: "CCS",
  DC_CCS2: "CCS2",
  TESLA: "Tesla",
  SCHUKO: "Schuko",
  OTHER: "Otro",
};

export async function EVChargersSection({
  entity,
  limit = 10,
  spokeHref,
}: EVChargersSectionProps) {
  const { items, total, lastUpdated } = await getLocationEVChargers(
    entity,
    limit
  );

  if (items.length === 0) return null;

  return (
    <section
      id="carga-ev"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            {total} cargador{total !== 1 ? "es" : ""} EV en {entity.name}
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-tl-amber-400 shrink-0" title="Actualizado frecuentemente"></span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 font-data">
            Actualizado {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Charger list */}
      <div className="space-y-3">
        {items.map((charger) => (
          <div
            key={charger.id}
            className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
          >
            {/* Power indicator */}
            <div className="flex flex-col items-center justify-center min-w-[52px] bg-tl-50 rounded-lg p-2 border border-tl-100">
              {charger.powerKw != null ? (
                <>
                  <span className="font-data font-bold text-tl-700 text-sm leading-none">
                    {Number(charger.powerKw).toFixed(0)}
                  </span>
                  <span className="text-[9px] text-tl-500">kW</span>
                </>
              ) : (
                <Zap className="w-4 h-4 text-tl-400" />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {charger.name}
                </p>
                {/* Public badge */}
                <span
                  className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${
                    charger.isPublic
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {charger.isPublic ? "Público" : "Privado"}
                </span>
              </div>

              {/* Network */}
              {charger.network && (
                <p className="text-xs text-gray-500 mt-0.5">{charger.network}</p>
              )}

              {/* Connectors */}
              <div className="flex flex-wrap gap-1 mt-1">
                {charger.chargerTypes.map((type) => (
                  <span
                    key={type}
                    className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"
                  >
                    {CHARGER_TYPE_LABELS[type] ?? type}
                  </span>
                ))}
                {charger.connectors != null && (
                  <span className="text-[10px] text-gray-500">
                    {charger.connectors} conector
                    {charger.connectors !== 1 ? "es" : ""}
                  </span>
                )}
              </div>

              {/* Address */}
              {charger.address && (
                <p className="text-[10px] text-gray-400 mt-1 truncate">
                  {charger.address}
                  {charger.city ? `, ${charger.city}` : ""}
                </p>
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
          Ver los {total} cargadores →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: MITERD</p>
    </section>
  );
}
