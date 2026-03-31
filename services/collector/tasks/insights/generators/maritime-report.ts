/**
 * Maritime Daily Report Generator
 *
 * Generates a daily maritime report covering:
 * - Maritime fuel price summary (Gasoleo A + Gasolina 95 E5 averages)
 * - Active coastal weather alerts (count + severity)
 * - Safety status (green/amber/red based on active severe alerts)
 *
 * Runs daily. Slug: informe-maritimo-YYYY-MM-DD
 */

import { PrismaClient, ArticleCategory } from "@prisma/client";
import {
  attachTags,
  todaySlug,
  fmtPrice,
  fmtInt,
  getEditorialWeight,
  estimateReadTime,
  mdTable,
} from "./shared";
import { log, logError } from "../../../shared/utils.js";

const TASK = "maritime-report";

export async function generateMaritimeReport(prisma: PrismaClient): Promise<number> {
  const slug = `informe-maritimo-${todaySlug()}`;

  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) {
    log(TASK, `Report already exists for today (${slug}), skipping`);
    return 0;
  }

  const now = new Date();

  // ── Queries ───────────────────────────────────────────────────────────────
  let avgGasoleoA: number | null = null;
  let avgGasolina95: number | null = null;
  let stationCount = 0;
  let activeCoastalAlerts = 0;
  let severeAlerts: { severity: string; provinceName: string | null; description: string | null }[] = [];
  let cheapestStation: { name: string; priceGasoleoA: number; port: string | null } | null = null;

  try {
    const [
      gasoleoAgg,
      gasolinaAgg,
      count,
      coastalCount,
      coastalSevere,
      cheapest,
    ] = await Promise.all([
      prisma.maritimeStation.aggregate({
        _avg: { priceGasoleoA: true },
        where: { priceGasoleoA: { not: null } },
      }),
      prisma.maritimeStation.aggregate({
        _avg: { priceGasolina95E5: true },
        where: { priceGasolina95E5: { not: null } },
      }),
      prisma.maritimeStation.count(),
      prisma.weatherAlert.count({
        where: { type: "COASTAL", isActive: true },
      }),
      prisma.weatherAlert.findMany({
        where: {
          type: "COASTAL",
          isActive: true,
          severity: { in: ["HIGH", "VERY_HIGH"] },
        },
        select: { severity: true, provinceName: true, description: true },
        orderBy: { severity: "desc" },
        take: 10,
      }),
      prisma.maritimeStation.findFirst({
        where: { priceGasoleoA: { not: null } },
        orderBy: { priceGasoleoA: "asc" },
        select: { name: true, priceGasoleoA: true, port: true },
      }),
    ]);

    avgGasoleoA = gasoleoAgg._avg.priceGasoleoA
      ? Number(gasoleoAgg._avg.priceGasoleoA)
      : null;
    avgGasolina95 = gasolinaAgg._avg.priceGasolina95E5
      ? Number(gasolinaAgg._avg.priceGasolina95E5)
      : null;
    stationCount = count;
    activeCoastalAlerts = coastalCount;
    severeAlerts = coastalSevere;
    if (cheapest && cheapest.priceGasoleoA != null) {
      cheapestStation = {
        name: cheapest.name,
        priceGasoleoA: Number(cheapest.priceGasoleoA),
        port: cheapest.port,
      };
    }
  } catch (err) {
    logError(TASK, "Failed to query maritime data", err);
    return 0;
  }

  // ── Safety status ─────────────────────────────────────────────────────────
  let safetyStatus: "verde" | "ambar" | "rojo";
  let safetyLabel: string;
  if (severeAlerts.length === 0 && activeCoastalAlerts === 0) {
    safetyStatus = "verde";
    safetyLabel = "Sin alertas costeras activas. Condiciones favorables para la navegación.";
  } else if (severeAlerts.length === 0) {
    safetyStatus = "ambar";
    safetyLabel = `${activeCoastalAlerts} aviso${activeCoastalAlerts !== 1 ? "s" : ""} costero${activeCoastalAlerts !== 1 ? "s" : ""} activo${activeCoastalAlerts !== 1 ? "s" : ""}. Consulta las alertas antes de zarpar.`;
  } else {
    safetyStatus = "rojo";
    safetyLabel = `**${severeAlerts.length} alerta${severeAlerts.length !== 1 ? "s" : ""} de severidad alta o muy alta** activa${severeAlerts.length !== 1 ? "s" : ""}. Precaución extrema en la navegación.`;
  }

  const safetyEmoji = safetyStatus === "verde" ? "🟢" : safetyStatus === "ambar" ? "🟡" : "🔴";

  // ── Date/time strings ─────────────────────────────────────────────────────
  const dateStr = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── Build body ────────────────────────────────────────────────────────────
  const sections: string[] = [];

  sections.push(`## Informe marítimo — ${dateStr}

Estado de seguridad: **${safetyEmoji} ${safetyStatus.toUpperCase()}** — ${safetyLabel}`);

  // Fuel prices section
  const fuelRows: string[][] = [];
  if (avgGasoleoA != null) {
    fuelRows.push(["Gasóleo A (marino)", fmtPrice(avgGasoleoA) + " €/L", `${fmtInt(stationCount)} estaciones`]);
  }
  if (avgGasolina95 != null) {
    fuelRows.push(["Gasolina 95 E5 (marina)", fmtPrice(avgGasolina95) + " €/L", "—"]);
  }

  if (fuelRows.length > 0) {
    sections.push(`### Combustible naval

${mdTable(
  ["Combustible", "Precio medio (€/L)", "Cobertura"],
  fuelRows,
  ["left", "right", "right"]
)}

${
  avgGasoleoA != null
    ? `El precio medio del **Gasóleo A marino** se sitúa en **${fmtPrice(avgGasoleoA)} €/L** en las ${fmtInt(stationCount)} estaciones marítimas registradas.`
    : "No hay datos de precio de gasóleo disponibles en este momento."
}
${
  cheapestStation
    ? `\nLa estación con el precio más bajo es **${cheapestStation.name}**${cheapestStation.port ? ` (puerto de ${cheapestStation.port})` : ""} con **${fmtPrice(cheapestStation.priceGasoleoA)} €/L**.`
    : ""
}

Consulta los [precios de combustible naval](/maritimo/combustible) en tiempo real.`);
  } else {
    sections.push(`### Combustible naval

No hay datos de precios disponibles en este momento. Consulta la sección de [combustible naval](/maritimo/combustible).`);
  }

  // Coastal alerts section
  if (activeCoastalAlerts === 0) {
    sections.push(`### Alertas costeras

No hay alertas costeras activas en este momento. Condiciones meteorológicas favorables para la navegación.`);
  } else {
    const severityLabels: Record<string, string> = {
      LOW: "bajos",
      MEDIUM: "moderados",
      HIGH: "altos",
      VERY_HIGH: "muy altos",
    };

    const severeProvinces = [
      ...new Set(severeAlerts.map((a) => a.provinceName).filter(Boolean)),
    ] as string[];

    sections.push(`### Alertas costeras

**${activeCoastalAlerts} aviso${activeCoastalAlerts !== 1 ? "s" : ""} costero${activeCoastalAlerts !== 1 ? "s" : ""} activo${activeCoastalAlerts !== 1 ? "s" : ""}** de la AEMET.${
      severeAlerts.length > 0
        ? ` De ellos, **${severeAlerts.length} son de nivel alto o muy alto**${
            severeProvinces.length > 0
              ? ` y afectan a: ${severeProvinces.slice(0, 6).join(", ")}${severeProvinces.length > 6 ? ` y ${severeProvinces.length - 6} más` : ""}`
              : ""
          }.`
        : ""
    }

Revisa las [alertas meteorológicas costeras](/maritimo/meteorologia) antes de zarpar.`);
  }

  // Links section
  sections.push(`### Más información

- [Estaciones de combustible marítimo](/maritimo/combustible)
- [Mapa marítimo](/maritimo/mapa)
- [Meteorología costera](/maritimo/meteorologia)
- [Puertos](/maritimo/puertos)
- [Alertas meteorológicas (tierra)](/alertas-meteo)

---

*Datos: MINETUR (combustible), AEMET (alertas). Actualizado a las ${timeStr}.*`);

  const body = sections.join("\n\n");

  const category: ArticleCategory = "DAILY_REPORT";

  const fuelSummary =
    avgGasoleoA != null
      ? `Gasóleo A marino: ${fmtPrice(avgGasoleoA)} €/L.`
      : "Sin datos de combustible.";
  const alertSummary =
    activeCoastalAlerts > 0
      ? `${activeCoastalAlerts} alerta${activeCoastalAlerts !== 1 ? "s" : ""} costera${activeCoastalAlerts !== 1 ? "s" : ""} activa${activeCoastalAlerts !== 1 ? "s" : ""}.`
      : "Sin alertas costeras.";

  const title = `Informe marítimo — ${dateStr}`;
  const summary = `${fuelSummary} ${alertSummary} Estado: ${safetyStatus.toUpperCase()}. ${fmtInt(stationCount)} estaciones marítimas registradas.`;

  try {
    const article = await prisma.article.create({
      data: {
        slug,
        title,
        summary,
        body,
        category,
        source: "maritime-collector",
        isAutoGenerated: true,
        readTime: estimateReadTime(body.length),
        editorialWeight: getEditorialWeight(category),
      },
    });

    await attachTags(prisma, article.id, [
      { slug: "maritimo", name: "Marítimo" },
      { slug: "combustible-naval", name: "Combustible naval" },
      { slug: "costera", name: "Costera" },
    ]);

    log(TASK, `Created maritime report: ${slug}`);
    return 1;
  } catch (err) {
    logError(TASK, `Failed to create maritime report article: ${slug}`, err);
    return 0;
  }
}
