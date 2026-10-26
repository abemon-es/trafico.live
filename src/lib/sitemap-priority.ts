import type { SitemapEntry } from "./sitemap-generator";

// ---------------------------------------------------------------------------
// /sitemap/priority.xml — a fixed list of the pages people actually land on
// ---------------------------------------------------------------------------
// Google crawls little of the site and indexes about a quarter of what it is
// sent, so priority.xml carries only the pages with their own data and real
// visits, not every hub a rule could match.
//
// Source: CMO list of 2026-10-25, ranked by 90-day GA4 landing sessions from
// every engine (Bing and its partners bring most of them) plus GSC clicks and
// impressions. Left out:
//   - single trains (/trenes/tren/<n>): a train's page changes every day;
//   - /mapa (duplicates the homepage map) and past event pages;
//   - /provincias/<code>: redirects; the /espana page it lands on is listed.
// To change the list, re-rank with fresh GA4/GSC data and keep it under 100.

export const PRIORITY_MAX_URLS = 100;

export const PRIORITY_PATHS: readonly string[] = [
  "/trenes/incidencias",
  "/",
  "/maritimo/combustible/35",
  "/rondas/ronda-dalt",
  "/trenes",
  "/prediccion/precio-combustible",
  "/estaciones-aforo",
  "/carreteras/AP-7/hoy",
  "/trafico/mapa",
  "/maritimo",
  "/gasolineras/tipo/glp",
  "/trafico/palma",
  "/rondas/ronda-litoral",
  "/radares",
  "/peajes/radiales-madrid",
  "/etiqueta-ambiental",
  "/camaras/carretera/A-1",
  "/peajes",
  "/barcos",
  "/maritimo/combustible",
  "/guias/limites-velocidad-espana",
  "/carreteras/A-3/hoy",
  "/carreteras/A-2/hoy",
  "/intensidad",
  "/camaras/valencia",
  "/rondas/m-30",
  "/atascos",
  "/zbe",
  "/espana/cataluna/barcelona/granollers",
  "/carreteras/A-6/hoy",
  "/atascos/madrid",
  "/camaras",
  "/camaras/carretera/AP-7",
  "/trafico/bilbao",
  "/trafico/sevilla",
  "/carreteras/A-7/hoy",
  "/camaras/sevilla",
  "/trafico/madrid",
  "/carreteras/AP-9/hoy",
  "/mejor-hora",
  "/trafico/zaragoza",
  "/carreteras/M-40/hoy",
  "/trafico",
  "/vuelos",
  "/camaras/madrid",
  "/camaras/palma",
  "/carreteras/A-8",
  "/trafico/valencia",
  "/carreteras/A-62/hoy",
  "/aviacion/mapa",
  "/guias/zonas-bajas-emisiones",
  "/estadisticas/accidentes",
  "/carreteras/AP-7",
  "/carreteras/A-8/hoy",
  "/carreteras/A-42/hoy",
  "/atascos/granada",
  "/calculadora",
  "/espana/pais-vasco/gipuzkoa",
  "/paneles",
  "/trenes/linea/cercanias-c1-valencia-estacio-del-nord-gandia",
  "/trenes/linea/alvia-cadiz-madrid-pta-atocha-almudena-grandes",
  "/espana/comunidad-valenciana/valencia",
  "/gasolineras/historico",
  "/carreteras/N-601",
  "/carreteras/A-4/hoy",
  "/aviacion",
  "/barcos/mapa",
  "/api-docs",
  "/camaras/malaga",
  "/camaras/carretera/A-62",
  "/trenes/reclamaciones",
  "/trenes/mapa",
  "/trafico/barcelona",
  "/rondas/m-40",
  "/espana/andalucia/sevilla",
  "/profesional/areas",
  "/noticias/accidentalidad-32-2023",
  "/trafico/granada",
  "/trafico/alicante",
  "/peajes/ap-36",
  "/guias/cercanias-madrid",
  "/carreteras/limites-velocidad",
  "/carreteras/M-50/hoy",
  "/carreteras/A-5/hoy",
  "/carreteras/A-49",
  "/camaras/carretera/A-42",
  "/atascos/palma",
  "/carreteras/nacionales",
  "/radares/A-92",
];

/**
 * The priority sitemap, in list order. A page the core sitemap also lists
 * keeps its lastmod, changefreq and priority from there; the rest (pages no
 * shard covers yet) go out without lastmod rather than with an invented one.
 */
export function priorityEntries(core: SitemapEntry[], baseUrl: string): SitemapEntry[] {
  const byPath = new Map<string, SitemapEntry>();
  for (const e of core) {
    const path = e.url.slice(baseUrl.length) || "/";
    if (!byPath.has(path)) byPath.set(path, e);
  }
  return PRIORITY_PATHS.slice(0, PRIORITY_MAX_URLS).map((path) => {
    const known = byPath.get(path);
    if (known) return known;
    return {
      url: path === "/" ? baseUrl : `${baseUrl}${path}`,
      changeFrequency: "daily",
      priority: 0.8,
    };
  });
}
