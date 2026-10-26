import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

/** Deactivates the subscription behind a token; false when no row has it. */
async function unsubscribe(token: string): Promise<boolean> {
  const subscriber = await prisma.digestSubscriber.findUnique({
    where: { unsubscribeToken: token },
  });
  if (!subscriber) return false;

  await prisma.digestSubscriber.update({
    where: { id: subscriber.id },
    data: { isActive: false },
  });
  return true;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.redirect(`${BASE_URL}?error=token-missing`);
    }

    if (!(await unsubscribe(token))) {
      return NextResponse.redirect(`${BASE_URL}?error=invalid-token`);
    }

    return NextResponse.redirect(`${BASE_URL}/informes?unsubscribed=true`);
  } catch (error) {
    reportApiError(error, "Error unsubscribing");
    return NextResponse.redirect(`${BASE_URL}?error=server-error`);
  }
}

// One-click unsubscribe (RFC 8058): the mail client POSTs
// «List-Unsubscribe=One-Click» to the List-Unsubscribe URL, token in the query.
export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Falta el token" }, { status: 400 });
    }

    if (!(await unsubscribe(token))) {
      return NextResponse.json({ error: "Token no válido" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    reportApiError(error, "Error unsubscribing (one-click)");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
