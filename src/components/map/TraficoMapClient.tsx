"use client";

/**
 * TraficoMapClient — bare re-export of <TraficoMap> via next/dynamic+ssr:false.
 *
 * Next.js 16 forbids `dynamic(..., { ssr: false })` inside Server Components.
 * Pages that need the raw TraficoMap import this client wrapper instead.
 *
 * For entity-card layouts (with footer + coordinate display), use <TraficoMapCard>.
 * For chromeless embed layouts (with height prop + wrapper chrome), use <TraficoMapEmbed>.
 * For raw TraficoMap usage inside server pages, use this file.
 */

import dynamic from "next/dynamic";

export const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-tl-50 dark:bg-slate-900 animate-pulse" />
    ),
  },
);

export type { TraficoMapProps } from "./TraficoMap";
