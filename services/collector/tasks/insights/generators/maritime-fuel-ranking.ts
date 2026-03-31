/**
 * Weekly Maritime Fuel Price Ranking
 *
 * Runs once per week (any day — slug-gated).
 * Slug: ranking-combustible-maritimo-YYYY-SWW
 *
 * Generates:
 * - National summary with weekly change %
 * - Region-by-region ranking table (cheapest to most expensive)
 * - Top 10 cheapest maritime stations nationwide
 * - Top 10 most expensive maritime stations nationwide
 * - Price difference vs terrestrial diesel
 * - Trend-based advice section
 */

import { PrismaClient, ArticleCategory } from "@prisma/client";
import {
  attachTags,
  weekSlug,
  fmtPrice,
  fmtPct,
  fmtInt,
  getEditorialWeight,
  estimateReadTime,
  mdTable,
} from "./shared";
import { log, logError } from "../../../shared/utils.js";

const TASK = "maritime-fuel-ranking";

// Province codes grouped by coastal region
const COAST_REGIONS: Record<string, string[]> = {
  "Mediterráneo": ["03", "04", "08", "12", "17", "18", "29", "30", "43", "46"],
  "Atlántico Norte": ["15", "20", "27", "33", "36", "39", "48"],
  "Atlántico Sur": ["11", "21", "35", "38", "41"],
  "Baleares": ["07"],
  "Ceuta y Melilla": ["51", "52"],
};

interface RegionStats {
  name: string;
  avgGasoleoA: number | null;
  minGasoleoA: number | null;
  cheapestStation: { name: string; port: string | null; price: number } | null;
  stationCount: number;
  weekAgoAvg: number | null;
  weeklyDelta: number | null;
}

interface StationSnapshot {
  id: string;
  name: string;
  port: string | null;
  province: string | null;
  provinceName: string | null;
  priceGasoleoA: number;
}

export async function generateMaritimeFuelRanking(prisma: PrismaClient): Promise<number> {
  const slug = `ranking-combustible-maritimo-${weekSlug()}`;

  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) {
    log(TASK, `Ranking already exists for this week (${slug}), skipping`);
    return 0;
  }

  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekAgoUTC = new Date(todayUTC);
  weekAgoUTC.setUTCDate(weekAgoUTC.getUTCDate() - 7);

  // ── Fetch all maritime stations with prices ────────────────────────────────
  let allStations: StationSnapshot[] = [];
  let terrestrialAvgDiesel: number | null = null;

  try {
    const [rawStations, terrestrialAgg] = await Promise.all([
      prisma.maritimeStation.findMany({
        where: { priceGasoleoA: { not: null } },
        select: {
          id: true,
          name: true,
          port: true,
          province: true,
          provinceName: true,
          priceGasoleoA: true,
        },
        orderBy: { priceGasoleoA: "asc" },
      }),
      prisma.gasStation.aggregate({
        _avg: { priceGasoleoA: true },
        where: { priceGasoleoA: { not: null } },
      }),
    ]);

    allStations = rawStations
      .filter((s) => s.priceGasoleoA != null)
      .map((s) => ({
        id: s.id,
        name: s.name,
        port: s.port,
        province: s.province,
        provinceName: s.provinceName,
        priceGasoleoA: Number(s.priceGasoleoA),
      }));

    terrestrialAvgDiesel = terrestrialAgg._avg.priceGasoleoA
      ? Number(terrestrialAgg._avg.priceGasoleoA)
      : null;
  } catch (err) {
    logError(TASK, "Failed to query maritime station data", err);
    return 0;
  }

  if (allStations.length === 0) {
    log(TASK, "No maritime stations with prices found, skipping");
    return 0;
  }

  // ── Fetch week-ago price history ──────────────────────────────────────────
  // Query maritimePriceHistory for records around 7 days ago (±1 day tolerance)
  const weekAgoWindowStart = new Date(weekAgoUTC);
  weekAgoWindowStart.setUTCDate(weekAgoWindowStart.getUTCDate() - 1);
  const weekAgoWindowEnd = new Date(weekAgoUTC);
  weekAgoWindowEnd.setUTCDate(weekAgoWindowEnd.getUTCDate() + 1);

  let weekAgoHistoryByStation = new Map<string, number>();

  try {
    const weekAgoHistory = await prisma.maritimePriceHistory.findMany({
      where: {
        recordedAt: {
          gte: weekAgoWindowStart,
          lte: weekAgoWindowEnd,
        },
        priceGasoleoA: { not: null },
      },
      select: {
        stationId: true,
        priceGasoleoA: true,
        recordedAt: true,
      },
    });

    // Keep only the closest record per station (prefer exact 7-day match)
    const byStation = new Map<string, { price: number; dist: number }>();
    for (const rec of weekAgoHistory) {
      if (rec.priceGasoleoA == null) continue;
      const dist = Math.abs(rec.recordedAt.getTime() - weekAgoUTC.getTime());
      const existing = byStation.get(rec.stationId);
      if (!existing || dist < existing.dist) {
        byStation.set(rec.stationId, { price: Number(rec.priceGasoleoA), dist });
      }
    }

    for (const [stationId, { price }] of byStation) {
      weekAgoHistoryByStation.set(stationId, price);
    }
  } catch (err) {
    // Week-ago data is optional — continue without it
    logError(TASK, "Could not fetch week-ago price history (non-fatal)", err);
  }

  // ── National averages ─────────────────────────────────────────────────────
  const prices = allStations.map((s) => s.priceGasoleoA);
  const nationalAvg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const nationalMin = Math.min(...prices);
  const nationalMax = Math.max(...prices);

  // National week-ago average (from stations that have history)
  const weekAgoPrices = allStations
    .map((s) => weekAgoHistoryByStation.get(s.id))
    .filter((p): p is number => p != null);
  const nationalWeekAgoAvg =
    weekAgoPrices.length > 0
      ? weekAgoPrices.reduce((sum, p) => sum + p, 0) / weekAgoPrices.length
      : null;
  const nationalWeeklyDelta =
    nationalWeekAgoAvg != null
      ? ((nationalAvg - nationalWeekAgoAvg) / nationalWeekAgoAvg) * 100
      : null;

  // ── Region stats ──────────────────────────────────────────────────────────
  const stationsByProvince = new Map<string, StationSnapshot[]>();
  for (const station of allStations) {
    const prov = station.province ?? "00";
    const arr = stationsByProvince.get(prov) ?? [];
    arr.push(station);
    stationsByProvince.set(prov, arr);
  }

  const regionStats: RegionStats[] = [];

  for (const [regionName, provinceCodes] of Object.entries(COAST_REGIONS)) {
    const regionStations: StationSnapshot[] = [];
    for (const code of provinceCodes) {
      const stations = stationsByProvince.get(code) ?? [];
      regionStations.push(...stations);
    }

    if (regionStations.length === 0) {
      regionStats.push({
        name: regionName,
        avgGasoleoA: null,
        minGasoleoA: null,
        cheapestStation: null,
        stationCount: 0,
        weekAgoAvg: null,
        weeklyDelta: null,
      });
      continue;
    }

    const regionPrices = regionStations.map((s) => s.priceGasoleoA);
    const avgGasoleoA = regionPrices.reduce((sum, p) => sum + p, 0) / regionPrices.length;
    const minGasoleoA = Math.min(...regionPrices);
    const cheapestRaw = regionStations.reduce((min, s) =>
      s.priceGasoleoA < min.priceGasoleoA ? s : min
    );
    const cheapestStation = {
      name: cheapestRaw.name,
      port: cheapestRaw.port,
      price: cheapestRaw.priceGasoleoA,
    };

    // Week-ago region average
    const regionWeekAgoPrices = regionStations
      .map((s) => weekAgoHistoryByStation.get(s.id))
      .filter((p): p is number => p != null);
    const weekAgoAvg =
      regionWeekAgoPrices.length > 0
        ? regionWeekAgoPrices.reduce((sum, p) => sum + p, 0) / regionWeekAgoPrices.length
        : null;
    const weeklyDelta =
      weekAgoAvg != null ? ((avgGasoleoA - weekAgoAvg) / weekAgoAvg) * 100 : null;

    regionStats.push({
      name: regionName,
      avgGasoleoA,
      minGasoleoA,
      cheapestStation,
      stationCount: regionStations.length,
      weekAgoAvg,
      weeklyDelta,
    });
  }

  // Sort regions cheapest to most expensive (nulls last)
  const sortedRegions = [...regionStats].sort((a, b) => {
    if (a.avgGasoleoA == null && b.avgGasoleoA == null) return 0;
    if (a.avgGasoleoA == null) return 1;
    if (b.avgGasoleoA == null) return -1;
    return a.avgGasoleoA - b.avgGasoleoA;
  });

  // ── Top 10 cheapest / most expensive ─────────────────────────────────────
  const cheapest10 = allStations.slice(0, 10);
  const mostExpensive10 = [...allStations]
    .sort((a, b) => b.priceGasoleoA - a.priceGasoleoA)
    .slice(0, 10);

  // ── Terrestrial vs maritime spread ────────────────────────────────────────
  const maritimeVsTerrestrialDelta =
    terrestrialAvgDiesel != null ? nationalAvg - terrestrialAvgDiesel : null;

  // ── Date string ───────────────────────────────────────────────────────────
  const week = weekSlug();
  const dateStr = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Build body ────────────────────────────────────────────────────────────
  const sections: string[] = [];

  // --- Header / national summary ---
  const trendArrow =
    nationalWeeklyDelta == null
      ? ""
      : nationalWeeklyDelta > 0.05
      ? ` (${fmtPct(nationalWeeklyDelta)} vs semana anterior)`
      : nationalWeeklyDelta < -0.05
      ? ` (${fmtPct(nationalWeeklyDelta)} vs semana anterior)`
      : " (estable vs semana anterior)";

  sections.push(
    `## Ranking de combustible marítimo — ${week}\n\n` +
      `Comparativa semanal del precio del **Gasóleo A marino** en las ${fmtInt(allStations.length)} estaciones de suministro naval registradas en España.\n\n` +
      `**Precio medio nacional:** ${fmtPrice(nationalAvg)} €/L${trendArrow}  \n` +
      `**Precio mínimo:** ${fmtPrice(nationalMin)} €/L · **Precio máximo:** ${fmtPrice(nationalMax)} €/L` +
      (terrestrialAvgDiesel != null
        ? `  \n**Gasóleo terrestre (referencia):** ${fmtPrice(terrestrialAvgDiesel)} €/L` +
          (maritimeVsTerrestrialDelta != null
            ? ` (el combustible naval es **${maritimeVsTerrestrialDelta >= 0 ? "+" : ""}${fmtPrice(maritimeVsTerrestrialDelta)} €/L** ${maritimeVsTerrestrialDelta >= 0 ? "más caro" : "más barato"})`
            : "")
        : "")
  );

  // --- Region ranking table ---
  const regionsWithData = sortedRegions.filter((r) => r.avgGasoleoA != null);

  if (regionsWithData.length > 0) {
    const regionRows = regionsWithData.map((r, i) => [
      String(i + 1),
      r.name,
      fmtPrice(r.avgGasoleoA),
      fmtPrice(r.minGasoleoA),
      r.cheapestStation
        ? `${r.cheapestStation.name}${r.cheapestStation.port ? ` (${r.cheapestStation.port})` : ""}`
        : "N/D",
      fmtInt(r.stationCount),
      r.weeklyDelta != null ? fmtPct(r.weeklyDelta) : "N/D",
    ]);

    sections.push(`### Ranking por región costera — Gasóleo A marino

${mdTable(
  ["#", "Región", "Media (€/L)", "Mínimo (€/L)", "Estación más barata", "Estaciones", "Var. 7d"],
  regionRows,
  ["center", "left", "right", "right", "left", "right", "right"]
)}`);
  }

  // --- Top 10 cheapest ---
  if (cheapest10.length > 0) {
    const cheapestRows = cheapest10.map((s, i) => {
      const weekAgoPriceRaw = weekAgoHistoryByStation.get(s.id);
      const delta =
        weekAgoPriceRaw != null
          ? ((s.priceGasoleoA - weekAgoPriceRaw) / weekAgoPriceRaw) * 100
          : null;
      return [
        String(i + 1),
        s.name,
        s.port ?? s.provinceName ?? "—",
        fmtPrice(s.priceGasoleoA),
        delta != null ? fmtPct(delta) : "N/D",
      ];
    });

    sections.push(`### Top 10 estaciones marítimas más baratas

${mdTable(
  ["#", "Estación", "Puerto / Provincia", "Gasóleo A (€/L)", "Var. 7d"],
  cheapestRows,
  ["center", "left", "left", "right", "right"]
)}`);
  }

  // --- Top 10 most expensive ---
  if (mostExpensive10.length > 0) {
    const expensiveRows = mostExpensive10.map((s, i) => {
      const weekAgoPriceRaw = weekAgoHistoryByStation.get(s.id);
      const delta =
        weekAgoPriceRaw != null
          ? ((s.priceGasoleoA - weekAgoPriceRaw) / weekAgoPriceRaw) * 100
          : null;
      return [
        String(i + 1),
        s.name,
        s.port ?? s.provinceName ?? "—",
        fmtPrice(s.priceGasoleoA),
        delta != null ? fmtPct(delta) : "N/D",
      ];
    });

    sections.push(`### Top 10 estaciones marítimas más caras

${mdTable(
  ["#", "Estación", "Puerto / Provincia", "Gasóleo A (€/L)", "Var. 7d"],
  expensiveRows,
  ["center", "left", "left", "right", "right"]
)}`);
  }

  // --- Price gap: maritime vs terrestrial ---
  if (terrestrialAvgDiesel != null && maritimeVsTerrestrialDelta != null) {
    const gapAbs = Math.abs(maritimeVsTerrestrialDelta);
    const gapDir = maritimeVsTerrestrialDelta >= 0 ? "superior" : "inferior";
    const gapPct =
      terrestrialAvgDiesel > 0
        ? Math.abs((maritimeVsTerrestrialDelta / terrestrialAvgDiesel) * 100)
        : null;

    sections.push(`### Combustible naval vs. terrestre

| Tipo | Precio medio (€/L) |
| :--- | ---: |
| Gasóleo A marino | ${fmtPrice(nationalAvg)} |
| Gasóleo A terrestre | ${fmtPrice(terrestrialAvgDiesel)} |
| Diferencia | ${maritimeVsTerrestrialDelta >= 0 ? "+" : ""}${fmtPrice(maritimeVsTerrestrialDelta)} |

El precio del gasóleo en estaciones marítimas es **${fmtPrice(gapAbs)} €/L ${gapDir}** al precio medio en gasolineras de tierra${gapPct != null ? ` (${gapPct.toFixed(1)}% de diferencia)` : ""}. Esta diferencia refleja los costes operativos específicos del suministro en puerto.`);
  }

  // --- Advice section ---
  const adviceLines: string[] = [];

  if (nationalWeeklyDelta != null) {
    if (nationalWeeklyDelta > 1) {
      adviceLines.push(
        `El precio del gasóleo marino ha subido un **${fmtPct(nationalWeeklyDelta)}** esta semana. Si tienes flexibilidad, considera repostar antes de que continúe la tendencia alcista.`
      );
    } else if (nationalWeeklyDelta < -1) {
      adviceLines.push(
        `El precio ha bajado un **${fmtPct(Math.abs(nationalWeeklyDelta))}** esta semana. Buen momento para repostar si lo necesitas.`
      );
    } else {
      adviceLines.push(
        "Los precios del combustible naval se mantienen estables esta semana. Sin presión para cambiar el patrón habitual de repostaje."
      );
    }
  }

  if (regionsWithData.length >= 2) {
    const cheapestRegion = regionsWithData[0];
    const mostExpRegion = regionsWithData[regionsWithData.length - 1];
    if (
      cheapestRegion.avgGasoleoA != null &&
      mostExpRegion.avgGasoleoA != null
    ) {
      const spread = mostExpRegion.avgGasoleoA - cheapestRegion.avgGasoleoA;
      adviceLines.push(
        `La región más económica es **${cheapestRegion.name}** (${fmtPrice(cheapestRegion.avgGasoleoA)} €/L) y la más cara **${mostExpRegion.name}** (${fmtPrice(mostExpRegion.avgGasoleoA)} €/L). La diferencia entre regiones es de **${fmtPrice(spread)} €/L** — relevante en rutas largas o aprovisionamientos grandes.`
      );
    }
  }

  if (cheapest10.length > 0) {
    const top = cheapest10[0];
    adviceLines.push(
      `La estación con el precio más bajo esta semana es **${top.name}**${top.port ? ` en el puerto de **${top.port}**` : ""} con **${fmtPrice(top.priceGasoleoA)} €/L**.`
    );
  }

  if (adviceLines.length > 0) {
    sections.push(`### Análisis y recomendaciones\n\n${adviceLines.join("\n\n")}`);
  }

  // --- Links ---
  sections.push(`### Más información

- [Combustible naval en España](/maritimo/combustible)
- [Mapa marítimo](/maritimo/mapa)
- [Meteorología costera](/maritimo/meteorologia)
- [Gasolineras más baratas en tierra](/gasolineras/baratas)
- [Ranking de precios por provincia](/gasolineras/precios)

---

*Fuente: MINETUR (Geoportal Gasolineras, suministro naval). Precios con IVA incluido. Datos del ${dateStr}.*`);

  const body = sections.join("\n\n");

  // ── Article creation ──────────────────────────────────────────────────────
  const cheapestRegionName = sortedRegions.find((r) => r.avgGasoleoA != null)?.name ?? "N/D";
  const cheapestRegionAvg = sortedRegions.find((r) => r.avgGasoleoA != null)?.avgGasoleoA ?? null;

  const title = `Ranking combustible marítimo — ${week}`;
  const summary =
    `Ranking semanal de gasóleo naval: media nacional ${fmtPrice(nationalAvg)} €/L` +
    (nationalWeeklyDelta != null ? ` (${fmtPct(nationalWeeklyDelta)} vs semana anterior)` : "") +
    `. Región más barata: ${cheapestRegionName} (${fmtPrice(cheapestRegionAvg)} €/L).` +
    (terrestrialAvgDiesel != null && maritimeVsTerrestrialDelta != null
      ? ` Diferencia con gasóleo terrestre: ${maritimeVsTerrestrialDelta >= 0 ? "+" : ""}${fmtPrice(maritimeVsTerrestrialDelta)} €/L.`
      : "") +
    ` ${fmtInt(allStations.length)} estaciones marítimas analizadas.`;

  const category: ArticleCategory = "FUEL_TREND";

  try {
    const article = await prisma.article.create({
      data: {
        slug,
        title,
        summary,
        body,
        category,
        source: "MINETUR",
        sourceUrl: "https://geoportalgasolineras.es",
        isAutoGenerated: true,
        readTime: estimateReadTime(body.length),
        editorialWeight: getEditorialWeight(category),
      },
    });

    await attachTags(prisma, article.id, [
      { slug: "maritimo", name: "Marítimo" },
      { slug: "combustible-naval", name: "Combustible naval" },
      { slug: "ranking-maritimo", name: "Ranking marítimo" },
      { slug: "precio-combustible", name: "Precio combustible" },
    ]);

    log(TASK, `Created maritime fuel ranking: ${slug}`);
    return 1;
  } catch (err) {
    logError(TASK, `Failed to create maritime fuel ranking article: ${slug}`, err);
    return 0;
  }
}
