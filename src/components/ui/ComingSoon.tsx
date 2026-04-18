import Link from "next/link";
import { Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ComingSoonProps {
  title: string;
  description: string;
  eta?: string;
  ctaLabel?: string;
  ctaHref?: string;
  icon?: LucideIcon;
}

export function ComingSoon({
  title,
  description,
  eta,
  ctaLabel = "Volver al inicio",
  ctaHref = "/",
  icon: Icon = Clock,
}: ComingSoonProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      {/* Icon container */}
      <div className="w-20 h-20 rounded-2xl bg-tl-50 dark:bg-tl-900/30 border border-tl-100 dark:border-tl-800 flex items-center justify-center mb-8 shadow-sm">
        <Icon
          className="w-10 h-10 text-tl-600 dark:text-tl-400"
          aria-hidden="true"
          strokeWidth={1.5}
        />
      </div>

      {/* ETA badge */}
      {eta && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-tl-amber-100 dark:bg-tl-amber-900/40 text-tl-amber-600 dark:text-tl-amber-300 border border-tl-amber-200 dark:border-tl-amber-700 mb-5">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {eta}
        </span>
      )}

      {/* Title */}
      <h1 className="font-heading text-3xl sm:text-4xl font-bold text-tl-900 dark:text-tl-50 mb-4 leading-tight">
        {title}
      </h1>

      {/* Description */}
      <p className="font-body text-base sm:text-lg text-tl-700 dark:text-tl-300 max-w-lg mx-auto mb-4 leading-relaxed">
        {description}
      </p>

      {/* Próximamente label */}
      <p className="font-body text-sm text-tl-500 dark:text-tl-400 mb-8">
        Esta sección está en desarrollo. Pronto estará disponible.
      </p>

      {/* CTA */}
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-tl-600 hover:bg-tl-700 dark:bg-tl-500 dark:hover:bg-tl-400 text-white font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tl-600"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
