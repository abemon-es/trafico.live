/** /carga-ev/provincia/<slug>: the /espana province slugs, by INE code. */

import { PROVINCE_SLUGS } from "@/lib/geo/geo-paths";

export function provinceCodeForSlug(slug: string): string | null {
  for (const [code, p] of Object.entries(PROVINCE_SLUGS)) if (p.province === slug) return code;
  return null;
}

export function evProvincePath(code: string): string | null {
  const p = PROVINCE_SLUGS[code.padStart(2, "0")];
  return p ? `/carga-ev/provincia/${p.province}` : null;
}
