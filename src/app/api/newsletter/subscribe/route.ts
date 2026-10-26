import { NextResponse } from "next/server";

/**
 * POST /api/newsletter/subscribe — closed.
 *
 * It stored the address as subscribed with no opt-in, and nothing ever
 * read that list.
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
