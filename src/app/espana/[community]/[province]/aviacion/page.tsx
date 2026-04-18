import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Plane, ArrowLeft, MapPin, Users, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { readFile } from "fs/promises";
import { join } from "path";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ community: string; province: string }>;
};

interface RunwayData {
  airport_icao: string;
  le_ident: string;
  le_heading: number | null;
  length_m: number | null;
  width_m: number | null;
  surface: string | null;
  le_latitude: number | null;
  le_longitude: number | null;
  he_ident: string;
  he_latitude: number | null;
  he_longitude: number | null;
}

// Shape of each runway entry in public/data/runways.json (keyed by ICAO)
interface RunwayJsonEntry {
  leIdent?: string;
  heIdent?: string;
  leHeading?: number | null;
  leLat?: number | null;
  leLon?: number | null;
  heLat?: number | null;
  heLon?: number | null;
  lengthFt?: number | null;
  widthFt?: number | null;
  surface?: string | null;
}

function formatPassengers(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString("es-ES");
}

async function getProvince(communitySlug: string, provinceSlug: string) {
  const province = await prisma.province.findUnique({
    where: { slug: provinceSlug },
    include: { community: true },
  });
  if (!province || province.community.slug !== communitySlug) return null;
  return province;
}

/**
 * runways.json is keyed by ICAO code: { "LEMD": [{lengthFt, widthFt, ...}, ...], ... }
 * Returns a flat RunwayData[] array normalising field names.
 */
async function getRunways(): Promise<RunwayData[]> {
  try {
    const raw = await readFile(
      join(process.cwd(), "public/data/runways.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw) as Record<string, RunwayJsonEntry[]>;
    if (Array.isArray(parsed)) return parsed as unknown as RunwayData[];
    // Object keyed by ICAO → flatten into RunwayData[]
    const result: RunwayData[] = [];
    for (const [icao, runways] of Object.entries(parsed)) {
      for (const rwy of runways) {
        result.push({
          airport_icao: icao,
          le_ident: rwy.leIdent ?? "",
          he_ident: rwy.heIdent ?? "",
          le_heading: rwy.leHeading ?? null,
          le_latitude: rwy.leLat ?? null,
          le_longitude: rwy.leLon ?? null,
          he_latitude: rwy.heLat ?? null,
          he_longitude: rwy.heLon ?? null,
          // Convert feet to metres, round to integer
          length_m: rwy.lengthFt ? Math.round(rwy.lengthFt * 0.3048) : null,
          width_m: rwy.widthFt ? Math.round(rwy.widthFt * 0.3048) : null,
          surface: rwy.surface ?? null,
        });
      }
    }
    return result;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { community, province: provSlug } = await params;
  const prov = await getProvince(community, provSlug);
  if (!prov) return { title: "Provincia no encontrada" };

  const title = `Aviacion en ${prov.name} — Aeropuertos y trafico aereo`;
  const description = `Aeropuertos en ${prov.name} (${prov.community.name}). Estadisticas de pasajeros, pistas, y trafico aereo en tiempo real.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/espana/${community}/${provSlug}/aviacion`,
    },
    openGraph: {
      title: `Aviacion en ${prov.name}`,
      description,
      url: `${BASE_URL}/espana/${community}/${provSlug}/aviacion`,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function ProvinceAviacionPage({ params }: Props) {
  const { community, province: provSlug } = await params;
  const prov = await getProvince(community, provSlug);
  if (!prov) notFound();

  // Airports in this province
  const airports = await prisma.airport.findMany({
    where: { province: prov.code },
    include: {
      statistics: {
        where: { metric: "pax" },
        orderBy: { periodStart: "desc" },
        take: 5,
      },
    },
    orderBy: { name: "asc" },
  }).catch(() => []);

  // If no airports, find nearest in adjacent province
  let nearestAirport: {
    name: string;
    iata: string | null;
    city: string | null;
    province: string | null;
    provinceName: string | null;
    distance: number;
  } | null = null;

  if (airports.length === 0) {
    try {
      // Get province center coordinates (use first municipality or default to Madrid)
      const provData = await prisma.province.findUnique({
        where: { code: prov.code },
        select: {
          municipalities: {
            orderBy: { population: "desc" },
            take: 1,
            select: { latitude: true, longitude: true },
          },
        },
      });
      const center = provData?.municipalities[0];
      if (center?.latitude && center?.longitude) {
        const lat = Number(center.latitude);
        const lng = Number(center.longitude);
        const nearest = await prisma.$queryRawUnsafe<
          {
            name: string;
            iata: string | null;
            city: string | null;
            province: string | null;
            distance: number;
          }[]
        >(
          `SELECT name, iata, city, province,
            (6371 * acos(
              cos(radians($1)) * cos(radians(latitude)) *
              cos(radians(longitude) - radians($2)) +
              sin(radians($1)) * sin(radians(latitude))
            )) AS distance
           FROM "Airport"
           WHERE province != $3
           ORDER BY distance ASC
           LIMIT 1`,
          lat,
          lng,
          prov.code
        );
        if (nearest[0]) {
          const nearestProv = nearest[0].province
            ? await prisma.province.findUnique({
                where: { code: nearest[0].province },
                select: { name: true },
              }).catch(() => null)
            : null;
          nearestAirport = {
            ...nearest[0],
            provinceName: nearestProv?.name ?? null,
            distance: Math.round(nearest[0].distance),
          };
        }
      }
    } catch {
      // If the nearest-airport lookup fails, continue without it
    }
  }

  // Load runway data
  const allRunways = await getRunways();
  const airportIcaos = airports.map((a) => a.icao);
  const runwaysByAirport = new Map<string, RunwayData[]>();
  for (const r of allRunways) {
    if (airportIcaos.includes(r.airport_icao)) {
      const list = runwaysByAirport.get(r.airport_icao) ?? [];
      list.push(r);
      runwaysByAirport.set(r.airport_icao, list);
    }
  }

  // Total passengers
  const totalPax = airports.reduce((sum, a) => {
    const stat = a.statistics[0];
    return sum + (stat ? Number(stat.value) : 0);
  }, 0);

  const breadcrumbs = [
    { name: "Inicio", href: "/" },
    { name: "Espana", href: "/espana" },
    { name: prov.community.name, href: `/espana/${community}` },
    { name: prov.name, href: `/espana/${community}/${provSlug}` },
    { name: "Aviacion", href: `/espana/${community}/${provSlug}/aviacion` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Plane className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">
                Aviacion en {prov.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {prov.community.name}
              </p>
              {airports.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                    <p className="font-data text-lg font-bold text-gray-900">
                      {airports.length}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Aeropuerto{airports.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {totalPax > 0 && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      <p className="font-data text-lg font-bold text-gray-900">
                        {formatPassengers(totalPax)}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Pasajeros/ano
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* No airports — show nearest */}
        {airports.length === 0 && nearestAirport && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-tl-600" />
              <h2 className="font-heading text-lg font-bold text-gray-900">
                No hay aeropuertos en {prov.name}
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              El aeropuerto mas cercano se encuentra a{" "}
              <span className="font-data font-semibold">
                {nearestAirport.distance} km
              </span>
              :
            </p>
            <div className="rounded-xl border border-tl-200 bg-tl-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                {nearestAirport.name}
              </p>
              {nearestAirport.iata && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-tl-100 text-tl-700 font-mono font-semibold">
                  {nearestAirport.iata}
                </span>
              )}
              {nearestAirport.city && (
                <p className="text-xs text-gray-500 mt-1">
                  {nearestAirport.city}
                  {nearestAirport.provinceName &&
                    `, ${nearestAirport.provinceName}`}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Airport details */}
        {airports.map((airport) => {
          const latestPax = airport.statistics[0]
            ? Number(airport.statistics[0].value)
            : null;
          const runways = runwaysByAirport.get(airport.icao) ?? [];
          const yearlyStats = airport.statistics.slice(0, 5).reverse();

          return (
            <section
              key={airport.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-heading text-lg font-bold text-gray-900">
                    {airport.name}
                  </h2>
                  {airport.city && (
                    <p className="text-sm text-gray-500">{airport.city}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  {airport.iata && (
                    <span className="text-xs px-2 py-1 rounded bg-tl-100 text-tl-700 font-mono font-semibold">
                      {airport.iata}
                    </span>
                  )}
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 font-mono">
                    {airport.icao}
                  </span>
                  {airport.isAena && (
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                      AENA
                    </span>
                  )}
                </div>
              </div>

              {/* Passenger stats */}
              {latestPax !== null && latestPax > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      <span className="font-data font-bold text-gray-900">
                        {formatPassengers(latestPax)}
                      </span>{" "}
                      pasajeros (ultimo dato disponible)
                    </p>
                  </div>
                  {/* Year-over-year mini chart */}
                  {yearlyStats.length > 1 && (
                    <div className="flex items-end gap-1 h-12">
                      {yearlyStats.map((stat, i) => {
                        const val = Number(stat.value);
                        const maxVal = Math.max(
                          ...yearlyStats.map((s) => Number(s.value))
                        );
                        const heightPct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-0.5"
                          >
                            <div
                              className="w-full bg-tl-200 rounded-t"
                              style={{ height: `${heightPct}%`, minHeight: "2px" }}
                            />
                            <span className="text-[8px] text-gray-400 font-data">
                              {stat.periodStart.getFullYear()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Runways */}
              {runways.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-600 mb-2">
                    Pistas ({runways.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {runways.map((rwy, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-gray-50 border border-gray-100 p-2 text-xs"
                      >
                        <p className="font-data font-semibold text-gray-800">
                          {rwy.le_ident}/{rwy.he_ident}
                        </p>
                        <div className="flex gap-3 mt-1 text-gray-500">
                          {rwy.length_m && (
                            <span>
                              <span className="font-data">
                                {rwy.length_m.toLocaleString("es-ES")}
                              </span>{" "}
                              m
                            </span>
                          )}
                          {rwy.width_m && (
                            <span>
                              <span className="font-data">{rwy.width_m}</span> m
                              ancho
                            </span>
                          )}
                          {rwy.surface && <span>{rwy.surface}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link to detail */}
              {airport.iata && (
                <Link
                  href={`/aviacion/aeropuertos/${airport.iata.toLowerCase()}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
                >
                  Ver detalle del aeropuerto{" "}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </section>
          );
        })}

        {/* Back link + attribution */}
        <div className="flex items-center justify-between mt-8">
          <Link
            href={`/espana/${community}/${provSlug}`}
            className="inline-flex items-center gap-2 text-sm text-tl-600 hover:text-tl-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a {prov.name}
          </Link>
          <p className="text-[10px] text-gray-400">
            Fuente: AENA, Eurostat, OurAirports
          </p>
        </div>
      </div>
    </div>
  );
}
