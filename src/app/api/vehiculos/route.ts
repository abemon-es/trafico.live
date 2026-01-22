import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

/**
 * GET /api/vehiculos
 *
 * Query parameters:
 * - province: Filter by province code (e.g., "28" for Madrid)
 * - year: Filter by year (e.g., "2023")
 * - vehicleType: Filter by vehicle type ("car", "motorcycle", "truck", "bus", "trailer", "other")
 * - fuelType: Filter by fuel type ("gasoline", "diesel", "electric", "hybrid", "other")
 * - month: Filter by month (1-12), omit for annual data
 * - groupBy: Group results ("province", "vehicleType", "fuelType", "year")
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const province = searchParams.get("province");
    const year = searchParams.get("year");
    const vehicleType = searchParams.get("vehicleType");
    const fuelType = searchParams.get("fuelType");
    const month = searchParams.get("month");
    const groupBy = searchParams.get("groupBy");

    // Build where clause
    const where: {
      provinceCode?: string;
      year?: number;
      vehicleType?: string;
      fuelType?: string | null;
      month?: number | null;
    } = {};

    if (province) where.provinceCode = province;
    if (year) where.year = parseInt(year, 10);
    if (vehicleType) where.vehicleType = vehicleType;
    if (fuelType) where.fuelType = fuelType === "null" ? null : fuelType;
    if (month) where.month = parseInt(month, 10);
    else where.month = null; // Default to annual data

    // If groupBy is specified, return aggregated data
    if (groupBy) {
      const groupedData = await getGroupedData(where, groupBy);
      return NextResponse.json({
        success: true,
        data: groupedData,
      });
    }

    // Get vehicle fleet data
    const fleetData = await prisma.vehicleFleet.findMany({
      where,
      orderBy: [{ year: "desc" }, { provinceCode: "asc" }, { count: "desc" }],
    });

    // Calculate totals
    const totals = fleetData.reduce(
      (acc, record) => ({
        total: acc.total + record.count,
        byVehicleType: {
          ...acc.byVehicleType,
          [record.vehicleType]:
            (acc.byVehicleType[record.vehicleType] || 0) + record.count,
        },
        byFuelType: record.fuelType
          ? {
              ...acc.byFuelType,
              [record.fuelType]:
                (acc.byFuelType[record.fuelType] || 0) + record.count,
            }
          : acc.byFuelType,
      }),
      {
        total: 0,
        byVehicleType: {} as Record<string, number>,
        byFuelType: {} as Record<string, number>,
      }
    );

    // Get top provinces by fleet size
    const topProvinces = Object.entries(
      fleetData.reduce(
        (acc, record) => {
          const key = record.provinceCode;
          if (!acc[key]) {
            acc[key] = {
              provinceCode: record.provinceCode,
              provinceName: record.provinceName || "Desconocido",
              count: 0,
            };
          }
          acc[key].count += record.count;
          return acc;
        },
        {} as Record<
          string,
          { provinceCode: string; provinceName: string; count: number }
        >
      )
    )
      .map(([, value]) => value)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Year-over-year data
    const yearlyData = Object.entries(
      fleetData.reduce(
        (acc, record) => {
          if (!acc[record.year]) {
            acc[record.year] = { year: record.year, total: 0 };
          }
          acc[record.year].total += record.count;
          return acc;
        },
        {} as Record<number, { year: number; total: number }>
      )
    )
      .map(([, value]) => value)
      .sort((a, b) => a.year - b.year);

    // Calculate year-over-year change
    let yearOverYearChange: number | null = null;
    if (yearlyData.length >= 2) {
      const latest = yearlyData[yearlyData.length - 1];
      const previous = yearlyData[yearlyData.length - 2];
      if (previous.total > 0) {
        yearOverYearChange =
          ((latest.total - previous.total) / previous.total) * 100;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totals,
        topProvinces,
        yearlyData,
        yearOverYearChange,
        records: fleetData,
        filters: {
          province,
          year: year ? parseInt(year, 10) : null,
          vehicleType,
          fuelType,
          month: month ? parseInt(month, 10) : null,
        },
      },
    });
  } catch (error) {
    console.error("Vehicle Fleet API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vehicle fleet data" },
      { status: 500 }
    );
  }
}

/**
 * Get aggregated data grouped by a specific field
 */
async function getGroupedData(
  where: {
    provinceCode?: string;
    year?: number;
    vehicleType?: string;
    fuelType?: string | null;
    month?: number | null;
  },
  groupBy: string
): Promise<unknown> {
  switch (groupBy) {
    case "province": {
      const data = await prisma.vehicleFleet.groupBy({
        by: ["provinceCode", "provinceName"],
        where,
        _sum: { count: true },
        orderBy: { _sum: { count: "desc" } },
      });
      return data.map((item) => ({
        provinceCode: item.provinceCode,
        provinceName: item.provinceName,
        total: item._sum.count || 0,
      }));
    }

    case "vehicleType": {
      const data = await prisma.vehicleFleet.groupBy({
        by: ["vehicleType"],
        where,
        _sum: { count: true },
        orderBy: { _sum: { count: "desc" } },
      });
      return data.map((item) => ({
        vehicleType: item.vehicleType,
        total: item._sum.count || 0,
      }));
    }

    case "fuelType": {
      const data = await prisma.vehicleFleet.groupBy({
        by: ["fuelType"],
        where: { ...where, fuelType: { not: null } },
        _sum: { count: true },
        orderBy: { _sum: { count: "desc" } },
      });
      return data.map((item) => ({
        fuelType: item.fuelType || "unknown",
        total: item._sum.count || 0,
      }));
    }

    case "year": {
      const data = await prisma.vehicleFleet.groupBy({
        by: ["year"],
        where,
        _sum: { count: true },
        orderBy: { year: "asc" },
      });
      return data.map((item) => ({
        year: item.year,
        total: item._sum.count || 0,
      }));
    }

    case "provinceType": {
      // Group by province and vehicle type
      const data = await prisma.vehicleFleet.groupBy({
        by: ["provinceCode", "provinceName", "vehicleType"],
        where,
        _sum: { count: true },
        orderBy: [{ provinceCode: "asc" }, { _sum: { count: "desc" } }],
      });
      return data.map((item) => ({
        provinceCode: item.provinceCode,
        provinceName: item.provinceName,
        vehicleType: item.vehicleType,
        total: item._sum.count || 0,
      }));
    }

    case "yearType": {
      // Group by year and vehicle type
      const data = await prisma.vehicleFleet.groupBy({
        by: ["year", "vehicleType"],
        where,
        _sum: { count: true },
        orderBy: [{ year: "asc" }, { vehicleType: "asc" }],
      });
      return data.map((item) => ({
        year: item.year,
        vehicleType: item.vehicleType,
        total: item._sum.count || 0,
      }));
    }

    case "yearFuel": {
      // Group by year and fuel type - useful for EV trend analysis
      const data = await prisma.vehicleFleet.groupBy({
        by: ["year", "fuelType"],
        where: { ...where, fuelType: { not: null } },
        _sum: { count: true },
        orderBy: [{ year: "asc" }, { fuelType: "asc" }],
      });
      return data.map((item) => ({
        year: item.year,
        fuelType: item.fuelType || "unknown",
        total: item._sum.count || 0,
      }));
    }

    default:
      return [];
  }
}
