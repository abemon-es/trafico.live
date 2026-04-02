import { MonitorSmartphone } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationPanels } from "@/lib/data/location-data";

interface PanelsSectionProps {
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

const MESSAGE_TYPE_STYLE: Record<
  string,
  { bg: string; border: string; text: string; label: string }
> = {
  DANGER: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    label: "Peligro",
  },
  PRECAUTION: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    label: "Precaución",
  },
  INFO: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    label: "Información",
  },
  SPEED_LIMIT: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-800",
    label: "Límite velocidad",
  },
  LANE_CLOSED: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-800",
    label: "Carril cerrado",
  },
  DETOUR: {
    bg: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-800",
    label: "Desvío",
  },
  OTHER: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    label: "Aviso",
  },
};

const DEFAULT_STYLE = MESSAGE_TYPE_STYLE.OTHER;

export async function PanelsSection({
  entity,
  limit = 10,
  spokeHref,
}: PanelsSectionProps) {
  const { items, total, lastUpdated } = await getLocationPanels(entity, limit);

  if (items.length === 0) return null;

  return (
    <section
      id="paneles"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            {total} panel{total !== 1 ? "es" : ""} variable
            {total !== 1 ? "s" : ""} en {entity.name}
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-signal-green shrink-0" title="Datos en tiempo real"></span>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 font-data">
            Actualizado {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Panel cards */}
      <div className="space-y-3">
        {items.map((panel) => {
          const style = panel.messageType
            ? (MESSAGE_TYPE_STYLE[panel.messageType] ?? DEFAULT_STYLE)
            : DEFAULT_STYLE;

          return (
            <div
              key={panel.id}
              className={`rounded-xl border p-4 ${style.bg} ${style.border}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Type badge + road */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.bg} ${style.border} ${style.text}`}
                    >
                      {panel.messageType
                        ? (MESSAGE_TYPE_STYLE[panel.messageType]?.label ??
                          panel.messageType)
                        : "Aviso"}
                    </span>
                    {panel.roadNumber && (
                      <span className="text-xs font-data font-medium text-gray-600">
                        {panel.roadNumber}
                        {panel.kmPoint != null &&
                          ` km ${Number(panel.kmPoint).toFixed(0)}`}
                      </span>
                    )}
                  </div>

                  {/* Message text */}
                  {panel.message && (
                    <p className={`text-sm font-medium ${style.text}`}>
                      {panel.message}
                    </p>
                  )}

                  {/* Panel name as subtitle */}
                  {panel.name && (
                    <p className="text-xs text-gray-500 mt-0.5">{panel.name}</p>
                  )}
                </div>

                {/* Time */}
                {panel.messageStartAt && (
                  <span className="text-xs text-gray-400 font-data shrink-0">
                    {formatRelativeTime(panel.messageStartAt)}
                  </span>
                )}
              </div>
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
          Ver los {total} paneles →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: DGT</p>
    </section>
  );
}
