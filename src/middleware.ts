import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateRequest } from "./lib/auth";

const CANONICAL_DOMAIN = "trafico.live";
const LEGACY_DOMAINS = [
  "trafico.logisticsexpress.es",
  "trafico.abemon.es",
];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.replace(/:\d+$/, "") || "";
  const pathname = request.nextUrl.pathname;

  // Redirect legacy domains → trafico.live
  const isLegacy = LEGACY_DOMAINS.some(
    (d) => hostname === d || hostname === `www.${d}`
  );
  if (isLegacy) {
    const url = request.nextUrl.clone();
    url.host = CANONICAL_DOMAIN;
    url.protocol = "https";
    return NextResponse.redirect(url, 301);
  }

  // Redirect www → apex
  if (hostname === `www.${CANONICAL_DOMAIN}`) {
    const url = request.nextUrl.clone();
    url.host = CANONICAL_DOMAIN;
    url.protocol = "https";
    return NextResponse.redirect(url, 301);
  }

  // API authentication (only for /api/* routes)
  if (pathname.startsWith("/api/")) {
    const authResponse = authenticateRequest(request);
    if (authResponse) return authResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths including API routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
