/**
 * Intent classifier — deterministic regex-based, not ML.
 *
 * Why not ML: the 13 intent buckets are mutually-informative and the regex
 * patterns were validated on 70,632 real queries (see INTENT-VALIDATION.md).
 * A weighted regex classifier beats a small-sample model here and is fully
 * inspectable — which matters for the E-E-A-T story ("how does the site
 * understand my query?" → publish the rules).
 *
 * If a query matches multiple buckets, priority follows validated volume.
 */

import type { ClassifiedIntent, IntentBucket, Mode } from "./types";

type Pattern = {
  bucket: IntentBucket;
  /** Higher = more confident/specific */
  weight: number;
  re: RegExp;
};

/* ────────────────────────── Intent patterns ────────────────────────── */

const INTENT_PATTERNS: Pattern[] = [
  // arrival_departure — highly specific, beat live_tracking when both match
  { bucket: "arrival_departure", weight: 10, re: /\b(llegad[ao]s?|salida[s]?|chegadas?|partidas?|arrivals?|departures?)\b/i },

  // delay/cancel — subset of live_tracking, but distinct landing needs
  { bucket: "incident_now", weight: 9, re: /\b(accidente|incident|cancelad[oa]|cancelamento|corte|cortad[oa]|avería|averia|obras?)\b/i },
  { bucket: "incident_now", weight: 9, re: /\b(retras[oas]s?|demora|atras[oa]s?)\b/i },

  // event_mobility — validated 450K vol (manifestación + huelga)
  { bucket: "event_mobility", weight: 10, re: /\b(manifestaci[oó]n|manifestaç[aã]o|huelga|greve|corte de tráfico|partido|concierto|feria)\b/i },

  // compliance_legal
  { bucket: "compliance_legal", weight: 10, re: /\b(baliza|v[-\s]?16|etiqueta ambiental|zbe|zona bajas emis|carnet|multa|puntos|reclamaci[oó]n|reclamar retraso)\b/i },

  // route_planner
  { bucket: "route_planner", weight: 9, re: /\b(c[oó]mo llegar|como llegar|c[oó]mo ir|como ir|ir (en|a|desde)|ruta (de|a)|opciones.*viaje|desde.*hasta|como chegar)\b/i },

  // price_intelligence — "mañana" / "mejor precio" signals
  { bucket: "price_intelligence", weight: 8, re: /\b(mañana|ma[nñ]ana|pr[oó]xima semana|pr[oó]xim[oa]s? dí?as?|mejor (precio|d[ií]a|hora)|m[aá]s barat[oa]|cu[aá]ndo.*barat[oa]|baja|baj[aá]ra|sub[ei][rn]?[aá])\b/i },

  // how_much — "cuánto cuesta"
  { bucket: "how_much", weight: 7, re: /\b(cu[aá]nto cuesta|quanto custa|precio de|preç[ôo] (do|da|de))\b/i },

  // booking_intent
  { bucket: "booking_intent", weight: 7, re: /\b(reservar|reserva|billete|ticket|booking|reserv[aá]r)\b/i },

  // stats_historical
  { bucket: "stats_historical", weight: 7, re: /\b(puntualidad|estad[ií]stica|estat[ií]stica|hist[oó]rico|promedio|media|r[eé]cord|ranking)\b/i },

  // comparison
  { bucket: "comparison", weight: 7, re: /\b(\s+vs\s+|versus|comparad[oa]|mejor [AE-Z]+ o [AE-Z]+|o es mejor|vs\.)\b/i },

  // nearest_local
  { bucket: "nearest_local", weight: 6, re: /\b(cerca( de m[ií])?|m[aá]s cercan[oa]|pr[oó]xim[ao]|mais pr[oó]xim[ao])\b/i },

  // schedule_timetable
  { bucket: "schedule_timetable", weight: 6, re: /\b(horario|horari|timetable|hora de (salida|llegada|partida|chegada))\b/i },

  // live_tracking — most generic, matches broadly
  { bucket: "live_tracking", weight: 5, re: /\b(tiempo real|en directo|en vivo|d[oó]nde est[aá]|donde esta|ahora|hoy|live|en tiempo|agora|em direto)\b/i },
];

/* ──────────────────────────── Mode patterns ──────────────────────────── */

const MODE_PATTERNS: Array<{ mode: Mode; re: RegExp }> = [
  { mode: "rail", re: /\b(tren|ave|alvia|renfe|cercan|rodalies|ouigo|iryo|intercity|euromed|avlo|comboio|cp\.pt|fertagus|adif)\b/i },
  { mode: "air", re: /\b(vuelo|vuelos|avión|avion|aeropuerto|iberia|ryanair|vueling|aena|aviaç[aã]o|aeroporto|flight|radar aviones)\b/i },
  { mode: "maritime", re: /\b(ferry|buque|barco|mmsi|ais|puerto|porto (de|do) (\w+)|sasemar|balearia|baleària|trasmed|gnv|fred olsen)\b/i },
  { mode: "fuel", re: /\b(gasolin|diesel|combustib|combust[íi]ve|gas[oó]leo|repsol|cepsa|galp|waylet|solred|ev charger|electrolinera|cargador.*coche)\b/i },
  { mode: "ev", re: /\b(coche el[eé]ctrico|ev charger|electrolinera|cargador.*coche|wallbox|iberdrola ev)\b/i },
  { mode: "transit", re: /\b(metro|autob[uú]s|bus urbano|tranv[ií]a|carris|emt|tmb|crtm|metrolisboa|metrodoporto)\b/i },
  { mode: "air_quality", re: /\b(calidad (del )?aire|qualidade (do )?ar|ica|pm2\.5|pm10|no2|ozono|cont[ae]minaci[oó]n)\b/i },
  { mode: "weather", re: /\b(tiempo en|el tiempo|meteo|meteorolog[ií]a|aemet|ipma|lluvia|nieve|viento|tormenta|dana|temperatura)\b/i },
  { mode: "road", re: /\b(atasco|retenci[oó]n|carretera|autopista|autov[ií]a|dgt|ap-\d|a-\d+|n-\d+|trânsito|estrada)\b/i },
];

/* ─────────────────── Entity detection (light heuristics) ─────────────── */

const TOP_CITIES_ES =
  "madrid|barcelona|valencia|sevilla|zaragoza|m[aá]laga|bilbao|murcia|palma|las palmas|c[oó]rdoba|valladolid|vigo|gij[oó]n|granada|a coru[nñ]a|alicante|badalona|oviedo|tarragona|pamplona|logro[nñ]o|toledo|huelva";
const TOP_CITIES_PT = "lisboa|porto|braga|coimbra|faro|leiria|aveiro|setubal|funchal|s[aã]o miguel|guimar[aã]es";
const IATA = /\b([A-Z]{3})\b/;
const ROAD_ID = /\b([AMNR]P?-\d{1,4})\b/i;

function detectEntities(q: string): string[] {
  const out = new Set<string>();
  const qn = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const cityRe = new RegExp(`\\b(${TOP_CITIES_ES}|${TOP_CITIES_PT})\\b`, "gi");
  for (const m of qn.matchAll(cityRe)) out.add(m[1].toLowerCase());

  for (const m of q.matchAll(new RegExp(IATA, "g"))) {
    // Filter obvious false-positives (e.g. "AVE" isn't IATA)
    if (!["AVE", "DGT", "ZBE", "IMD", "IVA", "NIF", "UBE", "EMT"].includes(m[1])) {
      out.add(m[1]);
    }
  }

  const road = q.match(ROAD_ID);
  if (road) out.add(road[1].toUpperCase());

  return [...out];
}

/* ────────────────────────── Template routing ────────────────────────── */

function suggestTemplate(bucket: IntentBucket, mode?: Mode, entities: string[] = []): string | undefined {
  const hasCity = entities.some((e) => e.length > 2 && !/^[A-Z]{3}$/.test(e) && !/-/.test(e));
  const iata = entities.find((e) => /^[A-Z]{3}$/.test(e));
  const road = entities.find((e) => /-/.test(e));

  if (mode === "air" && bucket === "arrival_departure") {
    return iata ? `/aviacion/aeropuertos/${iata}/llegadas` : "/aviacion/aeropuertos";
  }
  if (mode === "rail" && bucket === "arrival_departure") {
    return hasCity ? "/trenes/estacion/[slug]/llegadas" : "/trenes/estaciones";
  }
  if (mode === "rail" && bucket === "incident_now") return "/trenes/incidencias";
  if (mode === "rail" && bucket === "stats_historical") return "/trenes/puntualidad";
  if (mode === "rail" && bucket === "compliance_legal") return "/trenes/reclamaciones";

  if (mode === "fuel" && bucket === "price_intelligence") return "/precio-gasolina-hoy";
  if (mode === "fuel" && bucket === "nearest_local") return "/gasolineras/cerca";
  if (mode === "fuel" && bucket === "how_much") return "/gasolineras/[ciudad]";

  if (bucket === "route_planner") return "/ruta/[origen]-[destino]";
  if (bucket === "event_mobility") return "/evento/[slug]";
  if (bucket === "compliance_legal") return "/guia/[tema]";

  if (mode === "road" && bucket === "live_tracking") return "/atascos/[ciudad]";
  if (mode === "road" && bucket === "incident_now") return "/incidencias";

  if (mode === "maritime" && bucket === "live_tracking") return "/maritimo/mapa";
  if (mode === "maritime" && bucket === "schedule_timetable") return "/maritimo/ferries";

  if (mode === "air_quality") return hasCity ? "/calidad-aire/[ciudad]" : "/calidad-aire";
  if (mode === "weather") return hasCity ? "/meteo/[ciudad]" : "/meteo";

  return undefined;
}

/* ──────────────────────────── Public API ─────────────────────────────── */

export function classifyIntent(query: string): ClassifiedIntent {
  const q = query.trim();
  if (!q) {
    return { bucket: "unknown", entities: [], confidence: 0 };
  }

  // Score every intent bucket that matches
  const scores = new Map<IntentBucket, number>();
  for (const p of INTENT_PATTERNS) {
    if (p.re.test(q)) {
      scores.set(p.bucket, (scores.get(p.bucket) ?? 0) + p.weight);
    }
  }

  // Detect mode (single best match)
  let mode: Mode | undefined;
  for (const mp of MODE_PATTERNS) {
    if (mp.re.test(q)) {
      mode = mp.mode;
      break;
    }
  }

  const entities = detectEntities(q);

  // Pick primary bucket
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [primary, primaryScore] = sorted[0] ?? ["unknown" as IntentBucket, 0];
  const secondary = sorted[1]?.[0];

  const confidence = Math.min(1, primaryScore / 12);
  const template = suggestTemplate(primary, mode, entities);

  return {
    bucket: primary,
    secondary: secondary && secondary !== primary ? secondary : undefined,
    mode,
    entities,
    confidence,
    template,
  };
}
