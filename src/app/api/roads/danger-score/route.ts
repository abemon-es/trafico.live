import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// Cache TTL: 5 minutes
const CACHE_TTL = 300;

// Severity weights for incidents and weather alerts
const SEVERITY_WEIGHT: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  VERY_HIGH: 4,
};

// Danger level thresholds
type DangerLevel = "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH" | "EXTREME";

function getDangerLevel(score: number): DangerLevel {
  if (score <= 20) return "LOW";
  if (score <= 40) return "MODERATE";
  if (score <= 60) return "HIGH";
  if (score <= 80) return "VERY_HIGH";
  return "EXTREME";
}

/**
 * Calculate time-of-day risk factor (0-100).
 * Night: 22:00-06:00 → high (80)
 * Rush hours: 07:30-09:30 and 17:30-19:30 → elevated (70)
 * Normal hours → baseline (30)
 */
function getTimeOfDayScore(): number {
  const now = new Date();
  // Use Spain's UTC+1/+2 offset approximately — close enough for scoring
  const madridOffset = 60; // minutes, UTC+1 (winter); UTC+2 in summer
  const localMinutes =
    (now.getUTCHours() * 60 + now.getUTCMinutes() + madridOffset) % (24 * 60);

  const hour = Math.floor(localMinutes / 60);
  const minute = localMinutes % 60;
  const timeDecimal = hour + minute / 60;

  // Night window: 22:00–06:00
  if (timeDecimal >= 22 || timeDecimal < 6) return 80;

  // Morning rush: 07:30–09:30
  if (timeDecimal >= 7.5 && timeDecimal < 9.5) return 70;

  // Evening rush: 17:30–19:30
  if (timeDecimal >= 17.5 && timeDecimal < 19.5) return 70;

  // Normal hours
  return 30;
}

interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  level: DangerLevel;
  components: {
    incidents: number;
    weather: number;
    riskZones: number;
    historical: number;
    timeOfDay: number;
  };
  activeIncidents: number;
  weatherAlerts: number;
}

/**
 * GET /api/roads/danger-score
 *
 * Returns a composite danger score (0-100) per province or road,
 * combining active incidents, weather alerts, risk zones, historical
 * accidents, and time-of-day factor.
 *
 * Query parameters:
 * - province: INE 2-digit province code (e.g. "28" for Madrid)
 * - road: Road number filter (e.g. "A-1")
 * - (none): Returns top 20 most dangerous provinces
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const provinceFilter = searchParams.get("province");
    const roadFilter = searchParams.get("road");

    const mode = roadFilter ? "road" : provinceFilter ? "province" : "top";
    const cacheKey = `roads:danger-score:${mode}:${roadFilter ?? provinceFilter ?? "all"}`;

    const cached = await getFromCache<{ success: boolean; data: unknown }>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const timeOfDayScore = getTimeOfDayScore();

    if (mode === "road") {
      const scores = await calculateRoadScore(roadFilter!, timeOfDayScore);
      const result = {
        success: true,
        data: { scores, timestamp: new Date().toISOString() },
      };
      await setInCache(cacheKey, result, CACHE_TTL);
      return NextResponse.json(result);
    }

    if (mode === "province") {
      const scores = await calculateProvinceScores([provinceFilter!], timeOfDayScore);
      const result = {
        success: true,
        data: { scores, timestamp: new Date().toISOString() },
      };
      await setInCache(cacheKey, result, CACHE_TTL);
      return NextResponse.json(result);
    }

    // Top provinces mode: score all provinces that have data, return top 20
    const scores = await calculateTopProvinces(timeOfDayScore);
    const result = {
      success: true,
      data: { scores, timestamp: new Date().toISOString() },
    };
    await setInCache(cacheKey, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (error) {
    reportApiError(error, "Road danger score API error");
    return NextResponse.json(
      { success: false, error: "Failed to calculate danger scores" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Province-level scoring
// ---------------------------------------------------------------------------

async function calculateTopProvinces(timeOfDayScore: number): Promise<ScoreEntry[]> {
  // Fetch all provinces that appear in any active data
  const [
    activeIncidentsByProvince,
    activeWeatherByProvince,
    historicalByProvince,
    allProvinces,
  ] = await Promise.all([
    // Active incidents grouped by province
    prisma.trafficIncident.groupBy({
      by: ["province", "severity"],
      where: { isActive: true, province: { not: null } },
      _count: true,
    }),

    // Active weather alerts grouped by province
    prisma.weatherAlert.groupBy({
      by: ["province", "severity"],
      where: { isActive: true },
      _count: true,
    }),

    // Historical accidents aggregated by province (most recent year available)
    prisma.$queryRaw<Array<{ province: string; accidents: number }>>`
      SELECT province, SUM(accidents)::int AS accidents
      FROM "HistoricalAccidents"
      WHERE year = (SELECT MAX(year) FROM "HistoricalAccidents")
      GROUP BY province
    `,

    // Province reference for names
    prisma.province.findMany({
      select: { code: true, name: true },
    }),
  ]);

  // Build province name lookup
  const provinceNames: Record<string, string> = {};
  for (const p of allProvinces) {
    provinceNames[p.code] = p.name;
  }

  // Collect all province codes that appear in any source
  const provinceSet = new Set<string>();
  for (const row of activeIncidentsByProvince) {
    if (row.province) provinceSet.add(row.province);
  }
  for (const row of activeWeatherByProvince) {
    provinceSet.add(row.province);
  }
  for (const row of historicalByProvince) {
    provinceSet.add(row.province);
  }

  // Aggregate incidents per province
  const incidentMap: Record<string, { weightedSum: number; count: number }> = {};
  for (const row of activeIncidentsByProvince) {
    if (!row.province) continue;
    if (!incidentMap[row.province]) incidentMap[row.province] = { weightedSum: 0, count: 0 };
    const w = SEVERITY_WEIGHT[row.severity] ?? 1;
    incidentMap[row.province].weightedSum += w * row._count;
    incidentMap[row.province].count += row._count;
  }

  // Aggregate weather alerts per province
  const weatherMap: Record<string, { weightedSum: number; count: number }> = {};
  for (const row of activeWeatherByProvince) {
    if (!weatherMap[row.province]) weatherMap[row.province] = { weightedSum: 0, count: 0 };
    const w = SEVERITY_WEIGHT[row.severity] ?? 1;
    weatherMap[row.province].weightedSum += w * row._count;
    weatherMap[row.province].count += row._count;
  }

  // Historical accident map
  const histMap: Record<string, number> = {};
  let histTotal = 0;
  for (const row of historicalByProvince) {
    histMap[row.province] = row.accidents;
    histTotal += row.accidents;
  }
  const histAvg = provinceSet.size > 0 ? histTotal / provinceSet.size : 1;

  // Normalisation factors
  const maxIncidentWeighted = Math.max(...Object.values(incidentMap).map((v) => v.weightedSum), 1);
  const maxWeatherWeighted = Math.max(...Object.values(weatherMap).map((v) => v.weightedSum), 1);

  // RiskZone count per province is not indexed by province in this model (roadNumber only).
  // We skip per-province riskZone scoring here; it contributes via road-level queries.
  // Use a baseline of 0 (no data) for the province view.

  const scores: ScoreEntry[] = [];

  for (const province of provinceSet) {
    const inc = incidentMap[province] ?? { weightedSum: 0, count: 0 };
    const wea = weatherMap[province] ?? { weightedSum: 0, count: 0 };
    const histAccidents = histMap[province] ?? 0;

    const incidentsComponent = Math.round((inc.weightedSum / maxIncidentWeighted) * 100);
    const weatherComponent = Math.round((wea.weightedSum / maxWeatherWeighted) * 100);
    const riskZonesComponent = 0; // no province index on RiskZone
    const historicalComponent = Math.min(
      Math.round((histAccidents / Math.max(histAvg, 1)) * 50), // normalized: avg → 50
      100
    );

    const score = Math.round(
      incidentsComponent * 0.35 +
        weatherComponent * 0.25 +
        riskZonesComponent * 0.2 +
        historicalComponent * 0.1 +
        timeOfDayScore * 0.1
    );

    scores.push({
      id: province,
      name: provinceNames[province] ?? province,
      score,
      level: getDangerLevel(score),
      components: {
        incidents: incidentsComponent,
        weather: weatherComponent,
        riskZones: riskZonesComponent,
        historical: historicalComponent,
        timeOfDay: timeOfDayScore,
      },
      activeIncidents: inc.count,
      weatherAlerts: wea.count,
    });
  }

  return scores.sort((a, b) => b.score - a.score).slice(0, 20);
}

async function calculateProvinceScores(
  provinceCodes: string[],
  timeOfDayScore: number
): Promise<ScoreEntry[]> {
  const [
    activeIncidentsByProvince,
    activeWeatherByProvince,
    historicalByProvince,
    allProvinces,
  ] = await Promise.all([
    prisma.trafficIncident.groupBy({
      by: ["province", "severity"],
      where: { isActive: true, province: { in: provinceCodes } },
      _count: true,
    }),

    prisma.weatherAlert.groupBy({
      by: ["province", "severity"],
      where: { isActive: true, province: { in: provinceCodes } },
      _count: true,
    }),

    prisma.$queryRaw<Array<{ province: string; accidents: number }>>`
      SELECT province, SUM(accidents)::int AS accidents
      FROM "HistoricalAccidents"
      WHERE year = (SELECT MAX(year) FROM "HistoricalAccidents")
        AND province = ANY(${provinceCodes})
      GROUP BY province
    `,

    prisma.province.findMany({
      where: { code: { in: provinceCodes } },
      select: { code: true, name: true },
    }),
  ]);

  // Fetch global max for normalisation (so per-province scores are comparable)
  const [globalMaxIncidents, globalMaxWeather] = await Promise.all([
    prisma.$queryRaw<Array<{ max_weighted: number }>>`
      SELECT COALESCE(MAX(
        CASE severity
          WHEN 'LOW'      THEN 1
          WHEN 'MEDIUM'   THEN 2
          WHEN 'HIGH'     THEN 3
          WHEN 'VERY_HIGH' THEN 4
          ELSE 1
        END * cnt
      ), 1) AS max_weighted
      FROM (
        SELECT province, severity, COUNT(*) AS cnt
        FROM "TrafficIncident"
        WHERE "isActive" = true AND province IS NOT NULL
        GROUP BY province, severity
      ) sub
    `,
    prisma.$queryRaw<Array<{ max_weighted: number }>>`
      SELECT COALESCE(MAX(
        CASE severity
          WHEN 'LOW'      THEN 1
          WHEN 'MEDIUM'   THEN 2
          WHEN 'HIGH'     THEN 3
          WHEN 'VERY_HIGH' THEN 4
          ELSE 1
        END * cnt
      ), 1) AS max_weighted
      FROM (
        SELECT province, severity, COUNT(*) AS cnt
        FROM "WeatherAlert"
        WHERE "isActive" = true
        GROUP BY province, severity
      ) sub
    `,
  ]);

  const maxIncidentWeighted = Number(globalMaxIncidents[0]?.max_weighted ?? 1);
  const maxWeatherWeighted = Number(globalMaxWeather[0]?.max_weighted ?? 1);

  const provinceNames: Record<string, string> = {};
  for (const p of allProvinces) {
    provinceNames[p.code] = p.name;
  }

  const incidentMap: Record<string, { weightedSum: number; count: number }> = {};
  for (const row of activeIncidentsByProvince) {
    if (!row.province) continue;
    if (!incidentMap[row.province]) incidentMap[row.province] = { weightedSum: 0, count: 0 };
    const w = SEVERITY_WEIGHT[row.severity] ?? 1;
    incidentMap[row.province].weightedSum += w * row._count;
    incidentMap[row.province].count += row._count;
  }

  const weatherMap: Record<string, { weightedSum: number; count: number }> = {};
  for (const row of activeWeatherByProvince) {
    if (!weatherMap[row.province]) weatherMap[row.province] = { weightedSum: 0, count: 0 };
    const w = SEVERITY_WEIGHT[row.severity] ?? 1;
    weatherMap[row.province].weightedSum += w * row._count;
    weatherMap[row.province].count += row._count;
  }

  const histMap: Record<string, number> = {};
  for (const row of historicalByProvince) {
    histMap[row.province] = row.accidents;
  }

  // National average for historical normalisation
  const nationalAvgResult = await prisma.$queryRaw<Array<{ avg_accidents: number }>>`
    SELECT AVG(accidents)::float AS avg_accidents
    FROM (
      SELECT province, SUM(accidents) AS accidents
      FROM "HistoricalAccidents"
      WHERE year = (SELECT MAX(year) FROM "HistoricalAccidents")
      GROUP BY province
    ) sub
  `;
  const histAvg = Number(nationalAvgResult[0]?.avg_accidents ?? 1) || 1;

  return provinceCodes.map((province) => {
    const inc = incidentMap[province] ?? { weightedSum: 0, count: 0 };
    const wea = weatherMap[province] ?? { weightedSum: 0, count: 0 };
    const histAccidents = histMap[province] ?? 0;

    const incidentsComponent = Math.round((inc.weightedSum / maxIncidentWeighted) * 100);
    const weatherComponent = Math.round((wea.weightedSum / maxWeatherWeighted) * 100);
    const riskZonesComponent = 0;
    const historicalComponent = Math.min(
      Math.round((histAccidents / histAvg) * 50),
      100
    );

    const score = Math.round(
      incidentsComponent * 0.35 +
        weatherComponent * 0.25 +
        riskZonesComponent * 0.2 +
        historicalComponent * 0.1 +
        timeOfDayScore * 0.1
    );

    return {
      id: province,
      name: provinceNames[province] ?? province,
      score,
      level: getDangerLevel(score),
      components: {
        incidents: incidentsComponent,
        weather: weatherComponent,
        riskZones: riskZonesComponent,
        historical: historicalComponent,
        timeOfDay: timeOfDayScore,
      },
      activeIncidents: inc.count,
      weatherAlerts: wea.count,
    };
  });
}

// ---------------------------------------------------------------------------
// Road-level scoring
// ---------------------------------------------------------------------------

async function calculateRoadScore(
  roadFilter: string,
  timeOfDayScore: number
): Promise<ScoreEntry[]> {
  const roadLike = `%${roadFilter.toUpperCase()}%`;

  const [
    activeIncidentsBySeverity,
    riskZoneCount,
    historicalByRoad,
    globalHistAvg,
    globalMaxIncidents,
  ] = await Promise.all([
    // Active incidents on matching roads, grouped by severity
    prisma.trafficIncident.groupBy({
      by: ["severity"],
      where: {
        isActive: true,
        roadNumber: { contains: roadFilter, mode: "insensitive" },
      },
      _count: true,
    }),

    // Risk zones on the road (RiskZone model — indexed by roadNumber)
    prisma.riskZone.count({
      where: { roadNumber: { contains: roadFilter, mode: "insensitive" } },
    }),

    // Historical accidents: HistoricalAccidents has no roadNumber, so we use
    // RoadRiskZone which references road directly for additional signal
    prisma.roadRiskZone.count({
      where: {
        road: { contains: roadFilter, mode: "insensitive" },
        isActive: true,
      },
    }),

    // National average historical accidents (province-level, used as baseline)
    prisma.$queryRaw<Array<{ avg_accidents: number }>>`
      SELECT AVG(accidents)::float AS avg_accidents
      FROM (
        SELECT province, SUM(accidents) AS accidents
        FROM "HistoricalAccidents"
        WHERE year = (SELECT MAX(year) FROM "HistoricalAccidents")
        GROUP BY province
      ) sub
    `,

    // Global max weighted incident score (for normalisation)
    prisma.$queryRaw<Array<{ max_weighted: number }>>`
      SELECT COALESCE(MAX(weighted), 1) AS max_weighted
      FROM (
        SELECT
          CASE severity
            WHEN 'LOW'      THEN 1
            WHEN 'MEDIUM'   THEN 2
            WHEN 'HIGH'     THEN 3
            WHEN 'VERY_HIGH' THEN 4
            ELSE 1
          END * COUNT(*) AS weighted
        FROM "TrafficIncident"
        WHERE "isActive" = true AND "roadNumber" IS NOT NULL
        GROUP BY "roadNumber", severity
      ) sub
    `,
  ]);

  const maxIncidentWeighted = Number(globalMaxIncidents[0]?.max_weighted ?? 1);

  // Weighted incident sum for this road
  let incidentWeightedSum = 0;
  let incidentCount = 0;
  for (const row of activeIncidentsBySeverity) {
    const w = SEVERITY_WEIGHT[row.severity] ?? 1;
    incidentWeightedSum += w * row._count;
    incidentCount += row._count;
  }

  // Components
  const incidentsComponent = Math.round((incidentWeightedSum / maxIncidentWeighted) * 100);

  // Weather: road queries don't have province so we skip (no reliable link)
  const weatherComponent = 0;

  // Risk zones: cap at 10 zones = 100 score
  const riskZonesComponent = Math.min(riskZoneCount * 10, 100);

  // Historical: use RoadRiskZone count as proxy (active danger zones on road)
  // Normalise against expected average of ~5 per road
  const histAvg = Number(globalHistAvg[0]?.avg_accidents ?? 1) || 1;
  // historicalByRoad is the count of active RoadRiskZones (proxy for danger density)
  const historicalComponent = Math.min(Math.round((historicalByRoad / 5) * 50), 100);

  const score = Math.round(
    incidentsComponent * 0.35 +
      weatherComponent * 0.25 +
      riskZonesComponent * 0.2 +
      historicalComponent * 0.1 +
      timeOfDayScore * 0.1
  );

  const entry: ScoreEntry = {
    id: roadFilter.toUpperCase(),
    name: roadFilter.toUpperCase(),
    score,
    level: getDangerLevel(score),
    components: {
      incidents: incidentsComponent,
      weather: weatherComponent,
      riskZones: riskZonesComponent,
      historical: historicalComponent,
      timeOfDay: timeOfDayScore,
    },
    activeIncidents: incidentCount,
    weatherAlerts: 0,
  };

  // Suppress unused variable warning
  void histAvg;

  return [entry];
}
