import Stripe from "stripe";
import type { ApiTierName } from "@/lib/api-tiers";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  _stripe = new Stripe(key);
  return _stripe;
}

export interface CheckoutMetadata {
  /** Tier name — embedded so the webhook can resolve revenue + tier without a Stripe API call. */
  tier?: "PRO" | "ENTERPRISE";
  /** GA4 client_id captured from the browser `_ga` cookie. Used by the webhook
   *  to fire a server-side `purchase` event attributable to the originating session. */
  gaClientId?: string;
}

export async function createCheckoutSession(
  email: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  extra: CheckoutMetadata = {},
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      source: "trafico-live-api",
      ...(extra.tier && { tier: extra.tier }),
      ...(extra.gaClientId && { ga_client_id: extra.gaClientId }),
    },
  });
  if (!session.url) throw new Error(`Stripe checkout session ${session.id} has no URL`);
  return { url: session.url, sessionId: session.id };
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

export function constructWebhookEvent(
  body: string | Buffer,
  signature: string,
): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
  return stripe.webhooks.constructEvent(body, signature, secret);
}

/**
 * Create or retrieve a Stripe customer by email.
 * Uses `list` to check for an existing customer first to avoid duplicates.
 *
 * @param email - Customer email address
 * @param name  - Customer full name (used on creation only)
 * @returns     The Stripe Customer object
 */
export async function constructCustomer(email: string, name: string): Promise<Stripe.Customer> {
  const stripe = getStripe();
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) {
    const customer = existing.data[0];
    // Update name if it's missing
    if (!customer.name && name) {
      return stripe.customers.update(customer.id, { name }) as Promise<Stripe.Customer>;
    }
    return customer;
  }
  return stripe.customers.create({ email, name }) as Promise<Stripe.Customer>;
}

/**
 * Create a refund for a specific charge.
 *
 * @param chargeId - Stripe charge ID (ch_...)
 * @param reason   - Optional refund reason: "duplicate" | "fraudulent" | "requested_by_customer"
 * @returns        The Stripe Refund object
 */
export async function createRefund(
  chargeId: string,
  reason?: "duplicate" | "fraudulent" | "requested_by_customer",
): Promise<Stripe.Refund> {
  const stripe = getStripe();
  return stripe.refunds.create({
    charge: chargeId,
    ...(reason ? { reason } : {}),
  });
}

/**
 * Look up the active subscription for a customer by email.
 * Returns null if no active subscription is found.
 *
 * @param email - Customer email address
 * @returns     The active Stripe Subscription, or null
 */
export async function lookupSubscriptionByCustomerEmail(
  email: string,
): Promise<Stripe.Subscription | null> {
  const stripe = getStripe();
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length === 0) return null;

  const customerId = customers.data[0].id;
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });
  return subscriptions.data[0] ?? null;
}

/**
 * Map a Stripe Subscription's price ID back to an API tier name.
 * Defaults to "FREE" for unknown or missing price IDs.
 *
 * @param subscription - A Stripe Subscription object
 * @returns            The corresponding ApiTierName
 */
export function getSubscriptionTier(subscription: Stripe.Subscription): ApiTierName {
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    console.warn(`[stripe] getSubscriptionTier: subscription ${subscription.id} has no price item`);
    return "FREE";
  }
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return "ENTERPRISE";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "PRO";
  console.warn(`[stripe] getSubscriptionTier: unknown priceId ${priceId} on subscription ${subscription.id}`);
  return "FREE";
}
