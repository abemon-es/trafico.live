import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateRequest } from "./lib/auth";

const OLD_DOMAIN = "trafico.abemon.es";
const NEW_DOMAIN = "trafico.logisticsexpress.es";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Redirect from old domain to new domain
  if (hostname === OLD_DOMAIN || hostname === `www.${OLD_DOMAIN}`) {
    const url = request.nextUrl.clone();
    url.host = NEW_DOMAIN;
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
