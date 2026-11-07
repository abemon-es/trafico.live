/**
 * The slug of a port page built from a maritime station's port name:
 * /maritimo/puertos/<portSlug(name)>. The page resolves a slug back to the
 * name with this same function, so the sitemap has to use it too: a sitemap
 * that slugged «L'Escala» its own way listed /maritimo/puertos/lescala, a 404.
 */
export function portSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
