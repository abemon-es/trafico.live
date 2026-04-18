/**
 * Partner root redirect — /ir/[partner]
 *
 * Resolves the default (most popular) offer for the partner and redirects
 * using the same flow as /ir/[partner]/[slug].
 *
 * Falls back to the pilot static default slug defined in PARTNER_DEFAULT_SLUG.
 * If neither is found, returns 404.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateSubId,
  resolveOffer,
  buildPartnerUrl,
  recordClick,
  PARTNER_DEFAULT_SLUG,
} from "@/lib/affiliate";
import { sendEvent } from "@/lib/ga4-measurement-protocol";
import { randomBytes } from "crypto";

const SESSION_COOKIE = "tl_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 365;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partner: string }> }
): Promise<NextResponse> {
  const { partner } = await params;

  // Determine default slug for this partner
  let defaultSlug: string | undefined;

  // 1. Try DB: find most recently fetched active offer for partner
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma = (await import("@/lib/db")).default;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (prisma as any).affiliateOffer;
    if (model) {
      const topOffer = await model.findFirst({
        where: { provider: partner },
        orderBy: { fetchedAt: "desc" },
        select: { affiliateTag: true },
      });
      if (topOffer?.affiliateTag) {
        defaultSlug = topOffer.affiliateTag;
      }
    }
  } catch {
    // table not yet migrated — fall through
  }

  // 2. Static pilot fallback
  if (!defaultSlug) {
    defaultSlug = PARTNER_DEFAULT_SLUG[partner.toLowerCase()];
  }

  if (!defaultSlug) {
    return NextResponse.json(
      { error: "offer_not_found", partner },
      { status: 404 }
    );
  }

  const slug = defaultSlug;
  const offer = await resolveOffer(partner, slug);

  if (!offer) {
    return NextResponse.json(
      { error: "offer_not_found", partner, slug },
      { status: 404 }
    );
  }

  // Generate subId + session
  const subId = generateSubId();
  const existingSession = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = existingSession ?? randomBytes(16).toString("hex");
  const isNewSession = !existingSession;

  const partnerUrl = buildPartnerUrl({ deepLink: offer.deepLink, subId, partner });
  const referrerPath = request.headers.get("referer") ?? undefined;
  const clientId = sessionId;

  // Fire-and-forget tracking
  recordClick({
    offerId: offer.offerId,
    subId,
    sessionId,
    referrerPath,
    partner,
    slug,
  }).catch((err) =>
    console.warn("[ir/partner] recordClick failed:", err instanceof Error ? err.message : err)
  );

  sendEvent({
    clientId,
    sessionId,
    event: {
      name: "affiliate_click",
      params: {
        partner,
        slug,
        ...(offer.product && { product: offer.product }),
        ...(offer.priceEur !== undefined && {
          value: offer.priceEur,
          currency: "EUR",
        }),
        session_id: sessionId,
        sub_id: subId,
      },
    },
  }).catch((err) =>
    console.warn("[ir/partner] ga4 event failed:", err instanceof Error ? err.message : err)
  );

  const response = NextResponse.redirect(partnerUrl, 302);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

  if (isNewSession) {
    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
    });
  }

  return response;
}
