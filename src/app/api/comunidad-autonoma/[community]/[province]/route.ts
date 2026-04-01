import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ community: string; province: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { community: communitySlug, province: provinceSlug } = await params;

    const province = await prisma.province.findUnique({
      where: { slug: provinceSlug },
      include: {
        community: true,
        municipalities: {
          orderBy: { population: "desc" },
        },
      },
    });

    // Verify province exists and belongs to the community
    if (!province || province.community.slug !== communitySlug) {
      return NextResponse.json(
        { success: false, error: "Province not found" },
        { status: 404 }
      );
    }

    // Get accident stats for the province
    const accidents = await prisma.historicalAccidents.findFirst({
      where: { province: province.code },
    });

    const stats = accidents
      ? {
          accidents: accidents.accidents,
          fatalities: accidents.fatalities,
          hospitalized: accidents.hospitalized,
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        province,
        stats,
      },
    });
  } catch (error) {
    console.error("Province API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch province data" },
      { status: 500 }
    );
  }
}
