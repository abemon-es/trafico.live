/**
 * Social Broadcast Message Composer
 *
 * Generates per-platform messages (Bluesky, X, Telegram) from structured alert data.
 * All messages are in Spanish, professional tone, no emoji.
 *
 * Platform limits:
 *   Bluesky  — 300 chars
 *   X        — 280 chars (enforced again in x-api.ts)
 *   Telegram — no hard limit; formatted with Markdown
 */

import type { WeatherAlert, TrafficIncident } from "@prisma/client";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://trafico.live";

// Per-platform character limits (leave a small margin)
const BLUESKY_LIMIT = 298;
const X_LIMIT = 278;

// ---------------------------------------------------------------------------
// Severity label helpers
// ---------------------------------------------------------------------------

const SEVERITY_LABEL: Record<string, string> = {
  VERY_HIGH: "AVISO ROJO",
  HIGH: "AVISO NARANJA",
  MEDIUM: "AVISO AMARILLO",
  LOW: "AVISO VERDE",
};

const WEATHER_TYPE_LABEL: Record<string, string> = {
  RAIN: "lluvias intensas",
  SNOW: "nevadas",
  ICE: "hielo en calzada",
  FOG: "niebla densa",
  WIND: "vientos fuertes",
  TEMPERATURE: "temperaturas extremas",
  STORM: "tormentas",
  COASTAL: "fenomenos costeros",
  OTHER: "fenomenos meteorologicos",
};

const INCIDENT_TYPE_LABEL: Record<string, string> = {
  ACCIDENT: "accidente",
  ROADWORKS: "obras en calzada",
  OBSTACLE: "obstaculo en via",
  WEATHER: "condiciones meteorologicas adversas",
  CONGESTION: "congestion grave",
  CLOSURE: "corte de via",
  OTHER: "incidencia de trafico",
};

/** Truncate text to limit, appending ellipsis if cut */
function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1) + "…";
}

/** Format a Date as HH:mm in Madrid local time */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format a Date as dd/MM in Madrid local time */
function formatDate(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// WeatherAlert composer
// ---------------------------------------------------------------------------

export interface ComposedMessages {
  bluesky: string;
  x: string;
  telegram: string;
  /** Canonical URL for the event detail page */
  url: string;
  /** Short version of the URL for embed cards */
  linkTitle: string;
  linkDescription: string;
}

/**
 * Compose social messages for a WeatherAlert.
 * Expects severity='VERY_HIGH' (extreme) or severity='HIGH' (severe).
 */
export function composeWeatherAlert(alert: WeatherAlert): ComposedMessages {
  const severityLabel = SEVERITY_LABEL[alert.severity] ?? "AVISO METEOROLOGICO";
  const typeLabel = WEATHER_TYPE_LABEL[alert.type] ?? "fenomenos meteorologicos";
  const province = alert.provinceName ?? alert.province;

  // Quantitative detail line
  const details: string[] = [];
  if (alert.rainfallMm) details.push(`${alert.rainfallMm} mm/h`);
  if (alert.windGustKmh) details.push(`rachas ${alert.windGustKmh} km/h`);
  if (alert.snowLevelM) details.push(`cota nieve ${alert.snowLevelM} m`);
  if (alert.waveHeightM) details.push(`olas ${alert.waveHeightM} m`);
  if (alert.tempMaxC) details.push(`max ${alert.tempMaxC} °C`);
  if (alert.tempMinC) details.push(`min ${alert.tempMinC} °C`);

  const detailStr = details.length > 0 ? ` (${details.join(", ")})` : "";

  // Timing
  const timingStr = alert.endedAt
    ? ` hasta ${formatTime(alert.endedAt)} del ${formatDate(alert.endedAt)}`
    : "";

  // Slug from alertId: use last segment to keep URL clean
  const slug = alert.alertId.replace(/^AEMET-/, "").replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
  const url = `${BASE_URL}/alertas-meteo/${slug}`;

  // Advisory recommendation for extreme severity
  const advisory =
    alert.severity === "VERY_HIGH"
      ? " Evite desplazamientos no imprescindibles."
      : "";

  // Core message body (no URL — appended per platform)
  const core = `${severityLabel} AEMET: ${typeLabel} en ${province}${detailStr}${timingStr}.${advisory}`;

  // --- Bluesky ---
  const bskyUrl = ` ${url}`;
  const bluesky = truncate(core + bskyUrl, BLUESKY_LIMIT);

  // --- X ---
  const xUrl = ` ${url}`;
  const x = truncate(core + xUrl, X_LIMIT);

  // --- Telegram (Markdown) ---
  // Bold the label, italic the type, linked URL at the end
  const tgCore = `*${severityLabel} AEMET:* ${typeLabel} en ${province}${detailStr}${timingStr}.${advisory}`;
  const telegram = `${tgCore}\n\nDetalles: ${url}`;

  return {
    bluesky,
    x,
    telegram,
    url,
    linkTitle: `${severityLabel} AEMET — ${province}`,
    linkDescription: `${typeLabel}${detailStr}${timingStr}`,
  };
}

// ---------------------------------------------------------------------------
// TrafficIncident composer
// ---------------------------------------------------------------------------

/**
 * Compose social messages for a high-severity TrafficIncident.
 * Only called for severity HIGH or VERY_HIGH.
 */
export function composeTrafficIncident(incident: TrafficIncident): ComposedMessages {
  const typeLabel = INCIDENT_TYPE_LABEL[incident.type] ?? "incidencia de trafico";
  const province = incident.provinceName ?? incident.province ?? "Espana";
  const road = incident.roadNumber ? `en ${incident.roadNumber}` : "";
  const km = incident.kmPoint ? ` pk ${Number(incident.kmPoint).toFixed(1)}` : "";

  const location = [road + km, province].filter(Boolean).join(", ");

  // Timing
  const startedStr = formatTime(incident.startedAt);
  const timingStr = ` desde las ${startedStr}`;

  // URL: link to province page + anchor; use situationId as fallback
  const provinceSlug = incident.province ?? "espana";
  const url = `${BASE_URL}/provincia/${provinceSlug}#incidencias`;

  // Brief description (trim to 80 chars max)
  const descFragment = incident.description
    ? ` — ${incident.description.slice(0, 80).trimEnd()}`
    : "";

  const core = `Incidencia grave: ${typeLabel} ${location}${timingStr}${descFragment}.`;

  // --- Bluesky ---
  const bskyUrl = ` ${url}`;
  const bluesky = truncate(core + bskyUrl, BLUESKY_LIMIT);

  // --- X ---
  const xUrl = ` ${url}`;
  const x = truncate(core + xUrl, X_LIMIT);

  // --- Telegram ---
  const tgCore = `*Incidencia grave DGT:* ${typeLabel} ${location}${timingStr}${descFragment}.`;
  const telegram = `${tgCore}\n\nInfo: ${url}`;

  return {
    bluesky,
    x,
    telegram,
    url,
    linkTitle: `Incidencia — ${typeLabel} en ${province}`,
    linkDescription: `${road}${km}${timingStr}`,
  };
}
