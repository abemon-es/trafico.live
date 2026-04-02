import type { GeoEntity } from "@/lib/geo/types";
import { getLocationStats } from "@/lib/data/location-stats";
import {
  AlertTriangle,
  Camera,
  Radar,
  CloudRain,
  Fuel,
  Zap,
  Radio,
  Route,
} from "lucide-react";

interface StatsBarProps {
  entity: GeoEntity;
}

interface StatCard {
  icon: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  highlight?: boolean;
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

function formatDecimal(value: unknown): string {
  if (value == null) return "—";
  const num = typeof value === "object" && "toFixed" in (value as object)
    ? parseFloat(String(value))
    : Number(value);
  if (isNaN(num)) return "—";
  return num.toFixed(3);
}

function StatCard({ icon, label, value, unit, highlight }: StatCard) {
  if (value == null || value === 0) return null;

  return (
    <div
      className={[
        "flex flex-col items-start gap-1 rounded-xl p-3 border",
        highlight
          ? "bg-tl-50 border-tl-200"
          : "bg-white border-gray-200",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 text-gray-500">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-data text-xl font-bold text-gray-900">
          {typeof value === "number" ? value.toLocaleString("es-ES") : value}
        </span>
        {unit && <span className="text-xs text-gray-400 font-data">{unit}</span>}
      </div>
      {/* Mini visual indicator: pulse for real-time, bars for infrastructure */}
      {highlight ? (
        <span className="w-1.5 h-1.5 rounded-full bg-tl-amber-400 animate-pulse mt-1" />
      ) : typeof value === "number" && value > 0 ? (
        <svg
          className="w-full h-2 mt-1.5"
          viewBox="0 0 60 8"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect x="0" y="2" width="8" height="6" rx="1" fill="#dde8ff" />
          <rect x="10" y="1" width="8" height="7" rx="1" fill="#dde8ff" />
          <rect x="20" y="3" width="8" height="5" rx="1" fill="#c0d5ff" />
          <rect x="30" y="0" width="8" height="8" rx="1" fill="#c0d5ff" />
          <rect x="40" y="2" width="8" height="6" rx="1" fill="#94b6ff" />
          <rect x="50" y="1" width="8" height="7" rx="1" fill="#1b4bd5" opacity="0.3" />
        </svg>
      ) : null}
    </div>
  );
}

export async function StatsBar({ entity }: StatsBarProps) {
  const scopeType = toScopeType(entity.level);
  const scopeCode = toScopeCode(entity);

  const stats = await getLocationStats(scopeType, scopeCode);

  if (!stats) {
    return null;
  }

  // Build stat cards — only show cards with meaningful values
  const cards: StatCard[] = [
    {
      icon: <AlertTriangle className="w-4 h-4 text-tl-amber-400" />,
      label: "Incidencias activas",
      value: stats.activeIncidentCount ?? null,
      highlight: (stats.activeIncidentCount ?? 0) > 0,
    },
    {
      icon: <Camera className="w-4 h-4 text-tl-600" />,
      label: "Cámaras DGT",
      value: stats.cameraCount ?? null,
    },
    {
      icon: <Radar className="w-4 h-4 text-tl-600" />,
      label: "Radares",
      value: stats.radarCount ?? null,
    },
    {
      icon: <CloudRain className="w-4 h-4 text-tl-sea-500" />,
      label: "Alertas meteo",
      value: stats.activeWeatherAlerts ?? null,
      highlight: (stats.activeWeatherAlerts ?? 0) > 0,
    },
    {
      icon: <Fuel className="w-4 h-4 text-tl-amber-500" />,
      label: "Gasóleo A medio",
      // avgDieselPrice is a Prisma Decimal — format with 3 decimals
      value: stats.avgDieselPrice != null ? formatDecimal(stats.avgDieselPrice) : null,
      unit: "€/L",
    },
    {
      icon: <Zap className="w-4 h-4 text-signal-green" />,
      label: "Puntos de recarga",
      value: stats.evChargerCount ?? null,
    },
    {
      icon: <Radio className="w-4 h-4 text-tl-600" />,
      label: "V16 activos",
      value: stats.activeV16Count ?? null,
      highlight: (stats.activeV16Count ?? 0) > 0,
    },
    {
      icon: <Route className="w-4 h-4 text-tl-600" />,
      label: "Carreteras",
      value: stats.roadCount ?? null,
    },
  ];

  // Filter out cards with null/zero values to keep the strip clean
  const visibleCards = cards.filter(
    (c) => c.value != null && c.value !== 0 && c.value !== "—"
  );

  if (visibleCards.length === 0) return null;

  return (
    <div>
      <div
        aria-label="Resumen estadístico"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2"
      >
        {visibleCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
      {stats?.realtimeUpdatedAt && (
        <p className="text-[10px] text-gray-400 font-data mt-1 text-right">
          Actualizado{" "}
          {new Date(stats.realtimeUpdatedAt).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
