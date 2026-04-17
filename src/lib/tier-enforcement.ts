/**
 * Tier Enforcement
 *
 * Combines feature gating + rate limiting into a single call for middleware (B1) to consume.
 * Never throws — all errors are caught and converted to a safe allow/deny result.
 */

import { NextResponse } from "next/server";
import type { ApiTierName } from "@/lib/api-tiers";
import { tierHasFeature } from "@/lib/api-tiers";
import { matchRule } from "@/lib/tier-paths";
import { checkTierRateLimit } from "@/lib/tier-rate-limit";

// ── Types ────────────────────────────────────────────────────────────────────

export type DenyReason = "feature_locked" | "rate_limited_minute" | "rate_limited_day";

export interface RateLimitBucketState {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface EnforcementAllow {
  allow: true;
  rateLimit: {
    minute: RateLimitBucketState;
    day: RateLimitBucketState;
  };
}

export interface EnforcementDeny {
  allow: false;
  reason: DenyReason;
  /** Present when reason === 'feature_locked' */
  requiredFeature?: string;
  /** Present when reason === 'rate_limited_*' */
  resetAt?: Date;
}

export type EnforcementResult = EnforcementAllow | EnforcementDeny;

// ── Upgrade URL ───────────────────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://trafico.live";
const UPGRADE_URL = `${BASE_URL}/api-landing?upgrade=1`;

// ── Main enforcement function ─────────────────────────────────────────────────

/**
 * Enforce tier for a single request.
 *
 * Steps:
 *  1. Feature gate  — does this path require a feature the tier doesn't have?
 *  2. Per-minute RL — is the caller within their per-minute window?
 *  3. Per-day RL    — is the caller within their daily quota?
 *
 * On any unexpected error, falls open (allow) and logs a warning.
 *
 * @param pathname    - Request pathname, e.g. "/api/accidentes/microdata"
 * @param tier        - Resolved tier for the caller
 * @param identifier  - SHA-256 hash of the API key (or IP for anonymous calls)
 */
export async function enforceTier({
  pathname,
  tier,
  identifier,
}: {
  pathname: string;
  tier: ApiTierName;
  identifier: string;
}): Promise<EnforcementResult> {
  try {
    // 1. Feature gate
    const requiredFeature = matchRule(pathname);
    if (requiredFeature && !tierHasFeature(tier, requiredFeature)) {
      return { allow: false, reason: "feature_locked", requiredFeature };
    }

    // 2. Per-minute rate limit
    const minuteResult = await checkTierRateLimit({ tier, identifier, bucket: "minute" });
    if (!minuteResult.allowed) {
      return { allow: false, reason: "rate_limited_minute", resetAt: minuteResult.resetAt };
    }

    // 3. Per-day rate limit
    const dayResult = await checkTierRateLimit({ tier, identifier, bucket: "day" });
    if (!dayResult.allowed) {
      return { allow: false, reason: "rate_limited_day", resetAt: dayResult.resetAt };
    }

    return {
      allow: true,
      rateLimit: {
        minute: minuteResult,
        day: dayResult,
      },
    };
  } catch (err) {
    // Fail open — log but never block the request due to an internal error
    console.warn("[tier-enforcement] Unexpected error, failing open:", err);
    return {
      allow: true,
      rateLimit: {
        minute: { allowed: true, remaining: -1, resetAt: new Date(Date.now() + 60_000) },
        day:    { allowed: true, remaining: -1, resetAt: new Date(Date.now() + 86_400_000) },
      },
    };
  }
}

// ── Deny response builder ─────────────────────────────────────────────────────

interface DenyDetails {
  /** Required when reason is 'feature_locked' */
  requiredFeature?: string;
  /** Required when reason is 'rate_limited_*' */
  resetAt?: Date;
}

/**
 * Build a NextResponse for a denied request.
 *
 * - feature_locked  → 402 Payment Required
 * - rate_limited_*  → 429 Too Many Requests
 *
 * Error messages are in Spanish (user-facing).
 */
export function buildDenyResponse(reason: DenyReason, details: DenyDetails): NextResponse {
  switch (reason) {
    case "feature_locked": {
      return NextResponse.json(
        {
          error: "Acceso restringido",
          mensaje:
            "Esta funcionalidad no está disponible en tu plan actual. Actualiza tu suscripción para acceder.",
          funcionalidadRequerida: details.requiredFeature ?? null,
          upgrade: UPGRADE_URL,
        },
        {
          status: 402,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    case "rate_limited_minute": {
      const retryAfterSec = details.resetAt
        ? Math.max(1, Math.ceil((details.resetAt.getTime() - Date.now()) / 1000))
        : 60;
      return NextResponse.json(
        {
          error: "Límite de solicitudes por minuto superado",
          mensaje:
            "Has superado el límite de solicitudes por minuto de tu plan. Por favor, espera antes de reintentar.",
          reintentarEn: retryAfterSec,
          upgrade: UPGRADE_URL,
        },
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSec),
          },
        },
      );
    }

    case "rate_limited_day": {
      const retryAfterSec = details.resetAt
        ? Math.max(1, Math.ceil((details.resetAt.getTime() - Date.now()) / 1000))
        : 86_400;
      return NextResponse.json(
        {
          error: "Límite diario de solicitudes superado",
          mensaje:
            "Has alcanzado el límite diario de solicitudes de tu plan. El contador se reinicia a medianoche (UTC).",
          reintentarEn: retryAfterSec,
          upgrade: UPGRADE_URL,
        },
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSec),
          },
        },
      );
    }
  }
}
