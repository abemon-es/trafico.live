import { getProvinceByCode } from "./ine-codes";

/**
 * Convert a string to a URL-friendly slug
 * Handles Spanish characters (ñ, accents)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Remove consecutive hyphens
}

/**
 * Generate slug for a community name
 * Handles special cases like "Comunidad de Madrid"
 */
export function communitySlug(name: string): string {
  // Keep "Comunidad de" prefix for better SEO but slugify it
  return slugify(name);
}

/**
 * Generate slug for a province name
 */
export function provinceSlug(name: string): string {
  return slugify(name);
}

/**
 * A province's slug by INE code, the one /estadisticas/accidentes/[provincia]
 * and /radares/provincia/[slug] resolve: provinceSlug() of its PROVINCES name
 * («Valencia/València» → "valenciavalencia"). A short or source name slugs to
 * another string that 404s («Valencia», «S.C. Tenerife», «Guipúzcoa»).
 */
export function provinceSlugByCode(code: string): string | null {
  const province = getProvinceByCode(code.padStart(2, "0"));
  return province ? provinceSlug(province.name) : null;
}

/**
 * Generate slug for a municipality name
 * May need disambiguation if same name exists in multiple provinces
 */
export function municipalitySlug(name: string, provinceName?: string): string {
  const base = slugify(name);
  // For now, just use the name. Later can add disambiguation if needed
  return base;
}
