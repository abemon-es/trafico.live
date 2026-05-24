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

// Simple shared secret — set BOT_VISIT_SECRET in env or fall back to a
// build-time constant (acceptable for an internal, write-only endpoint).
const INTERNAL_SECRET =
  process.env.BOT_VISIT_SECRET || "trafico-internal-bot-visit-v1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Validate internal secret
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== INTERNAL_SECRET) {
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
