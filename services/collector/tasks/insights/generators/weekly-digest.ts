/**
 * Weekly Digest Email Sender
 *
 * Sends the weekly traffic + fuel summary email to all confirmed
 * DigestSubscriber records. Runs on Monday after data ingestion.
 *
 * Dependencies: AWS SES configured via env vars.
 */

import { PrismaClient } from "@prisma/client";
import { weekSlug, fmtPrice, getProvinceNameMap } from "./shared";

export async function sendWeeklyDigest(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  if (now.getDay() !== 1) return 0; // Monday only

  // Check if SES is configured
  if (!process.env.AWS_SES_ACCESS_KEY || !process.env.AWS_SES_SECRET_KEY) {
    console.log("[digest] SES not configured, skipping email send");
    return 0;
  }

  // Check if we already sent this week (prevent duplicate sends)
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  const alreadySent = await prisma.digestSubscriber.findFirst({
    where: { lastSentAt: { gte: weekStart } },
  });
  if (alreadySent) {
    console.log("[digest] Already sent this week, skipping");
    return 0;
  }

  // Get confirmed subscribers
  const subscribers = await prisma.digestSubscriber.findMany({
    where: { isActive: true, confirmedAt: { not: null } },
    select: { id: true, email: true, province: true, unsubscribeToken: true },
  });

  if (subscribers.length === 0) {
    console.log("[digest] No confirmed subscribers");
    return 0;
  }

  // Gather data for the digest
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const provinceNames = await getProvinceNameMap(prisma);

  const [
    thisWeekIncidents,
    lastWeekIncidents,
    avgDiesel,
    avgGas95,
    weekAgoFuel,
    weatherAlerts,
    thisWeekStats,
    cheapestProvince,
    expensiveProvince,
  ] = await Promise.all([
    prisma.trafficIncident.count({ where: { startedAt: { gte: weekAgo } } }),
    prisma.trafficIncident.count({ where: { startedAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.gasStation.aggregate({ _avg: { priceGasoleoA: true }, where: { priceGasoleoA: { not: null } } }),
    prisma.gasStation.aggregate({ _avg: { priceGasolina95E5: true }, where: { priceGasolina95E5: { not: null } } }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: { gte: twoWeeksAgo, lt: weekAgo } },
      orderBy: { date: "desc" },
    }),
    prisma.weatherAlert.count({ where: { isActive: true } }),
    prisma.dailyStats.findMany({
      where: { dateStart: { gte: weekAgo } },
      select: { byProvince: true },
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { date: yesterday, scope: { startsWith: "province:" }, avgGasoleoA: { not: null } },
      orderBy: { avgGasoleoA: "asc" },
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { date: yesterday, scope: { startsWith: "province:" }, avgGasoleoA: { not: null } },
      orderBy: { avgGasoleoA: "desc" },
    }),
  ]);

  const dieselPrice = avgDiesel._avg.priceGasoleoA ? Number(avgDiesel._avg.priceGasoleoA) : null;
  const gas95Price = avgGas95._avg.priceGasolina95E5 ? Number(avgGas95._avg.priceGasolina95E5) : null;
  const lastWeekDiesel = weekAgoFuel?.avgGasoleoA ? Number(weekAgoFuel.avgGasoleoA) : null;
  const dieselChange = dieselPrice && lastWeekDiesel
    ? ((dieselPrice - lastWeekDiesel) / lastWeekDiesel) * 100
    : null;
  const incidentChange = lastWeekIncidents > 0
    ? ((thisWeekIncidents - lastWeekIncidents) / lastWeekIncidents) * 100
    : 0;

  // Aggregate provinces
  const weekProvinces: Record<string, number> = {};
  for (const day of thisWeekStats) {
    const bp = day.byProvince as Record<string, number> | null;
    if (bp) {
      for (const [code, count] of Object.entries(bp)) {
        weekProvinces[code] = (weekProvinces[code] || 0) + count;
      }
    }
  }
  const topProvinces = Object.entries(weekProvinces)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([code, count]) => ({
      name: provinceNames.get(code) || code,
      count,
    }));

  const cheapestCode = cheapestProvince?.scope.replace("province:", "");
  const expensiveCode = expensiveProvince?.scope.replace("province:", "");

  // Dynamic import of email modules (only available in the Next.js app context
  // or when the collector has access to src/lib/)
  // For the collector service, we inline a simpler email send
  const { SESv2Client, SendEmailCommand } = await import("@aws-sdk/client-sesv2");

  const sesClient = new SESv2Client({
    region: process.env.AWS_SES_REGION || "eu-west-1",
    credentials: {
      accessKeyId: process.env.AWS_SES_ACCESS_KEY!,
      secretAccessKey: process.env.AWS_SES_SECRET_KEY!,
    },
  });

  const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noticias@trafico.live";
  const fromName = process.env.AWS_SES_FROM_NAME || "trafico.live";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

  const digestData = {
    weekLabel: weekSlug(),
    totalIncidents: thisWeekIncidents,
    incidentChange,
    dieselPrice: fmtPrice(dieselPrice),
    dieselChange,
    gas95Price: fmtPrice(gas95Price),
    weatherAlerts,
    topProvinces,
    cheapestProvince: cheapestCode && cheapestProvince?.avgGasoleoA
      ? { name: provinceNames.get(cheapestCode) || cheapestCode, price: fmtPrice(Number(cheapestProvince.avgGasoleoA)) }
      : null,
    mostExpensiveProvince: expensiveCode && expensiveProvince?.avgGasoleoA
      ? { name: provinceNames.get(expensiveCode) || expensiveCode, price: fmtPrice(Number(expensiveProvince.avgGasoleoA)) }
      : null,
  };

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    const unsubscribeUrl = `${baseUrl}/api/digest/unsubscribe?token=${sub.unsubscribeToken}`;

    // Build simple text email for collector (HTML templates in src/lib/email/templates.ts for web)
    const trendIcon = incidentChange > 5 ? "↑" : incidentChange < -5 ? "↓" : "→";
    const textBody = `RESUMEN SEMANAL DE TRÁFICO — ${digestData.weekLabel}

INCIDENCIAS: ${digestData.totalIncidents.toLocaleString("es-ES")} (${trendIcon} ${incidentChange > 0 ? "+" : ""}${incidentChange.toFixed(1)}%)
GASÓLEO A: ${digestData.dieselPrice} €/L${dieselChange !== null ? ` (${dieselChange > 0 ? "+" : ""}${dieselChange.toFixed(1)}%)` : ""}
GASOLINA 95: ${digestData.gas95Price} €/L

${topProvinces.length > 0 ? "TOP PROVINCIAS:\n" + topProvinces.map((p) => `  ${p.name}: ${p.count}`).join("\n") : ""}

${digestData.cheapestProvince ? `Más barato: ${digestData.cheapestProvince.name} (${digestData.cheapestProvince.price} €/L)` : ""}
${digestData.mostExpensiveProvince ? `Más caro: ${digestData.mostExpensiveProvince.name} (${digestData.mostExpensiveProvince.price} €/L)` : ""}

Ver informes: ${baseUrl}/informes

---
Cancelar suscripción: ${unsubscribeUrl}`;

    // Simple HTML version
    const htmlBody = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/></head><body style="font-family:sans-serif;background:#f3f4f6;padding:24px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
<div style="background:#0a0a0a;padding:20px 32px;"><span style="color:#f59e0b;font-size:24px;font-weight:800;">trafico.live</span></div>
<div style="padding:32px;">
<h1 style="font-size:22px;color:#111;">Resumen semanal — ${digestData.weekLabel}</h1>
<table width="100%" style="margin:16px 0;"><tr>
<td style="padding:12px;background:#f9fafb;border-radius:8px;text-align:center;width:50%;">
<p style="margin:0;font-size:12px;color:#6b7280;">INCIDENCIAS</p>
<p style="margin:4px 0;font-size:28px;font-weight:800;">${digestData.totalIncidents.toLocaleString("es-ES")}</p>
<p style="margin:0;font-size:13px;color:${incidentChange > 5 ? "#dc2626" : incidentChange < -5 ? "#16a34a" : "#6b7280"};">${incidentChange > 0 ? "+" : ""}${incidentChange.toFixed(1)}%</p>
</td><td width="8"></td>
<td style="padding:12px;background:#f9fafb;border-radius:8px;text-align:center;width:50%;">
<p style="margin:0;font-size:12px;color:#6b7280;">GASÓLEO A</p>
<p style="margin:4px 0;font-size:28px;font-weight:800;">${digestData.dieselPrice} €/L</p>
<p style="margin:0;font-size:13px;color:#6b7280;">Gasolina 95: ${digestData.gas95Price} €/L</p>
</td></tr></table>
<p style="text-align:center;"><a href="${baseUrl}/informes" style="display:inline-block;padding:12px 32px;background:#d97706;color:#fff;font-weight:600;text-decoration:none;border-radius:8px;">Ver informes completos</a></p>
</div>
<div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
<p style="font-size:12px;color:#9ca3af;margin:0;"><a href="${unsubscribeUrl}" style="color:#9ca3af;">Cancelar suscripción</a></p>
</div></div></body></html>`;

    try {
      await sesClient.send(new SendEmailCommand({
        FromEmailAddress: `${fromName} <${fromEmail}>`,
        Destination: { ToAddress: [sub.email] },
        Content: {
          Simple: {
            Subject: { Data: `Resumen semanal de tráfico — ${digestData.weekLabel}`, Charset: "UTF-8" },
            Body: {
              Html: { Data: htmlBody, Charset: "UTF-8" },
              Text: { Data: textBody, Charset: "UTF-8" },
            },
          },
        },
        EmailTags: [{ Name: "type", Value: "weekly-digest" }],
      }));
      sent++;
      // Rate limit: pause every 10 emails
      if (sent % 10 === 0) await new Promise((r) => setTimeout(r, 1000));
    } catch (error) {
      console.error(`[digest] Failed to send to ${sub.email}:`, error);
      failed++;
    }
  }

  // Update lastSentAt for all subscribers
  if (sent > 0) {
    await prisma.digestSubscriber.updateMany({
      where: { isActive: true, confirmedAt: { not: null } },
      data: { lastSentAt: now },
    });
  }

  console.log(`[digest] Sent ${sent} digests, ${failed} failed`);
  return sent;
}
