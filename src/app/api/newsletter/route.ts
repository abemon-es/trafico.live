import { NextResponse } from "next/server";

/**
 * POST /api/newsletter — closed.
 *
 * Its confirmation went through Resend, which has no key, so every
 * sign-up stayed «pending» with no email sent.
 * The site's one email list is the weekly digest (/api/digest/subscribe,
 * double opt-in by email). This route answers 503 and stores nothing, so a
 * cached page with the old form collects no addresses.
 */
export async function POST() {
  return NextResponse.json(
    { error: "La suscripción no está disponible ahora mismo. Inténtalo más tarde." },
    { status: 503 }
  );
}
