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
const TITLE_KEYS = ["name", "title", "label", "stopName", "stationName", "operatorName", "shipName", "iata", "icao", "callsign", "trainNumber"];

/** Keys to hide from the property table (internal or noisy). */
const HIDDEN_KEYS = new Set([
  "id", "slug", "geom", "geometry", "source", "layer",
  "lat", "lng", "lon", "longitude", "latitude",
  "createdAt", "updatedAt", "tileId", "x", "y", "z",
  // Broad schedule + url fields that don't render as simple rows
  "feedUrl", "thumbnailUrl", "streamUrl",
  // Prisma cuid identifiers — noise unless they're the feature's main id
  "operatorId", "stopId", "sensorId", "stationId", "stationCode",
  // Tile-level metadata from clustering
  "clustered", "point_count", "sqrt_point_count", "point_count_abbreviated",
]);

/** DGT DATEX II incident types → Spanish labels. */
const INCIDENT_TYPES: Record<string, string> = {
  CONGESTION:       "Congestión",
  ROADWORKS:        "Obras",
  ACCIDENT:         "Accidente",
  WEATHER:          "Meteorología adversa",
  OBSTRUCTION:      "Obstáculo",
  HAZARD:           "Peligro",
  CLOSURE:          "Corte",
  EVENT:            "Evento",
  RESTRICTION:      "Restricción",
};

const LABEL_ALIASES: Record<string, string> = {
  sog:           "Velocidad (nudos)",
  cog:           "Rumbo",
  mmsi:          "MMSI",
  category:      "Categoría",
  destination:   "Destino",
  imd:           "IMD (veh/día)",
  year:          "Año",
  road:          "Carretera",
  roadNumber:    "Carretera",
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
  velocity:      "Velocidad (km/h)",
  altitude:      "Altitud (m)",
  heading:       "Rumbo",
  callsign:      "Vuelo",
  icao24:        "ICAO24",
  origin:        "Origen",
  iata:          "IATA",
  icao:          "ICAO",
  province:      "Provincia",
  provinceName:  "Provincia",
  address:       "Dirección",
  schedule:      "Horario",
  isOpen24h:     "24 h",
  city:          "Ciudad",
  locality:      "Localidad",
  municipality:  "Municipio",
  network:       "Red",
  distance:      "Distancia (m)",
  elevation:     "Altitud (m)",
  networkLabel:  "Red",
  stops:         "Paradas",
  roadType:      "Tipo de vía",
  direction:     "Sentido",
  platform:      "Andén",
  type:          "Tipo",
  status:        "Estado",
  startTime:     "Inicio",
  endTime:       "Fin",
  description:   "Descripción",
  km:            "KM",
  kilometer:     "KM",
  kmStart:       "Km inicio",
  kmEnd:         "Km fin",
  imdLigeros:    "IMD ligeros",
  imdPesados:    "IMD pesados",
  percentPesados: "% pesados",
  segmentLength: "Longitud (km)",
  serviceType:   "Servicio",
  originStation: "Origen",
  destStation:   "Destino",
  rollingStock:  "Vehículo",
  stopId:        "ID parada",
  operatorId:    "Operador",
  locationType:  "Tipo",
  onGround:      "En tierra",
  isActive:      "Activa",
  is24h:         "24 h",
  isOpen24h:     "24 h",
  brand_name:    "Marca",
};

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractTitle(props: FeatureProps, layerId?: string): string | null {
  // Layer-specific composite titles for entities where a single field
  // isn't descriptive enough on its own.
  if (layerId === "fleet") {
    const brand = typeof props.brand === "string" ? props.brand : "";
    const num = props.trainNumber;
    if (brand && num) return `${brand} ${num}`;
  }
  if (layerId === "aircraft") {
    const cs = typeof props.callsign === "string" ? props.callsign.trim() : "";
    if (cs) return cs;
  }
  if (layerId === "road-segments") {
    const road = typeof props.roadNumber === "string" ? props.roadNumber : "";
    const kmA = props.kmStart;
    const kmB = props.kmEnd;
    if (road && typeof kmA === "number" && typeof kmB === "number") {
      return `${road} · km ${kmA.toFixed(1)}–${kmB.toFixed(1)}`;
    }
    if (road) return road;
  }
  if (layerId === "cameras") {
    const road = typeof props.roadNumber === "string" ? props.roadNumber : "";
    const name = typeof props.name === "string" ? props.name : "";
    if (road && name && !name.includes(road)) return `${road} — ${name}`;
    if (name) return name;
  }
  if (layerId === "sensors" || layerId === "city-sensors") {
    // Use description truncated to first clause — long DGT descriptions are
    // structured as "(TYPE) STREET - REFS" — the street part is the useful bit.
    const d = typeof props.description === "string" ? props.description.trim() : "";
    if (d) {
      // Trim parenthetical prefix and take up to 40 chars of meaningful text
      const cleaned = d.replace(/^\([^)]*\)\s*/, "").split(/[(]/)[0].trim();
      return cleaned.length > 40 ? cleaned.slice(0, 40).trim() + "…" : cleaned;
    }
  }
  if (layerId === "incidents") {
    // Prefer description, falling back to the layer label via return null.
    const d = typeof props.description === "string" ? props.description.trim() : "";
    if (d) {
      const truncated = d.length > 48 ? d.slice(0, 48).trim() + "…" : d;
      return truncated;
    }
  }
  for (const key of TITLE_KEYS) {
    const v = props[key];
    if (typeof v === "string" && v.trim()) return smartTitleCase(v.trim());
    if (typeof v === "number") return String(v);
  }
  return null;
}

/** Spanish minor words that stay lowercase in Title Case. */
const MINOR_WORDS = new Set(["de", "del", "la", "las", "el", "los", "y", "en", "o", "a"]);

/** Convert ALL-CAPS Spanish strings to Title Case with minor-word rule.
 *  Detects "all caps" by ABSENCE of any lowercase letter rather than an
 *  exhaustive allow-list, so corrupted-encoding names like
 *  "TORREJ\uFFFDN DE ARDOZ" (mojibake from Latin-1 tiles) still get
 *  beautified. Leaves mixed-case or short strings alone. */
function smartTitleCase(s: string): string {
  if (s.length < 4) return s;
  if (/[a-záéíóúñü]/.test(s)) return s;          // already has lowercase
  if (!/[A-ZÁÉÍÓÚÑÜ]/.test(s)) return s;          // no letters, nothing to do
  return s
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      if (i > 0 && MINOR_WORDS.has(word)) return word;
      return word.replace(/(^|[\s'-])([a-záéíóúñü])/g, (_, sep, c) => sep + c.toUpperCase());
    })
    .join(" ");
}

function formatValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString("es-ES");
    return value.toLocaleString("es-ES", { maximumFractionDigits: 3 });
  }
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "string") {
    // Domain-specific value translations
    if (key === "type" && INCIDENT_TYPES[value]) return INCIDENT_TYPES[value];
    return escapeHtml(smartTitleCase(value));
  }
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

/** Camera live-feed thumbnail strip. DGT feeds are static JPGs refreshed ~5 min. */
function thumbnailHTML(props: FeatureProps): string {
  const url = typeof props.thumbnailUrl === "string" ? props.thumbnailUrl
            : typeof props.feedUrl === "string" ? props.feedUrl : null;
  if (!url) return "";
  const safe = escapeHtml(url);
  return `<div style="margin:6px 0;border-radius:4px;overflow:hidden;background:rgba(0,0,0,0.08);">
    <img src="${safe}" alt="Cámara en directo" loading="lazy" style="display:block;width:100%;max-height:130px;object-fit:cover;" onerror="this.style.display='none'"/>
  </div>`;
}

/** Price grid for gas stations. Accepts both newer (priceGasolina95,
 *  priceDieselA) and legacy (priceGasolina95E5, priceGasoleoA) key names
 *  since different tile generators / data sources use different schemas. */
function priceGridHTML(props: FeatureProps): string {
  const pick = (...keys: string[]): number | null => {
    for (const k of keys) {
      const v = props[k];
      if (typeof v === "number" && v > 0) return v;
    }
    return null;
  };
  const prices: Array<[string, string, number | null]> = [
    ["Gasolina 95",  "#1b4bd5", pick("priceGasolina95", "priceGasolina95E5")],
    ["Gasóleo A",    "#d48139", pick("priceDieselA",    "priceGasoleoA")],
    ["Gasolina 98",  "#7c3aed", pick("priceGasolina98", "priceGasolina98E5", "priceDieselPremium")],
    ["GLP",          "#059669", pick("priceGLP")],
  ];
  const cells = prices
    .filter(([, , v]) => v !== null)
    .map(([label, color, v]) => `
      <div style="background:rgba(0,0,0,0.05);border-radius:4px;padding:4px 6px;text-align:center;min-width:0;">
        <div style="font-size:9px;color:${color};font-weight:600;">${label}</div>
        <div style="font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;">${(v as number).toFixed(3)}€</div>
      </div>`);
  if (!cells.length) return "";
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:6px 0;">${cells.join("")}</div>`;
}

/** Real-time sensor dashboard for Madrid / city traffic sensors. */
function sensorDashHTML(props: FeatureProps): string {
  const serviceLevel = props.serviceLevel;
  const intensity = props.intensity;
  const occupancy = props.occupancy;
  const load = props.load;
  const svcLabels = ["Fluido", "Denso", "Congestionado", "Cortado"];
  const svcColors = ["#059669", "#eab308", "#f97316", "#dc2626"];
  const level = typeof serviceLevel === "number" ? serviceLevel : -1;
  const lvlLabel = level >= 0 && level <= 3 ? svcLabels[level] : null;
  const lvlColor = level >= 0 && level <= 3 ? svcColors[level] : "#64748b";

  const chip = lvlLabel
    ? `<div style="display:inline-block;background:${lvlColor};color:#fff;font-size:10px;font-weight:600;padding:3px 8px;border-radius:10px;margin-bottom:6px;">${lvlLabel}</div>`
    : "";

  const cells = [
    ["Intensidad",   typeof intensity === "number" ? `${intensity} veh/h` : null],
    ["Ocupación",    typeof occupancy === "number" ? `${occupancy}%` : null],
    ["Carga",        typeof load === "number" ? `${load}%` : null],
  ]
    .filter(([, v]) => v !== null)
    .map(([label, v]) => `
      <div style="background:rgba(0,0,0,0.05);border-radius:4px;padding:4px 6px;text-align:center;min-width:0;">
        <div style="font-size:9px;color:#64748b;font-weight:500;">${label}</div>
        <div style="font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;">${v}</div>
      </div>`)
    .join("");

  if (!chip && !cells) return "";
  return `${chip}${cells ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:6px;">${cells}</div>` : ""}`;
}

/** Severity chip (used for incidents / accidents / emergencies). */
function severityChipHTML(severity: unknown): string {
  if (!severity || typeof severity !== "string") return "";
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    HIGH:          { label: "Alta",         bg: "#dc2626", fg: "#ffffff" },
    MEDIUM:        { label: "Media",        bg: "#f97316", fg: "#ffffff" },
    LOW:           { label: "Baja",         bg: "#eab308", fg: "#1f2937" },
    fatal:         { label: "Mortal",       bg: "#dc2626", fg: "#ffffff" },
    hospitalized:  { label: "Hospitalizado",bg: "#f97316", fg: "#ffffff" },
    minor:         { label: "Leve",         bg: "#eab308", fg: "#1f2937" },
  };
  const s = map[severity];
  if (!s) return "";
  return `<span style="display:inline-block;background:${s.bg};color:${s.fg};font-size:9px;font-weight:600;padding:2px 6px;border-radius:10px;margin-left:4px;vertical-align:middle;">${s.label}</span>`;
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
  const title = extractTitle(props, layerId) ?? layerLabel;

  // Type-specific visual blocks
  const extraTop: string[] = [];
  if (layerId === "cameras") {
    extraTop.push(thumbnailHTML(props));
  }
  if (layerId === "gas-stations" || layerId === "maritime-fuel" || layerId === "portugal-gas") {
    extraTop.push(priceGridHTML(props));
  }
  if (layerId === "sensors" || layerId === "city-sensors") {
    extraTop.push(sensorDashHTML(props));
  }

  // Severity chip appended to title for incidents/emergencies/accidents
  const sevChip = (layerId === "incidents" || layerId === "accidents" || layerId === "emergencies")
    ? severityChipHTML(props.severity)
    : "";

  // Suppress the numeric province code when a human-readable name is also
  // present (avoids a duplicate "Provincia 28 / Provincia Madrid" row).
  const hasProvinceName = typeof props.provinceName === "string" && props.provinceName.trim();

  const rows: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (HIDDEN_KEYS.has(key)) continue;
    if (TITLE_KEYS.includes(key) && key === "name") continue;
    if (hasProvinceName && key === "province") continue;
    // Skip properties already displayed via the type-specific blocks
    if (layerId === "cameras" && (key === "thumbnailUrl" || key === "feedUrl")) continue;
    if ((layerId === "gas-stations" || layerId === "maritime-fuel" || layerId === "portugal-gas")
        && /^price/.test(key)) continue;
    if ((layerId === "incidents" || layerId === "accidents" || layerId === "emergencies")
        && key === "severity") continue;
    // Road segment: hide roadNumber/kmStart/kmEnd — already in composite title.
    if (layerId === "road-segments" && (key === "roadNumber" || key === "kmStart" || key === "kmEnd")) continue;
    // Camera: hide roadNumber when composite "ROAD — name" title already uses it.
    if (layerId === "cameras" && key === "roadNumber" && typeof props.name === "string" && !props.name.includes(String(props.roadNumber))) continue;
    // Sensors / city-sensors: real-time metrics go in the dashboard, not rows.
    if ((layerId === "sensors" || layerId === "city-sensors")
        && (key === "intensity" || key === "occupancy" || key === "load" || key === "serviceLevel")) continue;
    // Description is used as the composite title for sensors/incidents — don't repeat it.
    if ((layerId === "sensors" || layerId === "city-sensors" || layerId === "incidents") && key === "description") continue;

    const formatted = formatValue(key, value);
    if (formatted === null) continue;
    rows.push(
      `<div style="display:flex;justify-content:space-between;gap:6px;font-size:10px;line-height:1.3;">
        <span style="color:#6b7280;flex:0 0 auto;">${escapeHtml(labelFor(key))}</span>
        <span style="color:inherit;font-weight:500;text-align:right;word-break:break-all;">${formatted}</span>
      </div>`,
    );
    if (rows.length >= 4) break; // keep popup tight — max 4 rows
  }

  const link = detailUrl(layerId, props);
  const linkHtml = link
    ? `<a href="${link}" style="display:block;margin-top:6px;padding:5px 8px;text-align:center;font-size:10px;font-weight:600;background:#1b4bd5;color:#fff;border-radius:4px;text-decoration:none;letter-spacing:0.02em;">Ver detalle →</a>`
    : "";

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.35;word-wrap:break-word;">
      <div style="font-weight:600;color:inherit;font-size:12px;margin-bottom:2px;padding-right:14px;">${escapeHtml(title)}${sevChip}</div>
      <div style="color:#9ca3af;font-size:9px;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(layerLabel)}</div>
      ${extraTop.join("")}
      ${rows.length > 0 ? `<div style="display:flex;flex-direction:column;gap:1px;">${rows.join("")}</div>` : ""}
      ${linkHtml}
    </div>
  `;
}
