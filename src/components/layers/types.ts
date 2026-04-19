/**
 * Layer types — contract for the 5-layer data architecture.
 *
 * Spec: docs/seo-research-2026-04-19/EMERGENT-VERTICALS.md
 *
 *   0. Entity      (what it is)           — Prisma model
 *   1. State       (what happens now)     — real-time collector
 *   2. Prediction  (what will happen)     — ML on historical data
 *   3. Impact      (how it affects me)    — cross-vertical query
 *   4. Decision    (what should I do)     — rules applied to 1-3
 *
 * Every page template Sprint 2+ should accept these slot props (optional).
 * Slots render null when data is unavailable — never break the page.
 */

export type ConfidenceLevel = "low" | "medium" | "high";

/** Common metadata every layered response carries for schema.org + E-E-A-T. */
export interface LayerProvenance {
  /** ISO datetime the underlying data was captured */
  computedAt: string;
  /** Human-readable sources list (e.g. ["AEMET", "DGT"]) */
  sources: string[];
  /** Version of the model/rule set used (for retraining audit) */
  version?: string;
  /** Confidence tier (renders different visual treatment) */
  confidence?: ConfidenceLevel;
  /** Self-reported SLA — how fresh is "fresh" for this datapoint */
  slaMinutes?: number;
}

// ── Layer 2 — Prediction ─────────────────────────────────────────────────────

export type PredictionKind =
  | "traffic_congestion"
  | "fuel_price"
  | "train_delay"
  | "flight_delay"
  | "accident_risk"
  | "ferry_cancellation_risk";

export interface PredictionPayload<V = unknown> extends LayerProvenance {
  kind: PredictionKind;
  /** The predicted value (shape depends on kind) */
  value: V;
  /** Horizon in minutes from computedAt */
  horizonMinutes: number;
  /** Plain-language reasoning the user sees + Google cites */
  reasoning: string;
  /** Historical signal count — "based on N similar days" */
  basedOnSamples?: number;
}

export type TrafficPrediction = PredictionPayload<{
  level: "free_flow" | "moderate" | "congested" | "jammed";
  expectedDelayMinutes: number;
  probability: number;
}>;

export type FuelPricePrediction = PredictionPayload<{
  direction: "up" | "stable" | "down";
  deltaEurPerLitre: number;
}>;

export type TrainDelayPrediction = PredictionPayload<{
  expectedDelayMinutes: number;
  probabilityOfCancellation: number;
}>;

// ── Layer 3 — Impact (cross-vertical) ────────────────────────────────────────

export type ImpactSeverity = "none" | "advisory" | "warning" | "critical";

export interface ImpactFactor {
  /** What external condition causes the impact (e.g. "viento >80km/h") */
  cause: string;
  /** Source entity (e.g. "AEMET alert Málaga naranja") */
  source: string;
  /** Severity for THIS entity's operation */
  severity: ImpactSeverity;
  /** One-liner user sees */
  description: string;
}

export interface ImpactAssessment extends LayerProvenance {
  /** Overall severity (max across factors) */
  overall: ImpactSeverity;
  /** Individual contributing factors */
  factors: ImpactFactor[];
  /** Operational advisory (e.g. "Llame a Balearia antes de salir de casa") */
  advisory?: string;
}

// ── Layer 4 — Decision ───────────────────────────────────────────────────────

export type DecisionVerdict = "go" | "caution" | "avoid";

export interface DecisionPayload extends LayerProvenance {
  /** Traffic-light verdict */
  verdict: DecisionVerdict;
  /** Headline answer to the user's question */
  headline: string;
  /** Supporting bullets (2-4 items), each a concrete fact */
  rationale: string[];
  /** Alternative suggestion when verdict !== "go" */
  alternative?: string;
  /** Subject profile if decision depends on it (e.g. "asthmatic") */
  profile?: string;
}

// ── Generic slot state ───────────────────────────────────────────────────────

export type SlotState<T> =
  | { status: "loading" }
  | { status: "unavailable"; reason?: string }
  | { status: "ready"; data: T };
