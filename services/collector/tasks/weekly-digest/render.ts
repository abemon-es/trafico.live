/**
 * Weekly Digest — HTML Renderer
 *
 * Produces a fully inline-styled HTML email compatible with Gmail,
 * Outlook, Apple Mail, and mobile clients.
 *
 * Brand colors (from src/app/globals.css — approximated as hex for email):
 *   tl-primary   #1b4bd5 (Signal Blue)
 *   tl-accent    #b56200 (Amber 500)
 *   tl-success   #059669
 *   tl-danger    #dc2626
 *   tl-warning   #d48139
 */

import type { DigestData } from "./compose.js";

// ---------------------------------------------------------------------------
// Brand constants
// ---------------------------------------------------------------------------

const BRAND = {
  blue: "#1b4bd5",
  amber: "#b56200",
  amberLight: "#eca66e",
  success: "#059669",
  successBg: "#ecfdf5",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  warning: "#d48139",
  warningBg: "#fefce8",
  dark: "#0a0a0a",
  textPrimary: "#111827",
  textSecondary: "#374151",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  bgPage: "#f3f4f6",
  bgCard: "#f9fafb",
  white: "#ffffff",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return "N/D";
  return n.toFixed(3);
}

function fmtPct(n: number | null): string {
  if (n === null) return "";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function severityLabel(severity: string): { text: string; color: string } {
  switch (severity) {
    case "VERY_HIGH":
      return { text: "Muy alta", color: BRAND.danger };
    case "HIGH":
      return { text: "Alta", color: BRAND.warning };
    case "MEDIUM":
      return { text: "Media", color: "#d97706" };
    default:
      return { text: "Baja", color: BRAND.textMuted };
  }
}

function incidentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    ACCIDENT: "Accidente",
    ROADWORK: "Obra",
    WEATHER: "Meteorológica",
    CONGESTION: "Retención",
    RESTRICTION: "Restricción",
    INCIDENT: "Incidencia",
    CLOSURE: "Corte",
    OTHER: "Otro",
  };
  return map[type] ?? type;
}

function weatherTypeLabel(type: string): string {
  const map: Record<string, string> = {
    RAIN: "Lluvia",
    SNOW: "Nieve",
    ICE: "Hielo",
    FOG: "Niebla",
    WIND: "Viento",
    TEMPERATURE: "Temperatura",
    STORM: "Tormenta",
    COASTAL: "Costera",
    OTHER: "Meteorológica",
  };
  return map[type] ?? type;
}

function trendBadge(pctChange: number | null): string {
  if (pctChange === null) return "";
  if (pctChange > 5)
    return `<span style="color:${BRAND.danger}; font-size:13px;">&#x25B2; ${fmtPct(pctChange)} vs semana anterior</span>`;
  if (pctChange < -5)
    return `<span style="color:${BRAND.success}; font-size:13px;">&#x25BC; ${fmtPct(pctChange)} vs semana anterior</span>`;
  return `<span style="color:${BRAND.textMuted}; font-size:13px;">&#8594; ${fmtPct(pctChange)} vs semana anterior</span>`;
}

// ---------------------------------------------------------------------------
// Layout wrapper
// ---------------------------------------------------------------------------

function layout(content: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Resumen semanal de tráfico — trafico.live</title>
</head>
<body style="margin:0; padding:0; background-color:${BRAND.bgPage}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bgPage}; min-height:100%;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <!-- Outer card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="background-color:${BRAND.white}; border-radius:12px; overflow:hidden; max-width:600px; width:100%; box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- ── Header ────────────────────────────────────────────────── -->
          <tr>
            <td style="background-color:${BRAND.dark}; padding:20px 32px;">
              <a href="https://trafico.live"
                 style="color:${BRAND.amberLight}; font-size:24px; font-weight:800; text-decoration:none; letter-spacing:-0.5px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                trafico.live
              </a>
              <span style="color:#6b7280; font-size:13px; margin-left:12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                Inteligencia vial en tiempo real
              </span>
            </td>
          </tr>

          <!-- ── Body ─────────────────────────────────────────────────── -->
          <tr>
            <td style="padding:32px 32px 8px;">
              ${content}
            </td>
          </tr>

          <!-- ── Footer ───────────────────────────────────────────────── -->
          <tr>
            <td style="padding:20px 32px 24px; background-color:${BRAND.bgCard}; border-top:1px solid ${BRAND.border};">
              <p style="margin:0 0 6px; font-size:12px; color:${BRAND.textMuted}; line-height:1.5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                Recibes este resumen porque te suscribiste en
                <a href="https://trafico.live" style="color:${BRAND.amber};">trafico.live</a>.
              </p>
              <p style="margin:0; font-size:12px; color:${BRAND.textMuted}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                <a href="${unsubscribeUrl}" style="color:${BRAND.textMuted}; text-decoration:underline;">Cancelar suscripción</a>
                &nbsp;·&nbsp; Datos: DGT, AEMET, CNMC, Renfe
              </p>
              <p style="margin:8px 0 0; font-size:11px; color:#d1d5db; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
                trafico.live — Certus SPV, SLU · Operado por Abemon
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function sectionTitle(title: string): string {
  return `<h2 style="margin:24px 0 12px; font-size:16px; font-weight:700; color:${BRAND.textPrimary}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; border-bottom:2px solid ${BRAND.blue}; padding-bottom:6px;">${title}</h2>`;
}

function renderIncidents(data: DigestData): string {
  if (!data.incidents) return "";

  const { top, totalCount, pctChange } = data.incidents;

  const incidentRows = top
    .map((inc) => {
      const sev = severityLabel(inc.severity);
      const road = inc.roadNumber ? `${inc.roadNumber}${inc.kmPoint ? ` km ${inc.kmPoint.toFixed(0)}` : ""}` : "—";
      const loc = inc.provinceName ?? "España";
      const dur = inc.durationSecs
        ? inc.durationSecs >= 3600
          ? `${(inc.durationSecs / 3600).toFixed(1)}h`
          : `${Math.round(inc.durationSecs / 60)} min`
        : null;

      return `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid ${BRAND.border}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          <p style="margin:0 0 2px; font-size:14px; font-weight:600; color:${BRAND.textPrimary};">
            ${incidentTypeLabel(inc.type)}
            <span style="font-size:12px; font-weight:400; color:${BRAND.textMuted};">— ${loc}</span>
          </p>
          <p style="margin:0; font-size:12px; color:${BRAND.textMuted};">
            ${road}${dur ? ` · Duración: ${dur}` : ""}
          </p>
          ${inc.description ? `<p style="margin:4px 0 0; font-size:12px; color:${BRAND.textSecondary}; font-style:italic;">${inc.description.slice(0, 120)}${inc.description.length > 120 ? "…" : ""}</p>` : ""}
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid ${BRAND.border}; text-align:right; white-space:nowrap; vertical-align:top; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          <span style="font-size:12px; font-weight:600; color:${sev.color};">${sev.text}</span>
        </td>
      </tr>`;
    })
    .join("");

  return `
    ${sectionTitle("Principales incidencias de la semana")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="margin-bottom:8px; border:1px solid ${BRAND.border}; border-radius:8px; overflow:hidden;">
      <tr style="background-color:${BRAND.bgCard};">
        <th style="padding:8px 12px; font-size:11px; font-weight:600; color:${BRAND.textMuted}; text-align:left; text-transform:uppercase; letter-spacing:0.05em; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          Incidencia
        </th>
        <th style="padding:8px 12px; font-size:11px; font-weight:600; color:${BRAND.textMuted}; text-align:right; text-transform:uppercase; letter-spacing:0.05em; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          Gravedad
        </th>
      </tr>
      ${incidentRows}
    </table>
    <p style="margin:4px 0 0; font-size:13px; color:${BRAND.textMuted}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      Total semana: <strong style="color:${BRAND.textPrimary};">${totalCount.toLocaleString("es-ES")}</strong> incidencias
      ${trendBadge(pctChange)}
    </p>
    <p style="margin:12px 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      <a href="${data.baseUrl}/incidencias"
         style="font-size:13px; color:${BRAND.blue}; text-decoration:none; font-weight:600;">
        Ver todas las incidencias &#8594;
      </a>
    </p>`;
}

function renderHottestRoad(data: DigestData): string {
  if (!data.hottestRoad) return "";

  const { roadNumber, incidentCount, avgSeverityScore } = data.hottestRoad;
  const quality =
    avgSeverityScore >= 3.5
      ? { label: "Crítica", color: BRAND.danger, bg: BRAND.dangerBg }
      : avgSeverityScore >= 2.5
      ? { label: "Alta", color: BRAND.warning, bg: BRAND.warningBg }
      : { label: "Moderada", color: "#d97706", bg: "#fffbeb" };

  return `
    ${sectionTitle("Carretera con mas incidencias")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="margin-bottom:8px; background-color:${quality.bg}; border-radius:8px; overflow:hidden;">
      <tr>
        <td style="padding:16px 20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          <p style="margin:0; font-size:22px; font-weight:800; color:${BRAND.textPrimary};">${roadNumber}</p>
          <p style="margin:4px 0 0; font-size:14px; color:${BRAND.textSecondary};">
            ${incidentCount} incidencias &nbsp;·&nbsp;
            Siniestralidad media: <span style="color:${quality.color}; font-weight:600;">${quality.label}</span>
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      <a href="${data.baseUrl}/carreteras"
         style="font-size:13px; color:${BRAND.blue}; text-decoration:none; font-weight:600;">
        Ver estado de carreteras &#8594;
      </a>
    </p>`;
}

function renderWeather(data: DigestData): string {
  if (!data.weather) return "";

  const { totalAlerts, extremeAlerts, biggestEvent } = data.weather;
  const severityColor = extremeAlerts > 0 ? BRAND.danger : BRAND.warning;
  const severityBg = extremeAlerts > 0 ? BRAND.dangerBg : BRAND.warningBg;

  return `
    ${sectionTitle("Alertas meteorologicas")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="margin-bottom:8px; background-color:${severityBg}; border-radius:8px;">
      <tr>
        <td style="padding:14px 20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          <p style="margin:0; font-size:15px; color:${BRAND.textPrimary};">
            <strong>${totalAlerts}</strong> alertas activas esta semana
            ${extremeAlerts > 0 ? `&nbsp;&#x26A0;&#xFE0F;&nbsp;<strong style="color:${BRAND.danger};">${extremeAlerts} de alta severidad</strong>` : ""}
          </p>
          ${biggestEvent
            ? `<p style="margin:6px 0 0; font-size:13px; color:${BRAND.textSecondary};">
                Evento principal: <strong>${weatherTypeLabel(biggestEvent.type)}</strong>
                ${biggestEvent.provinceName ? `en ${biggestEvent.provinceName}` : ""}
                ${biggestEvent.description ? `— ${biggestEvent.description.slice(0, 100)}` : ""}
               </p>`
            : ""}
        </td>
      </tr>
    </table>
    <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      <a href="${data.baseUrl}/alertas-meteo"
         style="font-size:13px; color:${BRAND.blue}; text-decoration:none; font-weight:600;">
        Ver alertas meteorologicas &#8594;
      </a>
    </p>`;
}

function renderFuel(data: DigestData): string {
  if (!data.fuel) return "";

  const {
    gasoline95CurrentAvg,
    gasoline95PctChange,
    dieselCurrentAvg,
    dieselPctChange,
    cheapestProvince,
    mostExpensiveProvince,
  } = data.fuel;

  const fuelTrend = (pct: number | null) => {
    if (pct === null) return "";
    const color = pct > 2 ? BRAND.danger : pct < -2 ? BRAND.success : BRAND.textMuted;
    return `<span style="font-size:12px; color:${color};">${fmtPct(pct)}</span>`;
  };

  return `
    ${sectionTitle("Tendencia del combustible")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td width="48%" style="padding:12px 16px; background-color:${BRAND.bgCard}; border-radius:8px; text-align:center; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          <p style="margin:0; font-size:11px; font-weight:600; color:${BRAND.textMuted}; text-transform:uppercase; letter-spacing:0.05em;">Gasolina 95</p>
          <p style="margin:4px 0; font-size:26px; font-weight:800; color:${BRAND.textPrimary}; font-family:monospace;">
            ${fmtPrice(gasoline95CurrentAvg)} <span style="font-size:14px; font-weight:400;">€/L</span>
          </p>
          ${fuelTrend(gasoline95PctChange)}
        </td>
        <td width="4%">&nbsp;</td>
        <td width="48%" style="padding:12px 16px; background-color:${BRAND.bgCard}; border-radius:8px; text-align:center; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          <p style="margin:0; font-size:11px; font-weight:600; color:${BRAND.textMuted}; text-transform:uppercase; letter-spacing:0.05em;">Gasóleo A</p>
          <p style="margin:4px 0; font-size:26px; font-weight:800; color:${BRAND.textPrimary}; font-family:monospace;">
            ${fmtPrice(dieselCurrentAvg)} <span style="font-size:14px; font-weight:400;">€/L</span>
          </p>
          ${fuelTrend(dieselPctChange)}
        </td>
      </tr>
    </table>

    ${cheapestProvince && mostExpensiveProvince
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px; margin-bottom:8px;">
          <tr>
            <td width="48%" style="padding:10px 14px; background-color:${BRAND.successBg}; border-radius:8px; text-align:center; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              <p style="margin:0; font-size:11px; color:${BRAND.success}; font-weight:600; text-transform:uppercase;">Más barato</p>
              <p style="margin:3px 0; font-size:15px; font-weight:700; color:${BRAND.textPrimary};">${cheapestProvince.name}</p>
              <p style="margin:0; font-size:13px; color:${BRAND.textSecondary}; font-family:monospace;">${fmtPrice(cheapestProvince.price)} €/L</p>
            </td>
            <td width="4%">&nbsp;</td>
            <td width="48%" style="padding:10px 14px; background-color:${BRAND.dangerBg}; border-radius:8px; text-align:center; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              <p style="margin:0; font-size:11px; color:${BRAND.danger}; font-weight:600; text-transform:uppercase;">Más caro</p>
              <p style="margin:3px 0; font-size:15px; font-weight:700; color:${BRAND.textPrimary};">${mostExpensiveProvince.name}</p>
              <p style="margin:0; font-size:13px; color:${BRAND.textSecondary}; font-family:monospace;">${fmtPrice(mostExpensiveProvince.price)} €/L</p>
            </td>
          </tr>
        </table>`
      : ""}

    <p style="margin:8px 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      <a href="${data.baseUrl}/gasolineras/baratas"
         style="font-size:13px; color:${BRAND.blue}; text-decoration:none; font-weight:600;">
        Ver gasolineras más baratas &#8594;
      </a>
    </p>`;
}

function renderRail(data: DigestData): string {
  if (!data.rail) return "";

  const { avgDelayMin, punctualityRate, worstBrand, worstBrandAvgDelay, totalAlerts, totalCancellations } =
    data.rail;

  const punctColor =
    punctualityRate !== null
      ? punctualityRate >= 85
        ? BRAND.success
        : punctualityRate >= 70
        ? BRAND.warning
        : BRAND.danger
      : BRAND.textMuted;

  return `
    ${sectionTitle("Puntualidad ferroviaria Renfe")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td width="48%" style="padding:12px 16px; background-color:${BRAND.bgCard}; border-radius:8px; text-align:center; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          <p style="margin:0; font-size:11px; font-weight:600; color:${BRAND.textMuted}; text-transform:uppercase; letter-spacing:0.05em;">Puntualidad media</p>
          <p style="margin:4px 0; font-size:28px; font-weight:800; color:${punctColor};">
            ${punctualityRate !== null ? `${punctualityRate.toFixed(1)}%` : "N/D"}
          </p>
        </td>
        <td width="4%">&nbsp;</td>
        <td width="48%" style="padding:12px 16px; background-color:${BRAND.bgCard}; border-radius:8px; text-align:center; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          <p style="margin:0; font-size:11px; font-weight:600; color:${BRAND.textMuted}; text-transform:uppercase; letter-spacing:0.05em;">Retraso medio</p>
          <p style="margin:4px 0; font-size:28px; font-weight:800; color:${BRAND.textPrimary};">
            ${avgDelayMin !== null ? `${avgDelayMin.toFixed(1)} min` : "N/D"}
          </p>
        </td>
      </tr>
    </table>

    ${worstBrand
      ? `<p style="margin:0 0 4px; font-size:13px; color:${BRAND.textSecondary}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          Marca con mayor retraso: <strong style="color:${BRAND.danger};">${worstBrand}</strong>
          ${worstBrandAvgDelay !== null ? `(${worstBrandAvgDelay.toFixed(1)} min de media)` : ""}
        </p>`
      : ""}

    ${totalAlerts > 0 || totalCancellations > 0
      ? `<p style="margin:4px 0 0; font-size:13px; color:${BRAND.textMuted}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          ${totalAlerts > 0 ? `${totalAlerts} alertas de servicio` : ""}
          ${totalAlerts > 0 && totalCancellations > 0 ? " · " : ""}
          ${totalCancellations > 0 ? `${totalCancellations} cancelaciones` : ""}
        </p>`
      : ""}

    <p style="margin:10px 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      <a href="${data.baseUrl}/trenes"
         style="font-size:13px; color:${BRAND.blue}; text-decoration:none; font-weight:600;">
        Ver mapa de trenes en tiempo real &#8594;
      </a>
    </p>`;
}

function renderTopStations(data: DigestData): string {
  if (!data.topStations || data.topStations.length === 0) return "";

  const rows = data.topStations
    .map(
      (s, i) => `
    <tr>
      <td style="padding:8px 12px; border-bottom:1px solid ${BRAND.border}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
        <span style="font-size:13px; font-weight:600; color:${BRAND.textPrimary};">${i + 1}. ${s.station}</span>
        ${s.network ? `<span style="font-size:12px; color:${BRAND.textMuted};"> · Cercanías ${s.network}</span>` : ""}
      </td>
      <td style="padding:8px 12px; border-bottom:1px solid ${BRAND.border}; text-align:right; white-space:nowrap; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
        <span style="font-size:12px; color:${BRAND.textMuted};">${s.observationCount.toLocaleString("es-ES")} trenes</span>
      </td>
    </tr>`
    )
    .join("");

  return `
    ${sectionTitle("Estaciones Cercanias mas activas")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="margin-bottom:8px; border:1px solid ${BRAND.border}; border-radius:8px; overflow:hidden;">
      ${rows}
    </table>`;
}

function renderCTA(data: DigestData): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px; margin-bottom:8px;">
      <tr>
        <td align="center">
          <a href="${data.baseUrl}/incidencias"
             style="display:inline-block; padding:13px 36px; background-color:${BRAND.blue}; color:${BRAND.white}; font-size:15px; font-weight:700; text-decoration:none; border-radius:8px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
            Ver mas en trafico.live/incidencias
          </a>
        </td>
      </tr>
    </table>`;
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

export function renderDigestHtml(data: DigestData, unsubscribeUrl: string): string {
  const header = `
    <h1 style="margin:0 0 4px; font-size:22px; font-weight:800; color:${BRAND.textPrimary}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      Resumen semanal de trafico
    </h1>
    <p style="margin:0 0 0; font-size:14px; color:${BRAND.textMuted}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
      ${data.weekRange} &nbsp;·&nbsp; ${data.weekLabel}
    </p>`;

  const sections = [
    renderIncidents(data),
    renderHottestRoad(data),
    renderWeather(data),
    renderFuel(data),
    renderRail(data),
    renderTopStations(data),
    renderCTA(data),
  ]
    .filter(Boolean)
    .join("\n");

  return layout(header + sections, unsubscribeUrl);
}

// ---------------------------------------------------------------------------
// Plain-text fallback
// ---------------------------------------------------------------------------

export function renderDigestText(data: DigestData, unsubscribeUrl: string): string {
  const lines: string[] = [
    `RESUMEN SEMANAL DE TRÁFICO — ${data.weekLabel}`,
    `Semana del ${data.weekRange}`,
    "",
  ];

  if (data.incidents) {
    lines.push(
      `INCIDENCIAS: ${data.incidents.totalCount.toLocaleString("es-ES")}${data.incidents.pctChange !== null ? ` (${fmtPct(data.incidents.pctChange)} vs semana anterior)` : ""}`,
      ""
    );
    if (data.incidents.top.length > 0) {
      lines.push("Principales incidencias:");
      for (const inc of data.incidents.top) {
        lines.push(
          `  · ${incidentTypeLabel(inc.type)} — ${inc.provinceName ?? "España"}${inc.roadNumber ? ` (${inc.roadNumber})` : ""} [${inc.severity}]`
        );
      }
      lines.push("");
    }
  }

  if (data.hottestRoad) {
    lines.push(`CARRETERA MÁS CONFLICTIVA: ${data.hottestRoad.roadNumber} (${data.hottestRoad.incidentCount} incidencias)`, "");
  }

  if (data.weather) {
    lines.push(
      `ALERTAS METEO: ${data.weather.totalAlerts} (${data.weather.extremeAlerts} de alta severidad)`,
      ""
    );
  }

  if (data.fuel) {
    if (data.fuel.gasoline95CurrentAvg !== null)
      lines.push(`GASOLINA 95: ${fmtPrice(data.fuel.gasoline95CurrentAvg)} €/L${data.fuel.gasoline95PctChange !== null ? ` (${fmtPct(data.fuel.gasoline95PctChange)})` : ""}`);
    if (data.fuel.dieselCurrentAvg !== null)
      lines.push(`GASÓLEO A: ${fmtPrice(data.fuel.dieselCurrentAvg)} €/L${data.fuel.dieselPctChange !== null ? ` (${fmtPct(data.fuel.dieselPctChange)})` : ""}`);
    if (data.fuel.cheapestProvince)
      lines.push(`Más barato: ${data.fuel.cheapestProvince.name} (${fmtPrice(data.fuel.cheapestProvince.price)} €/L)`);
    if (data.fuel.mostExpensiveProvince)
      lines.push(`Más caro: ${data.fuel.mostExpensiveProvince.name} (${fmtPrice(data.fuel.mostExpensiveProvince.price)} €/L)`);
    lines.push("");
  }

  if (data.rail) {
    lines.push(
      `PUNTUALIDAD RENFE: ${data.rail.punctualityRate !== null ? `${data.rail.punctualityRate.toFixed(1)}%` : "N/D"}`,
      `Retraso medio: ${data.rail.avgDelayMin !== null ? `${data.rail.avgDelayMin.toFixed(1)} min` : "N/D"}`,
      data.rail.worstBrand ? `Marca con mayor retraso: ${data.rail.worstBrand}` : "",
      ""
    );
  }

  lines.push(
    `Ver más: ${data.baseUrl}/incidencias`,
    "",
    "---",
    `Cancelar suscripción: ${unsubscribeUrl}`,
    "trafico.live — Inteligencia vial en tiempo real"
  );

  return lines.filter((l) => l !== undefined).join("\n");
}
