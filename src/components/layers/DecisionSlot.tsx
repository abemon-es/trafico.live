/**
 * DecisionSlot — Layer 4. Renders a single actionable verdict
 * ("¿puedo correr hoy?" → verde, ["ICA 2 bueno", "Temp 18°C"]).
 *
 * Populated by Sprint 8 (HEALTH-AND-WEATHER-IMPACT.md Part A) +
 * Sprint 10 (trip decision support).
 *
 * Returns emit Schema.org FAQPage JSON-LD so AI Overviews can use the
 * decision as a direct answer with cited rationale.
 */

import type { DecisionPayload, SlotState } from "./types";
import { TimestampBadge } from "@/components/freshness/TimestampBadge";
import { cn } from "@/lib/utils";

const VERDICT_STYLE = {
  go: {
    container: "bg-tl-emerald-50 ring-tl-emerald-300 text-tl-emerald-900",
    dot: "bg-tl-emerald-500",
    label: "Sí",
  },
  caution: {
    container: "bg-tl-amber-50 ring-tl-amber-300 text-tl-amber-900",
    dot: "bg-tl-amber-500",
    label: "Con precaución",
  },
  avoid: {
    container: "bg-red-50 ring-red-300 text-red-900",
    dot: "bg-red-500",
    label: "Mejor no",
  },
} as const;

export interface DecisionSlotProps {
  state: SlotState<DecisionPayload>;
  /** User question this answers, e.g. "¿Puedo correr hoy en Madrid?" */
  question: string;
  className?: string;
}

export function DecisionSlot({ state, question, className }: DecisionSlotProps) {
  if (state.status === "unavailable") return null;

  if (state.status === "loading") {
    return (
      <div
        className={cn("h-28 animate-pulse rounded-xl bg-tl-100/60", className)}
      />
    );
  }

  const d = state.data;
  const style = VERDICT_STYLE[d.verdict];

  return (
    <section
      className={cn(
        "rounded-xl ring-1 p-4 space-y-3",
        style.container,
        className,
      )}
      aria-label={question}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 size-3 shrink-0 rounded-full ring-2 ring-white",
            style.dot,
          )}
          aria-hidden
        />
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium opacity-80">{question}</p>
          <p className="text-lg font-semibold">{style.label} — {d.headline}</p>
        </div>
        <TimestampBadge at={d.computedAt} source={d.sources[0]} size="xs" />
      </div>

      {d.rationale.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {d.rationale.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span aria-hidden className="mt-1.5 size-1 rounded-full bg-current opacity-50" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {d.alternative ? (
        <p className="text-sm italic opacity-90">
          <strong className="not-italic">Alternativa:</strong> {d.alternative}
        </p>
      ) : null}

      {/* Schema.org FAQPage — cited by AI Overviews */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `${style.label}. ${d.headline}. ${d.rationale.join(". ")}`,
                },
              },
            ],
          }),
        }}
      />
    </section>
  );
}
