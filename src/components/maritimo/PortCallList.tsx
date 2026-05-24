"use client";

/**
 * PortCallList — top ports visited (all-time)
 *
 * Shows the top 20 Spanish ports this vessel has called at with:
 * - visit count + last visit date + total time docked
 * - Links to /maritimo/puertos/[slug] for named ports in the SpanishPort catalog
 */

import Link from "next/link";
import { Anchor, ExternalLink, Clock } from "lucide-react";
import type { TopPort } from "@/lib/maritimo/punctuality";

interface PortCallListProps {
  ports: TopPort[];
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDuration(h: number | null | undefined): string {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${h.toFixed(1).replace(".", ",")} h`;
  const days = Math.floor(h / 24);
  const rem = Math.round(h - days * 24);
  return rem > 0 ? `${days} d ${rem} h` : `${days} d`;
}

export function PortCallList({ ports }: PortCallListProps) {
  if (ports.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
        <Anchor className="w-8 h-8 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sin escalas registradas en puertos espanoles.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-tl-sea-100 dark:border-tl-sea-900/40 bg-white dark:bg-gray-900 overflow-hidden">
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {ports.map((port, idx) => (
          <li key={`${port.portName}-${port.portCode}`} className="flex items-center gap-4 px-5 py-4 hover:bg-tl-sea-50/30 dark:hover:bg-tl-sea-900/10 transition-colors">
            {/* Rank badge */}
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background:
                  idx < 3
                    ? "var(--color-tl-sea-100, #e0f2fe)"
                    : "var(--color-gray-100, #f3f4f6)",
                color:
                  idx < 3
                    ? "var(--color-tl-sea-700, #0369a1)"
                    : "var(--color-gray-600, #4b5563)",
              }}
            >
              {idx + 1}
            </span>

            {/* Port info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {port.portSlug ? (
                  <Link
                    href={`/maritimo/puertos/${port.portSlug}`}
                    className="font-medium text-sm text-tl-sea-600 dark:text-tl-sea-400 hover:underline truncate"
                  >
                    {port.portName}
                  </Link>
                ) : (
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {port.portName}
                  </span>
                )}
                {port.portCode && (
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {port.portCode}
                  </span>
                )}
                {port.portSlug && (
                  <ExternalLink className="w-3 h-3 text-tl-sea-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Ultima visita: {fmtDate(port.lastVisitAt)}
                </span>
                {port.totalDurationH != null && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Total: {fmtDuration(port.totalDurationH)}
                  </span>
                )}
              </div>
            </div>

            {/* Visits count */}
            <div className="flex-shrink-0 text-right">
              <div className="font-mono text-xl font-bold text-tl-sea-600 dark:text-tl-sea-400 [font-family:var(--font-jetbrains-mono)]">
                {port.visits}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {port.visits === 1 ? "escala" : "escalas"}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
