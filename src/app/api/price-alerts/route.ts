import { NextResponse } from "next/server";

/**
 * POST /api/price-alerts — closed.
 *
 * Price alerts were stored, but nothing ever checks them or sends the
 * email they promise. /api/price-alerts/unsubscribe still works for the rows
 * already stored.
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
