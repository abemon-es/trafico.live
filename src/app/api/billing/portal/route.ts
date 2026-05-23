/**
 * POST /api/billing/portal — TEMPORARILY DISABLED (security)
 *
 * Previous implementation accepted `{ email }` in the request body, looked
 * up the Stripe customer by that email, and returned a live Stripe Customer
 * Portal URL — granting full subscription-management access (cancel plan,
 * update payment method, view invoices) to **anyone** who knew the email.
 * No authentication of the caller was performed at all.
 *
 * This is a critical authorization bypass. The route is stubbed out at
 * the handler level until session-based auth (NextAuth + db sessions —
 * `src/lib/auth-config.ts`) is wired into the billing surface.
 *
 * To re-enable safely, the new handler must:
 *   1. `import { auth } from "@/lib/auth-config"`
 *   2. `const session = await auth()` — reject if no session
 *   3. Look up the Stripe customer by `session.user.email` (or by a stored
 *      `User.stripeCustomerId` once that column exists)
 *   4. Apply explicit per-user rate limiting (3 portal links per hour)
 *
 * The CLI escape hatch for ops is `stripe billing_portal sessions create`
 * — there is no need for a public HTTP endpoint to substitute.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "Not implemented",
      message:
        "El portal de facturación se está reescribiendo con autenticación de sesión. Contacta con soporte para gestionar tu suscripción mientras tanto.",
    },
    { status: 501 }
  );
}
