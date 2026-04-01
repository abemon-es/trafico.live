import { CloudRain } from "lucide-react";
import { GeoEntity } from "@/lib/geo/types";
import { getLocationWeather } from "@/lib/data/location-data";

interface WeatherSectionProps {
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

const SEVERITY_BANNER: Record<
  string,
  { bg: string; border: string; text: string; label: string }
> = {
  LOW: {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-800",
    label: "Aviso",
  },
  MEDIUM: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-800",
    label: "Alerta",
  },
  HIGH: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-800",
    label: "Alerta alta",
  },
  VERY_HIGH: {
    bg: "bg-red-100",
    border: "border-red-500",
    text: "text-red-900",
    label: "Emergencia",
  },
};

const WEATHER_TYPE_LABELS: Record<string, string> = {
  RAIN: "Lluvia",
  SNOW: "Nieve",
  ICE: "Hielo",
  FOG: "Niebla",
  WIND: "Viento",
  TEMPERATURE: "Temperatura",
  STORM: "Tormenta",
  COASTAL: "Costero",
  OTHER: "Meteorológico",
};

export async function WeatherSection({
  entity,
  limit = 10,
  spokeHref,
}: WeatherSectionProps) {
  const { items, total, lastUpdated } = await getLocationWeather(entity, limit);

  // Weather section always renders (even with no alerts — shows "no alerts" message)
  const hasAlerts = items.length > 0;

  return (
    <section
      id="meteorologia"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CloudRain className="w-5 h-5 text-tl-600" />
          <h2 className="font-heading text-lg font-bold text-gray-900">
            Alertas meteorológicas en {entity.name}
          </h2>
        </div>
        {lastUpdated && (
          <span className="text-xs text-gray-400 font-data">
            Actualizado {formatRelativeTime(lastUpdated)}
          </span>
        )}
      </div>

      {!hasAlerts ? (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
          Sin alertas meteorológicas activas
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((alert) => {
            const style =
              SEVERITY_BANNER[alert.severity] ?? SEVERITY_BANNER.LOW;
            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 ${style.bg} ${style.border}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${style.bg} ${style.border} ${style.text}`}
                      >
                        {style.label}
                      </span>
                      <span className={`text-xs font-medium ${style.text}`}>
                        {WEATHER_TYPE_LABELS[alert.type] ?? alert.type}
                      </span>
                    </div>
                    {alert.description && (
                      <p className={`text-sm ${style.text} mt-1`}>
                        {alert.description}
                      </p>
                    )}
                    <p className={`text-xs mt-1 opacity-70 ${style.text}`}>
                      {formatRelativeTime(alert.startedAt)}
                      {alert.endedAt &&
                        ` · hasta ${new Date(alert.endedAt).toLocaleTimeString(
                          "es-ES",
                          { hour: "2-digit", minute: "2-digit" }
                        )}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA */}
      {spokeHref && total > limit && (
        <a
          href={spokeHref}
          className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
        >
          Ver las {total} alertas →
        </a>
      )}

      {/* Attribution */}
      <p className="mt-4 text-[10px] text-gray-400">Fuente: AEMET</p>
    </section>
  );
}
