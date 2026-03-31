/**
 * Province Configuration — per-province editorial context.
 *
 * Each province has key roads, known problem zones, and seasonal patterns
 * that make report content province-specific rather than generic templates.
 */

export interface ProvinceConfig {
  code: string;
  name: string;
  keyRoads: string[]; // The 3-5 most important roads
  problemZones: string[]; // Known congestion points or high-accident areas
  seasonalNotes: {
    summer?: string;
    winter?: string;
    easter?: string;
  };
  peerGroup: string[]; // Province codes for comparison context
  trafficProfile: "metropolitan" | "coastal-tourism" | "transit-corridor" | "rural" | "mixed";
}

/**
 * Configuration for the top 20 most traffic-relevant provinces.
 * Others fall back to a generic template.
 */
export const PROVINCE_CONFIGS: Record<string, ProvinceConfig> = {
  "28": {
    code: "28",
    name: "Madrid",
    keyRoads: ["A-6", "A-1", "A-2", "A-3", "A-4", "A-5", "M-30", "M-40"],
    problemZones: [
      "M-30 (circunvalación urbana)",
      "A-6 salida a Galicia y noroeste",
      "A-3 corredor del Mediterráneo",
      "A-2 corredor del Henares",
    ],
    seasonalNotes: {
      summer: "Éxodo vacacional masivo por A-3, A-4 y A-6. Julio y agosto de máxima intensidad.",
      winter: "Niebla frecuente en accesos A-1 y A-6. Puerto de Navacerrada afecta A-6/AP-6.",
      easter: "Operación Semana Santa con retenciones severas en todas las radiales.",
    },
    peerGroup: ["08", "46", "41"],
    trafficProfile: "metropolitan",
  },
  "08": {
    code: "08",
    name: "Barcelona",
    keyRoads: ["AP-7", "B-23", "C-31", "C-32", "C-33", "Ronda Litoral"],
    problemZones: [
      "B-23 acceso desde Martorell",
      "Ronda Litoral (B-10) tramo puerto",
      "AP-7 La Jonquera — frontera francesa",
      "C-33 acceso norte",
    ],
    seasonalNotes: {
      summer: "Turismo costero colapsa AP-7 y C-31/C-32. Tráfico de cruceros en el puerto.",
      winter: "Niebla y heladas en C-17 hacia los Pirineos. Cadenas frecuentes en accesos a esquí.",
      easter: "Retorno masivo por AP-7 norte y C-32 sur.",
    },
    peerGroup: ["28", "46", "43"],
    trafficProfile: "metropolitan",
  },
  "46": {
    code: "46",
    name: "Valencia",
    keyRoads: ["A-7", "V-21", "V-30", "V-31", "AP-7", "A-3"],
    problemZones: [
      "V-21 corredor norte (puerto — Sagunto)",
      "V-30/V-31 distribuidor sur",
      "A-7 by-pass de Valencia",
      "A-3 acceso desde Madrid",
    ],
    seasonalNotes: {
      summer: "Pico turístico costero. V-21 y AP-7 saturados viernes y domingos.",
      winter: "DANA y lluvias torrenciales pueden cortar A-7 y carreteras comarcales.",
      easter: "Fallas en marzo generan picos adicionales de tráfico urbano.",
    },
    peerGroup: ["28", "03", "12"],
    trafficProfile: "coastal-tourism",
  },
  "41": {
    code: "41",
    name: "Sevilla",
    keyRoads: ["A-4", "A-49", "A-92", "SE-30", "AP-4"],
    problemZones: [
      "SE-30 circunvalación urbana",
      "A-4 acceso desde Madrid/Córdoba",
      "A-49 corredor Sevilla-Huelva",
    ],
    seasonalNotes: {
      summer: "Tráfico hacia playas de Huelva y Cádiz por A-49 y AP-4.",
      easter: "Semana Santa sevillana: restricciones centro urbano + procesiones.",
    },
    peerGroup: ["29", "11", "14"],
    trafficProfile: "metropolitan",
  },
  "29": {
    code: "29",
    name: "Málaga",
    keyRoads: ["AP-7", "A-7", "A-45", "MA-20", "A-357"],
    problemZones: [
      "AP-7/A-7 Costa del Sol (Málaga-Marbella)",
      "MA-20 circunvalación",
      "A-45 Málaga-Córdoba (puerto montaña)",
    ],
    seasonalNotes: {
      summer: "Pico absoluto por turismo costero. AP-7 saturada entre Málaga y Estepona.",
      winter: "Niebla en A-45 puerto. Menos impacto que otras provincias.",
    },
    peerGroup: ["11", "04", "18"],
    trafficProfile: "coastal-tourism",
  },
  "03": {
    code: "03",
    name: "Alicante",
    keyRoads: ["AP-7", "A-7", "A-31", "A-70", "N-332"],
    problemZones: [
      "AP-7 Alicante-Benidorm (pico turístico)",
      "A-70 circunvalación urbana",
      "A-31 acceso desde Madrid",
    ],
    seasonalNotes: {
      summer: "Turismo masivo. AP-7 y N-332 colapsan fines de semana.",
      winter: "DANA: zona de alto riesgo de lluvias torrenciales.",
    },
    peerGroup: ["46", "30", "12"],
    trafficProfile: "coastal-tourism",
  },
  "48": {
    code: "48",
    name: "Bizkaia",
    keyRoads: ["AP-8", "A-8", "AP-68", "BI-30", "N-634"],
    problemZones: [
      "AP-8 corredor cantábrico",
      "BI-30 Supersur",
      "AP-68 acceso desde la Meseta",
    ],
    seasonalNotes: {
      summer: "Tráfico hacia playas cantábricas y Francia por AP-8.",
      winter: "Lluvia persistente. Heladas en AP-68 y accesos desde Meseta.",
    },
    peerGroup: ["20", "01", "39"],
    trafficProfile: "metropolitan",
  },
  "50": {
    code: "50",
    name: "Zaragoza",
    keyRoads: ["A-2", "A-68", "AP-2", "AP-68", "Z-40"],
    problemZones: [
      "Z-40 circunvalación",
      "A-2 corredor Madrid-Barcelona (paso obligado)",
      "A-68 corredor del Ebro",
    ],
    seasonalNotes: {
      summer: "Corredor Madrid-Barcelona: tráfico de paso intenso.",
      winter: "Cierzo: rachas de viento lateral en A-2 y A-68. Hielo en accesos al Pirineo.",
    },
    peerGroup: ["28", "08", "31"],
    trafficProfile: "transit-corridor",
  },
  "30": {
    code: "30",
    name: "Murcia",
    keyRoads: ["A-7", "A-30", "AP-7", "A-30", "RM-15"],
    problemZones: [
      "A-7/A-30 nudo de Murcia",
      "AP-7 acceso a La Manga y Mar Menor",
    ],
    seasonalNotes: {
      summer: "Turismo costero hacia La Manga. AP-7 saturada.",
      winter: "DANA: zona de riesgo extremo de lluvias torrenciales.",
    },
    peerGroup: ["03", "04", "02"],
    trafficProfile: "mixed",
  },
  "18": {
    code: "18",
    name: "Granada",
    keyRoads: ["A-44", "A-92", "A-7", "GR-30"],
    problemZones: [
      "A-44 acceso a Sierra Nevada",
      "A-92 corredor Baza-Guadix",
      "GR-30 circunvalación",
    ],
    seasonalNotes: {
      summer: "Tráfico hacia la costa tropical por A-44.",
      winter: "Sierra Nevada: cadenas obligatorias A-395. Máximo tráfico esquí.",
      easter: "Pico turístico Alhambra + Semana Santa.",
    },
    peerGroup: ["29", "04", "23"],
    trafficProfile: "mixed",
  },
  "15": {
    code: "15",
    name: "A Coruña",
    keyRoads: ["AP-9", "AG-55", "A-6", "AC-11"],
    problemZones: [
      "AP-9 corredor atlántico (A Coruña-Vigo)",
      "A-6 acceso desde Meseta",
    ],
    seasonalNotes: {
      summer: "Turismo gallego: AP-9 saturada. Camino de Santiago genera tráfico adicional.",
      winter: "Lluvia persistente y temporal costero. Viento lateral en AP-9.",
    },
    peerGroup: ["36", "27", "32"],
    trafficProfile: "mixed",
  },
  "11": {
    code: "11",
    name: "Cádiz",
    keyRoads: ["AP-4", "A-4", "A-48", "CA-33", "A-381"],
    problemZones: [
      "AP-4/A-4 acceso desde Sevilla",
      "A-48 corredor Cádiz-Algeciras",
      "Puerto de Algeciras: tráfico OPE (paso del Estrecho)",
    ],
    seasonalNotes: {
      summer: "OPE (Operación Paso del Estrecho): tráfico masivo en Algeciras y Tarifa.",
      easter: "Carnaval de Cádiz genera picos adicionales en febrero.",
    },
    peerGroup: ["41", "29", "21"],
    trafficProfile: "coastal-tourism",
  },
  "33": {
    code: "33",
    name: "Asturias",
    keyRoads: ["A-66", "A-8", "AS-II", "AS-I"],
    problemZones: [
      "A-8 corredor cantábrico",
      "A-66 Ruta de la Plata (acceso sur)",
      "AS-II autovía minera",
    ],
    seasonalNotes: {
      summer: "Turismo rural y playas cantábricas. A-8 saturada en puentes.",
      winter: "Nieve en Pajares y accesos de montaña. Cadenas frecuentes.",
    },
    peerGroup: ["39", "24", "27"],
    trafficProfile: "mixed",
  },
  "43": {
    code: "43",
    name: "Tarragona",
    keyRoads: ["AP-7", "A-7", "AP-2", "T-11", "N-340"],
    problemZones: [
      "AP-7 corredor costero (Camp de Tarragona)",
      "AP-2 acceso desde Lleida",
      "N-340 travesías costeras",
    ],
    seasonalNotes: {
      summer: "Costa Daurada: turismo masivo. AP-7 y N-340 saturadas.",
      winter: "Menor impacto. Niebla en interior.",
    },
    peerGroup: ["08", "25", "12"],
    trafficProfile: "coastal-tourism",
  },
  "20": {
    code: "20",
    name: "Gipuzkoa",
    keyRoads: ["AP-8", "AP-1", "N-1", "GI-20"],
    problemZones: [
      "AP-8 frontera francesa (Irún-Biriatou)",
      "AP-1 acceso desde Meseta",
      "GI-20 variante de San Sebastián",
    ],
    seasonalNotes: {
      summer: "Tráfico fronterizo máximo. AP-8 colapsada viernes y domingos.",
      winter: "Lluvia intensa. Nieve en AP-1 (Etxegarate).",
    },
    peerGroup: ["48", "01", "31"],
    trafficProfile: "transit-corridor",
  },
};

/**
 * Get config for a province. Returns a generic fallback for provinces
 * not in the detailed config.
 */
export function getProvinceConfig(code: string, name?: string): ProvinceConfig {
  if (PROVINCE_CONFIGS[code]) return PROVINCE_CONFIGS[code];
  return {
    code,
    name: name || code,
    keyRoads: [],
    problemZones: [],
    seasonalNotes: {},
    peerGroup: [],
    trafficProfile: "rural",
  };
}

/**
 * Get current seasonal context based on month.
 */
export function getSeasonalContext(month: number): "summer" | "winter" | "easter" | null {
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 11 || month <= 2) return "winter";
  if (month === 3 || month === 4) return "easter"; // approximate
  return null;
}

/**
 * Translate incident type enum to Spanish.
 */
export const INCIDENT_TYPE_NAMES: Record<string, string> = {
  ACCIDENT: "Accidente",
  ROADWORK: "Obras",
  CONGESTION: "Retención",
  HAZARD: "Peligro",
  VEHICLE_BREAKDOWN: "Avería",
  WEATHER: "Meteorología",
  EVENT: "Evento",
  CLOSURE: "Corte",
  OTHER: "Otro",
};

/**
 * Translate road type enum to Spanish.
 */
export const ROAD_TYPE_NAMES: Record<string, string> = {
  AUTOPISTA: "Autopista",
  AUTOVIA: "Autovía",
  NACIONAL: "Nacional",
  COMARCAL: "Comarcal",
  LOCAL: "Local",
  URBANA: "Urbana",
  OTRO: "Otro",
};
