/**
 * Title and description of the /espana/<comunidad> pages, retitled for the
 * «estado de las carreteras en <comunidad>» searches (CMO spec, 02-11-2026,
 * experiment trafico-estado-carreteras):
 *   - title «Estado de las carreteras en <comunidad> hoy», plus
 *     «: cortes, obras y cámaras» only when it fits in 60 characters;
 *   - the root layout appends « | trafico.live» (15 characters); when that
 *     pushes the title past 60, the brand is left out (`absolute`) rather
 *     than letting the search snippet cut the community name.
 * Pure: the tests import it without a database.
 */

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;
export const BRAND_SUFFIX = " | trafico.live";

export function communityRoadHeading(name: string): string {
  return `Estado de las carreteras en ${name} hoy`;
}

export type CommunityRoadTitle = string | { absolute: string };

export function communityRoadTitle(name: string): CommunityRoadTitle {
  const base = communityRoadHeading(name);
  const long = `${base}: cortes, obras y cámaras`;
  if (long.length + BRAND_SUFFIX.length <= TITLE_MAX) return long;
  if (base.length + BRAND_SUFFIX.length <= TITLE_MAX) return base;
  return { absolute: base };
}

/** The title as it ends up in <title>, for checks. */
export function renderedTitle(t: CommunityRoadTitle): string {
  return typeof t === "string" ? `${t}${BRAND_SUFFIX}` : t.absolute;
}

export function communityRoadDescription(name: string): string {
  return `Estado de las carreteras en ${name} hoy: cortes de tráfico, obras, nieve y hielo, con cámaras de la DGT y avisos de AEMET.`;
}
