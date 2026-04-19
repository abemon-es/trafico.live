/**
 * Intent classification types — used to route search queries and page
 * templates to the right layer (0-4) of the data architecture.
 *
 * Spec: docs/seo-research-2026-04-19/EMERGENT-VERTICALS.md
 *        + docs/seo-research-2026-04-19/design/INTENT-VALIDATION.md
 *
 * Intent buckets come from `intent_analysis.py`, which measured each cluster's
 * volume across the 70,632-keyword universe. Order below is by validated
 * volume desc.
 */

export type IntentBucket =
  /** 10.8M vol · "ahora/hoy/tiempo real/dónde está" — Layer 1 */
  | "live_tracking"
  /** 5.4M vol · "horario/hora de salida/llegada" — Layer 0+1 */
  | "schedule_timetable"
  /** 3.4M vol · "más barato/mejor precio/cuándo barato" — Layer 2 */
  | "price_intelligence"
  /** 2.7M vol · "cerca de mí/más cercano/próximo" — Layer 0+geo */
  | "nearest_local"
  /** 2.2M vol · "cuánto cuesta/precio de" — Layer 0 */
  | "how_much"
  /** 1.5M vol · "accidente/obras/corte hoy" — Layer 1+4 */
  | "incident_now"
  /** 1.2M vol · "llegadas/salidas/chegadas/partidas" — Layer 1 */
  | "arrival_departure"
  /** 862K vol · "baliza/ZBE/etiqueta/multa/carnet" — Layer 0 guide */
  | "compliance_legal"
  /** 483K vol · "cómo llegar/cómo ir/desde-hasta" — Layer 4 (multimodal planner) */
  | "route_planner"
  /** 376K vol · "puntualidad/histórico/media/récord" — Layer 0+2 (data journalism) */
  | "stats_historical"
  /** 374K vol · "X vs Y/mejor A o B/comparativa" — Layer 4 */
  | "comparison"
  /** 815K vol · "reservar/billete/booking" — transactional */
  | "booking_intent"
  /** Event-driven · "manifestación/huelga/partido" — Layer 1 auto-article */
  | "event_mobility"
  /** Fallback */
  | "unknown";

export type Mode =
  | "road"
  | "rail"
  | "air"
  | "maritime"
  | "transit"
  | "fuel"
  | "ev"
  | "air_quality"
  | "weather"
  | "cross";

export interface ClassifiedIntent {
  bucket: IntentBucket;
  /** Secondary bucket when the query straddles (e.g. arrival_departure + weather_impact) */
  secondary?: IntentBucket;
  mode?: Mode;
  /** Detected entity tokens (city, station, airport code, road id, etc.) */
  entities: string[];
  /** Confidence 0-1 */
  confidence: number;
  /** Suggested landing template path, e.g. "/trenes/estacion/[slug]/llegadas" */
  template?: string;
}
