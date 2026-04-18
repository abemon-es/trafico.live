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
import type { ApiTierName } from "@/lib/api-tiers";

export const runtime = "nodejs";

const VALID_TIERS = new Set<ApiTierName>(["FREE", "PRO", "ENTERPRISE"]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Validate x-internal header — reject all public callers.
  const internal = request.headers.get("x-internal");
  if (internal !== "1") {
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

  const result = await checkTierRateLimit(identifier, tier as ApiTierName);
  return NextResponse.json(result);
}
