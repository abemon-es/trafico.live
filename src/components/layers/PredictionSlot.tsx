/**
 * PredictionSlot — Layer 2 placeholder. Renders a prediction with reasoning,
 * or nothing when data is unavailable. Never breaks the page.
 *
 * Populated by Sprint 9-10 (PREDICTIVE-FORECASTING.md).
 * Schema.org: emits Dataset + DataFeed JSON-LD so Google AI Overviews can cite.
 */

import type { PredictionPayload, SlotState } from "./types";
import { TimestampBadge } from "@/components/freshness/TimestampBadge";
import { cn } from "@/lib/utils";

export interface PredictionSlotProps {
  state: SlotState<PredictionPayload>;
  /** Visible title, e.g. "Previsión retraso hoy" */
  title: string;
  /** Optional className */
  className?: string;
}

function formatValue(p: PredictionPayload): string {
  const v = p.value as Record<string, unknown>;
  switch (p.kind) {
    case "traffic_congestion":
      return `${v.level} · +${v.expectedDelayMinutes} min`;
    case "fuel_price":
      return `${v.direction === "up" ? "↑" : v.direction === "down" ? "↓" : "→"} ${Number(v.deltaEurPerLitre).toFixed(3)} €/L`;
    case "train_delay":
      return `+${v.expectedDelayMinutes} min · ${Math.round(Number(v.probabilityOfCancellation) * 100)}% riesgo cancelación`;
    default:
      return JSON.stringify(v);
  }
}

export function PredictionSlot({ state, title, className }: PredictionSlotProps) {
  if (state.status === "unavailable") return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-tl-200/60 dark:border-tl-800/60",
        "bg-gradient-to-br from-tl-50/80 to-white dark:from-tl-950/40 dark:to-transparent",
        "p-4 space-y-2",
        className,
      )}
      aria-label={title}
    >
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-tl-900 dark:text-tl-100">
          {title}
        </h3>
        {state.status === "ready" ? (
          <TimestampBadge
            at={state.data.computedAt}
            source={state.data.sources.join(" · ")}
            size="xs"
          />
        ) : null}
      </header>

      {state.status === "loading" ? (
        <div className="h-12 animate-pulse rounded-md bg-tl-100/60 dark:bg-tl-900/40" />
      ) : (
        <PredictionBody prediction={state.data} />
      )}
    </section>
  );
}

function PredictionBody({ prediction }: { prediction: PredictionPayload }) {
  return (
    <>
      <div className="font-mono text-2xl tabular-nums text-tl-900 dark:text-tl-50">
        {formatValue(prediction)}
      </div>
      <p className="text-xs text-tl-700 dark:text-tl-300">
        {prediction.reasoning}
      </p>
      {prediction.basedOnSamples ? (
        <p className="text-[11px] text-tl-600 dark:text-tl-400">
          Basado en {prediction.basedOnSamples.toLocaleString("es-ES")} observaciones históricas
          {prediction.version ? ` · modelo ${prediction.version}` : ""}.
        </p>
      ) : null}

      {/* Schema.org — cited by AI Overviews / SGE */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: `Predicción ${prediction.kind}`,
            description: prediction.reasoning,
            temporalCoverage: prediction.computedAt,
            creator: { "@type": "Organization", name: "trafico.live" },
            isBasedOn: prediction.sources.map((s) => ({ "@type": "CreativeWork", name: s })),
          }),
        }}
      />
    </>
  );
}
