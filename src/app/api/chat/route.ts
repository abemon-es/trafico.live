import { NextResponse } from "next/server";

/**
 * POST /api/chat
 *
 * Stub endpoint — returns 503 until S3 integration (mayo 2026).
 *
 * Future: will proxy to Claude API with MCP tools (traffic, fuel, trains, flights).
 * Authentication: will require x-api-key header for external callers (same-origin exempt).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Asistente no disponible aún",
      eta: "S3 (mayo 2026)",
    },
    { status: 503 }
  );
}

// Reject other methods explicitly
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
