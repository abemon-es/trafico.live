/**
 * Generic popup HTML builder for TraficoMap features.
 *
 * Extracts a title from common property keys, renders a compact key/value
 * list of useful properties, and appends a "Ver detalle" link when the
 * layer id maps to a known detail URL pattern.
 */

type FeatureProps = Record<string, unknown>;

interface DetailRoute {
  /** Property key to use as the URL slug/id */
  idKey: string;
  /** URL template — `{id}` is replaced with the extracted value */
  pattern: string;
}

const DETAIL_ROUTES: Record<string, DetailRoute> = {
  "gas-stations":     { idKey: "id",   pattern: "/gasolineras/terrestres/{id}" },
  "maritime-fuel":    { idKey: "id",   pattern: "/gasolineras/maritimas/{id}" },
  "cameras":          { idKey: "id",   pattern: "/camaras/camara/{id}" },
  "radars":           { idKey: "id",   pattern: "/radares/radar/{id}" },
  "airports":         { idKey: "iata", pattern: "/aviacion/aeropuertos/{id}" },
  "ports":            { idKey: "slug", pattern: "/maritimo/puertos/{id}" },
  "railway-stations": { idKey: "slug", pattern: "/trenes/estacion/{id}" },
  "climate-stations": { idKey: "slug", pattern: "/meteo/estaciones/{id}" },
  "air-quality":      { idKey: "id",   pattern: "/calidad-aire/estacion/{id}" },
};

/** Keys that indicate the feature's human-readable title (first match wins). */
const TITLE_KEYS = ["name", "title", "label", "stationName", "operatorName", "shipName", "iata", "icao"];

/** Keys to hide from the property table (internal or noisy). */
const HIDDEN_KEYS = new Set([
  "id", "slug", "geom", "geometry", "source", "layer",
  "lat", "lng", "lon", "longitude", "latitude",
  "createdAt", "updatedAt", "tileId", "x", "y", "z",
]);

const LABEL_ALIASES: Record<string, string> = {
  sog:           "Velocidad (nudos)",
  cog:           "Rumbo",
  mmsi:          "MMSI",
  category:      "Categoría",
  imd:           "IMD (veh/día)",
  year:          "Año",
  road:          "Carretera",
  severity:      "Gravedad",
  delay:         "Retraso (min)",
  brand:         "Marca",
  trainNumber:   "Tren",
  operatorName:  "Operador",
  mode:          "Modo",
  routeShortName:"Línea",
  priceGasolina95E5: "Gasolina 95",
  priceGasolina98E5: "Gasolina 98",
  priceGasoleoA:     "Gasóleo A",
  priceGLP:          "GLP",
  ica:           "ICA",
  aqLevel:       "Nivel",
  pollutant:     "Contaminante",
  no2:           "NO₂",
  pm10:          "PM10",
  pm25:          "PM2.5",
  o3:            "O₃",
  so2:           "SO₂",
  co:            "CO",
  tempMax:       "Tª máx",
  tempMin:       "Tª mín",
  precipitation: "Precipitación",
};

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractTitle(props: FeatureProps): string | null {
  for (const key of TITLE_KEYS) {
    const v = props[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function formatValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString("es-ES");
    return value.toLocaleString("es-ES", { maximumFractionDigits: 3 });
  }
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "string") return escapeHtml(value);
  return null;
}

function labelFor(key: string): string {
  if (LABEL_ALIASES[key]) return LABEL_ALIASES[key];
  // camelCase → Title Case
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function detailUrl(layerId: string, props: FeatureProps): string | null {
  const route = DETAIL_ROUTES[layerId];
  if (!route) return null;
  const raw = props[route.idKey] ?? props.id;
  if (raw === null || raw === undefined || raw === "") return null;
  return route.pattern.replace("{id}", encodeURIComponent(String(raw)));
}

/**
 * Build HTML content for a MapLibre popup given a feature's layer id
 * and its properties. Returns a self-contained HTML string.
 */
export function buildPopupHTML(
  layerId: string,
  layerLabel: string,
  props: FeatureProps,
): string {
  const title = extractTitle(props) ?? layerLabel;

  const rows: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (HIDDEN_KEYS.has(key)) continue;
    if (TITLE_KEYS.includes(key) && key === "name") continue;
    const formatted = formatValue(key, value);
    if (formatted === null) continue;
    rows.push(
      `<div style="display:flex;justify-content:space-between;gap:6px;font-size:10px;line-height:1.3;">
        <span style="color:#6b7280;">${escapeHtml(labelFor(key))}</span>
        <span style="color:#111827;font-weight:500;text-align:right;">${formatted}</span>
      </div>`,
    );
    if (rows.length >= 3) break; // keep popup tight — max 3 rows
  }

  const link = detailUrl(layerId, props);
  const linkHtml = link
    ? `<a href="${link}" style="display:block;margin-top:6px;padding:4px 6px;text-align:center;font-size:10px;font-weight:500;background:#1b4bd5;color:#fff;border-radius:3px;text-decoration:none;">Ver detalle →</a>`
    : "";

  return `
    <div style="min-width:160px;max-width:220px;font-family:system-ui,-apple-system,sans-serif;line-height:1.3;">
      <div style="font-weight:600;color:#111827;font-size:11px;margin-bottom:3px;">${escapeHtml(title)}</div>
      <div style="color:#9ca3af;font-size:9px;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(layerLabel)}</div>
      ${rows.length > 0 ? `<div style="display:flex;flex-direction:column;gap:1px;">${rows.join("")}</div>` : ""}
      ${linkHtml}
    </div>
  `;
}
