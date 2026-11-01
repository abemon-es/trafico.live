/**
 * /gasolineras/tipo/glp answers «dónde repostar GLP»: the stations with GLP
 * grouped by province, each province with its count, cheapest and mean price
 * and its three cheapest stations.
 *
 * GSC 02..29-10-2026 (CMO): the page had 190 impressions, 0 clicks, position
 * 70.7; its top query was «donde repostar glp» (49 impressions, position 79),
 * and it only listed the 20 cheapest stations of the whole country. Experiment
 * trafico-glp-donde, read at +14 and +28 days.
 *
 * Only provinces with a /gasolineras/precios/<slug> page and at least one
 * station with a GLP price appear; nothing is shown as «0 gasolineras».
 */

import { PRICE_PROVINCE_SLUGS } from "@/lib/geo/area-routes";

export interface GlpStationRow {
  id: string;
  name: string;
  locality: string | null;
  municipality: string | null;
  province: string | null;
  priceGLP: number;
}

export interface GlpProvince {
  code: string;
  name: string;
  slug: string;
  /** #glp-<slug> on /gasolineras/tipo/glp. */
  anchor: string;
  count: number;
  min: number;
  avg: number;
  cheapest: GlpStationRow[];
}

/** INE code → price-page slug and name. */
export function provinceSlugsByCode(
  slugs: Record<string, { code: string; name: string }> = PRICE_PROVINCE_SLUGS
): Map<string, { slug: string; name: string }> {
  return new Map(Object.entries(slugs).map(([slug, p]) => [p.code, { slug, name: p.name }]));
}

export const glpAnchor = (slug: string) => `glp-${slug}`;

export function glpByProvince(
  rows: GlpStationRow[],
  slugs: Record<string, { code: string; name: string }> = PRICE_PROVINCE_SLUGS,
  perProvince = 3
): GlpProvince[] {
  const byCode = provinceSlugsByCode(slugs);
  const groups = new Map<string, GlpStationRow[]>();
  for (const r of rows) {
    if (!r.province || !(r.priceGLP > 0) || !byCode.has(r.province)) continue;
    const g = groups.get(r.province);
    if (g) g.push(r);
    else groups.set(r.province, [r]);
  }
  const out: GlpProvince[] = [];
  for (const [code, list] of groups) {
    const p = byCode.get(code)!;
    const sorted = [...list].sort((a, b) => a.priceGLP - b.priceGLP || a.id.localeCompare(b.id));
    out.push({
      code,
      name: p.name,
      slug: p.slug,
      anchor: glpAnchor(p.slug),
      count: list.length,
      min: sorted[0].priceGLP,
      avg: list.reduce((s, r) => s + r.priceGLP, 0) / list.length,
      cheapest: sorted.slice(0, perProvince),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "es"));
}
