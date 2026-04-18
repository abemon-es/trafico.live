/**
 * Affiliate offer lookup, subId generation, deep-link building, and click recording.
 *
 * T4.8 — Affiliate redirect infrastructure (/go/[partner]/[slug])
 *
 * Partners and their subId query-param conventions:
 *   Awin           → clickref=
 *   Rakuten        → u1=
 *   Skyscanner     → adref=   (Impact)
 *   Trainline      → subid=
 *   DirectFerries  → subid=
 *   FlixBus        → sub1=
 */

import { randomBytes } from "crypto";
import prisma from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AffiliatePartner =
  | "skyscanner"
  | "trainline"
  | "directferries"
  | "flixbus"
  | "awin"
  | "rakuten";

export interface ResolvedOffer {
  deepLink: string;
  product?: string;
  priceEur?: number;
  offerId?: string;
}

export interface BuildPartnerUrlOptions {
  deepLink: string;
  subId: string;
  partner: AffiliatePartner | string;
}

export interface RecordClickOptions {
  offerId?: string;
  subId: string;
  userId?: string;
  sessionId?: string;
  referrerPath?: string;
  partner: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Pilot static fallback offers (used when AffiliateOffer table is not yet migrated)
// Keyed as `{partner}/{slug}`.
// ---------------------------------------------------------------------------

const STATIC_OFFERS: Record<string, Omit<ResolvedOffer, "offerId">> = {
  // Skyscanner
  "skyscanner/vuelos-espana": {
    deepLink: "https://www.skyscanner.net/transport/flights/mad/?utm_source=traficolive&utm_medium=affiliate&utm_campaign=es-domestic",
    product: "Vuelos nacionales España",
    priceEur: undefined,
  },
  "skyscanner/vuelos-baratos": {
    deepLink: "https://www.skyscanner.net/flights-to/es/vuelos-baratos-a-espana.html?utm_source=traficolive&utm_medium=affiliate",
    product: "Vuelos baratos a España",
    priceEur: undefined,
  },
  // Trainline
  "trainline/ave-madrid-barcelona": {
    deepLink: "https://www.thetrainline.com/es/trains/spain/madrid-to-barcelona?utm_source=traficolive&utm_medium=affiliate",
    product: "AVE Madrid-Barcelona",
    priceEur: 49,
  },
  "trainline/trenes-espana": {
    deepLink: "https://www.thetrainline.com/es/trains/spain?utm_source=traficolive&utm_medium=affiliate",
    product: "Trenes en España",
    priceEur: undefined,
  },
  // DirectFerries
  "directferries/baleares": {
    deepLink: "https://www.directferries.es/ferry_espana_baleares.htm?aff=traficolive",
    product: "Ferries Península-Baleares",
    priceEur: 79,
  },
  "directferries/canarias": {
    deepLink: "https://www.directferries.es/ferry_espana_canarias.htm?aff=traficolive",
    product: "Ferries Península-Canarias",
    priceEur: 199,
  },
  // FlixBus
  "flixbus/madrid-barcelona": {
    deepLink: "https://www.flixbus.es/autobuses/espana/madrid-to-barcelona?utm_source=traficolive&utm_medium=partner",
    product: "FlixBus Madrid-Barcelona",
    priceEur: 9,
  },
  "flixbus/bus-espana": {
    deepLink: "https://www.flixbus.es/autobuses/espana?utm_source=traficolive&utm_medium=partner",
    product: "Autobuses en España",
    priceEur: undefined,
  },
  // Awin
  "awin/combustible": {
    deepLink: "https://www.repsol.es/gasolineras/?utm_source=awin&utm_medium=affiliate&awc=traficolive",
    product: "Gasolineras Repsol",
    priceEur: undefined,
  },
  "awin/seguros-auto": {
    deepLink: "https://www.rastreator.com/seguros-de-coche.aspx?utm_source=awin&awc=traficolive",
    product: "Comparador seguros coche",
    priceEur: undefined,
  },
  // Rakuten / Booking.com via Rakuten
  "rakuten/hoteles-espana": {
    deepLink: "https://www.booking.com/searchresults.es.html?cc1=es&utm_source=rakutenadvertising&utm_medium=affiliate&utm_campaign=traficolive",
    product: "Hoteles en España",
    priceEur: undefined,
  },
  "rakuten/coches-alquiler": {
    deepLink: "https://www.rentalcars.com/es/?utm_source=rakutenadvertising&utm_medium=affiliate&utm_campaign=traficolive",
    product: "Coches de alquiler",
    priceEur: undefined,
  },
};

// Per-partner top (default) offer slug — used by the partner-root handler
export const PARTNER_DEFAULT_SLUG: Record<string, string> = {
  skyscanner: "vuelos-espana",
  trainline: "trenes-espana",
  directferries: "baleares",
  flixbus: "bus-espana",
  awin: "combustible",
  rakuten: "hoteles-espana",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a 16-char (8-byte) random hex subId.
 * Uses Node's `crypto.randomBytes` on the server.
 */
export function generateSubId(): string {
  return randomBytes(8).toString("hex");
}

/**
 * Resolve an affiliate offer by partner + slug.
 *
 * Priority:
 *   1. AffiliateOffer table (if table exists and has a matching row)
 *   2. STATIC_OFFERS pilot fallback
 */
export async function resolveOffer(
  partner: string,
  slug: string
): Promise<ResolvedOffer | null> {
  const key = `${partner}/${slug}`;

  // 1. Try Prisma AffiliateOffer table
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (prisma as any).affiliateOffer;
    if (model) {
      const row = await model.findFirst({
        where: {
          provider: partner,
          affiliateTag: slug,
        },
        orderBy: { fetchedAt: "desc" },
      });
      if (row) {
        return {
          offerId: row.id,
          deepLink: row.deeplinkUrl,
          product: `${row.offerType} ${row.originCode}→${row.destCode}`,
          priceEur: row.priceCents ? row.priceCents / 100 : undefined,
        };
      }
    }
  } catch {
    // Table not yet migrated or query failed — fall through to static
    console.warn(`[affiliate] AffiliateOffer lookup failed for ${key}, using static fallback`);
  }

  // 2. Static pilot fallback
  const staticOffer = STATIC_OFFERS[key] ?? null;
  if (!staticOffer) return null;
  return { ...staticOffer };
}

/**
 * Build the partner deep-link URL with the subId appended using the
 * partner-specific query parameter convention.
 *
 * Conventions:
 *   awin          → clickref=
 *   rakuten       → u1=
 *   skyscanner    → adref=   (Impact network)
 *   trainline     → subid=
 *   directferries → subid=
 *   flixbus       → sub1=
 *   (default)     → subid=
 */
export function buildPartnerUrl({ deepLink, subId, partner }: BuildPartnerUrlOptions): string {
  const paramMap: Record<string, string> = {
    awin: "clickref",
    rakuten: "u1",
    skyscanner: "adref",
    trainline: "subid",
    directferries: "subid",
    flixbus: "sub1",
  };

  const param = paramMap[partner.toLowerCase()] ?? "subid";

  try {
    const url = new URL(deepLink);
    url.searchParams.set(param, subId);
    return url.toString();
  } catch {
    // Fallback: append raw query string if URL is malformed
    const separator = deepLink.includes("?") ? "&" : "?";
    return `${deepLink}${separator}${param}=${encodeURIComponent(subId)}`;
  }
}

/**
 * Record an affiliate click in the AffiliateClick table.
 *
 * Fire-and-forget safe: caller should catch() or use .catch(warn).
 * Degrades gracefully if the table is not yet migrated.
 */
export async function recordClick({
  offerId,
  subId,
  userId,
  sessionId,
  referrerPath,
  partner,
  slug,
}: RecordClickOptions): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (prisma as any).affiliateClick;
    if (!model) {
      console.warn("[affiliate] AffiliateClick table not available — skipping click record");
      return;
    }

    await model.create({
      data: {
        offerId: offerId ?? null,
        provider: partner,
        offerType: slug,
        route: `${partner}/${slug}`,
        subId,
        ...(userId && { userId }),
        ...(sessionId && { sessionId }),
        ...(referrerPath && { referrerPath }),
        converted: false,
      },
    });
  } catch (err) {
    // Never throw — click recording is non-critical
    console.warn("[affiliate] Failed to record click:", err instanceof Error ? err.message : err);
  }
}
