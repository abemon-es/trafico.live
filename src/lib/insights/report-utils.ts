/**
 * Report Utilities — shared helpers for insight report generation.
 *
 * Formatting, slug helpers, threshold logic, and editorial weight assignment.
 */

import { ArticleCategory } from "@prisma/client";

// ---------------------------------------------------------------------------
// Date / Slug Helpers
// ---------------------------------------------------------------------------

export function todaySlug(): string {
  return new Date().toISOString().split("T")[0];
}

export function weekSlug(): string {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-S${String(weekNum).padStart(2, "0")}`;
}

export function monthSlug(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDateES(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTimeES(date: Date): string {
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Number Formatting
// ---------------------------------------------------------------------------

export function fmtPrice(n: number | null | undefined): string {
  if (n == null) return "N/D";
  return Number(n).toFixed(3);
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null) return "N/D";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("es-ES");
}

export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}min`;
}

// ---------------------------------------------------------------------------
// Editorial Weight Assignment
// ---------------------------------------------------------------------------

/**
 * Assign editorial weight for feed ranking.
 * Higher weight = more prominent in /noticias feed.
 */
export function getEditorialWeight(category: ArticleCategory): number {
  switch (category) {
    // Evergreen analytical — highest value
    case "ANNUAL_REPORT":
    case "ROAD_ANALYSIS":
      return 10;
    // Monthly analysis
    case "MONTHLY_REPORT":
      return 9;
    // Weekly summaries
    case "WEEKLY_REPORT":
    case "FUEL_TREND":
      return 7;
    // Daily national
    case "DAILY_REPORT":
      return 5;
    // Event-driven alerts
    case "PRICE_ALERT":
    case "INCIDENT_DIGEST":
    case "WEATHER_ALERT":
      return 4;
    // Manual editorial content
    case "GUIDE":
    case "ANALYSIS":
    case "NEWS":
    case "REGULATORY":
      return 8;
    default:
      return 5;
  }
}

// ---------------------------------------------------------------------------
// Read Time Estimation
// ---------------------------------------------------------------------------

export function estimateReadTime(bodyLength: number): string {
  // Average reading speed: ~200 words/min for Spanish
  // Rough: 5 chars per word
  const words = bodyLength / 5;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min`;
}

// ---------------------------------------------------------------------------
// Markdown Table Builder
// ---------------------------------------------------------------------------

/**
 * Build a markdown table from headers and rows.
 * Used by report generators to embed tables in article body.
 */
export function mdTable(
  headers: string[],
  rows: string[][],
  alignments?: ("left" | "center" | "right")[]
): string {
  const headerLine = `| ${headers.join(" | ")} |`;
  const separatorLine = `| ${headers
    .map((_, i) => {
      const align = alignments?.[i] || "left";
      if (align === "center") return ":---:";
      if (align === "right") return "---:";
      return "---";
    })
    .join(" | ")} |`;
  const rowLines = rows.map((row) => `| ${row.join(" | ")} |`);
  return [headerLine, separatorLine, ...rowLines].join("\n");
}

// ---------------------------------------------------------------------------
// Trend Arrow
// ---------------------------------------------------------------------------

export function trendArrow(change: number): string {
  if (change > 1) return "↑";
  if (change < -1) return "↓";
  return "→";
}

export function trendWord(change: number): string {
  if (change > 5) return "ha subido significativamente";
  if (change > 1) return "ha subido ligeramente";
  if (change < -5) return "ha bajado significativamente";
  if (change < -1) return "ha bajado ligeramente";
  return "se ha mantenido estable";
}

// ---------------------------------------------------------------------------
// Severity Threshold for Alert Publishing
// ---------------------------------------------------------------------------

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

/**
 * Only publish weather alert articles for significant events.
 * Expert recommendation: only RED (VERY_HIGH) and ORANGE (HIGH).
 */
export function shouldPublishWeatherAlert(
  severity: AlertSeverity,
  alertCount: number
): boolean {
  if (severity === "VERY_HIGH") return true;
  if (severity === "HIGH" && alertCount >= 3) return true;
  return false;
}

/**
 * Only publish incident spike articles for significant spikes.
 * Expert recommendation: meaningful threshold, not just 1.5x average.
 */
export function shouldPublishIncidentSpike(
  currentCount: number,
  weekAvg: number,
  minAbsolute = 15
): boolean {
  if (currentCount < minAbsolute) return false;
  return currentCount > weekAvg * 1.8;
}
