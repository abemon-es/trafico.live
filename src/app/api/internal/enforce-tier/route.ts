/**
 * /api/internal/enforce-tier — Node.js rate-limit backend for tier enforcement.
 *
 * Called exclusively by src/lib/tier-enforcement.ts (via fetch from edge middleware).
 * Secured by x-internal header check; must never be exposed to public callers.
 *
 * Accepts: POST { identifier: string, tier: ApiTierName, pathname: string }
 * Returns: TierRateLimitResult JSON
 */

import { NextRequest, NextResponse } from "next/server";
import { checkTierRateLimit } from "@/lib/tier-rate-limit";
import { safeCompare } from "@/lib/auth";
import type { ApiTierName } from "@/lib/api-tiers";

export const runtime = "nodejs";

const VALID_TIERS = new Set<ApiTierName>(["FREE", "PRO", "ENTERPRISE"]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  // SECURITY: the previous gate was a literal `x-internal: 1` header check
  // — a value any external caller could trivially set. Now requires the
  // `INTERNAL_API_SECRET` env var (shared between Edge middleware and this
  // Node route handler). Reject if env is unset (no implicit allow).
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) {
    console.error("[internal/enforce-tier] INTERNAL_API_SECRET not set");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const provided = request.headers.get("x-internal-secret");
  if (!provided || !safeCompare(provided, expected)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { identifier?: string; tier?: string; pathname?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { identifier, tier } = body;

  if (!identifier || typeof identifier !== "string") {
    return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
  }
  if (!tier || !VALID_TIERS.has(tier as ApiTierName)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const [minute, day] = await Promise.all([
    checkTierRateLimit({ tier: tier as ApiTierName, identifier, bucket: "minute" }),
    checkTierRateLimit({ tier: tier as ApiTierName, identifier, bucket: "day" }),
  ]);
  return NextResponse.json({ minute, day });
}
