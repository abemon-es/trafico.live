import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { InsightCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") as InsightCategory | null;
  const province = searchParams.get("province");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const where = {
    ...(category && { category }),
    ...(province && { province }),
  };

  const [insights, total] = await Promise.all([
    prisma.insight.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.insight.count({ where }),
  ]);

  return NextResponse.json({
    data: insights,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}
