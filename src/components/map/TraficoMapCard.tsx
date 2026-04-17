"use client";

/**
 * TraficoMapCard — small server-importable card wrapper around <TraficoMap>.
 *
 * Mirrors the compact embed pattern previously provided by the deleted
 * StationLocationMap: map canvas + coordinate/navigation footer, sized for
 * sidebars and entity page "location" sections. Uses TraficoMap internally
 * with a preset + entity, so it picks up layer registry styling for free.
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, ExternalLink, Navigation } from "lucide-react";
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

interface TraficoMapCardProps {
  latitude: number;
  longitude: number;
  name: string;
  /** Height in px for the map canvas */
  height?: number;
  /** Footer link target — defaults to /gasolineras/mapa */
  mapPageUrl?: string;
  /** TraficoMap preset + entity to activate */
  preset: TraficoMapProps["preset"];
  entity?: TraficoMapProps["entity"];
  /** Initial zoom for the embed */
  zoom?: number;
}

export function TraficoMapCard({
  latitude,
  longitude,
  name,
  height = 250,
  mapPageUrl,
  preset,
  entity,
  zoom = 14,
}: TraficoMapCardProps) {
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div style={{ height: `${height}px` }} className="w-full relative">
        <TraficoMap
          preset={preset}
          entity={entity}
          initialView={{ center: [longitude, latitude], zoom }}
          controls={{ layerPanel: false, legend: false, themeToggle: false }}
          className="h-full w-full"
        />
      </div>
      <div className="p-3 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="w-3 h-3" />
          <span className="font-mono">
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-tl-600 dark:text-tl-400 hover:text-tl-700 hover:bg-tl-50 dark:hover:bg-tl-900/20 rounded transition-colors"
            aria-label={`Cómo llegar a ${name}`}
          >
            <Navigation className="w-3 h-3" />
            Llegar
          </a>
          {mapPageUrl && (
            <Link
              href={mapPageUrl}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-950 rounded transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Ver mapa
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
