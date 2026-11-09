import { ApiLandingLink } from "./ApiLandingLink";
import { apiHubSentence, API_HUB_LINK, type ApiHub } from "@/lib/api-hub-cta";

interface ApiHubCtaProps {
  hub: ApiHub;
  /** "legend": small type for the map legend on /mapa. */
  variant?: "inline" | "legend";
  className?: string;
}

/**
 * One plain line under a hub's first data block inviting companies to the
 * API: text and a link, no banner (CMO, 09-11-2026). Copy and the datasets
 * each hub may name live in src/lib/api-hub-cta.ts.
 */
export function ApiHubCta({ hub, variant = "inline", className = "" }: ApiHubCtaProps) {
  const legend = variant === "legend";
  return (
    <p
      className={
        legend
          ? `text-[10px] leading-snug text-slate-500 dark:text-slate-400 font-['DM_Sans'] ${className}`
          : `text-sm text-gray-600 dark:text-gray-400 ${className}`
      }
    >
      {apiHubSentence(hub)}{" "}
      <ApiLandingLink
        source="hub"
        hub={hub}
        className="font-semibold text-tl-600 dark:text-tl-400 hover:underline whitespace-nowrap"
      >
        {API_HUB_LINK}
      </ApiLandingLink>
    </p>
  );
}
