/**
 * Slug utilities for /ir /ruta /viaje OD-pair namespaces.
 */

const ACCENT_MAP: Record<string, string> = {
  á: "a", à: "a", â: "a", ä: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", ô: "o", ö: "o",
  ú: "u", ù: "u", û: "u", ü: "u",
  ñ: "n",
  ç: "c",
  Á: "a", À: "a", Â: "a", Ä: "a",
  É: "e", È: "e", Ê: "e", Ë: "e",
  Í: "i", Ì: "i", Î: "i", Ï: "i",
  Ó: "o", Ò: "o", Ô: "o", Ö: "o",
  Ú: "u", Ù: "u", Û: "u", Ü: "u",
  Ñ: "n",
  Ç: "c",
};

/**
 * Converts a city name to a URL-safe lowercase slug.
 * Examples:
 *   "La Coruña"         -> "la-coruna"
 *   "Donostia/San Seb." -> "donostia-san-seb"
 *   "Las Palmas G.C."   -> "las-palmas-gc"
 */
export function slugifyCity(name: string): string {
  return name
    .split("")
    .map((ch) => ACCENT_MAP[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Returns the canonical slug for an OD pair.
 * Always lowercase, "-" separated within each city slug, "/" between.
 */
export function pairSlug(origin: string, destination: string): string {
  return `${slugifyCity(origin)}/${slugifyCity(destination)}`;
}
