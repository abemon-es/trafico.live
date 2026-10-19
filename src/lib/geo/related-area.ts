import { PROVINCES } from "./ine-codes";
import { provinceSlug } from "./slugify";
import { provincePath } from "./geo-paths";
import { BARATAS_CITIES, CAMERA_CITY_PROVINCES, PRICE_PROVINCE_SLUGS, TRAFFIC_CITIES } from "./area-routes";

export interface AreaLink {
  href: string;
  label: string;
}

/** Same normalisation the city lists use as keys ("San Sebastián" → "san-sebastian"). */
function citySlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Cross-links for one area. Every href is built from the same data its route
 * uses to decide whether the page exists, so none of them can 404:
 * - province links come from the INE province code, never from free text;
 * - city links only when the slug is in that route's list AND that city is in
 *   the same province (a locality called "Valencia" elsewhere gets none).
 *
 * Before 2026-10-19 the gas-station pages built all six links from the
 * station's locality, so links like /radares/provincia/muxia or
 * /camaras/balbases-(los) 404'd on ~12k pages.
 */
export function relatedAreaLinks({ provinceCode, city }: { provinceCode?: string | null; city?: string | null }): AreaLink[] {
  const code = provinceCode ? provinceCode.padStart(2, "0") : null;
  const province = code ? PROVINCES.find((p) => p.code === code) : undefined;
  if (!code || !province) return [];

  const links: AreaLink[] = [];
  const hub = provincePath(code);
  if (hub) links.push({ href: hub, label: `Tráfico en ${province.name}` });

  const priceSlug = Object.keys(PRICE_PROVINCE_SLUGS).find((s) => PRICE_PROVINCE_SLUGS[s].code === code);
  if (priceSlug) links.push({ href: `/gasolineras/precios/${priceSlug}`, label: "Precios combustible" });

  // /radares/provincia and /estadisticas/accidentes resolve their param as
  // provinceSlug(PROVINCES[i].name), so the same call can't miss.
  links.push({ href: `/radares/provincia/${provinceSlug(province.name)}`, label: "Radares" });
  links.push({ href: `/estadisticas/accidentes/${provinceSlug(province.name)}`, label: "Accidentalidad" });

  if (city) {
    const slug = citySlug(city);
    if (TRAFFIC_CITIES[slug]?.provinceCode === code) {
      links.push({ href: `/trafico/${slug}`, label: `Tráfico en ${TRAFFIC_CITIES[slug].name}` });
    }
    if (CAMERA_CITY_PROVINCES[slug]?.code === code) {
      links.push({ href: `/camaras/${slug}`, label: "Cámaras DGT" });
    }
    if (BARATAS_CITIES[slug]?.provinceCode === code) {
      links.push({ href: `/gasolineras/baratas/${slug}`, label: "Gasolineras baratas" });
    }
  }
  return links;
}
