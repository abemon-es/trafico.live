"use client";

import { useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import { motion, useAnimationControls } from "motion/react";
import { AlertTriangle, AlertOctagon, Info, Radio } from "lucide-react";
import { LiveIncidentBadge } from "./LiveIncidentBadge";
import { trackEntityView } from "@/lib/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Incident {
  id: string;
  road: string | null;
  km: number | null;
  severity: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
  description: string | null;
  effect: string;
  cause: string;
  province: string | null;
}

interface IncidentsResponse {
  count: number;
  totalCount: number;
  incidents: Incident[];
  lastUpdated: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// TODO(backend gap): /api/incidents does not support ?live=true yet.
// It already returns only active incidents (isActive: true). When ?live=true is
// implemented by T3, replace INCIDENTS_URL with `/api/incidents?live=true&limit=15`
// and remove this comment.
const INCIDENTS_URL = "/api/incidents?limit=15";
const TICKER_SPEED = 40; // px/s — full scroll duration calculated from content width

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Severity icon ────────────────────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: Incident["severity"] }) {
  const base = "w-4 h-4 flex-shrink-0";
  if (severity === "VERY_HIGH")
    return <AlertOctagon className={`${base} text-tl-amber-500 dark:text-tl-amber-400`} aria-label="Severidad muy alta" />;
  if (severity === "HIGH")
    return <AlertTriangle className={`${base} text-tl-amber-400 dark:text-tl-amber-300`} aria-label="Severidad alta" />;
  if (severity === "MEDIUM")
    return <AlertTriangle className={`${base} text-tl-500 dark:text-tl-400`} aria-label="Severidad media" />;
  return <Info className={`${base} text-gray-400 dark:text-gray-500`} aria-label="Severidad baja" />;
}

// ─── Single ticker item ───────────────────────────────────────────────────────

function TickerItem({ incident }: { incident: Incident }) {
  const roadCode = incident.road ?? "—";
  const roadSlug = incident.road?.toLowerCase().replace(/\s+/g, "-") ?? null;
  const href = roadSlug ? `/carreteras/${roadSlug}` : "/incidencias";
  const desc = incident.description
    ? incident.description.length > 80
      ? `${incident.description.slice(0, 80)}…`
      : incident.description
    : incident.effect.replace(/_/g, " ").toLowerCase();

  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 px-5 py-0 hover:opacity-80 transition-opacity"
      tabIndex={-1}
    >
      <SeverityIcon severity={incident.severity} />

      <LiveIncidentBadge severity={incident.severity} />

      {/* Road code in monospace */}
      <span className="font-mono text-xs font-semibold text-tl-600 dark:text-tl-400 whitespace-nowrap">
        {roadCode}
      </span>

      {/* km marker */}
      {incident.km != null && (
        <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
          km {incident.km.toFixed(0)}
        </span>
      )}

      {/* Description */}
      <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {desc}
      </span>

      {/* Separator */}
      <span className="text-gray-300 dark:text-gray-700 ml-2 select-none">·</span>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TickerSkeleton() {
  return (
    <div className="flex items-center gap-6 h-10 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-gray-200 dark:bg-gray-800 animate-pulse"
          style={{ width: `${80 + i * 30}px` }}
        />
      ))}
    </div>
  );
}

// ─── TickerStrip ──────────────────────────────────────────────────────────────

export function TickerStrip() {
  const { data, isLoading, error } = useSWR<IncidentsResponse>(
    INCIDENTS_URL,
    fetcher,
    { refreshInterval: 60_000, dedupingInterval: 30_000 }
  );

  const controls = useAnimationControls();
  const trackRef = useRef<HTMLDivElement>(null);
  const isHovered = useRef(false);

  // Detect reduced-motion preference
  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const startMarquee = useCallback(async () => {
    if (prefersReduced || !trackRef.current || isHovered.current) return;
    const trackWidth = trackRef.current.scrollWidth / 2; // duplicated content
    await controls.start({
      x: [0, -trackWidth],
      transition: {
        duration: trackWidth / TICKER_SPEED,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
      },
    });
  }, [controls, prefersReduced]);

  const pauseMarquee = useCallback(() => {
    controls.stop();
  }, [controls]);

  const resumeMarquee = useCallback(() => {
    if (!isHovered.current) startMarquee();
  }, [startMarquee]);

  // Restart marquee when data changes
  useEffect(() => {
    if (!isLoading && data?.incidents?.length) {
      startMarquee();
    }
  }, [data, isLoading, startMarquee]);

  // Analytics on first render
  useEffect(() => {
    trackEntityView("incident-ticker", "noticias");
  }, []);

  const incidents = data?.incidents ?? [];
  const count = data?.totalCount ?? data?.count ?? 0;
  const hasStaleData = !isLoading && error && incidents.length > 0;
  const isDataError = !isLoading && error && incidents.length === 0;

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!isLoading && !error && incidents.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-tl-50 dark:bg-tl-900/20 border border-tl-100 dark:border-tl-900/40 text-sm text-gray-500 dark:text-gray-400">
        <span className="text-base">🟢</span>
        <span>No hay incidentes activos — vía libre</span>
      </div>
    );
  }

  // ── Error state (no data at all) ──────────────────────────────────────────
  if (isDataError) {
    return null; // Silent fallback
  }

  return (
    <div className="rounded-xl border border-tl-200 dark:border-tl-900/40 bg-white dark:bg-gray-950 overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-tl-600 dark:bg-tl-700">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-white animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            En vivo
          </span>
          {count > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1.5 rounded-full bg-white/20 text-white text-[10px] font-bold tabular-nums">
              {count}
            </span>
          )}
          <span className="text-[10px] text-white/70 hidden sm:inline">
            incidentes activos ahora
          </span>
        </div>

        {hasStaleData && (
          <span className="text-[10px] text-white/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-tl-amber-400 inline-block" />
            datos pausados
          </span>
        )}
      </div>

      {/* Ticker track */}
      <div
        className="relative h-10 overflow-hidden cursor-default select-none"
        onMouseEnter={() => {
          isHovered.current = true;
          pauseMarquee();
        }}
        onMouseLeave={() => {
          isHovered.current = false;
          resumeMarquee();
        }}
        onFocus={() => {
          isHovered.current = true;
          pauseMarquee();
        }}
        onBlur={() => {
          isHovered.current = false;
          resumeMarquee();
        }}
        role="marquee"
        aria-label={`${count} incidentes activos en carreteras españolas`}
        aria-live="polite"
        aria-atomic="false"
      >
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-white dark:from-gray-950 to-transparent pointer-events-none" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-white dark:from-gray-950 to-transparent pointer-events-none" />

        {isLoading ? (
          <div className="flex items-center h-full px-4">
            <TickerSkeleton />
          </div>
        ) : prefersReduced ? (
          // Static list for reduced-motion
          <ul className="flex items-center h-full overflow-x-auto gap-0 px-4">
            {incidents.map((inc) => (
              <li key={inc.id} className="flex-shrink-0">
                <TickerItem incident={inc} />
              </li>
            ))}
          </ul>
        ) : (
          <motion.div
            ref={trackRef}
            animate={controls}
            className="flex items-center h-full will-change-transform"
            aria-hidden="true"
          >
            {/* Duplicate content for seamless loop */}
            {[...incidents, ...incidents].map((inc, idx) => (
              <TickerItem key={`${inc.id}-${idx}`} incident={inc} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
