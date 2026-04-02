/**
 * Enrich municipalities.json with population data, coordinates, and correct INE codes.
 *
 * Data source: Wikidata SPARQL endpoint
 *   - INE 5-digit municipal codes (P772)
 *   - Population (P1082 — latest available from municipal register)
 *   - Coordinates (P625 — geographic center)
 *
 * The existing municipalities.json has sequential internal IDs instead of real INE codes,
 * and is missing population and coordinates. This script replaces it with authoritative
 * data from Wikidata, which aggregates INE, IGN, and municipal register sources.
 *
 * Usage: npx tsx scripts/enrich-municipalities.ts
 *
 * Safe to run multiple times (idempotent). Writes to data/municipalities.json.
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Municipality {
  code: string; // INE 5-digit code: "28079"
  name: string;
  slug: string;
  provinceCode: string; // first 2 digits of code: "28"
  population?: number;
  latitude?: number;
  longitude?: number;
}

interface WikidataBinding {
  ineCode: { value: string };
  nombre: { value: string };
  population?: { value: string };
  latitude?: { value: string };
  longitude?: { value: string };
}

interface WikidataResponse {
  results: {
    bindings: WikidataBinding[];
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Round a coordinate to 6 decimal places (roughly 0.11 m precision).
 */
function roundCoord(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value);
  if (isNaN(n)) return undefined;
  return Math.round(n * 1_000_000) / 1_000_000;
}

/**
 * Valid Spanish province codes (INE 2-digit).
 */
const VALID_PROVINCE_CODES = new Set([
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
  "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
  "31", "32", "33", "34", "35", "36", "37", "38", "39", "40",
  "41", "42", "43", "44", "45", "46", "47", "48", "49", "50",
  "51", "52",
]);

// ---------------------------------------------------------------------------
// Wikidata fetch
// ---------------------------------------------------------------------------

/**
 * Execute a single SPARQL query against Wikidata with retry logic.
 */
async function querySparql(sparql: string, maxRetries = 3): Promise<WikidataBinding[]> {
  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("format", "json");
  url.searchParams.set("query", sparql);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/sparql-results+json",
          "User-Agent": "trafico.live-enrichment/1.0 (https://trafico.live; data enrichment script)",
        },
        signal: AbortSignal.timeout(60_000),
      });

      if (response.status === 429 || response.status === 503 || response.status === 504) {
        const wait = attempt * 5_000;
        console.log(`    Wikidata ${response.status}, retrying in ${wait / 1000}s (attempt ${attempt}/${maxRetries})...`);
        await sleep(wait);
        continue;
      }

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Wikidata returned ${response.status}: ${body.slice(0, 200)}`);
      }

      const data = (await response.json()) as WikidataResponse;
      return data.results.bindings;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const wait = attempt * 5_000;
      console.log(`    Request failed, retrying in ${wait / 1000}s (attempt ${attempt}/${maxRetries})...`);
      await sleep(wait);
    }
  }

  return []; // unreachable, but satisfies TS
}

/**
 * Fetch all Spanish municipalities from Wikidata via SPARQL.
 *
 * Queries province-by-province to avoid Wikidata timeouts on large result sets.
 * Uses property P772 (INE municipality code) as the primary selector,
 * which captures all municipality subtypes (municipio de Espana,
 * municipio de Cataluna, concejo, etc.) without needing to enumerate types.
 *
 * Population uses MAX to pick the latest reported value.
 * Coordinates use SAMPLE to deduplicate multi-valued entries.
 */
async function fetchFromWikidata(): Promise<Municipality[]> {
  console.log("  Querying Wikidata SPARQL endpoint (province by province)...");

  const allBindings: WikidataBinding[] = [];
  const provinceCodes = Array.from(VALID_PROVINCE_CODES).sort();

  for (const prov of provinceCodes) {
    const sparql = `
SELECT ?ineCode ?nombre (MAX(?pop) AS ?population) (SAMPLE(?lat) AS ?latitude) (SAMPLE(?lon) AS ?longitude) WHERE {
  ?municipio wdt:P772 ?ineCode.
  ?municipio rdfs:label ?nombre.
  FILTER(LANG(?nombre) = "es")
  FILTER(STRSTARTS(?ineCode, "${prov}"))
  FILTER(STRLEN(?ineCode) = 5)
  OPTIONAL { ?municipio wdt:P1082 ?pop. }
  OPTIONAL {
    ?municipio wdt:P625 ?coord.
    BIND(geof:latitude(?coord) AS ?lat)
    BIND(geof:longitude(?coord) AS ?lon)
  }
}
GROUP BY ?ineCode ?nombre
ORDER BY ?ineCode
`.trim();

    const bindings = await querySparql(sparql);
    allBindings.push(...bindings);

    // Brief pause between provinces to be polite to Wikidata
    await sleep(500);

    // Progress (one dot per province, count every 10)
    if (provinceCodes.indexOf(prov) % 10 === 9) {
      console.log(`    ... ${provinceCodes.indexOf(prov) + 1}/${provinceCodes.length} provinces fetched (${allBindings.length} municipalities so far)`);
    }
  }

  console.log(`  Received ${allBindings.length} raw results from Wikidata`);

  // Deduplicate by INE code (keep the first, which is the canonical name)
  const seen = new Map<string, Municipality>();

  for (const b of allBindings) {
    const code = b.ineCode.value;
    const provinceCode = code.substring(0, 2);

    // Skip invalid province codes
    if (!VALID_PROVINCE_CODES.has(provinceCode)) continue;

    // Skip if already seen (first result is canonical due to ORDER BY)
    if (seen.has(code)) continue;

    const pop = b.population?.value ? parseInt(b.population.value, 10) : undefined;
    const lat = roundCoord(b.latitude?.value);
    const lon = roundCoord(b.longitude?.value);

    seen.set(code, {
      code,
      name: b.nombre.value,
      slug: slugify(b.nombre.value),
      provinceCode,
      population: pop && !isNaN(pop) ? pop : undefined,
      latitude: lat,
      longitude: lon,
    });
  }

  return Array.from(seen.values()).sort((a, b) => a.code.localeCompare(b.code));
}

// ---------------------------------------------------------------------------
// Nominatim fallback for missing coordinates
// ---------------------------------------------------------------------------

/**
 * Province code to name mapping for geocoding queries.
 */
const PROVINCE_NAMES: Record<string, string> = {
  "01": "Alava", "02": "Albacete", "03": "Alicante", "04": "Almeria",
  "05": "Avila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
  "09": "Burgos", "10": "Caceres", "11": "Cadiz", "12": "Castellon",
  "13": "Ciudad Real", "14": "Cordoba", "15": "A Coruna", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaen", "24": "Leon",
  "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
  "29": "Malaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
  "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
  "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
  "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
  "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta",
  "52": "Melilla",
};

/**
 * Geocode a municipality name via Nominatim (OSM).
 * Respects the 1 request/second rate limit.
 */
async function geocodeNominatim(
  name: string,
  provinceCode: string
): Promise<{ lat: number; lon: number } | null> {
  const province = PROVINCE_NAMES[provinceCode] || "";
  const query = `${name}, ${province}, Spain`;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "es");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "trafico.live-enrichment/1.0 (https://trafico.live; data enrichment script)",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status === 429) {
      // Rate limited — wait and return null (will be retried on next run)
      console.log(`    Rate limited by Nominatim, skipping ${name}`);
      return null;
    }

    if (!response.ok) return null;

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (results.length === 0) return null;

    return {
      lat: parseFloat(results[0].lat),
      lon: parseFloat(results[0].lon),
    };
  } catch {
    return null;
  }
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Geocode cache
// ---------------------------------------------------------------------------

interface GeocodeCache {
  [ineCode: string]: { lat: number; lon: number };
}

const CACHE_PATH = path.join(process.cwd(), "data/.municipality-geocode-cache.json");

function loadCache(): GeocodeCache {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveCache(cache: GeocodeCache): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const outPath = path.join(process.cwd(), "data/municipalities.json");
  console.log("Municipality enrichment script\n");

  // Step 1: Fetch from Wikidata
  console.log("Step 1: Fetching municipality data from Wikidata...");
  let municipalities: Municipality[];
  try {
    municipalities = await fetchFromWikidata();
  } catch (error) {
    console.error("Failed to fetch from Wikidata:", error);
    process.exit(1);
  }

  console.log(`  Deduplicated to ${municipalities.length} unique municipalities`);

  // Step 2: Stats before Nominatim
  const missingCoords = municipalities.filter((m) => !m.latitude || !m.longitude);
  const missingPop = municipalities.filter((m) => !m.population);
  console.log(`  With population: ${municipalities.length - missingPop.length}`);
  console.log(`  With coordinates: ${municipalities.length - missingCoords.length}`);
  console.log(`  Missing coordinates: ${missingCoords.length}`);
  console.log(`  Missing population: ${missingPop.length}`);

  // Step 3: Fill missing coordinates via Nominatim with cache
  if (missingCoords.length > 0) {
    console.log(`\nStep 2: Geocoding ${missingCoords.length} municipalities via Nominatim...`);
    const cache = loadCache();
    let geocoded = 0;
    let cached = 0;
    let failed = 0;

    for (const m of missingCoords) {
      // Check cache first
      if (cache[m.code]) {
        m.latitude = roundCoord(String(cache[m.code].lat));
        m.longitude = roundCoord(String(cache[m.code].lon));
        cached++;
        continue;
      }

      // Nominatim rate limit: 1 req/sec
      await sleep(1100);

      const result = await geocodeNominatim(m.name, m.provinceCode);
      if (result) {
        m.latitude = roundCoord(String(result.lat));
        m.longitude = roundCoord(String(result.lon));
        cache[m.code] = result;
        geocoded++;

        // Save cache periodically
        if (geocoded % 10 === 0) {
          saveCache(cache);
        }
      } else {
        failed++;
      }

      // Progress
      if ((geocoded + cached + failed) % 50 === 0) {
        console.log(`    Progress: ${geocoded + cached + failed}/${missingCoords.length} (${geocoded} geocoded, ${cached} cached, ${failed} failed)`);
      }
    }

    saveCache(cache);
    console.log(`  Geocoded: ${geocoded}, from cache: ${cached}, failed: ${failed}`);
  } else {
    console.log("\nStep 2: All municipalities have coordinates. Skipping Nominatim.");
  }

  // Step 4: Build final output (only include fields that have values)
  const output: Municipality[] = municipalities.map((m) => {
    const entry: Municipality = {
      code: m.code,
      name: m.name,
      slug: m.slug,
      provinceCode: m.provinceCode,
    };
    if (m.population !== undefined) entry.population = m.population;
    if (m.latitude !== undefined) entry.latitude = m.latitude;
    if (m.longitude !== undefined) entry.longitude = m.longitude;
    return entry;
  });

  // Step 5: Write output
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWritten ${output.length} municipalities to ${outPath}`);

  // Step 6: Print summary
  const withPop = output.filter((m) => m.population !== undefined).length;
  const withCoords = output.filter((m) => m.latitude !== undefined && m.longitude !== undefined).length;
  const byProvince = new Map<string, number>();
  for (const m of output) {
    byProvince.set(m.provinceCode, (byProvince.get(m.provinceCode) || 0) + 1);
  }

  console.log("\nSummary:");
  console.log(`  Total municipalities: ${output.length}`);
  console.log(`  With population: ${withPop} (${((withPop / output.length) * 100).toFixed(1)}%)`);
  console.log(`  With coordinates: ${withCoords} (${((withCoords / output.length) * 100).toFixed(1)}%)`);
  console.log(`  Provinces covered: ${byProvince.size}/52`);
  console.log(`  Avg per province: ${Math.round(output.length / byProvince.size)}`);

  // Show provinces with fewer than expected municipalities
  const underrepresented = Array.from(byProvince.entries())
    .filter(([, count]) => count < 10)
    .sort(([a], [b]) => a.localeCompare(b));
  if (underrepresented.length > 0) {
    console.log(`\n  Underrepresented provinces (<10 municipalities):`);
    for (const [code, count] of underrepresented) {
      console.log(`    ${code}: ${count}`);
    }
  }

  // Show data completeness per field
  const noSlug = output.filter((m) => !m.slug).length;
  if (noSlug > 0) {
    console.log(`\n  Warning: ${noSlug} municipalities missing slug`);
  }
}

main().catch((error) => {
  console.error("Enrichment failed:", error);
  process.exit(1);
});
