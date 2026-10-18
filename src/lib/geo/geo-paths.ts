/**
 * Canonical /espana URLs — the final ones, never a redirect hop.
 *
 * Generated from production (Province ⋈ Community, 2026-10-19) because the
 * route slugs come from the DB, not from slugify(name): the community pages
 * live at /espana/cataluna, /espana/comunidad-valenciana, /espana/islas-baleares…
 * Hand-built links (/espana/<province>, /comunidad-autonoma/catalunya) each
 * cost a 301/308 and some ended on a soft 404. bin/check-internal-redirects.sh
 * catches drift; regenerate this table if a slug ever changes in the DB.
 */

/** INE community code → community slug. */
export const COMMUNITY_SLUG: Record<string, string> = {
  "01": "andalucia", // Andalucía
  "02": "aragon", // Aragón
  "03": "principado-de-asturias", // Principado de Asturias
  "04": "islas-baleares", // Islas Baleares
  "05": "canarias", // Canarias
  "06": "cantabria", // Cantabria
  "07": "castilla-y-leon", // Castilla y León
  "08": "castilla-la-mancha", // Castilla-La Mancha
  "09": "cataluna", // Cataluña
  "10": "comunidad-valenciana", // Comunidad Valenciana
  "11": "extremadura", // Extremadura
  "12": "galicia", // Galicia
  "13": "comunidad-de-madrid", // Comunidad de Madrid
  "14": "region-de-murcia", // Región de Murcia
  "15": "navarra", // Navarra
  "16": "pais-vasco", // País Vasco
  "17": "la-rioja", // La Rioja
  "18": "ceuta", // Ceuta
  "19": "melilla", // Melilla
};

/** INE province code → { community, province } slugs. */
export const PROVINCE_SLUGS: Record<string, { community: string; province: string }> = {
  "01": { community: "pais-vasco", province: "alava" },
  "02": { community: "castilla-la-mancha", province: "albacete" },
  "03": { community: "comunidad-valenciana", province: "alicante" },
  "04": { community: "andalucia", province: "almeria" },
  "05": { community: "castilla-y-leon", province: "avila" },
  "06": { community: "extremadura", province: "badajoz" },
  "07": { community: "islas-baleares", province: "baleares" },
  "08": { community: "cataluna", province: "barcelona" },
  "09": { community: "castilla-y-leon", province: "burgos" },
  "10": { community: "extremadura", province: "caceres" },
  "11": { community: "andalucia", province: "cadiz" },
  "12": { community: "comunidad-valenciana", province: "castellon" },
  "13": { community: "castilla-la-mancha", province: "ciudad-real" },
  "14": { community: "andalucia", province: "cordoba" },
  "15": { community: "galicia", province: "a-coruna" },
  "16": { community: "castilla-la-mancha", province: "cuenca" },
  "17": { community: "cataluna", province: "girona" },
  "18": { community: "andalucia", province: "granada" },
  "19": { community: "castilla-la-mancha", province: "guadalajara" },
  "20": { community: "pais-vasco", province: "gipuzkoa" },
  "21": { community: "andalucia", province: "huelva" },
  "22": { community: "aragon", province: "huesca" },
  "23": { community: "andalucia", province: "jaen" },
  "24": { community: "castilla-y-leon", province: "leon" },
  "25": { community: "cataluna", province: "lleida" },
  "26": { community: "la-rioja", province: "la-rioja" },
  "27": { community: "galicia", province: "lugo" },
  "28": { community: "comunidad-de-madrid", province: "madrid" },
  "29": { community: "andalucia", province: "malaga" },
  "30": { community: "region-de-murcia", province: "murcia" },
  "31": { community: "navarra", province: "navarra" },
  "32": { community: "galicia", province: "ourense" },
  "33": { community: "principado-de-asturias", province: "asturias" },
  "34": { community: "castilla-y-leon", province: "palencia" },
  "35": { community: "canarias", province: "las-palmas" },
  "36": { community: "galicia", province: "pontevedra" },
  "37": { community: "castilla-y-leon", province: "salamanca" },
  "38": { community: "canarias", province: "santa-cruz-de-tenerife" },
  "39": { community: "cantabria", province: "cantabria" },
  "40": { community: "castilla-y-leon", province: "segovia" },
  "41": { community: "andalucia", province: "sevilla" },
  "42": { community: "castilla-y-leon", province: "soria" },
  "43": { community: "cataluna", province: "tarragona" },
  "44": { community: "aragon", province: "teruel" },
  "45": { community: "castilla-la-mancha", province: "toledo" },
  "46": { community: "comunidad-valenciana", province: "valencia" },
  "47": { community: "castilla-y-leon", province: "valladolid" },
  "48": { community: "pais-vasco", province: "bizkaia" },
  "49": { community: "castilla-y-leon", province: "zamora" },
  "50": { community: "aragon", province: "zaragoza" },
  "51": { community: "ceuta", province: "ceuta" },
  "52": { community: "melilla", province: "melilla" },
};

/** /espana/<community>/<province> for an INE province code, or null. */
export function provincePath(provinceCode: string): string | null {
  const p = PROVINCE_SLUGS[provinceCode.padStart(2, "0")];
  return p ? `/espana/${p.community}/${p.province}` : null;
}

/** /espana/<community> for the community that contains an INE province code. */
export function communityPathForProvince(provinceCode: string): string | null {
  const p = PROVINCE_SLUGS[provinceCode.padStart(2, "0")];
  return p ? `/espana/${p.community}` : null;
}

/** /espana/<community> for an INE community code. */
export function communityPath(communityCode: string): string | null {
  const slug = COMMUNITY_SLUG[communityCode.padStart(2, "0")];
  return slug ? `/espana/${slug}` : null;
}
