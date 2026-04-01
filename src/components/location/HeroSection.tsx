import type { GeoEntity } from "@/lib/geo/types";
import { getLocationStats } from "@/lib/data/location-stats";
import { AlertTriangle, Camera, Fuel, Zap, CloudRain, Activity } from "lucide-react";

interface HeroSectionProps {
  entity: GeoEntity;
}

/** Map LocationLevel to the scopeType string used by LocationStats */
function toScopeType(level: GeoEntity["level"]): string {
  switch (level) {
    case "community":
      return "community";
    case "province":
      return "province";
    case "municipality":
    case "city":
      return "municipality";
    case "road":
      return "road";
    default:
      return "province";
  }
}

/** Pick the most specific code for the entity */
function toScopeCode(entity: GeoEntity): string {
  return (
    entity.municipalityCode ??
    entity.provinceCode ??
    entity.communityCode ??
    entity.roadId ??
    ""
  );
}

export async function HeroSection({ entity }: HeroSectionProps) {
  const scopeType = toScopeType(entity.level);
  const scopeCode = toScopeCode(entity);

  const stats = await getLocationStats(scopeType, scopeCode);

  const incidents = stats?.activeIncidentCount ?? 0;
  const weatherAlerts = stats?.activeWeatherAlerts ?? 0;

  // Health score: 100 - (incidents * 4) - (weatherAlerts * 8), clamped 0–100
  const score = Math.max(0, Math.min(100, 100 - incidents * 4 - weatherAlerts * 8));

  const scoreColor =
    score >= 80 ? "text-signal-green" : score >= 40 ? "text-tl-amber-400" : "text-signal-red";
  const scoreBg =
    score >= 80 ? "stroke-signal-green" : score >= 40 ? "stroke-tl-amber-400" : "stroke-signal-red";
  const scoreLabel =
    score >= 80
      ? "Fluido"
      : score >= 60
        ? "Con retenciones leves"
        : score >= 40
          ? "Con incidencias"
          : score >= 20
            ? "Tráfico complicado"
            : "Tráfico crítico";

  // SVG circle circumference for r=34: 2 * π * 34 ≈ 213.6
  const CIRCUMFERENCE = 213.6;
  const dashArray = `${(score / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`;

  const now = new Date();
  const timeStr = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  return (
    <section id="hero" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Title + live badge */}
        <div className="flex-1">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">
            Tráfico en {entity.name} Hoy
          </h1>
          {entity.parentName && (
            <p className="mt-1 text-sm text-gray-500">
              {entity.parentName}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
              En directo
            </span>
            <span className="text-xs text-gray-500 font-data">{timeStr}</span>
          </div>

          {/* Quick stats strip */}
          <div className="mt-4 flex flex-wrap gap-4">
            {incidents > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <AlertTriangle className="w-4 h-4 text-tl-amber-400" />
                <span className="font-data font-semibold text-gray-800">{incidents}</span>
                <span className="text-gray-500">incidencia{incidents !== 1 ? "s" : ""} activa{incidents !== 1 ? "s" : ""}</span>
              </div>
            )}
            {weatherAlerts > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <CloudRain className="w-4 h-4 text-tl-sea-500" />
                <span className="font-data font-semibold text-gray-800">{weatherAlerts}</span>
                <span className="text-gray-500">alerta{weatherAlerts !== 1 ? "s" : ""} meteorológica{weatherAlerts !== 1 ? "s" : ""}</span>
              </div>
            )}
            {stats?.cameraCount != null && stats.cameraCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Camera className="w-4 h-4 text-tl-600" />
                <span className="font-data font-semibold text-gray-800">{stats.cameraCount}</span>
                <span className="text-gray-500">cámara{stats.cameraCount !== 1 ? "s" : ""}</span>
              </div>
            )}
            {stats?.gasStationCount != null && stats.gasStationCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Fuel className="w-4 h-4 text-tl-amber-500" />
                <span className="font-data font-semibold text-gray-800">{stats.gasStationCount}</span>
                <span className="text-gray-500">gasolinera{stats.gasStationCount !== 1 ? "s" : ""}</span>
              </div>
            )}
            {stats?.evChargerCount != null && stats.evChargerCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Zap className="w-4 h-4 text-signal-green" />
                <span className="font-data font-semibold text-gray-800">{stats.evChargerCount}</span>
                <span className="text-gray-500">punto{stats.evChargerCount !== 1 ? "s" : ""} de recarga</span>
              </div>
            )}
          </div>
        </div>

        {/* Traffic Health Score gauge */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="relative w-20 h-20" aria-label={`Estado del tráfico: ${scoreLabel} (${score}/100)`}>
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
              {/* Track */}
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-gray-200"
              />
              {/* Progress arc */}
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                className={scoreBg}
                strokeDasharray={dashArray}
              />
            </svg>
            <span
              className={`absolute inset-0 flex items-center justify-center font-heading text-xl font-bold ${scoreColor}`}
            >
              {score}
            </span>
          </div>
          <span className={`text-xs font-semibold ${scoreColor}`}>{scoreLabel}</span>
          <span className="text-[10px] text-gray-400 font-data">Fuente: DGT</span>
        </div>
      </div>

      {/* IMD summary if available */}
      {stats?.avgIMD != null && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4 text-tl-600" aria-hidden="true" />
          <span>
            IMD medio:{" "}
            <span className="font-data font-semibold text-gray-700">
              {stats.avgIMD.toLocaleString("es-ES")}
            </span>{" "}
            veh/día
            {stats.maxIMD != null && (
              <>
                {" — "}máximo:{" "}
                <span className="font-data font-semibold text-gray-700">
                  {Math.round(stats.maxIMD as number).toLocaleString("es-ES")}
                </span>
              </>
            )}
          </span>
        </div>
      )}
    </section>
  );
}
