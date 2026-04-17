/**
 * Weekly Digest — React Email Component
 *
 * Alternative rendering path for the weekly digest email.
 * Can be previewed via React Email dev server or rendered via
 * `renderToStaticMarkup(WeeklyDigestEmail({ data, unsubscribeUrl }))`.
 *
 * Same visual output as render.ts but as a composable React component.
 * All styles are inline for email client compatibility.
 *
 * Usage (preview):
 *   npx email dev   # opens http://localhost:3000 with live preview
 *
 * Usage (programmatic):
 *   import { renderToStaticMarkup } from "react-dom/server";
 *   import { WeeklyDigestEmail } from "@/emails/weekly-digest";
 *   const html = renderToStaticMarkup(<WeeklyDigestEmail data={data} unsubscribeUrl={url} />);
 */

import React from "react";
import type { DigestData } from "../../services/collector/tasks/weekly-digest/compose.js";

// ---------------------------------------------------------------------------
// Brand constants (hex approximations from globals.css OKLCH tokens)
// ---------------------------------------------------------------------------

const C = {
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
  text: "#111827",
  textSec: "#374151",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  bgPage: "#f3f4f6",
  bgCard: "#f9fafb",
  white: "#ffffff",
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";
const MONO = "monospace";

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
  const map: Record<string, { text: string; color: string }> = {
    VERY_HIGH: { text: "Muy alta", color: C.danger },
    HIGH: { text: "Alta", color: C.warning },
    MEDIUM: { text: "Media", color: "#d97706" },
    LOW: { text: "Baja", color: C.textMuted },
  };
  return map[severity] ?? { text: severity, color: C.textMuted };
}

function incidentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    ACCIDENT: "Accidente", ROADWORK: "Obra", WEATHER: "Meteorológica",
    CONGESTION: "Retención", RESTRICTION: "Restricción",
    INCIDENT: "Incidencia", CLOSURE: "Corte", OTHER: "Otro",
  };
  return map[type] ?? type;
}

function weatherTypeLabel(type: string): string {
  const map: Record<string, string> = {
    RAIN: "Lluvia", SNOW: "Nieve", ICE: "Hielo", FOG: "Niebla",
    WIND: "Viento", TEMPERATURE: "Temperatura", STORM: "Tormenta",
    COASTAL: "Costera", OTHER: "Meteorológica",
  };
  return map[type] ?? type;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function EmailLayout({
  children,
  unsubscribeUrl,
}: {
  children: React.ReactNode;
  unsubscribeUrl: string;
}) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Resumen semanal de tráfico — trafico.live</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: C.bgPage, fontFamily: FONT }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: C.bgPage, minHeight: "100%" }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "24px 16px" }}>
                <table
                  role="presentation"
                  width={600}
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    backgroundColor: C.white,
                    borderRadius: 12,
                    overflow: "hidden",
                    maxWidth: 600,
                    width: "100%",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <tbody>
                    {/* Header */}
                    <tr>
                      <td style={{ backgroundColor: C.dark, padding: "20px 32px" }}>
                        <a
                          href="https://trafico.live"
                          style={{
                            color: C.amberLight,
                            fontSize: 24,
                            fontWeight: 800,
                            textDecoration: "none",
                            letterSpacing: -0.5,
                            fontFamily: FONT,
                          }}
                        >
                          trafico.live
                        </a>
                        <span
                          style={{
                            color: "#6b7280",
                            fontSize: 13,
                            marginLeft: 12,
                            fontFamily: FONT,
                          }}
                        >
                          Inteligencia vial en tiempo real
                        </span>
                      </td>
                    </tr>

                    {/* Body */}
                    <tr>
                      <td style={{ padding: "32px 32px 8px" }}>{children}</td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          padding: "20px 32px 24px",
                          backgroundColor: C.bgCard,
                          borderTop: `1px solid ${C.border}`,
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 6px",
                            fontSize: 12,
                            color: C.textMuted,
                            lineHeight: 1.5,
                            fontFamily: FONT,
                          }}
                        >
                          Recibes este resumen porque te suscribiste en{" "}
                          <a href="https://trafico.live" style={{ color: C.amber }}>
                            trafico.live
                          </a>
                          .
                        </p>
                        <p
                          style={{ margin: 0, fontSize: 12, color: C.textMuted, fontFamily: FONT }}
                        >
                          <a
                            href={unsubscribeUrl}
                            style={{ color: C.textMuted, textDecoration: "underline" }}
                          >
                            Cancelar suscripción
                          </a>
                          {" · "}Datos: DGT, AEMET, CNMC, Renfe
                        </p>
                        <p
                          style={{
                            margin: "8px 0 0",
                            fontSize: 11,
                            color: "#d1d5db",
                            fontFamily: FONT,
                          }}
                        >
                          trafico.live — Certus SPV, SLU · Operado por Abemon
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: "24px 0 12px",
        fontSize: 16,
        fontWeight: 700,
        color: C.text,
        fontFamily: FONT,
        borderBottom: `2px solid ${C.blue}`,
        paddingBottom: 6,
      }}
    >
      {children}
    </h2>
  );
}

function IncidentsSection({ data }: { data: DigestData }) {
  if (!data.incidents) return null;
  const { top, totalCount, pctChange } = data.incidents;
  const trendColor =
    pctChange !== null
      ? pctChange > 5 ? C.danger : pctChange < -5 ? C.success : C.textMuted
      : C.textMuted;

  return (
    <>
      <SectionTitle>Principales incidencias de la semana</SectionTitle>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ marginBottom: 8, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}
      >
        <thead>
          <tr style={{ backgroundColor: C.bgCard }}>
            <th
              style={{
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 600,
                color: C.textMuted,
                textAlign: "left",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: FONT,
              }}
            >
              Incidencia
            </th>
            <th
              style={{
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 600,
                color: C.textMuted,
                textAlign: "right",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: FONT,
              }}
            >
              Gravedad
            </th>
          </tr>
        </thead>
        <tbody>
          {top.map((inc) => {
            const sev = severityLabel(inc.severity);
            const dur = inc.durationSecs
              ? inc.durationSecs >= 3600
                ? `${(inc.durationSecs / 3600).toFixed(1)}h`
                : `${Math.round(inc.durationSecs / 60)} min`
              : null;
            return (
              <tr key={inc.id}>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: `1px solid ${C.border}`,
                    fontFamily: FONT,
                  }}
                >
                  <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: C.text }}>
                    {incidentTypeLabel(inc.type)}{" "}
                    <span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}>
                      — {inc.provinceName ?? "España"}
                    </span>
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>
                    {inc.roadNumber ?? "—"}
                    {inc.kmPoint !== null ? ` km ${Math.round(inc.kmPoint)}` : ""}
                    {dur ? ` · Duración: ${dur}` : ""}
                  </p>
                  {inc.description && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textSec, fontStyle: "italic" }}>
                      {inc.description.slice(0, 120)}{inc.description.length > 120 ? "…" : ""}
                    </p>
                  )}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: `1px solid ${C.border}`,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                    verticalAlign: "top",
                    fontFamily: FONT,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: sev.color }}>{sev.text}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted, fontFamily: FONT }}>
        Total semana:{" "}
        <strong style={{ color: C.text }}>{totalCount.toLocaleString("es-ES")}</strong>{" "}
        incidencias{" "}
        {pctChange !== null && (
          <span style={{ color: trendColor }}>{fmtPct(pctChange)} vs semana anterior</span>
        )}
      </p>
      <p style={{ margin: "12px 0 0", fontFamily: FONT }}>
        <a
          href={`${data.baseUrl}/incidencias`}
          style={{ fontSize: 13, color: C.blue, textDecoration: "none", fontWeight: 600 }}
        >
          Ver todas las incidencias →
        </a>
      </p>
    </>
  );
}

function FuelSection({ data }: { data: DigestData }) {
  if (!data.fuel) return null;
  const { gasoline95CurrentAvg, gasoline95PctChange, dieselCurrentAvg, dieselPctChange, cheapestProvince, mostExpensiveProvince } = data.fuel;

  const fuelPctColor = (pct: number | null) =>
    pct !== null ? (pct > 2 ? C.danger : pct < -2 ? C.success : C.textMuted) : C.textMuted;

  return (
    <>
      <SectionTitle>Tendencia del combustible</SectionTitle>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 8 }}>
        <tbody>
          <tr>
            <td
              width="48%"
              style={{ padding: "12px 16px", backgroundColor: C.bgCard, borderRadius: 8, textAlign: "center", fontFamily: FONT }}
            >
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" }}>
                Gasolina 95
              </p>
              <p style={{ margin: "4px 0", fontSize: 26, fontWeight: 800, color: C.text, fontFamily: MONO }}>
                {fmtPrice(gasoline95CurrentAvg)}{" "}
                <span style={{ fontSize: 14, fontWeight: 400, fontFamily: FONT }}>€/L</span>
              </p>
              {gasoline95PctChange !== null && (
                <span style={{ fontSize: 12, color: fuelPctColor(gasoline95PctChange) }}>
                  {fmtPct(gasoline95PctChange)}
                </span>
              )}
            </td>
            <td width="4%">&nbsp;</td>
            <td
              width="48%"
              style={{ padding: "12px 16px", backgroundColor: C.bgCard, borderRadius: 8, textAlign: "center", fontFamily: FONT }}
            >
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" }}>
                Gasóleo A
              </p>
              <p style={{ margin: "4px 0", fontSize: 26, fontWeight: 800, color: C.text, fontFamily: MONO }}>
                {fmtPrice(dieselCurrentAvg)}{" "}
                <span style={{ fontSize: 14, fontWeight: 400, fontFamily: FONT }}>€/L</span>
              </p>
              {dieselPctChange !== null && (
                <span style={{ fontSize: 12, color: fuelPctColor(dieselPctChange) }}>
                  {fmtPct(dieselPctChange)}
                </span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
      {cheapestProvince && mostExpensiveProvince && (
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: 8, marginBottom: 8 }}>
          <tbody>
            <tr>
              <td width="48%" style={{ padding: "10px 14px", backgroundColor: C.successBg, borderRadius: 8, textAlign: "center", fontFamily: FONT }}>
                <p style={{ margin: 0, fontSize: 11, color: C.success, fontWeight: 600, textTransform: "uppercase" }}>Más barato</p>
                <p style={{ margin: "3px 0", fontSize: 15, fontWeight: 700, color: C.text }}>{cheapestProvince.name}</p>
                <p style={{ margin: 0, fontSize: 13, color: C.textSec, fontFamily: MONO }}>{fmtPrice(cheapestProvince.price)} €/L</p>
              </td>
              <td width="4%">&nbsp;</td>
              <td width="48%" style={{ padding: "10px 14px", backgroundColor: C.dangerBg, borderRadius: 8, textAlign: "center", fontFamily: FONT }}>
                <p style={{ margin: 0, fontSize: 11, color: C.danger, fontWeight: 600, textTransform: "uppercase" }}>Más caro</p>
                <p style={{ margin: "3px 0", fontSize: 15, fontWeight: 700, color: C.text }}>{mostExpensiveProvince.name}</p>
                <p style={{ margin: 0, fontSize: 13, color: C.textSec, fontFamily: MONO }}>{fmtPrice(mostExpensiveProvince.price)} €/L</p>
              </td>
            </tr>
          </tbody>
        </table>
      )}
      <p style={{ margin: "8px 0 0", fontFamily: FONT }}>
        <a href={`${data.baseUrl}/gasolineras/baratas`} style={{ fontSize: 13, color: C.blue, textDecoration: "none", fontWeight: 600 }}>
          Ver gasolineras más baratas →
        </a>
      </p>
    </>
  );
}

function RailSection({ data }: { data: DigestData }) {
  if (!data.rail) return null;
  const { avgDelayMin, punctualityRate, worstBrand, worstBrandAvgDelay, totalAlerts, totalCancellations } = data.rail;
  const punctColor =
    punctualityRate !== null
      ? punctualityRate >= 85 ? C.success : punctualityRate >= 70 ? C.warning : C.danger
      : C.textMuted;

  return (
    <>
      <SectionTitle>Puntualidad ferroviaria Renfe</SectionTitle>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 8 }}>
        <tbody>
          <tr>
            <td width="48%" style={{ padding: "12px 16px", backgroundColor: C.bgCard, borderRadius: 8, textAlign: "center", fontFamily: FONT }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" }}>Puntualidad media</p>
              <p style={{ margin: "4px 0", fontSize: 28, fontWeight: 800, color: punctColor }}>
                {punctualityRate !== null ? `${punctualityRate.toFixed(1)}%` : "N/D"}
              </p>
            </td>
            <td width="4%">&nbsp;</td>
            <td width="48%" style={{ padding: "12px 16px", backgroundColor: C.bgCard, borderRadius: 8, textAlign: "center", fontFamily: FONT }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" }}>Retraso medio</p>
              <p style={{ margin: "4px 0", fontSize: 28, fontWeight: 800, color: C.text }}>
                {avgDelayMin !== null ? `${avgDelayMin.toFixed(1)} min` : "N/D"}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
      {worstBrand && (
        <p style={{ margin: "0 0 4px", fontSize: 13, color: C.textSec, fontFamily: FONT }}>
          Marca con mayor retraso:{" "}
          <strong style={{ color: C.danger }}>{worstBrand}</strong>
          {worstBrandAvgDelay !== null ? ` (${worstBrandAvgDelay.toFixed(1)} min de media)` : ""}
        </p>
      )}
      {(totalAlerts > 0 || totalCancellations > 0) && (
        <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted, fontFamily: FONT }}>
          {totalAlerts > 0 && `${totalAlerts} alertas de servicio`}
          {totalAlerts > 0 && totalCancellations > 0 && " · "}
          {totalCancellations > 0 && `${totalCancellations} cancelaciones`}
        </p>
      )}
      <p style={{ margin: "10px 0 0", fontFamily: FONT }}>
        <a href={`${data.baseUrl}/trenes`} style={{ fontSize: 13, color: C.blue, textDecoration: "none", fontWeight: 600 }}>
          Ver mapa de trenes en tiempo real →
        </a>
      </p>
    </>
  );
}

function WeatherSection({ data }: { data: DigestData }) {
  if (!data.weather) return null;
  const { totalAlerts, extremeAlerts, biggestEvent } = data.weather;
  const bg = extremeAlerts > 0 ? C.dangerBg : C.warningBg;
  const accentColor = extremeAlerts > 0 ? C.danger : C.warning;

  return (
    <>
      <SectionTitle>Alertas meteorológicas</SectionTitle>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 8, backgroundColor: bg, borderRadius: 8 }}>
        <tbody>
          <tr>
            <td style={{ padding: "14px 20px", fontFamily: FONT }}>
              <p style={{ margin: 0, fontSize: 15, color: C.text }}>
                <strong>{totalAlerts}</strong> alertas activas esta semana
                {extremeAlerts > 0 && (
                  <> ⚠️ <strong style={{ color: accentColor }}>{extremeAlerts} de alta severidad</strong></>
                )}
              </p>
              {biggestEvent && (
                <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textSec }}>
                  Evento principal: <strong>{weatherTypeLabel(biggestEvent.type)}</strong>
                  {biggestEvent.provinceName ? ` en ${biggestEvent.provinceName}` : ""}
                  {biggestEvent.description ? ` — ${biggestEvent.description.slice(0, 100)}` : ""}
                </p>
              )}
            </td>
          </tr>
        </tbody>
      </table>
      <p style={{ margin: 0, fontFamily: FONT }}>
        <a href={`${data.baseUrl}/alertas-meteo`} style={{ fontSize: 13, color: C.blue, textDecoration: "none", fontWeight: 600 }}>
          Ver alertas meteorológicas →
        </a>
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export interface WeeklyDigestEmailProps {
  data: DigestData;
  unsubscribeUrl: string;
}

export function WeeklyDigestEmail({ data, unsubscribeUrl }: WeeklyDigestEmailProps) {
  return (
    <EmailLayout unsubscribeUrl={unsubscribeUrl}>
      {/* Title */}
      <h1
        style={{
          margin: "0 0 4px",
          fontSize: 22,
          fontWeight: 800,
          color: C.text,
          fontFamily: FONT,
        }}
      >
        Resumen semanal de tráfico
      </h1>
      <p style={{ margin: "0 0 0", fontSize: 14, color: C.textMuted, fontFamily: FONT }}>
        {data.weekRange} · {data.weekLabel}
      </p>

      {/* Sections */}
      <IncidentsSection data={data} />
      <WeatherSection data={data} />
      <FuelSection data={data} />
      <RailSection data={data} />

      {/* CTA */}
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ marginTop: 28, marginBottom: 8 }}
      >
        <tbody>
          <tr>
            <td align="center">
              <a
                href={`${data.baseUrl}/incidencias`}
                style={{
                  display: "inline-block",
                  padding: "13px 36px",
                  backgroundColor: C.blue,
                  color: C.white,
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: "none",
                  borderRadius: 8,
                  fontFamily: FONT,
                }}
              >
                Ver más en trafico.live/incidencias
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </EmailLayout>
  );
}

export default WeeklyDigestEmail;
