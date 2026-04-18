"use client";

interface LiveIncidentBadgeProps {
  severity: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
  label?: string;
}

const SEVERITY_CONFIG = {
  VERY_HIGH: {
    default: "Muy alta",
    bg: "bg-tl-amber-100 dark:bg-tl-amber-900/40",
    text: "text-tl-amber-600 dark:text-tl-amber-300",
    ring: "ring-tl-amber-300 dark:ring-tl-amber-700",
    dot: "bg-tl-amber-500",
  },
  HIGH: {
    default: "Alta",
    bg: "bg-tl-amber-50 dark:bg-tl-amber-900/20",
    text: "text-tl-amber-500 dark:text-tl-amber-400",
    ring: "ring-tl-amber-200 dark:ring-tl-amber-800",
    dot: "bg-tl-amber-400",
  },
  MEDIUM: {
    default: "Media",
    bg: "bg-tl-100 dark:bg-tl-900/30",
    text: "text-tl-600 dark:text-tl-400",
    ring: "ring-tl-200 dark:ring-tl-800",
    dot: "bg-tl-500",
  },
  LOW: {
    default: "Baja",
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-500 dark:text-gray-400",
    ring: "ring-gray-200 dark:ring-gray-700",
    dot: "bg-gray-400",
  },
} as const;

export function LiveIncidentBadge({ severity, label }: LiveIncidentBadgeProps) {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.LOW;
  const text = label ?? cfg.default;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {text}
    </span>
  );
}
