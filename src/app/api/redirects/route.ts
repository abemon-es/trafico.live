import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { safeCompare } from "@/lib/auth";
import { invalidateRedirectCache } from "@/lib/redirects";
import { isSameSitePath } from "@/lib/redirect-destination";

/**
 * GET /api/redirects — List all redirects
 * POST /api/redirects — Create or update a redirect
 * DELETE /api/redirects?source=/old-path — Remove a redirect
 *
 * Admin only: every method requires the `x-admin-secret` header to match the
 * ADMIN_SECRET env var (constant-time compare, see `safeCompare`), the same
 * gate as /api/billing/refund and /api/admin/seed-accidents. The /api/* gate
 * in the middleware (same origin or x-api-key) still runs first.
 *
 *   curl -X POST https://trafico.live/api/redirects \
 *     -H "x-api-key: $API_KEY" -H "x-admin-secret: $ADMIN_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"source":"/old-page","destination":"/new-page"}'
 *
 * Source and destination must both be paths of this site
 * (src/lib/redirect-destination.ts); full URLs are refused.
 */

const NOTE_MAX_LENGTH = 500;

function requireAdmin(request: NextRequest): NextResponse | null {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.error("[redirects] ADMIN_SECRET env var is not set");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const headerSecret = request.headers.get("x-admin-secret");
  if (!headerSecret || !safeCompare(headerSecret, adminSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const redirects = await prisma.redirect.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(redirects, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const { source, destination, permanent = true, note } = body as Record<string, unknown>;

  if (!source || !destination) {
    return NextResponse.json(
      { error: "source and destination are required" },
      { status: 400 }
    );
  }
  if (typeof source !== "string" || typeof destination !== "string") {
    return NextResponse.json(
      { error: "source and destination must be strings" },
      { status: 400 }
    );
  }

  // Normalize: ensure source starts with /
  const normalizedSource = source.startsWith("/") ? source : `/${source}`;

  if (!isSameSitePath(normalizedSource) || !isSameSitePath(destination)) {
    return NextResponse.json(
      { error: "source and destination must be paths of this site, such as /new-page" },
      { status: 400 }
    );
  }
  if (typeof permanent !== "boolean") {
    return NextResponse.json({ error: "permanent must be a boolean" }, { status: 400 });
  }
  if (note !== undefined && note !== null && (typeof note !== "string" || note.length > NOTE_MAX_LENGTH)) {
    return NextResponse.json(
      { error: `note must be a string of at most ${NOTE_MAX_LENGTH} characters` },
      { status: 400 }
    );
  }
  const noteValue = typeof note === "string" ? note : null;

  const redirect = await prisma.redirect.upsert({
    where: { source: normalizedSource },
    create: {
      source: normalizedSource,
      destination,
      permanent,
      note: noteValue,
    },
    update: {
      destination,
      permanent,
      note: noteValue,
    },
  });

  invalidateRedirectCache();

  return NextResponse.json(redirect, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

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
