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
    phrases: ["estación de servicio", "estacion de servicio", "gasolineras", "gasolinera"],
    collection: "gas_stations",
    label: "Gasolineras",
  },
  { phrases: ["cámaras", "camaras", "cámara", "camara"], collection: "cameras", label: "Cámaras" },
  { phrases: ["radares", "radar"], collection: "radars", label: "Radares" },
  {
    phrases: ["estación de tren", "estacion de tren", "trenes", "tren", "renfe"],
    collection: "railway_stations",
    label: "Trenes",
  },
  {
    phrases: ["zona baja emisiones", "zbe"],
    collection: "zbe_zones",
    label: "ZBE",
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
// Main parser
// ---------------------------------------------------------------------------

export function parseSearchQuery(rawQuery: string): ParsedSearchQuery {
  let q = rawQuery;
  const labels: string[] = [];
  const filters: ParsedSearchQuery["detectedFilters"] = {};

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
