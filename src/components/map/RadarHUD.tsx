"use client";

import { useEffect, useState } from "react";
import type { RadarProximityState } from "@/hooks/useRadarProximity";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RadarHUDProps {
  proximityState: RadarProximityState;
  /** Whether the parent has radar proximity tracking enabled at all */
  enabled: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RADAR_TYPE_LABELS: Record<string, string> = {
  FIXED: "Radar fijo",
  SECTION: "Tramo controlado",
  MOBILE_ZONE: "Zona móvil",
  TRAFFIC_LIGHT: "Radar semafórico",
};

/** Dot colour per radar type */
const RADAR_TYPE_DOT: Record<string, string> = {
  FIXED: "bg-yellow-400",
  SECTION: "bg-orange-500",
  MOBILE_ZONE: "bg-tl-amber-400",
  TRAFFIC_LIGHT: "bg-red-500",
};

function formatDistance(metres: number): string {
  if (metres >= 1000) {
    const km = (metres / 1000).toFixed(1).replace(".", ",");
    return `${km} km`;
  }
  return `${Math.round(metres)} m`;
}

function formatSpeed(ms: number | null): string {
  if (ms === null) return "--";
  return Math.round(ms * 3.6).toString(); // m/s → km/h
}

/** Approach progress 0→1 (1 = at the radar). maxDist is when we first notice it. */
function approachProgress(distance: number, maxDist: number): number {
  return Math.max(0, Math.min(1, 1 - distance / maxDist));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpeedBadge({
  speedMs,
  limitKmh,
}: {
  speedMs: number | null;
  limitKmh: number | null;
}) {
  const speedKmh = speedMs !== null ? Math.round(speedMs * 3.6) : null;
  const hasLimit = limitKmh !== null && limitKmh > 0;

  let speedColor = "text-green-400";
  if (speedKmh !== null && hasLimit) {
    const ratio = speedKmh / limitKmh!;
    if (ratio > 1) speedColor = "text-red-500";
    else if (ratio > 0.9) speedColor = "text-tl-amber-400";
    else speedColor = "text-green-400";
  }

  return (
    <div className="flex items-center gap-3">
      {/* Current speed */}
      <div className="flex items-baseline gap-0.5">
        <span className={`font-mono text-2xl font-bold leading-none ${speedColor}`}>
          {speedKmh ?? "--"}
        </span>
        <span className="text-gray-400 text-xs font-mono ml-0.5">km/h</span>
      </div>

      {hasLimit && (
        <>
          <span className="text-gray-600 text-sm select-none">·</span>
          {/* Speed limit */}
          <div className="flex items-center gap-1">
            <span className="font-heading text-gray-400 text-xs uppercase tracking-wide">Límite</span>
            <span className="font-mono text-white text-sm font-semibold">{limitKmh}</span>
            <span className="text-gray-500 text-xs font-mono">km/h</span>
          </div>
        </>
      )}
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100);
  // Colour shifts from tl-500 → tl-amber-400 → red-500 as we approach
  const barColor =
    progress < 0.5
      ? "bg-tl-500"
      : progress < 0.8
      ? "bg-tl-amber-400"
      : "bg-red-500";

  return (
    <div
      className="w-full h-1.5 rounded-full bg-gray-700 overflow-hidden"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Proximidad al radar: ${pct}%`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RadarHUD({ proximityState, enabled }: RadarHUDProps) {
  const { userPosition, userSpeed, closestRadar, isTracking, error } = proximityState;

  // Respect prefers-reduced-motion for entry/exit animation
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Visibility state for animated entry/exit
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Show HUD if tracking (or erroring) while enabled
    const shouldShow = enabled && (isTracking || !!error);
    if (shouldShow) {
      // Small defer so mount → opacity transition triggers
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [enabled, isTracking, error]);

  if (!enabled) return null;

  const transitionClass = prefersReducedMotion
    ? ""
    : "transition-opacity duration-300 ease-out";
  const visibilityClass = visible ? "opacity-100" : "opacity-0 pointer-events-none";

  // ── GPS unavailable / error states ──────────────────────────────────────

  if (error) {
    return (
      <div
        className={`
          fixed bottom-20 left-1/2 -translate-x-1/2 z-40
          bg-gray-900/90 backdrop-blur-sm rounded-xl
          border border-gray-700/60 shadow-2xl
          px-4 py-3 w-[calc(100%-2rem)] max-w-sm
          ${transitionClass} ${visibilityClass}
        `}
        role="alert"
        aria-live="polite"
      >
        <p className="text-red-400 text-sm font-heading text-center">{error}</p>
      </div>
    );
  }

  if (!isTracking || !userPosition) {
    return (
      <div
        className={`
          fixed bottom-20 left-1/2 -translate-x-1/2 z-40
          bg-gray-900/90 backdrop-blur-sm rounded-xl
          border border-gray-700/60 shadow-2xl
          px-4 py-3 w-[calc(100%-2rem)] max-w-sm
          ${transitionClass} ${visibilityClass}
        `}
        role="status"
        aria-live="polite"
      >
        <p className="text-gray-400 text-sm font-heading text-center">GPS desactivado</p>
      </div>
    );
  }

  // ── No radar nearby ──────────────────────────────────────────────────────

  if (!closestRadar) {
    return (
      <div
        className={`
          fixed bottom-20 left-1/2 -translate-x-1/2 z-40
          bg-gray-900/90 backdrop-blur-sm rounded-xl
          border border-gray-700/60 shadow-2xl
          px-4 py-3 w-[calc(100%-2rem)] max-w-sm
          flex items-center justify-between gap-4
          ${transitionClass} ${visibilityClass}
        `}
        role="status"
      >
        <SpeedBadge speedMs={userSpeed} limitKmh={null} />
        <span className="text-gray-500 text-xs font-heading text-right">
          Sin radares próximos
        </span>
      </div>
    );
  }

  // ── Radar in range ───────────────────────────────────────────────────────

  const radar = closestRadar;
  const isSection = radar.type === "SECTION";
  const dotClass = RADAR_TYPE_DOT[radar.type] ?? "bg-gray-400";
  const typeLabel = RADAR_TYPE_LABELS[radar.type] ?? radar.type;
  const progress = approachProgress(radar.distance, 5000);

  return (
    <div
      className={`
        fixed bottom-20 left-1/2 -translate-x-1/2 z-40
        bg-gray-900/90 backdrop-blur-sm rounded-xl
        border border-gray-700/60 shadow-2xl
        px-4 pt-3 pb-3.5
        w-[calc(100%-2rem)] max-w-sm
        space-y-2.5
        ${transitionClass} ${visibilityClass}
      `}
      role="status"
      aria-live="polite"
      aria-label={`Alerta de radar: ${typeLabel} a ${formatDistance(radar.distance)}`}
    >
      {/* Row 1: speed + limit */}
      <SpeedBadge speedMs={userSpeed} limitKmh={radar.speedLimit} />

      {/* Row 2: radar type + distance */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Coloured type dot */}
          <span
            className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${dotClass}`}
            aria-hidden="true"
          />
          <span className="font-heading text-white text-sm truncate">{typeLabel}</span>
        </div>

        {/* Distance — large, monospace */}
        <span
          className="font-mono text-white text-lg font-semibold tabular-nums flex-shrink-0"
          aria-label={`Distancia: ${formatDistance(radar.distance)}`}
        >
          {formatDistance(radar.distance)}
        </span>
      </div>

      {/* Row 3: road info */}
      {isSection ? (
        <div className="text-gray-400 text-xs font-heading">
          <span className="text-gray-300">{radar.road}</span>
          {" · "}
          <span>km {radar.kmPoint}</span>
          {radar.avgSpeedPartner && (
            <>
              {" → "}
              <span>km {radar.avgSpeedPartner}</span>
            </>
          )}
          {radar.speedLimit && (
            <>
              {" · "}
              <span className="text-tl-amber-400 font-mono font-medium">
                Límite {radar.speedLimit} km/h
              </span>
            </>
          )}
        </div>
      ) : (
        <div className="text-gray-400 text-xs font-heading">
          <span className="text-gray-300">{radar.road}</span>
          {" · "}
          <span>km {radar.kmPoint}</span>
        </div>
      )}

      {/* Row 4: approach progress bar */}
      <ProgressBar progress={progress} />
    </div>
  );
}
