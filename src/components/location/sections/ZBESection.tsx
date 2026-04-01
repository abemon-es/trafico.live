import { Leaf } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationZBE } from "@/lib/data/location-data";

interface ZBESectionProps {
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

// Vehicle labels map for restriction display
const VEHICLE_LABELS: Record<string, string> = {
  A: "Etiqueta A",
  B: "Etiqueta B",
  C: "Etiqueta C",
  ECO: "Eco",
  ZERO: "0 emisiones",
};

const RESTRICTION_LABELS: Record<string, string> = {
  denied: "Prohibido",
  restricted: "Restringido",
  allowed: "Permitido",
};

const RESTRICTION_COLORS: Record<string, string> = {
  denied: "bg-red-100 text-red-700",
  restricted: "bg-yellow-100 text-yellow-700",
  allowed: "bg-green-100 text-green-700",
};

export async function ZBESection({
  entity,
  limit = 5,
  spokeHref,
}: ZBESectionProps) {
  const { items, total, lastUpdated } = await getLocationZBE(entity, limit);

  if (items.length === 0) return null;

  return (
    <section
      id="zbe"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-green-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            Zona{total !== 1 ? "s" : ""} de Bajas Emisiones en {entity.name}
          </h2>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 font-data">
            Actualizado {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* ZBE cards */}
      <div className="space-y-4">
        {items.map((zone) => {
          // Parse restrictions (JSON field)
          let restrictions: Record<string, string> = {};
          try {
            restrictions =
              typeof zone.restrictions === "string"
                ? JSON.parse(zone.restrictions)
                : (zone.restrictions as Record<string, string>) ?? {};
          } catch {
            // ignore parse errors
          }

          // Parse schedule
          let scheduleText: string | null = null;
          try {
            if (zone.schedule) {
              const sched =
                typeof zone.schedule === "string"
                  ? JSON.parse(zone.schedule)
                  : zone.schedule;
              if (typeof sched === "string") scheduleText = sched;
              else if (sched?.hours) scheduleText = sched.hours;
              else if (sched?.text) scheduleText = sched.text;
            }
          } catch {
            // ignore
          }

          return (
            <div
              key={zone.id}
              className="rounded-xl border border-green-100 bg-green-50 p-4"
            >
              {/* Zone name + city */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-heading font-semibold text-gray-900 text-base">
                    {zone.name}
                  </h3>
                  <p className="text-xs text-gray-500">{zone.cityName}</p>
                </div>
                {zone.fineAmount != null && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">Multa</p>
                    <p className="font-data font-semibold text-red-700">
                      {Number(zone.fineAmount).toLocaleString("es-ES")} €
                    </p>
                  </div>
                )}
              </div>

              {/* Restrictions grid */}
              {Object.keys(restrictions).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Object.entries(restrictions).map(([vehicle, status]) => (
                    <span
                      key={vehicle}
                      className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                        RESTRICTION_COLORS[status] ??
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {VEHICLE_LABELS[vehicle] ?? vehicle}:{" "}
                      {RESTRICTION_LABELS[status] ?? status}
                    </span>
                  ))}
                </div>
              )}

              {/* Schedule */}
              {scheduleText && (
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Horario:</span> {scheduleText}
                </p>
              )}

              {/* Link to full ZBE page */}
              {spokeHref && (
                <a
                  href={`/zbe/${entity.slug}`}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-medium"
                >
                  Ver detalles completos →
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA for more zones */}
      {total > limit && spokeHref && (
        <a
          href={spokeHref}
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
        >
          Ver las {total} zonas ZBE →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: DGT</p>
    </section>
  );
}
