import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ community: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { community: slug } = await params;

    const community = await prisma.community.findUnique({
      where: { slug },
      include: {
        provinces: {
          include: {
            municipalities: {
              select: {
                code: true,
                name: true,
                slug: true,
                population: true,
              },
              orderBy: { population: "desc" },
              take: 5,
            },
          },
          orderBy: { population: "desc" },
        },
      },
    });

    if (!community) {
      return NextResponse.json(
        { success: false, error: "Community not found" },
        { status: 404 }
      );
    }

    // Get accident stats for the community's provinces
    const provinceCodes = community.provinces.map((p) => p.code);
    const accidents = await prisma.historicalAccidents.aggregate({
      where: { province: { in: provinceCodes } },
      _sum: {
        accidents: true,
        fatalities: true,
        hospitalized: true,
      },
    });

    const stats = {
      totalAccidents: accidents._sum.accidents || 0,
      totalFatalities: accidents._sum.fatalities || 0,
      totalHospitalized: accidents._sum.hospitalized || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        community,
        stats,
      },
    });
  } catch (error) {
    console.error("Community API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch community data" },
      { status: 500 }
    );
  }
}
