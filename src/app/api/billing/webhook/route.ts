import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent, getStripe } from "@/lib/stripe";
import prisma from "@/lib/db";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook — Stripe webhook
 *
 * Events: checkout.session.completed, subscription.updated/deleted, invoice.payment_failed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const event = constructWebhookEvent(body, signature);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const email = session.customer_email;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        if (!email || !customerId) break;

        const tier = await getTierFromSubscription(subscriptionId);
        const key = `tl_${tier.toLowerCase()}_${randomBytes(24).toString("hex")}`;

        await prisma.apiKey.create({
          data: {
            key,
            name: `${tier} key for ${email}`,
            email,
            tier,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId || null,
            rateLimitPerMinute: tier === "ENTERPRISE" ? 300 : 60,
            rateLimitPerDay: tier === "ENTERPRISE" ? 500_000 : 50_000,
          },
        });
        console.log(`[webhook] Created ${tier} key for ${email}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (!customerId) break;

        const newTier = await getTierFromSubscription(sub.id);
        await prisma.apiKey.updateMany({
          where: { stripeCustomerId: customerId, isActive: true },
          data: {
            tier: newTier,
            rateLimitPerMinute: newTier === "ENTERPRISE" ? 300 : 60,
            rateLimitPerDay: newTier === "ENTERPRISE" ? 500_000 : 50_000,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (!customerId) break;

        await prisma.apiKey.updateMany({
          where: { stripeCustomerId: customerId, isActive: true },
          data: { tier: "FREE", rateLimitPerMinute: 10, rateLimitPerDay: 1000, stripeSubscriptionId: null },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) console.warn(`[webhook] Payment failed: ${customerId}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook] Error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}

async function getTierFromSubscription(subId: string | null | undefined): Promise<"PRO" | "ENTERPRISE"> {
  if (!subId) return "PRO";
  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subId);
    const priceId = sub.items.data[0]?.price?.id;
    return priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID ? "ENTERPRISE" : "PRO";
  } catch {
    return "PRO";
  }
}
