/**
 * Enhanced Weather Alert Generator (v2)
 *
 * Severity-gated weather alert with traffic correlation.
 * Only publishes for HIGH or VERY_HIGH severity alerts.
 * - VERY_HIGH: always publish if at least 1 alert
 * - HIGH: only publish if >= 3 alerts
 *
 * Body includes:
 * - Opinionated lead referencing alert level in Spanish
 * - Alert detail table (Provincia, Tipo, Nivel, Descripción)
 * - Traffic impact section with incident count in affected provinces
 * - Type-specific safety recommendations
 * - Camera links for affected zones
 * - Navigation links
 */

import { PrismaClient, ArticleCategory } from "@prisma/client";
import {
  attachTags,
  todaySlug,
  fmtInt,
  getEditorialWeight,
  estimateReadTime,
  mdTable,
} from "./shared";

// ── Spanish labels ────────────────────────────────────────────────────────────

const SEVERITY_NAMES: Record<string, string> = {
  VERY_HIGH: "Rojo",
  HIGH: "Naranja",
  MEDIUM: "Amarillo",
  LOW: "Verde",
};

const ALERT_TYPE_NAMES: Record<string, string> = {
  RAIN: "Lluvia",
  SNOW: "Nieve",
  ICE: "Hielo",
  FOG: "Niebla",
  WIND: "Viento",
  TEMPERATURE: "Temperaturas extremas",
  STORM: "Tormenta",
  COASTAL: "Costero",
  OTHER: "Otro",
};

// ── Per-type safety recommendations ──────────────────────────────────────────

function getRecommendations(types: Set<string>): string[] {
  const recs: string[] = [];

  if (types.has("RAIN") || types.has("STORM")) {
    recs.push(
      "**Lluvia / Tormenta:** Reduce la velocidad y aumenta la distancia de seguridad. Activa los limpiaparabrisas y las luces. Evita zonas propensas a inundaciones."
    );
  }
  if (types.has("SNOW") || types.has("ICE")) {
    recs.push(
      "**Nieve / Hielo:** Comprueba la obligatoriedad de cadenas antes de salir. Conduce con velocidad muy reducida y evita frenadas bruscas. Consulta el estado de los puertos de montaña."
    );
  }
  if (types.has("FOG")) {
    recs.push(
      "**Niebla:** Usa antinieblas delanteras y traseras cuando la visibilidad sea inferior a 50 m. Reduce la velocidad y evita adelantamientos."
    );
  }
  if (types.has("WIND")) {
    recs.push(
      "**Viento fuerte:** Presta especial atención al volante, especialmente en viaductos y zonas despejadas. Los vehículos de alto perfil (furgonetas, camiones) deben extremar la precaución."
    );
  }
  if (types.has("TEMPERATURE")) {
    recs.push(
      "**Temperaturas extremas:** Revisa el nivel de líquido refrigerante y los neumáticos. En calor intenso, evita viajes en las horas centrales del día."
    );
  }

  if (recs.length === 0) {
    recs.push(
      "Extrema la precaución y adapta la velocidad a las condiciones meteorológicas. Consulta la previsión actualizada antes de iniciar cualquier desplazamiento."
    );
  }

  return recs;
}

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateEnhancedWeatherAlert(prisma: PrismaClient): Promise<number> {
  // 1. Query active alerts ordered by severity desc
  const activeAlerts = await prisma.weatherAlert.findMany({
    where: { isActive: true },
    orderBy: { severity: "desc" },
    take: 20,
  });

  // 2. Count HIGH + VERY_HIGH
  const seriousAlerts = activeAlerts.filter(
    (a) => a.severity === "HIGH" || a.severity === "VERY_HIGH"
  );
  if (seriousAlerts.length < 1) return 0;

  const highestSeverity = activeAlerts[0]?.severity;
  const isVeryHigh = highestSeverity === "VERY_HIGH";
  const isHigh = highestSeverity === "HIGH";

  // Expert gate: VERY_HIGH always publishes; HIGH only if >= 3 serious alerts
  if (isHigh && !isVeryHigh && seriousAlerts.length < 3) return 0;

  // 3. Check if slug already exists (one per day)
  const slug = `alerta-meteo-${todaySlug()}`;
  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) return 0;

  // ── Derived data ────────────────────────────────────────────────────────────
  const affectedProvinces = [
    ...new Set(activeAlerts.map((a) => a.province).filter(Boolean)),
  ] as string[];

  const affectedProvinceNames = [
    ...new Set(activeAlerts.map((a) => a.provinceName).filter(Boolean)),
  ] as string[];

  const alertTypes = new Set(activeAlerts.map((a) => String(a.type)));

  // ── Parallel queries for traffic correlation ─────────────────────────────
  const [totalActiveIncidents, incidentsInAffectedProvinces, availableCameras] =
    await Promise.all([
      prisma.trafficIncident.count({ where: { isActive: true } }),
      prisma.trafficIncident.count({
        where: { isActive: true, province: { in: affectedProvinces } },
      }),
      prisma.camera.count({
        where: { province: { in: affectedProvinces }, isActive: true },
      }),
    ]);

  // ── Severity label for lead ──────────────────────────────────────────────
  const levelLabel =
    isVeryHigh
      ? "**rojo** (nivel máximo)"
      : "**naranja** (nivel alto)";

  // ── Alert detail table ───────────────────────────────────────────────────
  const alertTableRows = activeAlerts
    .filter((a) => a.severity === "HIGH" || a.severity === "VERY_HIGH")
    .slice(0, 15)
    .map((a) => [
      a.provinceName ?? a.province,
      ALERT_TYPE_NAMES[String(a.type)] ?? String(a.type),
      SEVERITY_NAMES[String(a.severity)] ?? String(a.severity),
      a.description ? a.description.slice(0, 80) + (a.description.length > 80 ? "…" : "") : "—",
    ]);

  // ── Camera city links ────────────────────────────────────────────────────
  const cameraProvinceLinks = affectedProvinceNames
    .slice(0, 5)
    .map((name) => {
      const slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");
      return `[${name}](/camaras/${slug})`;
    })
    .join(", ");

  // ── Build body ───────────────────────────────────────────────────────────
  const sections: string[] = [];

  // Lead
  sections.push(
    `## Alertas meteorológicas de nivel ${levelLabel} activas\n\n` +
      `La AEMET mantiene avisos de nivel ${levelLabel} que afectan a **${fmtInt(seriousAlerts.length)} avisos activos** ` +
      `en **${fmtInt(affectedProvinces.length)} provincias**. ` +
      `Extrema la precaución si tienes previsto desplazarte por las zonas afectadas.`
  );

  // Alert detail table
  if (alertTableRows.length > 0) {
    sections.push(
      `### Avisos activos de nivel alto y muy alto\n\n` +
        mdTable(
          ["Provincia", "Tipo", "Nivel", "Descripción"],
          alertTableRows,
          ["left", "left", "center", "left"]
        )
    );
  }

  // Traffic impact
  sections.push(
    `### Impacto en el tráfico\n\n` +
      `- **${fmtInt(incidentsInAffectedProvinces)} incidencias activas** en las provincias afectadas por los avisos\n` +
      `- **${fmtInt(totalActiveIncidents)} incidencias activas** en el total de la red viaria nacional\n` +
      `- **${fmtInt(availableCameras)} cámaras de tráfico** disponibles en las zonas con alertas`
  );

  // Recommendations
  const recs = getRecommendations(alertTypes);
  sections.push(
    `### Recomendaciones de conducción\n\n` +
      recs.map((r) => `- ${r}`).join("\n")
  );

  // Camera links
  if (cameraProvinceLinks) {
    sections.push(
      `### Cámaras de tráfico en zonas afectadas\n\n` +
        `Consulta las cámaras de tráfico en las zonas afectadas para valorar el estado de la vía antes de salir: ${cameraProvinceLinks}.`
    );
  }

  // Navigation links
  sections.push(
    `### Más información\n\n` +
      `- [Todas las alertas meteorológicas](/alertas-meteo)\n` +
      `- [Incidencias activas en carretera](/incidencias)\n` +
      `- [Cámaras de tráfico en tiempo real](/camaras)\n\n` +
      `---\n\n` +
      `*Fuente: AEMET. Avisos actualizados en tiempo real.*`
  );

  const body = sections.join("\n\n");

  // ── Metadata ─────────────────────────────────────────────────────────────
  const levelWord = isVeryHigh ? "rojo" : "naranja";
  const title = `Alerta meteorológica nivel ${levelWord}: ${fmtInt(seriousAlerts.length)} avisos en ${fmtInt(affectedProvinces.length)} provincias`;
  const summary =
    `La AEMET mantiene ${fmtInt(seriousAlerts.length)} avisos de nivel ${SEVERITY_NAMES[highestSeverity] ?? highestSeverity} ` +
    `que afectan a ${affectedProvinceNames.slice(0, 5).join(", ")}${affectedProvinceNames.length > 5 ? ` y ${affectedProvinceNames.length - 5} más` : ""}. ` +
    `${fmtInt(incidentsInAffectedProvinces)} incidencias activas en las zonas afectadas.`;

  const category: ArticleCategory = "WEATHER_ALERT";

  const article = await prisma.article.create({
    data: {
      slug,
      title,
      summary,
      body,
      category,
      source: "AEMET",
      sourceUrl: "https://www.aemet.es",
      isAutoGenerated: true,
      readTime: estimateReadTime(body.length),
      editorialWeight: getEditorialWeight(category),
    },
  });

  await attachTags(prisma, article.id, [
    { slug: "meteorologia", name: "Meteorología" },
    { slug: "aemet", name: "AEMET" },
    { slug: "seguridad-vial", name: "Seguridad vial" },
    { slug: "alerta", name: "Alerta" },
  ]);

  return 1;
}
