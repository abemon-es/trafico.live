/**
 * Individual Road Details API
 *
 * GET /api/roads/[roadId]
 *   - Get details for a specific road by ID
 *
 * @example
 *   GET /api/roads/A-7
 *   GET /api/roads/AP-7
 *   GET /api/roads/N-340
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

// Province code to name mapping
const PROVINCE_NAMES: Record<string, string> = {
  "01": "Alava",
  "02": "Albacete",
  "03": "Alicante",
  "04": "Almeria",
  "05": "Avila",
  "06": "Badajoz",
  "07": "Baleares",
  "08": "Barcelona",
  "09": "Burgos",
  "10": "Caceres",
  "11": "Cadiz",
  "12": "Castellon",
  "13": "Ciudad Real",
  "14": "Cordoba",
  "15": "A Coruna",
  "16": "Cuenca",
  "17": "Girona",
  "18": "Granada",
  "19": "Guadalajara",
  "20": "Gipuzkoa",
  "21": "Huelva",
  "22": "Huesca",
  "23": "Jaen",
  "24": "Leon",
  "25": "Lleida",
  "26": "La Rioja",
  "27": "Lugo",
  "28": "Madrid",
  "29": "Malaga",
  "30": "Murcia",
  "31": "Navarra",
  "32": "Ourense",
  "33": "Asturias",
  "34": "Palencia",
  "35": "Las Palmas",
  "36": "Pontevedra",
  "37": "Salamanca",
  "38": "S.C. Tenerife",
  "39": "Cantabria",
  "40": "Segovia",
  "41": "Sevilla",
  "42": "Soria",
  "43": "Tarragona",
  "44": "Teruel",
  "45": "Toledo",
  "46": "Valencia",
  "47": "Valladolid",
  "48": "Bizkaia",
  "49": "Zamora",
  "50": "Zaragoza",
  "51": "Ceuta",
  "52": "Melilla",
};

interface RoadResponse {
  success: true;
  data: {
    id: string;
    name: string | null;
    type: string;
    kmStart: number | null;
    kmEnd: number | null;
    totalKm: number | null;
    provinces: string[];
    provinceNames: string[];
    description: string;
  };
  meta: {
    generatedAt: string;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
}

/**
 * Generate a human-readable description for a road
 */
function generateDescription(road: {
  id: string;
  name: string | null;
  type: string;
  totalKm: number | null;
  provinces: string[];
}): string {
  const typeDescriptions: Record<string, string> = {
    AUTOPISTA: "autopista de peaje",
    AUTOVIA: "autovia",
    NACIONAL: "carretera nacional",
    COMARCAL: "carretera comarcal",
    PROVINCIAL: "carretera provincial",
    URBANA: "via urbana",
    OTHER: "carretera",
  };

  const typeDesc = typeDescriptions[road.type] || "carretera";
  const provinceNames = road.provinces.map(
    (code) => PROVINCE_NAMES[code] || code
  );

  let desc = `La ${road.id}`;
  if (road.name) {
    desc += ` (${road.name})`;
  }
  desc += ` es una ${typeDesc}`;

  if (road.totalKm) {
    desc += ` de ${road.totalKm} km`;
  }

  if (provinceNames.length > 0) {
    if (provinceNames.length === 1) {
      desc += ` que discurre por ${provinceNames[0]}`;
    } else {
      const lastProvince = provinceNames.pop();
      desc += ` que atraviesa ${provinceNames.join(", ")} y ${lastProvince}`;
    }
  }

  desc += ".";
  return desc;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roadId: string }> }
): Promise<NextResponse<RoadResponse | ErrorResponse>> {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse as NextResponse<RoadResponse | ErrorResponse>;

  try {
    const { roadId } = await params;

    // Normalize road ID (uppercase, handle URL encoding)
    const normalizedId = decodeURIComponent(roadId).toUpperCase();

    // Find road by ID (case-insensitive)
    const road = await prisma.road.findFirst({
      where: {
        id: {
          equals: normalizedId,
          mode: "insensitive",
        },
      },
    });

    if (!road) {
      return NextResponse.json(
        {
          success: false,
          error: `Road not found: ${roadId}`,
        },
        { status: 404 }
      );
    }

    const response: RoadResponse = {
      success: true,
      data: {
        id: road.id,
        name: road.name,
        type: road.type,
        kmStart: road.kmStart ? Number(road.kmStart) : null,
        kmEnd: road.kmEnd ? Number(road.kmEnd) : null,
        totalKm: road.totalKm ? Number(road.totalKm) : null,
        provinces: road.provinces,
        provinceNames: road.provinces.map(
          (code) => PROVINCE_NAMES[code] || `Unknown (${code})`
        ),
        description: generateDescription({
          id: road.id,
          name: road.name,
          type: road.type,
          totalKm: road.totalKm ? Number(road.totalKm) : null,
          provinces: road.provinces,
        }),
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching road:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
