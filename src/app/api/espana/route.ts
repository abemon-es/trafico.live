import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch communities with provinces
    const communities = await prisma.community.findMany({
      include: {
        provinces: {
          select: {
            code: true,
            name: true,
            slug: true,
            population: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Get total population from provinces
    const provinceStats = await prisma.province.aggregate({
      _sum: { population: true },
      _count: true,
    });

    // Get historical accident totals
    const accidents = await prisma.historicalAccidents.aggregate({
      _sum: {
        accidents: true,
        fatalities: true,
        hospitalized: true,
      },
    });

    const stats = {
      totalPopulation: provinceStats._sum.population || 0,
      provinceCount: provinceStats._count,
      totalAccidents: accidents._sum.accidents || 0,
      totalFatalities: accidents._sum.fatalities || 0,
      totalHospitalized: accidents._sum.hospitalized || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        communities,
        stats,
      },
    });
  } catch (error) {
    console.error("España API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch España data" },
      { status: 500 }
    );
  }
}
