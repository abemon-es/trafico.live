/**
 * ?page=N for hub pages that list every item of a family with plain links, so
 * search engines can reach each item page without a sitemap.
 * Page 1 is the bare URL; ?page=1 redirects there; anything else invalid is a 404.
 */

export const DIRECTORY_PAGE_SIZE = 100;

export type PageResult =
  | { kind: "ok"; page: number; pages: number }
  | { kind: "redirect-to-first" }
  | { kind: "not-found" };

export function resolvePage(raw: string | string[] | undefined, total: number, size = DIRECTORY_PAGE_SIZE): PageResult {
  const pages = Math.max(1, Math.ceil(total / size));
  if (raw === undefined) return { kind: "ok", page: 1, pages };
  if (Array.isArray(raw) || !/^[1-9]\d{0,4}$/.test(raw)) return { kind: "not-found" };
  const page = Number(raw);
  if (page === 1) return { kind: "redirect-to-first" };
  if (page > pages) return { kind: "not-found" };
  return { kind: "ok", page, pages };
}

/** The URL of page `page` of a hub: the bare path for page 1. */
export function pageHref(path: string, page: number): string {
  return page <= 1 ? path : `${path}?page=${page}`;
}
