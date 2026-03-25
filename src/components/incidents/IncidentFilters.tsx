"use client";

import {
  Ban,
  Construction,
  AlertTriangle,
  CloudRain,
  TrafficCone,
  ArrowLeftRight,
  Car,
  CircleSlash,
  HelpCircle,
} from "lucide-react";
import type { IncidentEffect, IncidentCause } from "@/lib/parsers/datex2";

interface FilterChipProps {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  color: string;
}

function FilterChip({ label, count, active, onClick, icon, color }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        transition-all duration-200 border-2
        ${active
          ? `${color} text-white border-transparent shadow-md`
          : `bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50`
        }
      `}
    >
      <span className="w-4 h-4">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
      {count !== undefined && (
        <span
          className={`
            text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center
            ${active ? "bg-white/20" : "bg-gray-100"}
          `}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// Effect configurations
const EFFECT_CONFIG: Record<IncidentEffect, { label: string; icon: React.ReactNode; color: string }> = {
  ROAD_CLOSED: {
    label: "Carreteras cortadas",
    icon: <Ban className="w-4 h-4" />,
    color: "bg-red-600",
  },
  SLOW_TRAFFIC: {
    label: "Tráfico lento",
    icon: <Car className="w-4 h-4" />,
    color: "bg-orange-500",
  },
  RESTRICTED: {
    label: "Circulación restringida",
    icon: <CircleSlash className="w-4 h-4" />,
    color: "bg-yellow-500",
  },
  DIVERSION: {
    label: "Desvíos",
    icon: <ArrowLeftRight className="w-4 h-4" />,
    color: "bg-tl-500",
  },
  OTHER_EFFECT: {
    label: "Otras afecciones",
    icon: <HelpCircle className="w-4 h-4" />,
    color: "bg-gray-500",
  },
};

// Cause configurations
const CAUSE_CONFIG: Record<IncidentCause, { label: string; icon: React.ReactNode; color: string }> = {
  ROADWORK: {
    label: "Obras",
    icon: <Construction className="w-4 h-4" />,
    color: "bg-tl-amber-600",
  },
  ACCIDENT: {
    label: "Accidentes",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "bg-red-600",
  },
  WEATHER: {
    label: "Meteorológicos",
    icon: <CloudRain className="w-4 h-4" />,
    color: "bg-tl-600",
  },
  RESTRICTION: {
    label: "Restricciones",
    icon: <TrafficCone className="w-4 h-4" />,
    color: "bg-purple-600",
  },
  OTHER_CAUSE: {
    label: "Otras",
    icon: <HelpCircle className="w-4 h-4" />,
    color: "bg-gray-500",
  },
};

interface IncidentFiltersProps {
  activeEffects: IncidentEffect[];
  activeCauses: IncidentCause[];
  onEffectToggle: (effect: IncidentEffect) => void;
  onCauseToggle: (cause: IncidentCause) => void;
  onClearAll: () => void;
  counts?: {
    byEffect?: Record<string, number>;
    byCause?: Record<string, number>;
  };
  compact?: boolean;
}

export function IncidentFilters({
  activeEffects,
  activeCauses,
  onEffectToggle,
  onCauseToggle,
  onClearAll,
  counts,
  compact = false,
}: IncidentFiltersProps) {
  const hasActiveFilters = activeEffects.length > 0 || activeCauses.length > 0;

  const effectOrder: IncidentEffect[] = [
    "ROAD_CLOSED",
    "SLOW_TRAFFIC",
    "RESTRICTED",
    "DIVERSION",
    "OTHER_EFFECT",
  ];

  const causeOrder: IncidentCause[] = [
    "ROADWORK",
    "ACCIDENT",
    "WEATHER",
    "RESTRICTION",
    "OTHER_CAUSE",
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {effectOrder.map((effect) => {
          const config = EFFECT_CONFIG[effect];
          const count = counts?.byEffect?.[effect];
          if (!count) return null;
          return (
            <FilterChip
              key={effect}
              label={config.label}
              count={count}
              active={activeEffects.includes(effect)}
              onClick={() => onEffectToggle(effect)}
              icon={config.icon}
              color={config.color}
            />
          );
        })}
        {causeOrder.map((cause) => {
          const config = CAUSE_CONFIG[cause];
          const count = counts?.byCause?.[cause];
          if (!count) return null;
          return (
            <FilterChip
              key={cause}
              label={config.label}
              count={count}
              active={activeCauses.includes(cause)}
              onClick={() => onCauseToggle(cause)}
              icon={config.icon}
              color={config.color}
            />
          );
        })}
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Effects section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Afecciones en la vía
        </h3>
        <div className="flex flex-wrap gap-2">
          {effectOrder.map((effect) => {
            const config = EFFECT_CONFIG[effect];
            const count = counts?.byEffect?.[effect] || 0;
            return (
              <FilterChip
                key={effect}
                label={config.label}
                count={count}
                active={activeEffects.includes(effect)}
                onClick={() => onEffectToggle(effect)}
                icon={config.icon}
                color={config.color}
              />
            );
          })}
        </div>
      </div>

      {/* Causes section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Construction className="w-4 h-4" />
          Causas de afección
        </h3>
        <div className="flex flex-wrap gap-2">
          {causeOrder.map((cause) => {
            const config = CAUSE_CONFIG[cause];
            const count = counts?.byCause?.[cause] || 0;
            return (
              <FilterChip
                key={cause}
                label={config.label}
                count={count}
                active={activeCauses.includes(cause)}
                onClick={() => onCauseToggle(cause)}
                icon={config.icon}
                color={config.color}
              />
            );
          })}
        </div>
      </div>

      {/* Clear button */}
      {hasActiveFilters && (
        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={onClearAll}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Limpiar todos los filtros
          </button>
        </div>
      )}
    </div>
  );
}

// Export configs for use in other components
export { EFFECT_CONFIG, CAUSE_CONFIG };
