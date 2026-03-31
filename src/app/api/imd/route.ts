import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/imd — Redirects to /api/trafico/imd
 *
 * This endpoint is deprecated. Use /api/trafico/imd instead.
 * Forwards all query parameters to the canonical endpoint.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const params = searchParams.toString();
  const target = `/api/trafico/imd${params ? `?${params}` : ""}`;
  return NextResponse.redirect(new URL(target, request.url), 301);
}
