/**
 * search-filters.ts
 *
 * Parse a Spanish search query and detect smart filter keywords.
 * Pure utility — no I/O, no side effects.
 */

export interface ParsedSearchQuery {
  cleanQuery: string;
  detectedFilters: {
    priceSort?: "asc" | "desc";
    fuelType?: string; // Typesense field name
    targetCollection?: string;
    proximityMode?: boolean;
    locationHint?: string; // extracted location name
  };
  activeFilterLabels: string[];
}

// ---------------------------------------------------------------------------
// Keyword tables
// ---------------------------------------------------------------------------

// Pairs of [phrase, value] — longer phrases MUST come first so they are
// matched and stripped before any sub-word inside them is evaluated.

const PRICE_ASC_KEYWORDS = [
  "más barata",
  "mas barata",
  "precio bajo",
  "más económica",
  "mas economica",
  "low cost",
  "descuento",
  "económica",
  "economica",
  "económico",
  "economico",
  "barata",
  "barato",
  "precios",
  "precio",
];

const PRICE_DESC_KEYWORDS = [
  "más cara",
  "mas cara",
  "precio alto",
  "cara",
  "caro",
];

// fuel keyword → { fuelType field, targetCollection, label }
const FUEL_KEYWORD_MAP: Array<{
  phrases: string[];
  fuelType: string;
  collection: string;
  label: string;
}> = [
  {
    phrases: ["gasolina 98", "98 octanos", "super"],
    fuelType: "priceGasolina98",
    collection: "gas_stations",
    label: "Gasolina 98",
  },
  {
    phrases: ["gasolina 95", "sin plomo", "gasolina"],
    fuelType: "priceGasolina95",
    collection: "gas_stations",
    label: "Gasolina 95",
  },
  {
    phrases: ["gasóleo", "gasoleo", "diesel", "diésel"],
    fuelType: "priceGasoleoA",
    collection: "gas_stations",
    label: "Diésel",
  },
  {
    phrases: ["autogas", "glp"],
    fuelType: "priceGLP",
    collection: "gas_stations",
    label: "GLP",
  },
  {
    phrases: ["gas natural", "gnc"],
    fuelType: "priceGNC",
    collection: "gas_stations",
    label: "GNC",
  },
];

// EV keywords → targetCollection only (no fuelType)
const EV_KEYWORDS = [
  "carga eléctrica",
  "carga electrica",
  "electrolinera",
  "eléctrico",
  "electrico",
  "cargador",
];

// Collection targeting (when no fuel keyword matched)
const COLLECTION_KEYWORD_MAP: Array<{ phrases: string[]; collection: string; label: string }> = [
  {
    phrases: ["estación de servicio", "estacion de servicio", "gasolineras", "gasolinera", "surtidor de gasolina", "estación gasolina", "estacion gasolina", "surtidor", "gasinera", "tanque lleno", "repostar"],
    collection: "gas_stations",
    label: "Gasolineras",
  },
  { phrases: ["cámaras de tráfico", "camaras de trafico", "cámaras", "camaras", "cámara", "camara", "webcam"], collection: "cameras", label: "Cámaras" },
  { phrases: ["radares fijos", "cinemómetro", "radares", "radar", "multa velocidad"], collection: "radars", label: "Radares" },
  {
    phrases: ["estación de tren", "estacion de tren", "ferrocarril", "cercanías", "cercanias", "trenes", "tren", "renfe", "ave", "alvia", "avant", "retraso tren", "cancelación tren", "línea", "linea"],
    collection: "railway_stations",
    label: "Trenes",
  },
  {
    phrases: ["retraso", "cancelación", "cancelacion", "avería", "averia", "suprimido", "demora"],
    collection: "railway_alerts",
    label: "Alertas tren",
  },
  {
    phrases: ["zona de bajas emisiones", "zona baja emisiones", "zona bajas emisiones", "zbe"],
    collection: "zbe_zones",
    label: "ZBE",
  },
  {
    phrases: ["punto negro", "puntos negros", "zona peligrosa", "tramo peligroso"],
    collection: "risk_zones",
    label: "Zonas de riesgo",
  },
  {
    phrases: ["panel informativo", "paneles", "panel variable", "señal variable"],
    collection: "variable_panels",
    label: "Paneles",
  },
  {
    phrases: ["estación de aforo", "estacion de aforo", "contador de tráfico", "imd"],
    collection: "traffic_stations",
    label: "Estaciones de aforo",
  },
  {
    phrases: ["incidencia", "incidencias", "accidente", "accidentes", "corte de tráfico", "corte de trafico"],
    collection: "incidents",
    label: "Incidencias",
  },
  {
    phrases: ["alerta meteorológica", "alerta meteo", "aviso aemet", "temporal"],
    collection: "weather_alerts",
    label: "Alertas Meteo",
  },
  {
    phrases: ["combustible marítimo", "combustible maritimo", "gasolinera puerto", "náutico", "nautico"],
    collection: "maritime_stations",
    label: "Marítimo",
  },
  {
    phrases: ["portugal combustible", "gasolinera portugal", "portugal gasoleo"],
    collection: "portugal_stations",
    label: "Portugal",
  },
];

// Proximity keywords
const PROXIMITY_KEYWORDS = ["próximo", "proximo", "próxima", "proxima", "cercano", "cercana", "cerca"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip a literal phrase from the query (case-insensitive). */
function stripPhrase(query: string, phrase: string): string {
  // Use word-boundary-aware replacement
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return query.replace(new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, "gi"), " ");
}

function normalise(s: string): string {
  return s
    .trim()
    .replace(/\s{2,}/g, " ");
}

// ---------------------------------------------------------------------------
// Road identifier normalization
// ---------------------------------------------------------------------------

/**
 * Normalize road identifiers so "a6" matches "A-6", "ap7" matches "AP-7", etc.
 * Also strips contextual words like "autopista", "autovía", "carretera", "nacional".
 *
 * Examples:
 *   "autopista a6"        → "A-6"
 *   "ap7 mediterraneo"    → "AP-7 mediterraneo"
 *   "nacional 340"        → "N-340"
 *   "carretera n2"        → "N-II"
 *   "a 6"                 → "A-6"
 *   "m30"                 → "M-30"
 *   "trafico a7 valencia" → "A-7 valencia"
 */

// Road prefixes: AP, A, N, M, C, CT, AG, RM, EX, CM, etc.
const ROAD_PREFIX_RE = /\b(AP|A|N|M|C|CT|AG|RM|EX|CM|MA|CA|SE|GR|CO|HU|TE|Z|BU|SA|AV|SG|SO|CU|GU|TO|CR|AB|BA|CC|VA|LE|ZA|PA|LO|BI|SS|NA|OR|PO|LU|TF|GC)\s*[-–]?\s*(\d{1,4}[A-Za-z]?)\b/gi;

// Contextual road words to strip (they add intent but not search value)
const ROAD_CONTEXT_WORDS = [
  "autopista", "autovía", "autovia", "autoroute",
  "carretera", "nacional", "comarcal",
  "tráfico", "trafico", "estado",
  "cortes", "atascos", "retenciones", "obras",
];

function normalizeRoadIds(query: string): string {
  // Step 1: Normalize "a6" → "A-6", "ap 7" → "AP-7", "n 340" → "N-340"
  let result = query.replace(ROAD_PREFIX_RE, (_match, prefix: string, num: string) => {
    return `${prefix.toUpperCase()}-${num}`;
  });

  // Step 2: Handle roman numeral roads (N-I through N-VI)
  // "n2" or "N-2" for N-I through N-VI are commonly searched
  // but the actual road IDs use roman numerals only for N-I to N-VI
  const romanMap: Record<string, string> = {
    "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V", "6": "VI",
  };
  result = result.replace(/\bN-([1-6])\b/g, (_m, digit: string) => {
    return romanMap[digit] ? `N-${romanMap[digit]}` : `N-${digit}`;
  });

  return result;
}

// ---------------------------------------------------------------------------
// Accent-insensitive query normalization
// ---------------------------------------------------------------------------

/**
 * Expand accented characters to include both accented and unaccented variants.
 * Typesense handles this internally, but this helps with exact phrase matching
 * in our keyword detection.
 */
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseSearchQuery(rawQuery: string): ParsedSearchQuery {
  let q = rawQuery;
  const labels: string[] = [];
  const filters: ParsedSearchQuery["detectedFilters"] = {};

  // ── 0. Road ID normalization ───────────────────────────────────────────
  // Must run before keyword stripping — "autopista a6" → "A-6"
  q = normalizeRoadIds(q);

  // Strip contextual road words (they express intent, not search terms)
  const qLower = stripAccents(q.toLowerCase());
  for (const word of ROAD_CONTEXT_WORDS) {
    if (qLower.includes(word)) {
      q = q.replace(new RegExp(`\\b${word}\\b`, "gi"), " ");
      // If we stripped a road context word, hint at roads collection
      if (!filters.targetCollection && ROAD_PREFIX_RE.test(q)) {
        filters.targetCollection = "roads";
        labels.push("Carreteras");
      }
    }
  }
  q = normalise(q);

  // ── 1. Proximity / location ──────────────────────────────────────────────

  // "cerca de {location}" — extract location hint first so we can strip it
  const nearMatch = q.match(/cerca\s+de\s+(.+?)(?:\s+(?:barata|cara|económica|economica|diesel|gasolina|glp|gnc|cargador|eléctrico|electrico))?$/i);
  if (nearMatch) {
    filters.proximityMode = true;
    filters.locationHint = nearMatch[1].trim();
    // Strip the whole "cerca de {location}" fragment
    q = q.replace(/cerca\s+de\s+.+?(?=\s+(?:barata|cara|económica|economica|diesel|gasolina|glp|gnc|cargador|eléctrico|electrico)|$)/i, " ");
    labels.push("Cercano");
  } else {
    // Check plain proximity keywords
    for (const kw of PROXIMITY_KEYWORDS) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, "gi");
      if (re.test(q)) {
        filters.proximityMode = true;
        q = q.replace(re, " ");
        labels.push("Cercano");
        break;
      }
    }
  }

  // ── 2. EV keywords ─────────────────────────────────────────────────────

  for (const kw of EV_KEYWORDS) {
    const stripped = stripPhrase(q, kw);
    if (stripped !== q) {
      filters.targetCollection = "ev_chargers";
      q = stripped;
      labels.push("Electrolineras");
      break;
    }
  }

  // ── 3. Fuel type ────────────────────────────────────────────────────────

  if (!filters.targetCollection) {
    outer: for (const entry of FUEL_KEYWORD_MAP) {
      for (const phrase of entry.phrases) {
        const stripped = stripPhrase(q, phrase);
        if (stripped !== q) {
          filters.fuelType = entry.fuelType;
          filters.targetCollection = entry.collection;
          q = stripped;
          labels.push(entry.label);
          break outer;
        }
      }
    }
  }

  // ── 4. Price sort ───────────────────────────────────────────────────────

  for (const kw of PRICE_DESC_KEYWORDS) {
    const stripped = stripPhrase(q, kw);
    if (stripped !== q) {
      filters.priceSort = "desc";
      q = stripped;
      labels.push("Precio ↑");
      break;
    }
  }

  if (!filters.priceSort) {
    for (const kw of PRICE_ASC_KEYWORDS) {
      const stripped = stripPhrase(q, kw);
      if (stripped !== q) {
        filters.priceSort = "asc";
        q = stripped;
        labels.push("Precio ↓");
        break;
      }
    }
  }

  // ── 5. Collection targeting (if not already set) ─────────────────────────

  if (!filters.targetCollection) {
    outer: for (const entry of COLLECTION_KEYWORD_MAP) {
      for (const phrase of entry.phrases) {
        const stripped = stripPhrase(q, phrase);
        if (stripped !== q) {
          filters.targetCollection = entry.collection;
          q = stripped;
          labels.push(entry.label);
          break outer;
        }
      }
    }
  }

  // ── 6. Clean up ─────────────────────────────────────────────────────────

  const cleanQuery = normalise(q);

  return {
    cleanQuery,
    detectedFilters: filters,
    activeFilterLabels: labels,
  };
}
