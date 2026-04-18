"use client";

/**
 * NewsletterHero — large hero variant for lead magnets and landing sections.
 *
 * Embeds NewsletterSignup inline with an H2 headline and pitch copy.
 * Designed to be placed at the top and bottom of long-form articles.
 */

import { motion } from "motion/react";
import { BellRing } from "lucide-react";
import { NewsletterSignup } from "./NewsletterSignup";

interface NewsletterHeroProps {
  source: string;
  leadMagnet?: string;
  /** Override the default headline */
  headline?: string;
  /** Override the default pitch */
  pitch?: string;
  /** Layout variant: "banner" (full-width strip) | "inset" (contained card) */
  layout?: "banner" | "inset";
}

export function NewsletterHero({
  source,
  leadMagnet,
  headline = "El resumen semanal de la movilidad en España",
  pitch = "Datos de tráfico, trenes, vuelos y transporte público. Sin ruido, en tu bandeja de entrada cada lunes.",
  layout = "banner",
}: NewsletterHeroProps) {
  const isBanner = layout === "banner";

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      aria-labelledby="newsletter-hero-heading"
      className={
        isBanner
          ? "my-10 rounded-2xl bg-gradient-to-br from-tl-600 to-tl-700 dark:from-tl-700 dark:to-tl-800 p-8 sm:p-10 text-white"
          : "my-8 rounded-xl border border-tl-200 dark:border-tl-700 bg-tl-50 dark:bg-tl-950/40 p-6 sm:p-8"
      }
    >
      <div className="max-w-xl">
        {/* Icon badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 ${
            isBanner
              ? "bg-white/20 text-white"
              : "bg-tl-100 dark:bg-tl-800/50 text-tl-700 dark:text-tl-300"
          }`}
          aria-hidden="true"
        >
          <BellRing className="w-3.5 h-3.5" />
          <span>Newsletter semanal</span>
        </div>

        {/* Headline */}
        <h2
          id="newsletter-hero-heading"
          className={`font-heading text-2xl sm:text-3xl font-bold mb-3 leading-tight ${
            isBanner ? "text-white" : "text-gray-900 dark:text-gray-100"
          }`}
        >
          {headline}
        </h2>

        {/* Pitch */}
        <p
          className={`text-base mb-6 leading-relaxed ${
            isBanner ? "text-tl-100" : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {pitch}
        </p>

        {/* Signup form — always "inline" variant inside this hero */}
        <div
          className={
            isBanner
              ? "[&_input]:!bg-white/10 [&_input]:!border-white/30 [&_input]:!text-white [&_input]:placeholder:!text-white/60 [&_input]:focus:!ring-white/50 [&_button[type=submit]]:!bg-white [&_button[type=submit]]:!text-tl-700 [&_button[type=submit]]:hover:!bg-tl-50 [&_p.text-xs]:!text-white/70 [&_a]:!text-white/90"
              : ""
          }
        >
          <NewsletterSignup source={source} leadMagnet={leadMagnet} variant="inline" />
        </div>
      </div>
    </motion.section>
  );
}
