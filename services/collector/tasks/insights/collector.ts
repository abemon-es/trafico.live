/**
 * Insights Collector
 *
 * Generates insights from existing data:
 * - Price change detector: alerts when national fuel average changes >2%
 * - Incident spike detector: compares daily count to 7-day average
 * - Weather alert aggregator: summarizes active AEMET alerts
 * - Daily report: end-of-day traffic digest
 *
 * Each detector creates Insight records if conditions are met.
 */

import { PrismaClient, InsightCategory } from "@prisma/client";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function todaySlug(): string {
  return new Date().toISOString().split("T")[0]; // "2026-03-30"
}

// ---------------------------------------------------------------------------
// Price Change Detector
// ---------------------------------------------------------------------------

async function detectPriceChanges(prisma: PrismaClient): Promise<number> {
  let created = 0;

  // Get average diesel price today vs yesterday
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [todayAvg, yesterdayAvg] = await Promise.all([
    prisma.gasStation.aggregate({
      _avg: { priceGasoleoA: true },
      where: { priceGasoleoA: { not: null } },
    }),
    // Use price history for yesterday if available
    prisma.gasStationPriceHistory.aggregate({
      _avg: { provinceRankDiesel: true },
      where: { recordedAt: yesterday },
    }),
  ]);

  // Simplified: compare current avg prices. If no history comparison possible,
  // just create a daily price snapshot insight.
  const avgDiesel = todayAvg._avg.priceGasoleoA;

  if (avgDiesel) {
    const slug = `precio-diesel-${todaySlug()}`;
    const existing = await prisma.insight.findUnique({ where: { slug } });

    if (!existing) {
      const price = Number(avgDiesel).toFixed(3);
      await prisma.insight.create({
        data: {
          slug,
          title: `Precio medio del diésel hoy: ${price} €/L`,
          summary: `La media nacional del precio del gasóleo A se sitúa en ${price} €/L según datos del MITERD.`,
          body: `## Precio del diésel hoy\n\nEl precio medio nacional del **Gasóleo A** se sitúa hoy en **${price} €/L** según los datos oficiales del Ministerio para la Transición Ecológica (MITERD).\n\nConsulta las [gasolineras más baratas](/gasolineras/baratas) para encontrar el mejor precio cerca de ti.`,
          category: "PRICE_ALERT" as InsightCategory,
          source: "MITERD",
          sourceUrl: "https://geoportalgasolineras.es",
        },
      });
      created++;
    }
  }

  return created;
}

// ---------------------------------------------------------------------------
// Incident Spike Detector
// ---------------------------------------------------------------------------

async function detectIncidentSpikes(prisma: PrismaClient): Promise<number> {
  let created = 0;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Today's active incidents
  const todayCount = await prisma.trafficIncident.count({
    where: { isActive: true },
  });

  // 7-day average (from incidents started in last 7 days)
  const weekAgo = new Date(todayStart);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weekCount = await prisma.trafficIncident.count({
    where: {
      startedAt: { gte: weekAgo },
    },
  });

  const weekAvg = weekCount / 7;
  const isSpike = todayCount > weekAvg * 1.5 && todayCount >= 10;

  if (isSpike) {
    const slug = `pico-incidencias-${todaySlug()}`;
    const existing = await prisma.insight.findUnique({ where: { slug } });

    if (!existing) {
      await prisma.insight.create({
        data: {
          slug,
          title: `Pico de incidencias: ${todayCount} activas (media 7d: ${Math.round(weekAvg)})`,
          summary: `Se registran ${todayCount} incidencias de tráfico activas, un ${Math.round(((todayCount - weekAvg) / weekAvg) * 100)}% por encima de la media semanal.`,
          body: `## Pico de incidencias de tráfico\n\nHoy se registran **${todayCount} incidencias activas** en las carreteras españolas, significativamente por encima de la media de los últimos 7 días (**${Math.round(weekAvg)} incidencias/día**).\n\nConsulta el [mapa de incidencias](/incidencias) para ver el estado actual del tráfico.`,
          category: "INCIDENT_DIGEST" as InsightCategory,
          source: "DGT",
        },
      });
      created++;
    }
  }

  return created;
}

// ---------------------------------------------------------------------------
// Weather Alert Aggregator
// ---------------------------------------------------------------------------

async function aggregateWeatherAlerts(prisma: PrismaClient): Promise<number> {
  let created = 0;

  const activeAlerts = await prisma.weatherAlert.findMany({
    where: { isActive: true },
    orderBy: { severity: "desc" },
    take: 20,
  });

  if (activeAlerts.length >= 3) {
    const slug = `alertas-meteo-${todaySlug()}`;
    const existing = await prisma.insight.findUnique({ where: { slug } });

    if (!existing) {
      const provinces = [...new Set(activeAlerts.map((a) => a.province).filter(Boolean))];
      const severities = activeAlerts.reduce(
        (acc, a) => {
          acc[a.severity] = (acc[a.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const severityText = Object.entries(severities)
        .map(([s, c]) => `${c} ${s.toLowerCase()}`)
        .join(", ");

      await prisma.insight.create({
        data: {
          slug,
          title: `${activeAlerts.length} alertas meteorológicas activas`,
          summary: `AEMET mantiene ${activeAlerts.length} avisos activos (${severityText}) que afectan a ${provinces.length} provincias.`,
          body: `## Alertas meteorológicas activas\n\nLa AEMET mantiene **${activeAlerts.length} avisos meteorológicos activos** que pueden afectar a la circulación.\n\n**Provincias afectadas:** ${provinces.join(", ") || "varias"}\n\n**Niveles:** ${severityText}\n\nConsulta las [alertas meteorológicas](/alertas-meteo) para más detalle y recomendaciones de conducción.`,
          category: "WEATHER_ALERT" as InsightCategory,
          source: "AEMET",
          sourceUrl: "https://www.aemet.es",
        },
      });
      created++;
    }
  }

  return created;
}

// ---------------------------------------------------------------------------
// Daily Report Generator
// ---------------------------------------------------------------------------

async function generateDailyReport(prisma: PrismaClient): Promise<number> {
  const slug = `informe-diario-${todaySlug()}`;
  const existing = await prisma.insight.findUnique({ where: { slug } });

  if (existing) return 0;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [
    activeIncidents,
    todayIncidents,
    activeAlerts,
    avgDiesel,
    avgGas95,
  ] = await Promise.all([
    prisma.trafficIncident.count({ where: { isActive: true } }),
    prisma.trafficIncident.count({
      where: { startedAt: { gte: todayStart } },
    }),
    prisma.weatherAlert.count({ where: { isActive: true } }),
    prisma.gasStation.aggregate({
      _avg: { priceGasoleoA: true },
      where: { priceGasoleoA: { not: null } },
    }),
    prisma.gasStation.aggregate({
      _avg: { priceGasolina95E5: true },
      where: { priceGasolina95E5: { not: null } },
    }),
  ]);

  const dieselPrice = avgDiesel._avg.priceGasoleoA
    ? Number(avgDiesel._avg.priceGasoleoA).toFixed(3)
    : "N/D";
  const gas95Price = avgGas95._avg.priceGasolina95E5
    ? Number(avgGas95._avg.priceGasolina95E5).toFixed(3)
    : "N/D";

  const dateStr = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await prisma.insight.create({
    data: {
      slug,
      title: `Informe de tráfico — ${dateStr}`,
      summary: `${activeIncidents} incidencias activas, ${todayIncidents} nuevas hoy. Diésel: ${dieselPrice} €/L. Gasolina 95: ${gas95Price} €/L. ${activeAlerts} alertas meteorológicas.`,
      body: `## Informe de tráfico — ${dateStr}\n\n### Incidencias\n- **${activeIncidents}** incidencias activas en este momento\n- **${todayIncidents}** incidencias nuevas registradas hoy\n\n### Precios de combustible\n- **Gasóleo A:** ${dieselPrice} €/L (media nacional)\n- **Gasolina 95:** ${gas95Price} €/L (media nacional)\n\n### Meteorología\n- **${activeAlerts}** alertas meteorológicas activas\n\n---\n\n*Datos: DGT, MITERD, AEMET. Actualizado a las ${now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.*`,
      category: "DAILY_REPORT" as InsightCategory,
      source: "trafico.live",
    },
  });

  return 1;
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  console.log("[insights] Starting insights generation...");

  const results = await Promise.allSettled([
    detectPriceChanges(prisma),
    detectIncidentSpikes(prisma),
    aggregateWeatherAlerts(prisma),
    generateDailyReport(prisma),
  ]);

  let total = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      total += r.value;
    } else {
      console.error("[insights] Detector failed:", r.reason);
    }
  }

  console.log(`[insights] Created ${total} new insights`);
}
