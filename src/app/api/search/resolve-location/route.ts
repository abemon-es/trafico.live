/**
 * Location Resolution API — GET /api/search/resolve-location?q=Valencia
 *
 * Resolves a Spanish place name (city or province) to geographic coordinates.
 *
 * Resolution cascade:
 *   1. Clean & normalize input (strip prefixes, apply aliases)
 *   2. Exact lookup in CITY_COORDS (50+ capitals + major cities)
 *   3. Fuzzy search via Typesense `cities` collection → look up in CITY_COORDS
 *   4. Exact lookup in PROVINCE_CENTROIDS (all 52 provinces)
 *   5. Return { resolved: false } if nothing matches
 *
 * Responses are cached in Redis for 1 hour.
 */

import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/api-utils";
import { reportApiError } from "@/lib/api-error";
import { getOrCompute } from "@/lib/redis";
import { typesenseClient } from "@/lib/typesense";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LocationEntry {
  lat: number;
  lng: number;
  /** Display name (properly cased) */
  name: string;
  province: string;
}

interface ProvinceEntry {
  lat: number;
  lng: number;
  /** Display name (properly cased) */
  name: string;
}

interface ResolvedLocation {
  name: string;
  type: "city" | "province";
  lat: number;
  lng: number;
}

interface ResolveLocationResponse {
  resolved: boolean;
  location?: ResolvedLocation;
  alternatives?: ResolvedLocation[];
}

// ---------------------------------------------------------------------------
// Hardcoded city coordinates (all 52 province capitals + major cities)
// Keys are normalized (lowercase, no diacritics) for matching
// ---------------------------------------------------------------------------

// Normalizes a string for lookup: lowercase + remove diacritics
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// All 52 province capitals + major Spanish cities (80+ entries)
// Coordinates are WGS84 centroid of the urban area
const CITY_COORDS: Record<string, LocationEntry> = {
  // Andalucía
  almeria: { lat: 36.8381, lng: -2.4597, name: "Almería", province: "Almería" },
  cadiz: { lat: 36.5271, lng: -6.2886, name: "Cádiz", province: "Cádiz" },
  cordoba: { lat: 37.8882, lng: -4.7794, name: "Córdoba", province: "Córdoba" },
  granada: { lat: 37.1773, lng: -3.5986, name: "Granada", province: "Granada" },
  huelva: { lat: 37.2614, lng: -6.9447, name: "Huelva", province: "Huelva" },
  jaen: { lat: 37.7796, lng: -3.7849, name: "Jaén", province: "Jaén" },
  malaga: { lat: 36.7213, lng: -4.4214, name: "Málaga", province: "Málaga" },
  sevilla: { lat: 37.3891, lng: -5.9845, name: "Sevilla", province: "Sevilla" },
  jerez: { lat: 36.6866, lng: -6.1375, name: "Jerez de la Frontera", province: "Cádiz" },
  algeciras: { lat: 36.1408, lng: -5.4545, name: "Algeciras", province: "Cádiz" },
  marbella: { lat: 36.5101, lng: -4.8825, name: "Marbella", province: "Málaga" },
  // Aragón
  huesca: { lat: 42.1401, lng: -0.4089, name: "Huesca", province: "Huesca" },
  teruel: { lat: 40.3456, lng: -1.1065, name: "Teruel", province: "Teruel" },
  zaragoza: { lat: 41.6488, lng: -0.8891, name: "Zaragoza", province: "Zaragoza" },
  // Asturias
  oviedo: { lat: 43.3619, lng: -5.8494, name: "Oviedo", province: "Asturias" },
  gijon: { lat: 43.5322, lng: -5.6611, name: "Gijón", province: "Asturias" },
  aviles: { lat: 43.5568, lng: -5.9247, name: "Avilés", province: "Asturias" },
  // Baleares
  palma: { lat: 39.5696, lng: 2.6502, name: "Palma de Mallorca", province: "Baleares" },
  "palma de mallorca": { lat: 39.5696, lng: 2.6502, name: "Palma de Mallorca", province: "Baleares" },
  ibiza: { lat: 38.9067, lng: 1.4321, name: "Ibiza", province: "Baleares" },
  // Canarias
  "las palmas": { lat: 28.1235, lng: -15.4366, name: "Las Palmas de Gran Canaria", province: "Las Palmas" },
  "las palmas de gran canaria": { lat: 28.1235, lng: -15.4366, name: "Las Palmas de Gran Canaria", province: "Las Palmas" },
  "santa cruz de tenerife": { lat: 28.4636, lng: -16.2519, name: "Santa Cruz de Tenerife", province: "Santa Cruz de Tenerife" },
  "santa cruz": { lat: 28.4636, lng: -16.2519, name: "Santa Cruz de Tenerife", province: "Santa Cruz de Tenerife" },
  tenerife: { lat: 28.2916, lng: -16.6291, name: "Tenerife", province: "Santa Cruz de Tenerife" },
  "gran canaria": { lat: 27.9202, lng: -15.5474, name: "Gran Canaria", province: "Las Palmas" },
  // Cantabria
  santander: { lat: 43.4623, lng: -3.8099, name: "Santander", province: "Cantabria" },
  // Castilla-La Mancha
  albacete: { lat: 38.9942, lng: -1.8585, name: "Albacete", province: "Albacete" },
  "ciudad real": { lat: 38.9848, lng: -3.9274, name: "Ciudad Real", province: "Ciudad Real" },
  cuenca: { lat: 40.0704, lng: -2.1374, name: "Cuenca", province: "Cuenca" },
  guadalajara: { lat: 40.6333, lng: -3.1667, name: "Guadalajara", province: "Guadalajara" },
  toledo: { lat: 39.8628, lng: -4.0273, name: "Toledo", province: "Toledo" },
  // Castilla y León
  avila: { lat: 40.6567, lng: -4.6977, name: "Ávila", province: "Ávila" },
  burgos: { lat: 42.3440, lng: -3.6969, name: "Burgos", province: "Burgos" },
  leon: { lat: 42.5987, lng: -5.5671, name: "León", province: "León" },
  palencia: { lat: 42.0097, lng: -4.5288, name: "Palencia", province: "Palencia" },
  salamanca: { lat: 40.9701, lng: -5.6635, name: "Salamanca", province: "Salamanca" },
  segovia: { lat: 40.9429, lng: -4.1088, name: "Segovia", province: "Segovia" },
  soria: { lat: 41.7640, lng: -2.4657, name: "Soria", province: "Soria" },
  valladolid: { lat: 41.6523, lng: -4.7245, name: "Valladolid", province: "Valladolid" },
  zamora: { lat: 41.5036, lng: -5.7448, name: "Zamora", province: "Zamora" },
  // Cataluña
  barcelona: { lat: 41.3874, lng: 2.1686, name: "Barcelona", province: "Barcelona" },
  girona: { lat: 41.9794, lng: 2.8214, name: "Girona", province: "Girona" },
  lleida: { lat: 41.6176, lng: 0.6200, name: "Lleida", province: "Lleida" },
  tarragona: { lat: 41.1189, lng: 1.2445, name: "Tarragona", province: "Tarragona" },
  badalona: { lat: 41.4500, lng: 2.2472, name: "Badalona", province: "Barcelona" },
  hospitalet: { lat: 41.3598, lng: 2.0998, name: "L'Hospitalet de Llobregat", province: "Barcelona" },
  sabadell: { lat: 41.5433, lng: 2.1091, name: "Sabadell", province: "Barcelona" },
  terrassa: { lat: 41.5636, lng: 2.0089, name: "Terrassa", province: "Barcelona" },
  // Comunidad de Madrid
  madrid: { lat: 40.4168, lng: -3.7038, name: "Madrid", province: "Madrid" },
  mostoles: { lat: 40.3223, lng: -3.8641, name: "Móstoles", province: "Madrid" },
  alcala: { lat: 40.4819, lng: -3.3635, name: "Alcalá de Henares", province: "Madrid" },
  "alcala de henares": { lat: 40.4819, lng: -3.3635, name: "Alcalá de Henares", province: "Madrid" },
  fuenlabrada: { lat: 40.2839, lng: -3.7988, name: "Fuenlabrada", province: "Madrid" },
  leganes: { lat: 40.3283, lng: -3.7637, name: "Leganés", province: "Madrid" },
  getafe: { lat: 40.3050, lng: -3.7320, name: "Getafe", province: "Madrid" },
  alcorcon: { lat: 40.3489, lng: -3.8282, name: "Alcorcón", province: "Madrid" },
  // Comunidad Valenciana
  valencia: { lat: 39.4699, lng: -0.3763, name: "Valencia", province: "Valencia" },
  alicante: { lat: 38.3452, lng: -0.4815, name: "Alicante", province: "Alicante" },
  castellon: { lat: 39.9864, lng: -0.0513, name: "Castellón de la Plana", province: "Castellón" },
  "castellon de la plana": { lat: 39.9864, lng: -0.0513, name: "Castellón de la Plana", province: "Castellón" },
  elche: { lat: 38.2669, lng: -0.6985, name: "Elche", province: "Alicante" },
  torrevieja: { lat: 37.9786, lng: -0.6834, name: "Torrevieja", province: "Alicante" },
  benidorm: { lat: 38.5417, lng: -0.1315, name: "Benidorm", province: "Alicante" },
  // Extremadura
  badajoz: { lat: 38.8794, lng: -6.9706, name: "Badajoz", province: "Badajoz" },
  caceres: { lat: 39.4753, lng: -6.3724, name: "Cáceres", province: "Cáceres" },
  // Galicia
  "a coruna": { lat: 43.3713, lng: -8.3960, name: "A Coruña", province: "A Coruña" },
  coruna: { lat: 43.3713, lng: -8.3960, name: "A Coruña", province: "A Coruña" },
  lugo: { lat: 43.0097, lng: -7.5567, name: "Lugo", province: "Lugo" },
  ourense: { lat: 42.3364, lng: -7.8641, name: "Ourense", province: "Ourense" },
  pontevedra: { lat: 42.4328, lng: -8.6480, name: "Pontevedra", province: "Pontevedra" },
  vigo: { lat: 42.2406, lng: -8.7207, name: "Vigo", province: "Pontevedra" },
  santiago: { lat: 42.8782, lng: -8.5448, name: "Santiago de Compostela", province: "A Coruña" },
  "santiago de compostela": { lat: 42.8782, lng: -8.5448, name: "Santiago de Compostela", province: "A Coruña" },
  // La Rioja
  logrono: { lat: 42.4650, lng: -2.4457, name: "Logroño", province: "La Rioja" },
  // Murcia
  murcia: { lat: 37.9922, lng: -1.1307, name: "Murcia", province: "Murcia" },
  cartagena: { lat: 37.6257, lng: -0.9966, name: "Cartagena", province: "Murcia" },
  // Navarra
  pamplona: { lat: 42.8188, lng: -1.6440, name: "Pamplona", province: "Navarra" },
  // País Vasco
  bilbao: { lat: 43.2630, lng: -2.9350, name: "Bilbao", province: "Vizcaya" },
  "vitoria-gasteiz": { lat: 42.8467, lng: -2.6726, name: "Vitoria-Gasteiz", province: "Álava" },
  vitoria: { lat: 42.8467, lng: -2.6726, name: "Vitoria-Gasteiz", province: "Álava" },
  gasteiz: { lat: 42.8467, lng: -2.6726, name: "Vitoria-Gasteiz", province: "Álava" },
  "donostia-san sebastian": { lat: 43.3183, lng: -1.9812, name: "Donostia-San Sebastián", province: "Guipúzcoa" },
  "san sebastian": { lat: 43.3183, lng: -1.9812, name: "Donostia-San Sebastián", province: "Guipúzcoa" },
  donostia: { lat: 43.3183, lng: -1.9812, name: "Donostia-San Sebastián", province: "Guipúzcoa" },
  // Ciudades Autónomas
  ceuta: { lat: 35.8894, lng: -5.3213, name: "Ceuta", province: "Ceuta" },
  melilla: { lat: 35.2923, lng: -2.9381, name: "Melilla", province: "Melilla" },
  // Additional major cities
  barakaldo: { lat: 43.2968, lng: -2.9922, name: "Barakaldo", province: "Vizcaya" },
  "santa coloma de gramenet": { lat: 41.4519, lng: 2.2094, name: "Santa Coloma de Gramenet", province: "Barcelona" },
  "l'hospitalet de llobregat": { lat: 41.3598, lng: 2.0998, name: "L'Hospitalet de Llobregat", province: "Barcelona" },
  "cornella de llobregat": { lat: 41.3549, lng: 2.0720, name: "Cornellà de Llobregat", province: "Barcelona" },
  "san cugat del valles": { lat: 41.4728, lng: 2.0843, name: "Sant Cugat del Vallès", province: "Barcelona" },
  reus: { lat: 41.1562, lng: 1.1063, name: "Reus", province: "Tarragona" },
  mataro: { lat: 41.5381, lng: 2.4463, name: "Mataró", province: "Barcelona" },
  manresa: { lat: 41.7279, lng: 1.8248, name: "Manresa", province: "Barcelona" },
  "el puerto de santa maria": { lat: 36.5942, lng: -6.2333, name: "El Puerto de Santa María", province: "Cádiz" },
  linea: { lat: 36.1676, lng: -5.3491, name: "La Línea de la Concepción", province: "Cádiz" },
  "la linea de la concepcion": { lat: 36.1676, lng: -5.3491, name: "La Línea de la Concepción", province: "Cádiz" },
  motril: { lat: 36.7512, lng: -3.5148, name: "Motril", province: "Granada" },
  torremolinos: { lat: 36.6217, lng: -4.4995, name: "Torremolinos", province: "Málaga" },
  velez: { lat: 36.7833, lng: -4.0994, name: "Vélez-Málaga", province: "Málaga" },
  fuengirola: { lat: 36.5408, lng: -4.6246, name: "Fuengirola", province: "Málaga" },
  ronda: { lat: 36.7462, lng: -5.1619, name: "Ronda", province: "Málaga" },
  talavera: { lat: 39.9643, lng: -4.8312, name: "Talavera de la Reina", province: "Toledo" },
  "talavera de la reina": { lat: 39.9643, lng: -4.8312, name: "Talavera de la Reina", province: "Toledo" },
  irun: { lat: 43.3389, lng: -1.7887, name: "Irún", province: "Guipúzcoa" },
  "santiago de la ribera": { lat: 37.7972, lng: -0.7800, name: "Santiago de la Ribera", province: "Murcia" },
  lorca: { lat: 37.6714, lng: -1.6998, name: "Lorca", province: "Murcia" },
  elda: { lat: 38.4770, lng: -0.7892, name: "Elda", province: "Alicante" },
  orihuela: { lat: 38.0851, lng: -0.9452, name: "Orihuela", province: "Alicante" },
  gandia: { lat: 38.9660, lng: -0.1780, name: "Gandía", province: "Valencia" },
  sagunto: { lat: 39.6813, lng: -0.2703, name: "Sagunto", province: "Valencia" },
  "alzira": { lat: 39.1497, lng: -0.4333, name: "Alzira", province: "Valencia" },
  ontinyent: { lat: 38.8209, lng: -0.6072, name: "Ontinyent", province: "Valencia" },
  gilet: { lat: 39.6958, lng: -0.2836, name: "Gilet", province: "Valencia" },
  manacor: { lat: 39.5720, lng: 3.2115, name: "Manacor", province: "Baleares" },
  "palma mallorca": { lat: 39.5696, lng: 2.6502, name: "Palma de Mallorca", province: "Baleares" },
  arrecife: { lat: 28.9629, lng: -13.5484, name: "Arrecife", province: "Las Palmas" },
  "puerto del rosario": { lat: 28.5002, lng: -13.8616, name: "Puerto del Rosario", province: "Las Palmas" },
  "san cristobal de la laguna": { lat: 28.4869, lng: -16.3159, name: "San Cristóbal de La Laguna", province: "Santa Cruz de Tenerife" },
  "la laguna": { lat: 28.4869, lng: -16.3159, name: "San Cristóbal de La Laguna", province: "Santa Cruz de Tenerife" },
};

// ---------------------------------------------------------------------------
// Province centroids (all 52 provinces)
// ---------------------------------------------------------------------------

const PROVINCE_CENTROIDS: Record<string, ProvinceEntry> = {
  alava: { lat: 42.85, lng: -2.67, name: "Álava" },
  albacete: { lat: 38.99, lng: -1.86, name: "Albacete" },
  alicante: { lat: 38.35, lng: -0.48, name: "Alicante" },
  almeria: { lat: 37.10, lng: -2.30, name: "Almería" },
  asturias: { lat: 43.30, lng: -5.85, name: "Asturias" },
  avila: { lat: 40.57, lng: -4.99, name: "Ávila" },
  badajoz: { lat: 38.66, lng: -6.17, name: "Badajoz" },
  baleares: { lat: 39.57, lng: 2.65, name: "Baleares" },
  barcelona: { lat: 41.69, lng: 1.86, name: "Barcelona" },
  burgos: { lat: 42.36, lng: -3.69, name: "Burgos" },
  caceres: { lat: 39.47, lng: -6.37, name: "Cáceres" },
  cadiz: { lat: 36.53, lng: -5.93, name: "Cádiz" },
  cantabria: { lat: 43.18, lng: -4.02, name: "Cantabria" },
  castellon: { lat: 40.12, lng: -0.20, name: "Castellón" },
  ceuta: { lat: 35.89, lng: -5.32, name: "Ceuta" },
  "ciudad real": { lat: 38.93, lng: -3.92, name: "Ciudad Real" },
  cordoba: { lat: 37.80, lng: -4.78, name: "Córdoba" },
  "a coruna": { lat: 43.13, lng: -8.37, name: "A Coruña" },
  cuenca: { lat: 39.94, lng: -2.12, name: "Cuenca" },
  girona: { lat: 41.98, lng: 2.82, name: "Girona" },
  granada: { lat: 37.44, lng: -3.59, name: "Granada" },
  guadalajara: { lat: 40.87, lng: -2.49, name: "Guadalajara" },
  guipuzcoa: { lat: 43.17, lng: -2.25, name: "Guipúzcoa" },
  huelva: { lat: 37.51, lng: -6.90, name: "Huelva" },
  huesca: { lat: 42.13, lng: -0.41, name: "Huesca" },
  jaen: { lat: 37.95, lng: -3.33, name: "Jaén" },
  "la rioja": { lat: 42.29, lng: -2.41, name: "La Rioja" },
  "las palmas": { lat: 28.11, lng: -15.44, name: "Las Palmas" },
  leon: { lat: 42.50, lng: -5.57, name: "León" },
  lleida: { lat: 41.57, lng: 0.62, name: "Lleida" },
  lugo: { lat: 43.01, lng: -7.56, name: "Lugo" },
  madrid: { lat: 40.42, lng: -3.70, name: "Madrid" },
  malaga: { lat: 36.72, lng: -4.42, name: "Málaga" },
  melilla: { lat: 35.29, lng: -2.94, name: "Melilla" },
  murcia: { lat: 37.99, lng: -1.13, name: "Murcia" },
  navarra: { lat: 42.82, lng: -1.64, name: "Navarra" },
  ourense: { lat: 42.34, lng: -7.86, name: "Ourense" },
  palencia: { lat: 42.01, lng: -4.53, name: "Palencia" },
  pontevedra: { lat: 42.49, lng: -8.64, name: "Pontevedra" },
  salamanca: { lat: 40.97, lng: -5.66, name: "Salamanca" },
  "santa cruz de tenerife": { lat: 28.29, lng: -16.63, name: "Santa Cruz de Tenerife" },
  segovia: { lat: 40.94, lng: -4.11, name: "Segovia" },
  sevilla: { lat: 37.39, lng: -5.98, name: "Sevilla" },
  soria: { lat: 41.76, lng: -2.47, name: "Soria" },
  tarragona: { lat: 41.12, lng: 0.93, name: "Tarragona" },
  teruel: { lat: 40.34, lng: -1.11, name: "Teruel" },
  toledo: { lat: 39.86, lng: -4.03, name: "Toledo" },
  valencia: { lat: 39.47, lng: -0.38, name: "Valencia" },
  valladolid: { lat: 41.65, lng: -4.72, name: "Valladolid" },
  vizcaya: { lat: 43.26, lng: -2.94, name: "Vizcaya" },
  zamora: { lat: 41.50, lng: -5.74, name: "Zamora" },
  zaragoza: { lat: 41.65, lng: -0.89, name: "Zaragoza" },
};

// ---------------------------------------------------------------------------
// Prefix stripping
// ---------------------------------------------------------------------------

const STRIP_PREFIXES = [
  "centro de ",
  "zona de ",
  "cerca de ",
  "al lado de ",
  "provincia de ",
];

function stripPrefixes(input: string): string {
  const lower = input.toLowerCase().trim();
  for (const prefix of STRIP_PREFIXES) {
    if (lower.startsWith(prefix)) {
      // Return original casing minus the prefix length
      return input.slice(prefix.length).trim();
    }
  }
  return input.trim();
}

// ---------------------------------------------------------------------------
// Airport code / common aliases → canonical city name
// ---------------------------------------------------------------------------

const ALIASES: Record<string, string> = {
  bcn: "Barcelona",
  barna: "Barcelona",
  mad: "Madrid",
  vlc: "Valencia",
  svq: "Sevilla",
  agp: "Málaga",
  bio: "Bilbao",
  zaz: "Zaragoza",
};

function applyAliases(input: string): string {
  const lower = input.toLowerCase().trim();
  return ALIASES[lower] ?? input;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cityToResolved(entry: LocationEntry): ResolvedLocation {
  return { name: entry.name, type: "city", lat: entry.lat, lng: entry.lng };
}

function provinceToResolved(entry: ProvinceEntry): ResolvedLocation {
  return { name: entry.name, type: "province", lat: entry.lat, lng: entry.lng };
}

// ---------------------------------------------------------------------------
// Core resolution logic
// ---------------------------------------------------------------------------

async function resolveLocation(rawQuery: string): Promise<ResolveLocationResponse> {
  // 1. Clean: strip prefixes, apply aliases
  const stripped = stripPrefixes(rawQuery);
  const aliased = applyAliases(stripped);
  const key = normalize(aliased);

  // 2. Exact match in CITY_COORDS
  const exactCity = CITY_COORDS[key];
  if (exactCity) {
    const primary = cityToResolved(exactCity);
    const alternatives: ResolvedLocation[] = [];

    // If the query matches both a city and a province (e.g. "Valencia", "Sevilla"),
    // add the province centroid as an alternative.
    const provinceMatch = PROVINCE_CENTROIDS[key];
    if (provinceMatch) {
      alternatives.push(provinceToResolved(provinceMatch));
    }

    return { resolved: true, location: primary, alternatives };
  }

  // 3. Fuzzy search via Typesense cities collection
  if (typesenseClient) {
    try {
      const result = await typesenseClient
        .collections("cities")
        .documents()
        .search({
          q: aliased,
          query_by: "name,provinceName",
          per_page: 5,
          num_typos: 1,
        });

      const hits = (result as { hits?: Array<{ document: Record<string, unknown> }> }).hits ?? [];

      const typesenseMatches: ResolvedLocation[] = [];

      for (const hit of hits) {
        const doc = hit.document;
        const cityName = (doc.name as string) ?? "";
        const cityKey = normalize(cityName);
        const cityEntry = CITY_COORDS[cityKey];
        if (cityEntry) {
          typesenseMatches.push(cityToResolved(cityEntry));
        }
      }

      if (typesenseMatches.length > 0) {
        const [primary, ...rest] = typesenseMatches;

        // Also add province as alternative if it exists
        const provinceAlt = PROVINCE_CENTROIDS[key];
        const alternatives = provinceAlt
          ? [provinceToResolved(provinceAlt), ...rest].slice(0, 5)
          : rest.slice(0, 5);

        return { resolved: true, location: primary, alternatives };
      }
    } catch (err) {
      // Typesense unavailable — fall through to province check
      console.warn("[resolve-location] Typesense search failed:", err);
    }
  }

  // 4. Province centroid fallback
  const provinceMatch = PROVINCE_CENTROIDS[key];
  if (provinceMatch) {
    return { resolved: true, location: provinceToResolved(provinceMatch) };
  }

  // 5. Nothing found
  return { resolved: false };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json(
      { error: "Missing required parameter: q" },
      { status: 400 }
    );
  }

  if (q.length > 200) {
    return NextResponse.json(
      { error: "Parameter q exceeds maximum length of 200 characters" },
      { status: 400 }
    );
  }

  const cacheKey = `location:${normalize(q)}`;

  try {
    const data = await getOrCompute<ResolveLocationResponse>(
      cacheKey,
      3600,
      () => resolveLocation(q)
    );

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    reportApiError(error, "resolve-location", request);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
