/**
 * Corridor definitions — multimodal transport comparison between major Spanish cities.
 *
 * Each corridor connects two cities and defines the available transport modes
 * (road, rail, air) with static reference data. Live data (fuel prices, incidents,
 * mobility flows, accident stats) is fetched at request time from existing models.
 */

export interface CorridorCity {
  city: string;
  province: string; // INE 2-digit code
  iata?: string; // Airport IATA code (if city has commercial flights)
}

export interface Corridor {
  slug: string;
  name: string;
  origin: CorridorCity;
  destination: CorridorCity;
  roads: string[]; // Road IDs that form the corridor: ["A-2", "AP-2"]
  distance: number; // km by road
  driveTime: number; // minutes (typical, no traffic)
  trainBrands?: string[]; // Commercial train brands on this corridor
  trainTime?: number; // minutes (fastest service)
}

export const CORRIDORS: Corridor[] = [
  {
    slug: "madrid-barcelona",
    name: "Madrid — Barcelona",
    origin: { city: "Madrid", province: "28", iata: "MAD" },
    destination: { city: "Barcelona", province: "08", iata: "BCN" },
    roads: ["A-2", "AP-2"],
    distance: 621,
    driveTime: 360,
    trainBrands: ["AVE", "AVLO"],
    trainTime: 150,
  },
  {
    slug: "madrid-sevilla",
    name: "Madrid — Sevilla",
    origin: { city: "Madrid", province: "28", iata: "MAD" },
    destination: { city: "Sevilla", province: "41", iata: "SVQ" },
    roads: ["A-4"],
    distance: 534,
    driveTime: 310,
    trainBrands: ["AVE"],
    trainTime: 150,
  },
  {
    slug: "madrid-valencia",
    name: "Madrid — Valencia",
    origin: { city: "Madrid", province: "28", iata: "MAD" },
    destination: { city: "Valencia", province: "46", iata: "VLC" },
    roads: ["A-3"],
    distance: 356,
    driveTime: 210,
    trainBrands: ["AVE", "Alvia"],
    trainTime: 100,
  },
  {
    slug: "barcelona-valencia",
    name: "Barcelona — Valencia",
    origin: { city: "Barcelona", province: "08", iata: "BCN" },
    destination: { city: "Valencia", province: "46", iata: "VLC" },
    roads: ["AP-7", "A-7"],
    distance: 349,
    driveTime: 210,
    trainBrands: ["Euromed", "AVE"],
    trainTime: 165,
  },
  {
    slug: "madrid-malaga",
    name: "Madrid — Malaga",
    origin: { city: "Madrid", province: "28", iata: "MAD" },
    destination: { city: "Malaga", province: "29", iata: "AGP" },
    roads: ["A-4", "A-45"],
    distance: 531,
    driveTime: 310,
    trainBrands: ["AVE"],
    trainTime: 150,
  },
  {
    slug: "madrid-bilbao",
    name: "Madrid — Bilbao",
    origin: { city: "Madrid", province: "28", iata: "MAD" },
    destination: { city: "Bilbao", province: "48", iata: "BIO" },
    roads: ["A-1", "AP-1"],
    distance: 395,
    driveTime: 250,
    trainBrands: ["Alvia"],
    trainTime: 285,
  },
  {
    slug: "sevilla-malaga",
    name: "Sevilla — Malaga",
    origin: { city: "Sevilla", province: "41", iata: "SVQ" },
    destination: { city: "Malaga", province: "29", iata: "AGP" },
    roads: ["A-92", "AP-4"],
    distance: 209,
    driveTime: 150,
    trainBrands: ["AVE", "MD"],
    trainTime: 115,
  },
  {
    slug: "valencia-alicante",
    name: "Valencia — Alicante",
    origin: { city: "Valencia", province: "46", iata: "VLC" },
    destination: { city: "Alicante", province: "03", iata: "ALC" },
    roads: ["A-7", "AP-7"],
    distance: 177,
    driveTime: 110,
    trainBrands: ["Euromed", "Alvia"],
    trainTime: 100,
  },
  {
    slug: "madrid-zaragoza",
    name: "Madrid — Zaragoza",
    origin: { city: "Madrid", province: "28", iata: "MAD" },
    destination: { city: "Zaragoza", province: "50", iata: "ZAZ" },
    roads: ["A-2"],
    distance: 325,
    driveTime: 195,
    trainBrands: ["AVE"],
    trainTime: 75,
  },
  {
    slug: "barcelona-zaragoza",
    name: "Barcelona — Zaragoza",
    origin: { city: "Barcelona", province: "08", iata: "BCN" },
    destination: { city: "Zaragoza", province: "50", iata: "ZAZ" },
    roads: ["AP-2", "A-2"],
    distance: 296,
    driveTime: 180,
    trainBrands: ["AVE"],
    trainTime: 90,
  },
  {
    slug: "madrid-alicante",
    name: "Madrid — Alicante",
    origin: { city: "Madrid", province: "28", iata: "MAD" },
    destination: { city: "Alicante", province: "03", iata: "ALC" },
    roads: ["A-31", "A-3"],
    distance: 422,
    driveTime: 240,
    trainBrands: ["AVE", "Alvia"],
    trainTime: 130,
  },
  {
    slug: "madrid-coruna",
    name: "Madrid — A Coruna",
    origin: { city: "Madrid", province: "28", iata: "MAD" },
    destination: { city: "A Coruna", province: "15", iata: "LCG" },
    roads: ["A-6", "AP-9"],
    distance: 603,
    driveTime: 360,
    trainBrands: ["Alvia"],
    trainTime: 390,
  },
];

/**
 * Lookup a corridor by slug. Returns undefined if not found.
 */
export function getCorridorBySlug(slug: string): Corridor | undefined {
  return CORRIDORS.find((c) => c.slug === slug);
}

/**
 * Get all corridor slugs (for generateStaticParams).
 */
export function getAllCorridorSlugs(): string[] {
  return CORRIDORS.map((c) => c.slug);
}

/**
 * Check if a corridor has air connections (both ends have airports).
 */
export function hasAirConnection(corridor: Corridor): boolean {
  return !!corridor.origin.iata && !!corridor.destination.iata;
}

/**
 * Check if a corridor has rail connections.
 */
export function hasRailConnection(corridor: Corridor): boolean {
  return !!corridor.trainBrands && corridor.trainBrands.length > 0;
}

/**
 * CO2 emission factors (kg CO2 per passenger-km).
 * Sources: European Environment Agency, MITECO.
 */
export const CO2_FACTORS = {
  car: 0.12, // Average car, 1.2 occupants
  train: 0.014, // High-speed rail (AVE)
  plane: 0.255, // Domestic short-haul
} as const;

/**
 * Average car fuel consumption (L/100km) for cost estimates.
 */
export const CAR_CONSUMPTION_L_100KM = 7;

/**
 * Static train price estimates (EUR) — "desde X EUR" reference prices.
 * These are indicative base fares, not real-time prices.
 */
export const TRAIN_PRICE_ESTIMATES: Record<string, number> = {
  "madrid-barcelona": 25,
  "madrid-sevilla": 25,
  "madrid-valencia": 15,
  "barcelona-valencia": 20,
  "madrid-malaga": 25,
  "madrid-bilbao": 25,
  "sevilla-malaga": 15,
  "valencia-alicante": 10,
  "madrid-zaragoza": 15,
  "barcelona-zaragoza": 15,
  "madrid-alicante": 20,
  "madrid-coruna": 30,
};
