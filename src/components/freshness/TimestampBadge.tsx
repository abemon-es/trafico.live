/**
 * TimestampBadge — the freshness differentiator against static competitors.
 *
 * Competitive context (from docs/seo-research-2026-04-19/panel/competitor-ux-teardown.md):
 * - maisgasolina.com admits "Prices updated within last 14 days"
 * - aemet.es publishes date-less data
 * - etraffic.dgt.es is a non-indexed SPA
 * - dieselogasolina.com uses static PNG charts
 *
 * Every live datapoint trafico.live surfaces should carry this badge.
 * Google Schema (Dataset + DataFeed) reads from the same timestamp.
 *
 * Variants:
 *   - live (<2m): pulsing dot + "hace N min"
 *   - recent (<1h): solid dot + "hace N min"
 *   - today (<24h): "hoy HH:mm"
 *   - stale (>24h): "hace N días" in muted color (warning to editor)
 */

import { cn } from "@/lib/utils";

export interface TimestampBadgeProps {
  /** ISO datetime of the data source */
  at: string | Date;
  /** Data source name (e.g. "AEMET", "Renfe GTFS-RT", "CNMC") */
  source?: string;
  /** SLA threshold in minutes; data older than this renders "stale" */
  slaMinutes?: number;
  /** Visual size */
  size?: "xs" | "sm" | "md";
  /** Additional className */
  className?: string;
}

type Freshness = "live" | "recent" | "today" | "stale";

function classify(deltaMs: number, slaMinutes: number): Freshness {
  const m = deltaMs / 60000;
  if (m < 2) return "live";
  if (m < 60) return "recent";
  if (m < 24 * 60) return "today";
  return m > slaMinutes ? "stale" : "today";
}

function formatRelative(d: Date, now: Date): string {
  const deltaMs = now.getTime() - d.getTime();
  const m = Math.floor(deltaMs / 60000);
  if (m < 1) return "ahora mismo";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) {
    return `hoy ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  }
  const days = Math.floor(h / 24);
  return `hace ${days} d`;
}

const DOT_BY_FRESHNESS: Record<Freshness, string> = {
  live: "bg-tl-emerald-500 animate-pulse",
  recent: "bg-tl-emerald-500",
  today: "bg-tl-500",
  stale: "bg-tl-amber-500",
};

const TEXT_BY_FRESHNESS: Record<Freshness, string> = {
  live: "text-tl-emerald-700 dark:text-tl-emerald-300",
  recent: "text-tl-emerald-700 dark:text-tl-emerald-300",
  today: "text-tl-700 dark:text-tl-300",
  stale: "text-tl-amber-700 dark:text-tl-amber-300",
};

const SIZE: Record<NonNullable<TimestampBadgeProps["size"]>, string> = {
  xs: "text-[11px] gap-1 px-1.5 py-0.5",
  sm: "text-xs gap-1.5 px-2 py-0.5",
  md: "text-sm gap-2 px-2.5 py-1",
};

export function TimestampBadge({
  at,
  source,
  slaMinutes = 1440,
  size = "sm",
  className,
}: TimestampBadgeProps) {
  const d = typeof at === "string" ? new Date(at) : at;
  const now = new Date();
  const freshness = classify(now.getTime() - d.getTime(), slaMinutes);

  return (
    <time
      dateTime={d.toISOString()}
      className={cn(
        "inline-flex items-center rounded-full font-mono tabular-nums",
        "bg-tl-50 dark:bg-tl-950/50",
        SIZE[size],
        TEXT_BY_FRESHNESS[freshness],
        className,
      )}
      title={source ? `${source} · ${d.toLocaleString("es-ES")}` : d.toLocaleString("es-ES")}
      data-freshness={freshness}
    >
      <span className={cn("inline-block size-1.5 rounded-full", DOT_BY_FRESHNESS[freshness])} />
      <span>{formatRelative(d, now)}</span>
      {source ? <span className="opacity-70">· {source}</span> : null}
    </time>
  );
}
