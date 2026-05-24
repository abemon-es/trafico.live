import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, createPortalSession } from "@/lib/stripe";
import { API_TIERS, type ApiTierName } from "@/lib/api-tiers";
import { applyRateLimit } from "@/lib/api-utils";
import { sendEvent as sendGa4Event } from "@/lib/ga4-measurement-protocol";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/billing — Create Stripe checkout session
 * Body: { email, tier: "PRO" | "ENTERPRISE", gaClientId?: string }
 *
 * gaClientId — pass the browser GA4 client_id (from the `_ga` cookie,
 * format `GA1.X.<client_id>` — strip prefix and use only the trailing
 * part) so the corresponding `purchase` event fired from the webhook
 * stitches to the same GA4 user/session.
 */
export async function POST(request: NextRequest) {
  const rateLimited = await applyRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const { email, tier, gaClientId } = (await request.json()) as {
      email?: string;
      tier?: string;
      gaClientId?: string;
    };

    if (!email || !EMAIL_RE.test(email) || !tier) {
      return NextResponse.json({ error: "Missing or invalid email/tier" }, { status: 400 });
    }

    const validTier = tier.toUpperCase() as ApiTierName;
    if (validTier !== "PRO" && validTier !== "ENTERPRISE") {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const config = API_TIERS[validTier];
    if (!config.stripePriceId) {
      return NextResponse.json({ error: "Stripe price not configured" }, { status: 503 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
    const { url, sessionId } = await createCheckoutSession(
      email,
      config.stripePriceId,
      `${baseUrl}/api-docs?checkout=success`,
      `${baseUrl}/api-docs?checkout=cancelled`,
      { tier: validTier, gaClientId },
    );

    // Fire begin_checkout server-side. Skipped silently if GA4 MP env not set
    // or no client_id was passed (we don't synthesize one here — without a
    // real browser client_id this would create orphan GA4 sessions).
    if (gaClientId) {
      sendGa4Event({
        clientId: gaClientId,
        event: {
          name: "begin_checkout",
          params: {
            currency: "EUR",
            tier: validTier,
            checkout_session_id: sessionId,
          },
        },
      }).catch(() => {
        // Logged inside sendGa4Event — never block the checkout response.
      });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[billing] Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}

/**
 * GET /api/billing — Subscription status for an API key
 * Header: x-api-key
 */
export async function GET(request: NextRequest) {
  const rateLimited = await applyRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const apiKeyHeader = request.headers.get("x-api-key");
    if (!apiKeyHeader) {
      return NextResponse.json({ error: "Missing x-api-key" }, { status: 401 });
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: { key: apiKeyHeader, isActive: true },
    });
    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await prisma.apiUsage.aggregate({
      where: { keyId: apiKey.id, date: { gte: startOfMonth } },
      _sum: { requestCount: true },
    });

    const config = API_TIERS[(apiKey.tier as ApiTierName) || "FREE"];

    let portalUrl: string | null = null;
    if (apiKey.stripeCustomerId) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
      try {
        portalUrl = await createPortalSession(apiKey.stripeCustomerId, `${baseUrl}/api-docs`);
      } catch (err) {
        console.error("[billing] Portal session failed:", err);
      }
    }

    return NextResponse.json({
      tier: apiKey.tier,
      rateLimits: { perMinute: config.rateLimitPerMinute, perDay: config.rateLimitPerDay },
      features: config.features,
      usage: { monthlyRequests: usage._sum.requestCount || 0 },
      subscription: { portalUrl },
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
    });
  } catch (error) {
    console.error("[billing] Status error:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
