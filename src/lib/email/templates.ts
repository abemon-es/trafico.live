/**
 * Email Templates — HTML templates for trafico.live emails.
 *
 * All templates use inline styles (email client compatibility).
 * Brand colors: tl-600 = #d97706 (amber-600 equivalent in OKLCH)
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Shared layout wrapper
// ---------------------------------------------------------------------------

function emailLayout(content: string, unsubscribeUrl?: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>trafico.live</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; max-width:600px; width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:#0a0a0a; padding:20px 32px;">
              <a href="${BASE_URL}" style="color:#f59e0b; font-size:24px; font-weight:800; text-decoration:none; letter-spacing:-0.5px;">trafico.live</a>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px; background-color:#f9fafb; border-top:1px solid #e5e7eb;">
              <p style="margin:0; font-size:12px; color:#9ca3af; line-height:1.5;">
                Recibes este email porque te suscribiste en <a href="${BASE_URL}" style="color:#d97706;">trafico.live</a>.
                ${unsubscribeUrl ? `<br/><a href="${unsubscribeUrl}" style="color:#9ca3af;">Cancelar suscripción</a>` : ""}
              </p>
              <p style="margin:8px 0 0; font-size:11px; color:#d1d5db;">
                trafico.live — Inteligencia vial en tiempo real · Datos: DGT, AEMET, MITERD
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
// Weekly digest email
// ---------------------------------------------------------------------------

export interface WeeklyDigestData {
  weekLabel: string;
  totalIncidents: number;
  incidentChange: number; // % vs previous week
  dieselPrice: string;
  dieselChange: number | null;
  gas95Price: string;
  weatherAlerts: number;
  topProvinces: { name: string; count: number }[];
  cheapestProvince: { name: string; price: string } | null;
  mostExpensiveProvince: { name: string; price: string } | null;
}

export function weeklyDigestHtml(data: WeeklyDigestData, unsubscribeUrl: string): string {
  const trendIcon = data.incidentChange > 5 ? "📈" : data.incidentChange < -5 ? "📉" : "➡️";
  const trendColor = data.incidentChange > 5 ? "#dc2626" : data.incidentChange < -5 ? "#16a34a" : "#6b7280";
  const fuelTrendIcon = data.dieselChange !== null
    ? data.dieselChange > 0.1 ? "🔺" : data.dieselChange < -0.1 ? "🔻" : "▬"
    : "";

  const provincesHtml = data.topProvinces
    .slice(0, 5)
    .map((p) => `<tr><td style="padding:6px 12px; font-size:14px; color:#374151;">${p.name}</td><td style="padding:6px 12px; font-size:14px; color:#374151; text-align:right; font-weight:600;">${p.count}</td></tr>`)
    .join("");

  const content = `
    <h1 style="margin:0 0 8px; font-size:22px; color:#111827; font-weight:700;">
      Resumen semanal de tráfico
    </h1>
    <p style="margin:0 0 24px; font-size:14px; color:#6b7280;">
      Semana ${data.weekLabel}
    </p>

    <!-- KPI cards -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="50%" style="padding:12px; background:#f9fafb; border-radius:8px; text-align:center;">
          <p style="margin:0; font-size:12px; color:#6b7280; text-transform:uppercase;">Incidencias</p>
          <p style="margin:4px 0 0; font-size:28px; font-weight:800; color:#111827;">${data.totalIncidents.toLocaleString("es-ES")}</p>
          <p style="margin:4px 0 0; font-size:13px; color:${trendColor};">${trendIcon} ${data.incidentChange > 0 ? "+" : ""}${data.incidentChange.toFixed(1)}% vs semana anterior</p>
        </td>
        <td width="8"></td>
        <td width="50%" style="padding:12px; background:#f9fafb; border-radius:8px; text-align:center;">
          <p style="margin:0; font-size:12px; color:#6b7280; text-transform:uppercase;">Gasóleo A</p>
          <p style="margin:4px 0 0; font-size:28px; font-weight:800; color:#111827;">${data.dieselPrice} €/L</p>
          <p style="margin:4px 0 0; font-size:13px; color:#6b7280;">${fuelTrendIcon} ${data.dieselChange !== null ? `${data.dieselChange > 0 ? "+" : ""}${data.dieselChange.toFixed(1)}%` : ""} Gasolina 95: ${data.gas95Price} €/L</p>
        </td>
      </tr>
    </table>

    <!-- Top provinces -->
    ${data.topProvinces.length > 0 ? `
    <h2 style="margin:0 0 12px; font-size:16px; color:#111827;">Provincias con más incidencias</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
      <tr style="background:#f9fafb;">
        <th style="padding:8px 12px; font-size:12px; color:#6b7280; text-align:left; text-transform:uppercase;">Provincia</th>
        <th style="padding:8px 12px; font-size:12px; color:#6b7280; text-align:right; text-transform:uppercase;">Incidencias</th>
      </tr>
      ${provincesHtml}
    </table>
    ` : ""}

    <!-- Fuel comparison -->
    ${data.cheapestProvince && data.mostExpensiveProvince ? `
    <h2 style="margin:0 0 12px; font-size:16px; color:#111827;">Combustible por provincia</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:12px; background:#ecfdf5; border-radius:8px; text-align:center;">
          <p style="margin:0; font-size:12px; color:#059669;">MÁS BARATO</p>
          <p style="margin:4px 0 0; font-size:16px; font-weight:700; color:#111827;">${data.cheapestProvince.name}</p>
          <p style="margin:2px 0 0; font-size:14px; color:#374151;">${data.cheapestProvince.price} €/L</p>
        </td>
        <td width="8"></td>
        <td style="padding:12px; background:#fef2f2; border-radius:8px; text-align:center;">
          <p style="margin:0; font-size:12px; color:#dc2626;">MÁS CARO</p>
          <p style="margin:4px 0 0; font-size:16px; font-weight:700; color:#111827;">${data.mostExpensiveProvince.name}</p>
          <p style="margin:2px 0 0; font-size:14px; color:#374151;">${data.mostExpensiveProvince.price} €/L</p>
        </td>
      </tr>
    </table>
    ` : ""}

    ${data.weatherAlerts > 0 ? `
    <p style="margin:0 0 24px; padding:12px; background:#fefce8; border-radius:8px; font-size:14px; color:#854d0e;">
      ⚠️ <strong>${data.weatherAlerts} alertas meteorológicas</strong> activas esta semana.
      <a href="${BASE_URL}/alertas-meteo" style="color:#d97706;">Ver detalles →</a>
    </p>
    ` : ""}

    <!-- CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0;">
          <a href="${BASE_URL}/informes" style="display:inline-block; padding:12px 32px; background:#d97706; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; border-radius:8px;">
            Ver informes completos
          </a>
        </td>
      </tr>
    </table>
  `;

  return emailLayout(content, unsubscribeUrl);
}

export function weeklyDigestText(data: WeeklyDigestData, unsubscribeUrl: string): string {
  return `RESUMEN SEMANAL DE TRÁFICO — ${data.weekLabel}

INCIDENCIAS: ${data.totalIncidents.toLocaleString("es-ES")} (${data.incidentChange > 0 ? "+" : ""}${data.incidentChange.toFixed(1)}% vs semana anterior)
GASÓLEO A: ${data.dieselPrice} €/L
GASOLINA 95: ${data.gas95Price} €/L
ALERTAS METEO: ${data.weatherAlerts}

${data.topProvinces.length > 0 ? "PROVINCIAS CON MÁS INCIDENCIAS:\n" + data.topProvinces.slice(0, 5).map((p) => `  ${p.name}: ${p.count}`).join("\n") : ""}

${data.cheapestProvince ? `MÁS BARATO: ${data.cheapestProvince.name} (${data.cheapestProvince.price} €/L)` : ""}
${data.mostExpensiveProvince ? `MÁS CARO: ${data.mostExpensiveProvince.name} (${data.mostExpensiveProvince.price} €/L)` : ""}

Ver informes: ${BASE_URL}/informes

---
Cancelar suscripción: ${unsubscribeUrl}
trafico.live — Inteligencia vial en tiempo real`;
}

// ---------------------------------------------------------------------------
// Price alert notification
// ---------------------------------------------------------------------------

export interface PriceAlertData {
  fuelType: string;
  targetPrice: string;
  currentPrice: string;
  provinceName?: string;
  stationName?: string;
  stationAddress?: string;
}

export function priceAlertHtml(data: PriceAlertData, unsubscribeUrl: string): string {
  const fuelLabel = data.fuelType === "gasoleoA" ? "Gasóleo A" : "Gasolina 95";
  const content = `
    <h1 style="margin:0 0 8px; font-size:22px; color:#111827;">
      ✅ ¡Tu alerta de precio se ha cumplido!
    </h1>
    <p style="margin:0 0 24px; font-size:14px; color:#6b7280;">
      El ${fuelLabel} ha bajado de tu precio objetivo.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:16px; background:#ecfdf5; border-radius:8px; text-align:center;">
          <p style="margin:0; font-size:14px; color:#059669;">PRECIO ACTUAL</p>
          <p style="margin:8px 0 0; font-size:36px; font-weight:800; color:#111827;">${data.currentPrice} €/L</p>
          <p style="margin:4px 0 0; font-size:14px; color:#6b7280;">Tu objetivo: ${data.targetPrice} €/L</p>
        </td>
      </tr>
    </table>

    ${data.provinceName ? `<p style="margin:0 0 8px; font-size:14px; color:#374151;">📍 Provincia: <strong>${data.provinceName}</strong></p>` : ""}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0;">
          <a href="${BASE_URL}/gasolineras/baratas" style="display:inline-block; padding:12px 32px; background:#d97706; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; border-radius:8px;">
            Ver gasolineras baratas
          </a>
        </td>
      </tr>
    </table>
  `;

  return emailLayout(content, unsubscribeUrl);
}

// ---------------------------------------------------------------------------
// Digest confirmation (double opt-in)
// ---------------------------------------------------------------------------

export function confirmationHtml(confirmUrl: string): string {
  const content = `
    <h1 style="margin:0 0 8px; font-size:22px; color:#111827;">
      Confirma tu suscripción
    </h1>
    <p style="margin:0 0 24px; font-size:15px; color:#374151; line-height:1.6;">
      Has solicitado recibir el resumen semanal de tráfico y combustible de trafico.live.
      Pulsa el botón para confirmar tu email:
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0;">
          <a href="${confirmUrl}" style="display:inline-block; padding:14px 40px; background:#d97706; color:#ffffff; font-size:16px; font-weight:700; text-decoration:none; border-radius:8px;">
            Confirmar suscripción
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0; font-size:13px; color:#9ca3af;">
      Si no has solicitado esta suscripción, ignora este email.
    </p>
  `;

  return emailLayout(content);
}
