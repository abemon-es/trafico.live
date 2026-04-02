import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { invalidateRedirectCache } from "@/lib/redirects";

/**
 * GET /api/redirects — List all redirects
 * POST /api/redirects — Create a redirect
 * DELETE /api/redirects?source=/old-path — Remove a redirect
 *
 * Protected by API auth (same-origin or x-api-key).
 */

export async function GET() {
  const redirects = await prisma.redirect.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(redirects, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { source, destination, permanent = true, note } = body;

  if (!source || !destination) {
    return NextResponse.json(
      { error: "source and destination are required" },
      { status: 400 }
    );
  }

  // Normalize: ensure source starts with /
  const normalizedSource = source.startsWith("/") ? source : `/${source}`;

  const redirect = await prisma.redirect.upsert({
    where: { source: normalizedSource },
    create: {
      source: normalizedSource,
      destination,
      permanent,
      note,
    },
    update: {
      destination,
      permanent,
      note,
    },
  });

  invalidateRedirectCache();

  return NextResponse.json(redirect, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");

  if (!source) {
    return NextResponse.json(
      { error: "source query param is required" },
      { status: 400 }
    );
  }

  await prisma.redirect.delete({ where: { source } }).catch(() => null);
  invalidateRedirectCache();

  return NextResponse.json({ deleted: source });
}
