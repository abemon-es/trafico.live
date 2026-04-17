"use client";

import { useEffect, useState } from "react";
import { Ticket, ExternalLink } from "lucide-react";
import type { AffiliateProviderId, Offer, OfferRequest } from "@/lib/affiliates/types";
import { getProvider } from "@/lib/affiliates";

export interface OffersWidgetProps {
  provider: AffiliateProviderId;
  source: OfferRequest;
  /** Optional heading; defaults to a mode-specific label. */
  title?: string;
  /** Maximum cards to render. */
  limit?: number;
  className?: string;
}

// Scaffold — S4 will wire real provider calls. Today: renders a branded placeholder
// so consumer pages can compose the layout without blocking on affiliate APIs.
export function OffersWidget({
  provider,
  source,
  title,
  limit = 3,
  className = "",
}: OffersWidgetProps) {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [loading, setLoading] = useState(true);
  const meta = getProvider(provider).meta;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProvider(provider)
      .fetchOffers(source)
      .then((list) => {
        if (!cancelled) setOffers(list.slice(0, limit));
      })
      .catch(() => !cancelled && setOffers([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [provider, source, limit]);

  const resolvedTitle = title ?? defaultTitle(source.type);

  return (
    <section
      className={`rounded-xl border border-tl-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${className}`}
      aria-label={`Ofertas de ${meta.label}`}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-tl-700 dark:text-tl-200">
          <Ticket className="h-4 w-4" />
          <h3 className="font-['Exo_2'] text-base font-semibold text-slate-900 dark:text-white">
            {resolvedTitle}
          </h3>
        </div>
        <span className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-slate-400">
          {meta.label}
        </span>
      </header>

      {loading && <SkeletonRows limit={limit} />}

      {!loading && (!offers || offers.length === 0) && (
        <div className="rounded-lg border border-dashed border-tl-200 bg-tl-50/40 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
          <p className="font-['DM_Sans'] text-sm text-slate-600 dark:text-slate-300">
            Ofertas próximamente
          </p>
          <p className="mt-1 font-['JetBrains_Mono'] text-[11px] text-slate-400">
            {source.from} → {source.to}
            {source.date ? ` · ${source.date}` : ""}
          </p>
        </div>
      )}

      {!loading && offers && offers.length > 0 && (
        <ul className="space-y-2">
          {offers.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-tl-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <p className="font-['Exo_2'] text-sm font-semibold text-slate-900 dark:text-white">
                  {o.operator}
                </p>
                <p className="font-['JetBrains_Mono'] text-xs text-slate-500">
                  {o.stops === 0 ? "Directo" : `${o.stops ?? "?"} escalas`}
                </p>
              </div>
              <a
                href={o.deeplink}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-tl-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-tl-700"
              >
                {o.price.amount.toFixed(2)} {o.price.currency}
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[10px] leading-snug text-slate-400 dark:text-slate-500">
        {meta.disclosure}
      </p>
    </section>
  );
}

function SkeletonRows({ limit }: { limit: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: limit }).map((_, i) => (
        <div
          key={i}
          className="h-14 w-full animate-pulse rounded-lg bg-tl-50/70 dark:bg-slate-800/70"
        />
      ))}
    </div>
  );
}

function defaultTitle(mode: OfferRequest["type"]): string {
  switch (mode) {
    case "flight":
      return "Vuelos sugeridos";
    case "train":
      return "Trenes sugeridos";
    case "ferry":
      return "Ferries sugeridos";
    case "bus":
      return "Autobuses sugeridos";
  }
}

export { OffersWidget as Offers };
