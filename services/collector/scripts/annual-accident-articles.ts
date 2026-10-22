/**
 * The 52 annual province articles («accidentalidad-{código}-2023», published
 * 2026-04-02), corrected in place (CMO, 2026-10-22). URL, publishedAt and
 * updatedAt stay as they are.
 *   - «Análisis completo por provincia» linked /analisis/accidentes/<slug of
 *     the Province table>. That 308s to /estadisticas/accidentes/<slug>, and
 *     5 of them («alava», «alicante», «baleares», «castellon», «valencia»)
 *     ended in a 404. Now it links the province's own page directly.
 *   - «Información de la provincia» linked /provincias/<code>, a 301. Now it
 *     links its final URL.
 *   - «en sus carreteras» → «en sus vías»: the DGT figures cover every road,
 *     urban ones included.
 *   - «Datos definitivos» → «Datos»: nothing here says DGT calls them that.
 *
 * Pure functions here; correct-annual-accident-articles.ts runs them.
 */

/**
 * Each province's final URLs: provinceSlugByCode() and provincePath() of
 * src/lib (tests/annual-accident-articles.test.ts checks they still match).
 * Written out here because the collector image carries no src/lib/geo.
 */
export const PROVINCE_LINKS: Record<string, { estadisticas: string; espana: string }> = {
  "01": { estadisticas: "/estadisticas/accidentes/alavaaraba", espana: "/espana/pais-vasco/alava" },
  "02": { estadisticas: "/estadisticas/accidentes/albacete", espana: "/espana/castilla-la-mancha/albacete" },
  "03": { estadisticas: "/estadisticas/accidentes/alicantealacant", espana: "/espana/comunidad-valenciana/alicante" },
  "04": { estadisticas: "/estadisticas/accidentes/almeria", espana: "/espana/andalucia/almeria" },
  "05": { estadisticas: "/estadisticas/accidentes/avila", espana: "/espana/castilla-y-leon/avila" },
  "06": { estadisticas: "/estadisticas/accidentes/badajoz", espana: "/espana/extremadura/badajoz" },
  "07": { estadisticas: "/estadisticas/accidentes/illes-balears", espana: "/espana/islas-baleares/baleares" },
  "08": { estadisticas: "/estadisticas/accidentes/barcelona", espana: "/espana/cataluna/barcelona" },
  "09": { estadisticas: "/estadisticas/accidentes/burgos", espana: "/espana/castilla-y-leon/burgos" },
  "10": { estadisticas: "/estadisticas/accidentes/caceres", espana: "/espana/extremadura/caceres" },
  "11": { estadisticas: "/estadisticas/accidentes/cadiz", espana: "/espana/andalucia/cadiz" },
  "12": { estadisticas: "/estadisticas/accidentes/castelloncastello", espana: "/espana/comunidad-valenciana/castellon" },
  "13": { estadisticas: "/estadisticas/accidentes/ciudad-real", espana: "/espana/castilla-la-mancha/ciudad-real" },
  "14": { estadisticas: "/estadisticas/accidentes/cordoba", espana: "/espana/andalucia/cordoba" },
  "15": { estadisticas: "/estadisticas/accidentes/a-coruna", espana: "/espana/galicia/a-coruna" },
  "16": { estadisticas: "/estadisticas/accidentes/cuenca", espana: "/espana/castilla-la-mancha/cuenca" },
  "17": { estadisticas: "/estadisticas/accidentes/girona", espana: "/espana/cataluna/girona" },
  "18": { estadisticas: "/estadisticas/accidentes/granada", espana: "/espana/andalucia/granada" },
  "19": { estadisticas: "/estadisticas/accidentes/guadalajara", espana: "/espana/castilla-la-mancha/guadalajara" },
  "20": { estadisticas: "/estadisticas/accidentes/gipuzkoa", espana: "/espana/pais-vasco/gipuzkoa" },
  "21": { estadisticas: "/estadisticas/accidentes/huelva", espana: "/espana/andalucia/huelva" },
  "22": { estadisticas: "/estadisticas/accidentes/huesca", espana: "/espana/aragon/huesca" },
  "23": { estadisticas: "/estadisticas/accidentes/jaen", espana: "/espana/andalucia/jaen" },
  "24": { estadisticas: "/estadisticas/accidentes/leon", espana: "/espana/castilla-y-leon/leon" },
  "25": { estadisticas: "/estadisticas/accidentes/lleida", espana: "/espana/cataluna/lleida" },
  "26": { estadisticas: "/estadisticas/accidentes/la-rioja", espana: "/espana/la-rioja/la-rioja" },
  "27": { estadisticas: "/estadisticas/accidentes/lugo", espana: "/espana/galicia/lugo" },
  "28": { estadisticas: "/estadisticas/accidentes/madrid", espana: "/espana/comunidad-de-madrid/madrid" },
  "29": { estadisticas: "/estadisticas/accidentes/malaga", espana: "/espana/andalucia/malaga" },
  "30": { estadisticas: "/estadisticas/accidentes/murcia", espana: "/espana/region-de-murcia/murcia" },
  "31": { estadisticas: "/estadisticas/accidentes/navarra", espana: "/espana/navarra/navarra" },
  "32": { estadisticas: "/estadisticas/accidentes/ourense", espana: "/espana/galicia/ourense" },
  "33": { estadisticas: "/estadisticas/accidentes/asturias", espana: "/espana/principado-de-asturias/asturias" },
  "34": { estadisticas: "/estadisticas/accidentes/palencia", espana: "/espana/castilla-y-leon/palencia" },
  "35": { estadisticas: "/estadisticas/accidentes/las-palmas", espana: "/espana/canarias/las-palmas" },
  "36": { estadisticas: "/estadisticas/accidentes/pontevedra", espana: "/espana/galicia/pontevedra" },
  "37": { estadisticas: "/estadisticas/accidentes/salamanca", espana: "/espana/castilla-y-leon/salamanca" },
  "38": { estadisticas: "/estadisticas/accidentes/santa-cruz-de-tenerife", espana: "/espana/canarias/santa-cruz-de-tenerife" },
  "39": { estadisticas: "/estadisticas/accidentes/cantabria", espana: "/espana/cantabria/cantabria" },
  "40": { estadisticas: "/estadisticas/accidentes/segovia", espana: "/espana/castilla-y-leon/segovia" },
  "41": { estadisticas: "/estadisticas/accidentes/sevilla", espana: "/espana/andalucia/sevilla" },
  "42": { estadisticas: "/estadisticas/accidentes/soria", espana: "/espana/castilla-y-leon/soria" },
  "43": { estadisticas: "/estadisticas/accidentes/tarragona", espana: "/espana/cataluna/tarragona" },
  "44": { estadisticas: "/estadisticas/accidentes/teruel", espana: "/espana/aragon/teruel" },
  "45": { estadisticas: "/estadisticas/accidentes/toledo", espana: "/espana/castilla-la-mancha/toledo" },
  "46": { estadisticas: "/estadisticas/accidentes/valenciavalencia", espana: "/espana/comunidad-valenciana/valencia" },
  "47": { estadisticas: "/estadisticas/accidentes/valladolid", espana: "/espana/castilla-y-leon/valladolid" },
  "48": { estadisticas: "/estadisticas/accidentes/bizkaia", espana: "/espana/pais-vasco/bizkaia" },
  "49": { estadisticas: "/estadisticas/accidentes/zamora", espana: "/espana/castilla-y-leon/zamora" },
  "50": { estadisticas: "/estadisticas/accidentes/zaragoza", espana: "/espana/aragon/zaragoza" },
  "51": { estadisticas: "/estadisticas/accidentes/ceuta", espana: "/espana/ceuta/ceuta" },
  "52": { estadisticas: "/estadisticas/accidentes/melilla", espana: "/espana/melilla/melilla" },
};

const ANALISIS = /\]\(\/analisis\/accidentes\/[a-z0-9-]+\)/g;
const PROVINCIAS = /\]\(\/provincias\/\d{2}\)/g;
const ROADS = "en sus carreteras según datos de la DGT";
const DEFINITIVE = "*Fuente: DGT (Dirección General de Tráfico). Datos definitivos ";

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
const occurrences = (s: string, sub: string) => s.split(sub).length - 1;

/**
 * The corrected body, the same body when it's already corrected, or null when
 * its structure isn't the known one (the run then refuses to apply).
 */
export function rewriteAnnualArticle(provinceCode: string, body: string): string | null {
  const links = PROVINCE_LINKS[provinceCode];
  if (!links) return null;
  let out = body;

  const analisis = count(out, ANALISIS);
  if (analisis === 1) out = out.replace(ANALISIS, `](${links.estadisticas})`);
  else if (analisis !== 0 || occurrences(out, `](${links.estadisticas})`) !== 1) return null;

  const provincias = count(out, PROVINCIAS);
  if (provincias === 1) out = out.replace(PROVINCIAS, `](${links.espana})`);
  else if (provincias !== 0 || occurrences(out, `](${links.espana})`) !== 1) return null;

  const roads = occurrences(out, ROADS);
  if (roads === 1) out = out.replace(ROADS, "en sus vías según datos de la DGT");
  else if (roads !== 0 || occurrences(out, "en sus vías según datos de la DGT") !== 1) return null;

  const definitive = occurrences(out, DEFINITIVE);
  if (definitive === 1) out = out.replace(DEFINITIVE, "*Fuente: DGT (Dirección General de Tráfico). Datos ");
  else if (definitive !== 0 || occurrences(out, "*Fuente: DGT (Dirección General de Tráfico). Datos ") !== 1) return null;

  return out;
}
