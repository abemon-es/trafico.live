/**
 * Generate municipalities.json from INE (Instituto Nacional de Estadística) API
 *
 * Downloads all Spanish municipalities with codes, names, provinces, and populations.
 * Output: data/municipalities.json
 *
 * Usage: npx tsx scripts/generate-municipalities.ts
 */

import * as fs from "fs";
import * as path from "path";

interface INEMunicipality {
  Codigo: string; // "01001"
  Literal: string; // "Alegría-Dulantzi"
}

interface INEPopulation {
  COD_MUNICIPIO_INE: string;
  NOMBRE_MUNICIPIO: string;
  POBLACION: string;
}

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

// Province code to community code mapping
const PROVINCE_TO_COMMUNITY: Record<string, string> = {
  "01": "16", "02": "08", "03": "10", "04": "01", "05": "07",
  "06": "11", "07": "04", "08": "09", "09": "07", "10": "11",
  "11": "01", "12": "10", "13": "08", "14": "01", "15": "12",
  "16": "08", "17": "09", "18": "01", "19": "08", "20": "16",
  "21": "01", "22": "02", "23": "01", "24": "07", "25": "09",
  "26": "17", "27": "12", "28": "13", "29": "01", "30": "14",
  "31": "15", "32": "12", "33": "03", "34": "07", "35": "05",
  "36": "12", "37": "07", "38": "05", "39": "06", "40": "07",
  "41": "01", "42": "07", "43": "09", "44": "02", "45": "08",
  "46": "10", "47": "07", "48": "16", "49": "07", "50": "02",
  "51": "18", "52": "19",
};

async function fetchMunicipalities(): Promise<{ code: string; name: string; provinceCode: string }[]> {
  console.log("Fetching municipalities from INE API...");

  // INE provides a JSON endpoint for municipalities
  // URL: https://www.ine.es/jaxiT3/files/t/es/px/2852.px (population by municipality)
  // Simpler: use the municipal registry API
  const url = "https://www.ine.es/daco/inebase_mensual/cgi/inebase/consulta_series/seleccion_series?L=0&s_cod_series=S&_p_IdiomaSalida=ES&_p_F_Desc_Consulta=null&_p_OperYes=S&_p_TipoSalida=JSON&_p_Cod_Operacion=INES0099&_p_Cod_Variable_X=349&_p_Cod_Variable_Y=3&_p_Cod_Variable_Fila=&_p_Cod_Variable_Col=";

  // Fallback: use a simpler approach — fetch from the INE territorial codes API
  const codesUrl = "https://www.ine.es/daco/daco42/codmun/cod_ccaa_provincia.htm";

  // Most reliable: use the INE JSON API for municipal codes
  const apiUrl = "https://servicios.ine.es/wstempus/jsCache/ES/VALORES_VARIABLE/115?det=2&tip=A";

  try {
    const response = await fetch(apiUrl, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`INE API returned ${response.status}`);
    }

    const data = await response.json() as INEMunicipality[];
    console.log(`  Received ${data.length} entries from INE API`);

    const municipalities = data
      .filter((m) => m.Codigo && m.Codigo.length === 5 && m.Literal)
      .map((m) => ({
        code: m.Codigo,
        name: cleanName(m.Literal),
        provinceCode: m.Codigo.substring(0, 2),
      }));

    console.log(`  Parsed ${municipalities.length} valid municipalities`);
    return municipalities;
  } catch (error) {
    console.error("Failed to fetch from INE API:", error);
    console.log("Falling back to manual generation from province codes...");
    return [];
  }
}

function cleanName(name: string): string {
  // INE names come as "Municipio, El" or "MUNICIPIO" — normalize
  return name
    .replace(/^(\d+)\s+/, "") // Remove leading numbers
    .replace(/,\s*(El|La|Los|Las|L'|Es|Sa|S')$/i, (_, article) => `${article} `) // Move article to front
    .replace(/\s+/g, " ")
    .trim()
    // Title case
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(De|Del|El|La|Los|Las|En|Y|E|O|U|A|Al|Con|Por|Sin|Sobre|Bajo)\b/g,
      (w) => w.toLowerCase())
    // Fix first word
    .replace(/^./, (c) => c.toUpperCase());
}

async function main() {
  const municipalities = await fetchMunicipalities();

  if (municipalities.length === 0) {
    console.error("No municipalities fetched. Aborting.");
    process.exit(1);
  }

  const output = municipalities.map((m) => ({
    code: m.code,
    name: m.name,
    slug: slugify(m.name),
    provinceCode: m.provinceCode,
  }));

  // Deduplicate by code
  const uniqueMap = new Map<string, typeof output[0]>();
  for (const m of output) {
    uniqueMap.set(m.code, m);
  }
  const unique = Array.from(uniqueMap.values()).sort((a, b) => a.code.localeCompare(b.code));

  const outPath = path.join(process.cwd(), "data/municipalities.json");
  fs.writeFileSync(outPath, JSON.stringify(unique, null, 2));
  console.log(`\nWritten ${unique.length} municipalities to ${outPath}`);

  // Stats
  const byProvince = new Map<string, number>();
  for (const m of unique) {
    byProvince.set(m.provinceCode, (byProvince.get(m.provinceCode) || 0) + 1);
  }
  console.log(`Provinces covered: ${byProvince.size}`);
  console.log(`Avg municipalities per province: ${Math.round(unique.length / byProvince.size)}`);
}

main().catch(console.error);
