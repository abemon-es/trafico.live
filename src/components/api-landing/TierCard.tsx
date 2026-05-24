"use client";

import { CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { trackPricingClick } from "@/lib/analytics";

export interface TierCardProps {
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
  badge?: string | null;
  perMinute: number;
  perDay: number;
  ctaLabel: string;
  ctaHref: string;
  index?: number;
  /** Where on the page this tier card is rendered — passed to GA4 as `source`. */
  trackingSource?: string;
}

export function TierCard({
  name,
  price,
  period,
  features,
  highlight = false,
  badge = null,
  perMinute,
  perDay,
  ctaLabel,
  ctaHref,
  index = 0,
  trackingSource = "api-landing-pricing",
}: TierCardProps) {
  const handleCtaClick = () => {
    // FREE tier has no upgrade intent — only track paid tiers.
    if (name === "PRO" || name === "ENTERPRISE") {
      trackPricingClick(name, trackingSource);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: index * 0.1 }}
      className={`relative flex flex-col rounded-2xl border p-7 ${
        highlight
          ? "border-2 border-[color:var(--tl-primary)] bg-[color:var(--tl-primary-bg)] dark:bg-tl-900 shadow-lg shadow-tl-200/40 dark:shadow-tl-950"
          : name === "ENTERPRISE"
          ? "border border-tl-amber-200 dark:border-tl-amber-800 bg-background"
          : "border border-tl-200 dark:border-tl-800 bg-background"
      }`}
    >
      {/* Popular badge */}
      {badge && (
        <span
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold bg-tl-amber-400 text-tl-amber-950 px-4 py-1 rounded-full shadow-md whitespace-nowrap"
          aria-label={`Plan ${badge}`}
        >
          {badge}
        </span>
      )}

      {/* Header */}
      <div className="mb-5">
        <span
          className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full font-data mb-3 tracking-wide ${
            name === "FREE"
              ? "bg-tl-100 dark:bg-tl-900 text-tl-700 dark:text-tl-200"
              : name === "PRO"
              ? "bg-tl-600 text-white"
              : "bg-tl-amber-400 text-tl-amber-950"
          }`}
        >
          {name}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-heading font-bold text-foreground font-data">
            {price}
          </span>
          {period && (
            <span className="text-tl-500 dark:text-tl-400 text-sm">{period}</span>
          )}
        </div>
        <div className="mt-2 flex gap-3 text-xs font-data text-tl-600 dark:text-tl-300">
          <span>{perMinute} req/min</span>
          <span className="text-tl-300 dark:text-tl-600" aria-hidden="true">·</span>
          <span>{perDay.toLocaleString("es-ES")} req/día</span>
        </div>
      </div>

      {/* Features list */}
      <ul className="space-y-2.5 mb-7 flex-1" aria-label={`Características del plan ${name}`}>
        {features.map((feat) => (
          <li key={feat} className="flex items-start gap-2 text-sm text-foreground">
            <CheckCircle
              className="w-4 h-4 text-[color:var(--tl-success)] flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{feat}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a
        href={ctaHref}
        onClick={handleCtaClick}
        data-cta-id={`tier-${name.toLowerCase()}`}
        className={`block text-center text-sm font-semibold px-5 py-3 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600 ${
          highlight
            ? "bg-[color:var(--tl-primary)] hover:bg-[color:var(--tl-primary-hover)] text-white focus-visible:ring-white"
            : name === "ENTERPRISE"
            ? "bg-tl-amber-400 hover:bg-tl-amber-300 text-tl-amber-950"
            : "border border-tl-200 dark:border-tl-700 text-tl-600 dark:text-tl-300 hover:bg-[color:var(--tl-primary-bg)]"
        }`}
      >
        {ctaLabel}
      </a>
    </motion.div>
  );
}
