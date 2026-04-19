/**
 * WeatherImpactSlot — Layer 3. Renders cross-vertical weather impact
 * (e.g. "Viento 80km/h → riesgo cancelación vuelo").
 *
 * Populated by Sprint 8 (HEALTH-AND-WEATHER-IMPACT.md Part B).
 * The moat: 12/12 audited competitors don't cross weather × operations.
 */

import type { ImpactAssessment, SlotState } from "./types";
import { TimestampBadge } from "@/components/freshness/TimestampBadge";
import { cn } from "@/lib/utils";

const SEVERITY_STYLE = {
  none: { ring: "ring-tl-200", bg: "bg-tl-50", label: "Sin impacto", icon: "·" },
  advisory: { ring: "ring-tl-sky-300", bg: "bg-tl-sky-50", label: "Información", icon: "i" },
  warning: { ring: "ring-tl-amber-400", bg: "bg-tl-amber-50", label: "Precaución", icon: "!" },
  critical: { ring: "ring-red-500", bg: "bg-red-50", label: "Riesgo alto", icon: "⚠" },
} as const;

export interface WeatherImpactSlotProps {
  state: SlotState<ImpactAssessment>;
  /** Entity name to personalize the message (e.g. "Ferry Valencia-Palma") */
  entityLabel: string;
  className?: string;
}

export function WeatherImpactSlot({
  state,
  entityLabel,
  className,
}: WeatherImpactSlotProps) {
  if (state.status === "unavailable") return null;

  if (state.status === "loading") {
    return (
      <div
        className={cn(
          "h-24 animate-pulse rounded-xl bg-tl-100/60 dark:bg-tl-900/40",
          className,
        )}
      />
    );
  }

  const assessment = state.data;
  const style = SEVERITY_STYLE[assessment.overall];

  return (
    <section
      className={cn(
        "rounded-xl ring-1 p-4 space-y-3",
        style.ring,
        style.bg,
        "dark:bg-opacity-10",
        className,
      )}
      aria-label={`Impacto meteorológico en ${entityLabel}`}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex size-6 items-center justify-center rounded-full bg-white/70 font-bold"
          >
            {style.icon}
          </span>
          <h3 className="text-sm font-semibold">
            {style.label} · {entityLabel}
          </h3>
        </div>
        <TimestampBadge
          at={assessment.computedAt}
          source="AEMET"
          size="xs"
        />
      </header>

      {assessment.factors.length > 0 ? (
        <ul className="space-y-1.5 text-sm">
          {assessment.factors.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-current opacity-60" />
              <span>
                <strong className="font-medium">{f.cause}</strong>
                {" — "}
                <span className="opacity-80">{f.description}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {assessment.advisory ? (
        <p className="text-xs italic opacity-80">{assessment.advisory}</p>
      ) : null}
    </section>
  );
}
