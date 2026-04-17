"use client";

import type { ReactNode } from "react";
import Link from "next/link";

export interface TickerItem {
  id: string;
  icon?: ReactNode;
  label: ReactNode;
  value?: ReactNode;
  href?: string;
  tone?: "default" | "positive" | "warning" | "danger";
}

export interface TickerStripProps {
  items: TickerItem[];
  label?: string;
  speed?: "slow" | "normal" | "fast";
  pauseOnHover?: boolean;
  className?: string;
}

const TONE: Record<NonNullable<TickerItem["tone"]>, string> = {
  default: "text-gray-700 dark:text-gray-200",
  positive: "text-signal-green",
  warning: "text-tl-amber-500 dark:text-tl-amber-400",
  danger: "text-signal-red",
};

const DURATION: Record<NonNullable<TickerStripProps["speed"]>, string> = {
  slow: "60s",
  normal: "45s",
  fast: "30s",
};

export function TickerStrip({
  items,
  label = "Datos en vivo",
  speed = "normal",
  pauseOnHover = true,
  className,
}: TickerStripProps) {
  if (!items?.length) return null;

  const sequence = [...items, ...items];

  return (
    <div
      aria-label={label}
      className={[
        "relative w-full overflow-hidden bg-white dark:bg-gray-950 py-2.5",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "flex gap-8 whitespace-nowrap animate-[ticker_var(--ticker-duration)_linear_infinite] motion-reduce:animate-none",
          pauseOnHover ? "hover:[animation-play-state:paused]" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ ["--ticker-duration" as string]: DURATION[speed] }}
      >
        {sequence.map((item, i) => {
          const content = (
            <span
              className={`inline-flex items-center gap-2 text-sm font-medium ${TONE[item.tone ?? "default"]}`}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
              {item.value !== undefined && (
                <span className="font-data font-semibold">{item.value}</span>
              )}
            </span>
          );
          return (
            <span
              key={`${item.id}-${i}`}
              className="inline-flex items-center shrink-0"
            >
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-600 rounded"
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
