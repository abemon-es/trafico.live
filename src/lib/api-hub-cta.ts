/**
 * The one-line API invitation shown on the busiest hubs (CMO, 09-11-2026:
 * the five segments with the most GA4 views in 90 days, minus /camaras).
 *
 * Each dataset named here must be in the public API: in /api-docs, or on
 * /api-landing with its plan. Checked against the code on 09-11-2026:
 *   - trenes: /api/trenes/alertas (FREE, docs) + /api/trenes/posiciones (PRO, landing)
 *   - mapa: /api/incidents and /api/estaciones-aforo, both with GeoJSON
 *   - carreteras: the incident collector runs every 2 minutes (realtime crontab)
 *   - maritimo: AIS positions (PRO, landing)
 * Cameras are left out: /api/cameras is not in /api-docs and returns no GeoJSON.
 * Paid datasets are why the line says «hay plan gratuito», never «gratis».
 */

export type ApiHub = "trenes" | "mapa" | "carreteras" | "maritimo";

export const API_HUB_DATASETS: Record<ApiHub, string> = {
  trenes: "Alertas de Renfe y posiciones de los trenes en tiempo real",
  mapa: "Incidencias y aforos de toda España, en GeoJSON",
  carreteras: "Incidencias de la DGT actualizadas cada 2 minutos",
  maritimo: "Posiciones AIS de buques en aguas españolas",
};

export const API_HUB_LEAD = "¿Usas estos datos en tu empresa?";
export const API_HUB_TAIL = "por API. Hay plan gratuito sin tarjeta.";
export const API_HUB_LINK = "Ver la API →";

/** The sentence before the link, e.g. «¿Usas…? Incidencias…, por API. Hay plan…». */
export function apiHubSentence(hub: ApiHub): string {
  return `${API_HUB_LEAD} ${API_HUB_DATASETS[hub]}, ${API_HUB_TAIL}`;
}
