import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for Vercel/Coolify

const MINETUR_API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

const TAX_FREE_PROVINCES = ["35", "38", "51", "52"];

const PROVINCES: Record<string, string> = {
  "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
  "05": "Ávila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
  "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón",
  "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
  "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
  "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
  "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
  "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
  "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
  "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla",
};

function parsePrice(priceStr: string): number | null {
  if (!priceStr || priceStr.trim() === "") return null;
  const value = parseFloat(priceStr.replace(",", "."));
  return isNaN(value) ? null : value;
}

function parseCoord(s: string): number {
  if (!s) return NaN;
  return parseFloat(s.replace(",", "."));
}

/**
 * Gas station collector cron endpoint.
 * Call via: GET /api/cron/gas-stations?key=<API_KEY>
 * Or: GET /api/cron/gas-stations with x-api-key header
 *
 * Coolify cron config: curl -s https://trafico.live/api/cron/gas-stations?key=YOUR_KEY
 */
export async function GET(request: NextRequest) {
  // Auth: require API key (via header or query param for cron compatibility)
  const apiKey = request.headers.get("x-api-key") || request.nextUrl.searchParams.get("key");
  const validKeys = process.env.API_KEYS?.split(",").map((k) => k.trim()) || [];
  if (!apiKey || !validKeys.includes(apiKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  try {
    // 1. Fetch from MINETUR
    const res = await fetch(MINETUR_API_URL, {
      headers: { Accept: "application/json", "User-Agent": "TraficoLive/1.0" },
      signal: AbortSignal.timeout(180000),
    });

    if (!res.ok) throw new Error(`MINETUR API: ${res.status}`);

    const data = await res.json();
    const stations = data.ListaEESSPrecio;
    if (!stations?.length) {
      return NextResponse.json({ success: false, error: "No stations from API" }, { status: 502 });
    }

    // 2. Parse
    const valid = stations
      .map((s: Record<string, string>) => {
        const lat = parseCoord(s.Latitud);
        const lng = parseCoord(s["Longitud (WGS84)"]);
        if (isNaN(lat) || isNaN(lng)) return null;
        const pCode = s.IDProvincia ? s.IDProvincia.padStart(2, "0") : null;
        return {
          id: s.IDEESS, name: s["Rótulo"] || "Sin nombre", lat, lng,
          address: s["Dirección"] || null, postalCode: s["C.P."] || null,
          locality: s.Localidad || null, municipality: s.Municipio || null,
          municipalityCode: s.IDMunicipio || null,
          province: pCode, provinceName: (pCode ? PROVINCES[pCode] : null) || s.Provincia,
          communityCode: s.IDCCAA ? s.IDCCAA.padStart(2, "0") : null,
          pGA: parsePrice(s["Precio Gasoleo A"]), pGB: parsePrice(s["Precio Gasoleo B"]),
          pGP: parsePrice(s["Precio Gasoleo Premium"]),
          p95: parsePrice(s["Precio Gasolina 95 E5"]), p95_10: parsePrice(s["Precio Gasolina 95 E10"]),
          p98: parsePrice(s["Precio Gasolina 98 E5"]), p98_10: parsePrice(s["Precio Gasolina 98 E10"]),
          pGLP: parsePrice(s["Precio Gases licuados del petróleo"]),
          pGNC: parsePrice(s["Precio Gas Natural Comprimido"]),
          pGNL: parsePrice(s["Precio Gas Natural Licuado"]),
          pH2: parsePrice(s["Precio Hidrogeno"]),
          schedule: s.Horario || null,
          is24h: (s.Horario || "").includes("24H") || (s.Horario || "").includes("24h"),
          margin: s.Margen || null, saleType: s["Tipo Venta"] || null,
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    // 3. Bulk upsert
    const BATCH = 1000;
    let processed = 0;
    for (let i = 0; i < valid.length; i += BATCH) {
      const batch = valid.slice(i, i + BATCH);
      const values = batch.map((_, idx) => {
        const b = idx * 29;
        return `(${Array.from({ length: 29 }, (__, j) => `$${b + j + 1}`).join(", ")})`;
      }).join(", ");

      const params = batch.flatMap((s) => [
        s.id, s.name, s.lat, s.lng, s.address, s.postalCode,
        s.locality, s.municipality, s.municipalityCode, s.province,
        s.provinceName, s.communityCode, s.pGA, s.pGB, s.pGP,
        s.p95, s.p95_10, s.p98, s.p98_10, s.pGLP, s.pGNC,
        s.pGNL, s.pH2, s.schedule, s.is24h, s.margin, s.saleType,
        now, now,
      ]);

      await prisma.$executeRawUnsafe(`
        INSERT INTO "GasStation" (
          id, name, latitude, longitude, address, "postalCode",
          locality, municipality, "municipalityCode", province,
          "provinceName", "communityCode", "priceGasoleoA", "priceGasoleoB",
          "priceGasoleoPremium", "priceGasolina95E5", "priceGasolina95E10",
          "priceGasolina98E5", "priceGasolina98E10", "priceGLP", "priceGNC",
          "priceGNL", "priceHidrogeno", schedule, "is24h", margin, "saleType",
          "lastPriceUpdate", "lastUpdated"
        ) VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          name=EXCLUDED.name, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
          address=EXCLUDED.address, "postalCode"=EXCLUDED."postalCode",
          locality=EXCLUDED.locality, municipality=EXCLUDED.municipality,
          "municipalityCode"=EXCLUDED."municipalityCode", province=EXCLUDED.province,
          "provinceName"=EXCLUDED."provinceName", "communityCode"=EXCLUDED."communityCode",
          "priceGasoleoA"=EXCLUDED."priceGasoleoA", "priceGasoleoB"=EXCLUDED."priceGasoleoB",
          "priceGasoleoPremium"=EXCLUDED."priceGasoleoPremium",
          "priceGasolina95E5"=EXCLUDED."priceGasolina95E5",
          "priceGasolina95E10"=EXCLUDED."priceGasolina95E10",
          "priceGasolina98E5"=EXCLUDED."priceGasolina98E5",
          "priceGasolina98E10"=EXCLUDED."priceGasolina98E10",
          "priceGLP"=EXCLUDED."priceGLP", "priceGNC"=EXCLUDED."priceGNC",
          "priceGNL"=EXCLUDED."priceGNL", "priceHidrogeno"=EXCLUDED."priceHidrogeno",
          schedule=EXCLUDED.schedule, "is24h"=EXCLUDED."is24h",
          margin=EXCLUDED.margin, "saleType"=EXCLUDED."saleType",
          "lastPriceUpdate"=NOW(), "lastUpdated"=NOW()
      `, ...params);

      processed += batch.length;
    }

    // 4. Price history
    const withPrices = valid.filter((s) => s.pGA !== null || s.p95 !== null);
    const history = await prisma.gasStationPriceHistory.createMany({
      data: withPrices.map((s) => ({
        stationId: s.id as string,
        recordedAt: today,
        priceGasoleoA: s.pGA as number | null,
        priceGasolina95E5: s.p95 as number | null,
        priceGasolina98E5: s.p98 as number | null,
        priceGLP: s.pGLP as number | null,
      })),
      skipDuplicates: true,
    });

    // 5. Aggregation (public stations only)
    const pub = { OR: [{ saleType: "P" as const }, { saleType: null }] };

    const natl = await prisma.gasStation.aggregate({
      where: { province: { notIn: TAX_FREE_PROVINCES }, ...pub },
      _avg: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
      _min: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
      _max: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
      _count: true,
    });

    await prisma.fuelPriceDailyStats.upsert({
      where: { date_scope: { date: today, scope: "national" } },
      create: { date: today, scope: "national", avgGasoleoA: natl._avg.priceGasoleoA, minGasoleoA: natl._min.priceGasoleoA, maxGasoleoA: natl._max.priceGasoleoA, avgGasolina95: natl._avg.priceGasolina95E5, minGasolina95: natl._min.priceGasolina95E5, maxGasolina95: natl._max.priceGasolina95E5, avgGasolina98: natl._avg.priceGasolina98E5, minGasolina98: natl._min.priceGasolina98E5, maxGasolina98: natl._max.priceGasolina98E5, stationCount: natl._count },
      update: { avgGasoleoA: natl._avg.priceGasoleoA, minGasoleoA: natl._min.priceGasoleoA, maxGasoleoA: natl._max.priceGasoleoA, avgGasolina95: natl._avg.priceGasolina95E5, minGasolina95: natl._min.priceGasolina95E5, maxGasolina95: natl._max.priceGasolina95E5, avgGasolina98: natl._avg.priceGasolina98E5, minGasolina98: natl._min.priceGasolina98E5, maxGasolina98: natl._max.priceGasolina98E5, stationCount: natl._count },
    });

    // Province aggregation
    const provStats = await prisma.gasStation.groupBy({
      by: ["province"],
      where: { province: { not: null }, ...pub },
      _avg: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
      _min: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
      _max: { priceGasoleoA: true, priceGasolina95E5: true, priceGasolina98E5: true },
      _count: true,
    });

    for (const s of provStats) {
      if (!s.province) continue;
      await prisma.fuelPriceDailyStats.upsert({
        where: { date_scope: { date: today, scope: `province:${s.province}` } },
        create: { date: today, scope: `province:${s.province}`, avgGasoleoA: s._avg.priceGasoleoA, minGasoleoA: s._min.priceGasoleoA, maxGasoleoA: s._max.priceGasoleoA, avgGasolina95: s._avg.priceGasolina95E5, minGasolina95: s._min.priceGasolina95E5, maxGasolina95: s._max.priceGasolina95E5, avgGasolina98: s._avg.priceGasolina98E5, minGasolina98: s._min.priceGasolina98E5, maxGasolina98: s._max.priceGasolina98E5, stationCount: s._count },
        update: { avgGasoleoA: s._avg.priceGasoleoA, minGasoleoA: s._min.priceGasoleoA, maxGasoleoA: s._max.priceGasoleoA, avgGasolina95: s._avg.priceGasolina95E5, minGasolina95: s._min.priceGasolina95E5, maxGasolina95: s._max.priceGasolina95E5, avgGasolina98: s._avg.priceGasolina98E5, minGasolina98: s._min.priceGasolina98E5, maxGasolina98: s._max.priceGasolina98E5, stationCount: s._count },
      });
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    return NextResponse.json({
      success: true,
      stations: processed,
      historyCreated: history.count,
      provinces: provStats.length,
      nationalCount: natl._count,
      elapsed: `${elapsed}s`,
    });
  } catch (error) {
    console.error("[cron/gas-stations] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
