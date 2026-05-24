"use client";

/**
 * StopsTimeline — vertical timeline of stops for trains and buses.
 *
 * Accepts a generic stop list so it can be reused by both
 * /trenes/tren/[trainId] (StopRow with state) and
 * /transporte-publico/[operator]/[route] (sequential bus stops).
 *
 * Fully client-side so it can add interactive hover/click without
 * needing server hydration tricks.
 */

import Link from "next/link";
import { Clock, MapPin, Navigation } from "lucide-react";

export type StopState = "past" | "current" | "future" | "neutral";

export interface TimelineStop {
  id: string;
  name: string;
  href?: string | null;
  scheduledTime?: string | null;
  /** Optional distance from previous stop in metres */
  distanceFromPrevM?: number | null;
  state: StopState;
  platform?: string | null;
  isFirst?: boolean;
  isLast?: boolean;
}

interface StopsTimelineProps {
  stops: TimelineStop[];
  /** Accent color hex for current-stop ring */
  accentColor?: string;
  /** Show distances column (bus mode) */
  showDistances?: boolean;
  /** Collapsed: show only N nearest stops around current */
  maxVisible?: number;
}

function dotClasses(state: StopState) {
  switch (state) {
    case "past":
      return "bg-gray-300 dark:bg-gray-600";
    case "current":
      return "bg-tl-amber-400 ring-4 ring-tl-amber-200 dark:ring-tl-amber-900/40 shadow-sm";
    case "future":
      return "bg-tl-500 dark:bg-tl-400";
    case "neutral":
    default:
      return "bg-tl-600 dark:bg-tl-400";
  }
}

function nameClasses(state: StopState, isEndpoint: boolean) {
  if (state === "current")
    return "font-semibold text-tl-amber-700 dark:text-tl-amber-400";
  if (state === "past") return "text-gray-400 dark:text-gray-500 line-through";
  if (isEndpoint) return "font-semibold text-gray-900 dark:text-gray-100";
  return "text-gray-700 dark:text-gray-300";
}

function lineColor(state: StopState) {
  return state === "past"
    ? "var(--color-tl-200, #c0d5ff)"
    : state === "current"
    ? "var(--color-tl-amber-300, #eca66e)"
    : "var(--color-tl-300, #94b6ff)";
}

export default function StopsTimeline({
  stops,
  showDistances = false,
  maxVisible,
}: StopsTimelineProps) {
  if (stops.length === 0) {
    return (
      <div className="flex items-center gap-3 py-6 text-sm text-gray-400 dark:text-gray-500">
        <Navigation className="w-4 h-4 shrink-0" />
        Sin paradas disponibles en el feed GTFS.
      </div>
    );
  }

  // If maxVisible, collapse around the current stop
  let visibleStops = stops;
  let hiddenBefore = 0;
  let hiddenAfter = 0;

  if (maxVisible && stops.length > maxVisible) {
    const currentIdx = stops.findIndex((s) => s.state === "current");
    const pivotIdx = currentIdx >= 0 ? currentIdx : 0;
    const half = Math.floor(maxVisible / 2);
    const start = Math.max(0, pivotIdx - half);
    const end = Math.min(stops.length, start + maxVisible);
    hiddenBefore = start;
    hiddenAfter = stops.length - end;
    visibleStops = stops.slice(start, end);
  }

  return (
    <div>
      {hiddenBefore > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 pl-6">
          … {hiddenBefore} {hiddenBefore === 1 ? "parada anterior" : "paradas anteriores"}
        </p>
      )}

      <ol className="space-y-0">
        {visibleStops.map((stop, idx) => {
          const isLast = idx === visibleStops.length - 1;
          const isEndpoint =
            stop.isFirst === true || stop.isLast === true || idx === 0 || isLast;

          return (
            <li
              key={`${stop.id}-${idx}`}
              className="flex items-start gap-3 relative pb-2"
            >
              {/* Timeline spine */}
              <div className="flex flex-col items-center flex-shrink-0 pt-1">
                <span
                  className={`w-3 h-3 rounded-full ${dotClasses(stop.state)} transition-colors`}
                  aria-hidden="true"
                />
                {!isLast && (
                  <span
                    className="w-px flex-1 mt-1"
                    style={{
                      minHeight: "20px",
                      backgroundColor: lineColor(stop.state),
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 flex items-start justify-between gap-2 min-w-0 -mt-0.5 pb-1">
                <div className="min-w-0 flex-1">
                  {stop.href ? (
                    <Link
                      href={stop.href}
                      className={`text-sm hover:underline truncate block ${nameClasses(stop.state, isEndpoint)}`}
                    >
                      {stop.name}
                    </Link>
                  ) : (
                    <span
                      className={`text-sm truncate block ${nameClasses(stop.state, isEndpoint)}`}
                    >
                      {stop.name}
                    </span>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {stop.state === "current" && (
                      <span className="text-[10px] uppercase tracking-wide font-bold text-tl-amber-600 dark:text-tl-amber-400">
                        Próxima parada
                      </span>
                    )}
                    {stop.platform && (
                      <span className="text-[10px] bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 font-mono text-gray-600 dark:text-gray-400">
                        Andén {stop.platform}
                      </span>
                    )}
                    {showDistances && stop.distanceFromPrevM !== null && stop.distanceFromPrevM !== undefined && idx > 0 && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        {stop.distanceFromPrevM >= 1000
                          ? `${(stop.distanceFromPrevM / 1000).toFixed(1)} km`
                          : `${stop.distanceFromPrevM} m`}
                      </span>
                    )}
                  </div>
                </div>

                {stop.scheduledTime && (
                  <span className="font-mono text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {stop.scheduledTime.length > 5
                      ? stop.scheduledTime.slice(0, 5)
                      : stop.scheduledTime}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {hiddenAfter > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 pl-6">
          … {hiddenAfter} {hiddenAfter === 1 ? "parada más" : "paradas más"}
        </p>
      )}
    </div>
  );
}
