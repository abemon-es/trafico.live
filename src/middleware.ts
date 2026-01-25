import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const OLD_DOMAIN = "trafico.abemon.es";
const NEW_DOMAIN = "trafico.logisticsexpress.es";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  // Redirect from old domain to new domain
  if (hostname === OLD_DOMAIN || hostname === `www.${OLD_DOMAIN}`) {
    const url = request.nextUrl.clone();
    url.host = NEW_DOMAIN;
    url.protocol = "https";
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
