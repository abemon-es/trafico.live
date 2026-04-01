import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export async function GET(request: NextRequest) {
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

    await prisma.digestSubscriber.update({
      where: { id: subscriber.id },
      data: { isActive: false },
    });

    return NextResponse.redirect(`${BASE_URL}/informes?unsubscribed=true`);
  } catch (error) {
    console.error("Error unsubscribing:", error);
    return NextResponse.redirect(`${BASE_URL}?error=server-error`);
  }
}
