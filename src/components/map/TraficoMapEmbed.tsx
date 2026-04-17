"use client";

/**
 * TraficoMapEmbed — server-importable, chromeless wrapper around <TraficoMap>.
 *
 * Unlike <TraficoMapCard>, this variant has no coordinate footer or navigation
 * buttons. Use it for entity detail pages where the subject is a moving object
 * (vessels, aircraft, live fleet) and a static "directions" link is misleading.
 *
 * Lazy-loads TraficoMap via next/dynamic with ssr: false so it can be imported
 * directly from server components.
 */

import dynamic from "next/dynamic";
import type { TraficoMapProps } from "./TraficoMap";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-tl-50 dark:bg-slate-900 animate-pulse" />
    ),
  },
);

export interface TraficoMapEmbedProps extends TraficoMapProps {
  /** Height in px for the map canvas (default 420) */
  height?: number;
  /** Extra className applied to the outer card */
  wrapperClassName?: string;
}

export function TraficoMapEmbed({
  height = 420,
  wrapperClassName = "",
  className = "h-full w-full",
  ...rest
}: TraficoMapEmbedProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden ${wrapperClassName}`}
    >
      <div style={{ height: `${height}px` }} className="w-full relative">
        <TraficoMap {...rest} className={className} />
      </div>
    </div>
  );
}
