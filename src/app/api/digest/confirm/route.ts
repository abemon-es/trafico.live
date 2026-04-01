import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.redirect(`${BASE_URL}?error=token-missing`);
    }

    const subscriber = await prisma.digestSubscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      return NextResponse.redirect(`${BASE_URL}?error=invalid-token`);
    }

    if (subscriber.confirmedAt) {
      return NextResponse.redirect(`${BASE_URL}/informes?confirmed=already`);
    }

    await prisma.digestSubscriber.update({
      where: { id: subscriber.id },
      data: { confirmedAt: new Date(), isActive: true },
    });

    return NextResponse.redirect(`${BASE_URL}/informes?confirmed=true`);
  } catch (error) {
    console.error("Error confirming subscription:", error);
    return NextResponse.redirect(`${BASE_URL}?error=server-error`);
  }
}
