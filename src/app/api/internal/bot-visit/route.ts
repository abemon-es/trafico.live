/**
 * POST /api/internal/bot-visit
 *
 * Node runtime (not edge) — can use Prisma directly.
 * Called fire-and-forget from middleware when an AI bot is detected.
 * Protected by x-internal-secret header; NOT in the public auth flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reportApiError } from "@/lib/api-error";
import { safeCompare } from "@/lib/auth";

// Shared secret with the middleware, from BOT_VISIT_SECRET only. There is no
// fallback: the repo is public, so a default secret would be a public one
// (until 2026-10-19 prod ran on it, anyone could write fake visits).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Fail closed: without the variable the endpoint accepts nothing.
  const expected = process.env.BOT_VISIT_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  if (!safeCompare(request.headers.get("x-internal-secret") ?? "", expected)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    bot?: string;
    path?: string;
    statusCode?: number;
    ip?: string;
    country?: string;
    userAgent?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { bot, path, statusCode = 200, ip, country, userAgent = "" } = body;

  if (!bot || !path) {
    return NextResponse.json({ error: "bot and path required" }, { status: 400 });
  }

  try {
    await prisma.botVisit.create({
      data: {
        bot,
        path,
        statusCode,
        ip: ip ?? null,
        country: country ?? null,
        userAgent,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    reportApiError(err, "bot-visit-insert");
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
