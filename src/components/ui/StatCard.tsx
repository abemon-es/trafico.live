import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

type Trend = "up" | "down" | "flat";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: { direction: Trend; label?: string };
  icon?: LucideIcon;
  accent?: "tl" | "tl-amber" | "tl-sea" | "neutral";
  mono?: boolean;
  className?: string;
}

const ACCENT: Record<NonNullable<StatCardProps["accent"]>, string> = {
  tl: "text-tl-600 dark:text-tl-400 bg-tl-50 dark:bg-tl-900/20",
  "tl-amber":
    "text-tl-amber-500 dark:text-tl-amber-400 bg-tl-amber-50 dark:bg-tl-amber-900/20",
  "tl-sea":
    "text-tl-sea-500 dark:text-tl-sea-400 bg-tl-sea-50 dark:bg-tl-sea-900/20",
  neutral: "text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800",
};

const TREND_ICON: Record<Trend, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const TREND_COLOR: Record<Trend, string> = {
  up: "text-signal-green",
  down: "text-signal-red",
  flat: "text-gray-500 dark:text-gray-400",
};

export function StatCard({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  accent = "tl",
  mono = true,
  className,
}: StatCardProps) {
  const TrendIcon = trend ? TREND_ICON[trend.direction] : null;

  return (
    <div
      className={[
        "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 flex flex-col gap-2",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </span>
        {Icon && (
          <span
            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${ACCENT[accent]}`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
          </span>
        )}
      </div>

      <div
        className={[
          "text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-50 leading-tight",
          mono ? "font-data" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </div>

      {(hint || trend) && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {trend && TrendIcon && (
            <span
              className={`inline-flex items-center gap-1 font-medium ${TREND_COLOR[trend.direction]}`}
            >
              <TrendIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {trend.label}
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </div>
  );
}
