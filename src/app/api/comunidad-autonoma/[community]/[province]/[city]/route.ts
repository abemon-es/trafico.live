import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ community: string; province: string; city: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { community: communitySlug, province: provinceSlug, city: citySlug } = await params;

    const municipality = await prisma.municipality.findUnique({
      where: { slug: citySlug },
      include: {
        province: {
          include: {
            community: true,
          },
        },
      },
    });

    // Verify municipality exists and belongs to the correct province and community
    if (!municipality) {
      return NextResponse.json(
        { success: false, error: "Municipality not found" },
        { status: 404 }
      );
    }

    if (
      municipality.province.slug !== provinceSlug ||
      municipality.province.community.slug !== communitySlug
    ) {
      return NextResponse.json(
        { success: false, error: "Municipality not found in this location" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        municipality,
      },
    });
  } catch (error) {
    console.error("Municipality API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch municipality data" },
      { status: 500 }
    );
  }
}
