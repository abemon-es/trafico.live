import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/vehiculos
 *
 * Vehicle fleet data endpoint — placeholder until DGT census data is integrated.
 * The VehicleFleet model was removed as it was never populated by any collector.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      totals: { total: 0, byVehicleType: {}, byFuelType: {} },
      topProvinces: [],
      yearlyData: [],
      yearOverYearChange: null,
      records: [],
      message: "Vehicle fleet data not yet available. Pending DGT census integration.",
    },
  });
}
