import type { ApiTierName } from "@/lib/api-tiers";

interface TierBadgeProps {
  tier: ApiTierName;
  size?: "sm" | "md";
}

const TIER_STYLES: Record<ApiTierName, string> = {
  FREE: "bg-tl-50 text-tl-700 border border-tl-200 dark:bg-tl-900/40 dark:text-tl-300 dark:border-tl-800",
  PRO: "bg-tl-amber-50 text-tl-amber-700 border border-tl-amber-200 dark:bg-tl-amber-900/30 dark:text-tl-amber-300 dark:border-tl-amber-800",
  ENTERPRISE:
    "bg-tl-800 text-tl-100 border border-tl-700 dark:bg-tl-950 dark:text-tl-200 dark:border-tl-800",
};

const TIER_LABELS: Record<ApiTierName, string> = {
  FREE: "Gratuito",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export function TierBadge({ tier, size = "sm" }: TierBadgeProps) {
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium font-mono uppercase tracking-wide ${sizeClass} ${TIER_STYLES[tier]}`}
      aria-label={`Plan ${TIER_LABELS[tier]}`}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}
