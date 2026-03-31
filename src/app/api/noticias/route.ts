import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ArticleCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") as ArticleCategory | null;
  const tag = searchParams.get("tag");
  const province = searchParams.get("province");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const where = {
    status: "PUBLISHED" as const,
    ...(category && { category }),
    ...(province && { province }),
    ...(tag && {
      tags: { some: { tag: { slug: tag } } },
    }),
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: limit,
      skip: offset,
      include: { tags: { include: { tag: true } } },
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({
    data: articles,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}
