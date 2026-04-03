import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const authError = authenticateRequest(request);
  if (authError) return authError;

  // Portugal historical accidents — placeholder until PortugalHistoricalAccidents model is added
  return NextResponse.json({
    success: true,
    data: { total: 0, records: [] },
    message: "Portugal accident data coming soon",
  });
}
