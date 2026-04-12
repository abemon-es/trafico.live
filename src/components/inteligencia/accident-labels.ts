/**
 * Pure label utilities and shared types for accident intelligence pages.
 *
 * Intentionally has NO "use client" directive so server components can
 * import these functions directly without crossing the RSC boundary.
 * AccidentTrendChart.tsx re-exports everything here for convenience.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface YearTrendItem {
  year: number;
  accidents: number;
  fatalities: number;
  hospitalized: number;
}

export interface HourDistributionItem {
  hour: number;
  accidents: number;
  fatalities: number;
}

export interface ProvinceRankingItem {
  province: string;
  provinceName: string;
  accidents: number;
  fatalities: number;
  hospitalized: number;
}

export interface WeatherBreakdownItem {
  weatherCondition: string;
  accidents: number;
  fatalities: number;
}

export interface RoadTypeBreakdownItem {
  roadType: string;
  accidents: number;
  fatalities: number;
}

export interface DayOfWeekItem {
  dayOfWeek: number;
  dayLabel: string;
  accidents: number;
  fatalities: number;
}

export interface LightConditionItem {
  lightCondition: string;
  accidents: number;
  fatalities: number;
}

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const DAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miercoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sabado",
  7: "Domingo",
};

const ROAD_TYPE_LABELS: Record<string, string> = {
  AUTOPISTA: "Autopista",
  AUTOVIA: "Autovia",
  NACIONAL: "Nacional",
  COMARCAL: "Comarcal",
  PROVINCIAL: "Provincial",
  URBANA: "Urbana",
  OTHER: "Otros",
};

const WEATHER_LABELS: Record<string, string> = {
  // Numeric codes stored by DGT microdata collector
  "1": "Buen tiempo",
  "2": "Lluvia debil",
  "3": "Lluvia fuerte",
  "4": "Niebla",
  "5": "Nieve",
  "6": "Granizo",
  "7": "Viento fuerte",
  "999": "Desconocido",
  // Legacy string keys (kept for backwards compatibility)
  clear: "Despejado",
  rain: "Lluvia",
  fog: "Niebla",
  snow: "Nieve",
  hail: "Granizo",
  wind: "Viento fuerte",
  "buen tiempo": "Despejado",
  lluvia: "Lluvia",
  niebla: "Niebla",
  nieve: "Nieve",
  granizo: "Granizo",
  viento: "Viento fuerte",
};

const LIGHT_LABELS: Record<string, string> = {
  daylight: "Luz diurna",
  twilight: "Crepusculo",
  night_lit: "Noche con iluminacion",
  night_unlit: "Noche sin iluminacion",
};

// ---------------------------------------------------------------------------
// Label functions
// ---------------------------------------------------------------------------

export function getDayLabel(day: number): string {
  return DAY_LABELS[day] ?? `Dia ${day}`;
}

export function getRoadTypeLabel(rt: string): string {
  return ROAD_TYPE_LABELS[rt] ?? rt;
}

export function getWeatherLabel(wc: string): string {
  return WEATHER_LABELS[wc] ?? WEATHER_LABELS[wc.toLowerCase()] ?? wc;
}

export function getLightLabel(lc: string): string {
  return LIGHT_LABELS[lc.toLowerCase()] ?? lc;
}

/** Weather condition codes 2 (lluvia debil) and 3 (lluvia fuerte) */
export function isRainWeather(wc: string | null): boolean {
  return wc === "2" || wc === "3";
}

/** Weather condition code 1 (buen tiempo / despejado) */
export function isClearWeather(wc: string | null): boolean {
  return wc === "1";
}

/** Weather condition code 4 (niebla) */
export function isFogWeather(wc: string | null): boolean {
  return wc === "4";
}

/** Weather condition code 7 (viento fuerte) */
export function isWindWeather(wc: string | null): boolean {
  return wc === "7";
}

/** Get weather icon type for numeric code */
export function getWeatherIconType(wc: string): "rain" | "clear" | "fog" | "wind" | "snow" | "other" {
  switch (wc) {
    case "1": return "clear";
    case "2": case "3": return "rain";
    case "4": return "fog";
    case "5": return "snow";
    case "6": return "other";
    case "7": return "wind";
    default: return "other";
  }
}
