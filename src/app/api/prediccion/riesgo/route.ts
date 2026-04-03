import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/prediccion/riesgo
 *
 * Accident risk prediction for a given road/province/time based on
 * historical DGT microdata (AccidentMicrodata) + weather condition.
 *
 * Query params:
 *   - road       — road number (e.g. "A-6"), optional
 *   - province   — INE 2-digit code (e.g. "28"), optional
 *   - hour       — hour of day 0-23 (default: current Madrid hour)
 *   - dayOfWeek  — 1=Mon … 7=Sun (default: today in Madrid)
 *   - weather    — clear|rain|fog|snow|wind (default: clear)
 */

type WeatherCountRow = {
  weatherCondition: string | null;
  total: bigint;
};

const VALID_WEATHER = ["clear", "rain", "fog", "snow", "wind"] as const;
type WeatherCondition = (typeof VALID_WEATHER)[number];

// Map query-param weather labels to AccidentMicrodata.weatherCondition values
const WEATHER_MAP: Record<WeatherCondition, string[]> = {
  clear: ["clear", "despejado", "bueno", "good", "fair"],
  rain: ["rain", "lluvia", "lloviendo", "wet", "húmedo", "nublado"],
  fog: ["fog", "niebla", "neblina", "mist"],
  snow: ["snow", "nieve", "nevando", "ice", "hielo"],
  wind: ["wind", "viento", "strong wind", "viento fuerte"],
};

function getRiskLevel(score: number): "low" | "medium" | "high" | "very_high" {
  if (score < 25) return "low";
  if (score < 50) return "medium";
  if (score < 75) return "high";
  return "very_high";
}

function getRiskRecommendation(
  level: "low" | "medium" | "high" | "very_high",
  weather: WeatherCondition,
  hour: number
): string {
  const isNight = hour >= 22 || hour < 6;

  if (level === "very_high") {
    return isNight
      ? "Riesgo muy alto: tramo nocturno con historial de accidentes elevado. Reduzca la velocidad y extreme la precaución."
      : weather !== "clear"
        ? `Riesgo muy alto: condiciones de ${weather} agravan el peligro histórico en este tramo. Considere aplazar el viaje.`
        : "Riesgo muy alto: tramo con historial de accidentes muy elevado. Reduzca velocidad y mantenga distancia de seguridad.";
  }
  if (level === "high") {
    return weather !== "clear"
      ? `Riesgo alto: condiciones de ${weather} incrementan el peligro. Conduzca con precaución y respete los límites de velocidad.`
      : "Riesgo alto: tramo con historial de accidentes significativo. Mantenga atención y velocidad prudente.";
  }
  if (level === "medium") {
    return "Riesgo moderado: conduzca con precaución habitual y respete la señalización.";
  }
  return "Riesgo bajo: condiciones habituales de circulación.";
}

/** Madrid current time: hour 0-23, dayOfWeek 1=Mon 7=Sun */
function getMadridNow(): { hour: number; dayOfWeek: number } {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  // JS getDay(): 0=Sun…6=Sat → convert to 1=Mon…7=Sun
  const jsDay = d.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;
  return { hour: d.getHours(), dayOfWeek };
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    // --- Parse & validate params ---
    const road = searchParams.get("road") || null;
    const province = searchParams.get("province") || null;

    const now = getMadridNow();
    const hourRaw = parseInt(searchParams.get("hour") ?? String(now.hour), 10);
    const dayOfWeekRaw = parseInt(
      searchParams.get("dayOfWeek") ?? String(now.dayOfWeek),
      10
    );
    const weatherRaw = (searchParams.get("weather") || "clear") as WeatherCondition;

    if (isNaN(hourRaw) || hourRaw < 0 || hourRaw > 23) {
      return NextResponse.json(
        { success: false, error: "Invalid hour. Must be 0-23." },
        { status: 400 }
      );
    }
    if (isNaN(dayOfWeekRaw) || dayOfWeekRaw < 1 || dayOfWeekRaw > 7) {
      return NextResponse.json(
        { success: false, error: "Invalid dayOfWeek. Must be 1 (Mon) to 7 (Sun)." },
        { status: 400 }
      );
    }
    if (!VALID_WEATHER.includes(weatherRaw)) {
      return NextResponse.json(
        { success: false, error: `Invalid weather. Valid: ${VALID_WEATHER.join("|")}` },
        { status: 400 }
      );
    }

    const cacheKey = `prediccion:riesgo:${road ?? "all"}:${province ?? "all"}:${hourRaw}:${dayOfWeekRaw}:${weatherRaw}`;

    const result = await getOrCompute<object>(cacheKey, 300, async () => {
      // ---------------------------------------------------------------
      // 1. Base accident count for this slot (road + province + hour + dayOfWeek)
      // ---------------------------------------------------------------
      const slotFilter: Record<string, unknown> = { hour: hourRaw, dayOfWeek: dayOfWeekRaw };
      if (road) slotFilter.roadNumber = road;
      if (province) slotFilter.province = province;

      const [slotCount, provinceTotal] = await Promise.all([
        // Accidents in this specific slot
        prisma.accidentMicrodata.count({ where: slotFilter }),
        // Total accidents in province (or national) for normalization
        prisma.accidentMicrodata.count({
          where: province ? { province } : {},
        }),
      ]);

      // ---------------------------------------------------------------
      // 2. Weather multiplier — ratio of accidents in queried weather vs clear
      // ---------------------------------------------------------------
      const weatherFilter: Record<string, unknown> = {};
      if (road) weatherFilter.roadNumber = road;
      if (province) weatherFilter.province = province;

      const weatherAccidents = await prisma.accidentMicrodata.groupBy({
        by: ["weatherCondition"],
        where: { ...weatherFilter, weatherCondition: { not: null } },
        _count: { _all: true },
      });

      // Map groupBy result to WeatherCountRow shape
      const weatherRows: WeatherCountRow[] = weatherAccidents.map((r) => ({
        weatherCondition: r.weatherCondition,
        total: BigInt(r._count._all),
      }));

      const clearLabels = WEATHER_MAP["clear"];
      const targetLabels = WEATHER_MAP[weatherRaw];

      let clearCount = 0;
      let targetCount = 0;
      for (const row of weatherRows) {
        const wc = (row.weatherCondition ?? "").toLowerCase();
        if (clearLabels.some((l) => wc.includes(l))) clearCount += Number(row.total);
        if (targetLabels.some((l) => wc.includes(l))) targetCount += Number(row.total);
      }

      // Default multiplier = 1.0 (clear), otherwise ratio target/clear
      let weatherMultiplier = 1.0;
      if (weatherRaw !== "clear" && clearCount > 0 && targetCount > 0) {
        weatherMultiplier = Math.round((targetCount / clearCount) * 100) / 100;
      } else if (weatherRaw !== "clear") {
        // No historical data for this weather — use safe defaults
        const defaults: Record<WeatherCondition, number> = {
          clear: 1.0,
          rain: 1.6,
          fog: 1.9,
          snow: 2.4,
          wind: 1.3,
        };
        weatherMultiplier = defaults[weatherRaw];
      }

      // ---------------------------------------------------------------
      // 3. Night severity multiplier (22:00–06:00)
      // ---------------------------------------------------------------
      const isNight = hourRaw >= 22 || hourRaw < 6;
      const nightMultiplier = isNight ? 1.25 : 1.0;

      // ---------------------------------------------------------------
      // 4. Compute risk score 0-100
      // ---------------------------------------------------------------
      // Base rate: slot accidents as fraction of province total
      const baseRate = provinceTotal > 0 ? slotCount / provinceTotal : 0;
      // Scale to 0-100 using a logarithmic curve so even small rates show signal
      const rawScore = baseRate > 0 ? Math.min(Math.log1p(baseRate * 10000) / Math.log1p(100), 1) : 0;
      const adjustedScore = Math.min(rawScore * weatherMultiplier * nightMultiplier, 1);
      const riskScore = Math.round(adjustedScore * 100);
      const riskLevel = getRiskLevel(riskScore);

      // ---------------------------------------------------------------
      // 5. Build factors list
      // ---------------------------------------------------------------
      const factors: string[] = [];
      if (slotCount > 10) factors.push(`${slotCount} accidentes históricos en este tramo/horario`);
      if (isNight) factors.push("Hora nocturna (22h-6h): mayor severidad histórica");
      if (weatherRaw !== "clear") {
        factors.push(
          `Condición meteorológica "${weatherRaw}": multiplicador ×${weatherMultiplier.toFixed(2)}`
        );
      }
      if (dayOfWeekRaw >= 5) factors.push("Fin de semana: mayor densidad de accidentes");

      return {
        success: true,
        data: {
          riskScore,
          riskLevel,
          factors: factors.length > 0 ? factors : ["Sin factores de riesgo especiales detectados"],
          historicalAccidents: slotCount,
          weatherMultiplier,
          nightMultiplier,
          recommendation: getRiskRecommendation(riskLevel, weatherRaw, hourRaw),
          context: {
            road: road ?? null,
            province: province ?? null,
            hour: hourRaw,
            dayOfWeek: dayOfWeekRaw,
            weather: weatherRaw,
            provinceTotal,
          },
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    reportApiError(error, "Accident risk prediction API error", request);
    return NextResponse.json(
      { success: false, error: "Failed to compute accident risk prediction" },
      { status: 500 }
    );
  }
}
