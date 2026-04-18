import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Stub affiliate stats — real data lands when AffiliateClick model is active in S4.
 */
const PARTNERS = [
  { id: "skyscanner", name: "Skyscanner", category: "vuelos" },
  { id: "trainline", name: "Trainline", category: "trenes" },
  { id: "directferries", name: "DirectFerries", category: "ferris" },
  { id: "flixbus", name: "FlixBus", category: "autobús" },
  { id: "awin", name: "Awin Network", category: "red" },
  { id: "rakuten", name: "Rakuten Advertising", category: "red" },
];

function stubPartner(partner: (typeof PARTNERS)[number]) {
  return {
    ...partner,
    clicks7d: 0,
    clicks30d: 0,
    clicks90d: 0,
    conversions: 0,
    epc: 0,
    revenueEur: 0,
    status: "pendiente" as const,
  };
}

function stubChartData(days: number) {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(now - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10),
    clicks: 0,
    conversions: 0,
  }));
}

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

export async function GET(request: NextRequest) {
  const blocked = authenticateRequest(request);
  if (blocked) return blocked;

  // Admin check: for now via ADMIN_EMAILS env var.
  // TODO(T3.6): switch to session.user.role === 'ADMIN' once role field lands in User model.
  const adminEmail = request.headers.get("x-admin-email");
  if (!isAdminEmail(adminEmail)) {
    return NextResponse.json({ error: "Acceso restringido" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const period = parseInt(searchParams.get("period") ?? "30", 10);
  const safePeriod = [7, 30, 90].includes(period) ? period : 30;

  return NextResponse.json({
    _stub: true,
    _notice:
      "Dashboard interno. Los datos mostrados llegarán cuando AffiliateClick esté activo en S4.",
    summary: {
      totalClicks: 0,
      totalConversions: 0,
      totalRevenueEur: 0,
      averageEpc: 0,
    },
    partners: PARTNERS.map(stubPartner),
    chart: stubChartData(safePeriod),
    period: safePeriod,
  });
}
