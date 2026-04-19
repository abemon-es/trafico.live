/**
 * /aviacao/aeroportos/[iata]/chegadas — Chegadas ao vivo
 *
 * TARGET KEYWORDS (volume 33.100/mes KD 0-3):
 *   "chegadas aeroporto lisboa" · "chegada aeroporto porto"
 *   "chegadas aeroporto porto" · "chegadas aeroporto madeira"
 *   "aeroporto de lisboa chegadas" · "aeroporto lisboa chegadas"
 *
 * Server component com ISR 60s. Tablón de aeronaves a aterrar/aterradas
 * nas proximidades do aeroporto (30 km, última hora), com dados ADS-B
 * OpenSky. Schema: ItemList + BreadcrumbList.
 *
 * NOTA: OpenSky não fornece número de voo IATA diretamente.
 * O callsign ADS-B é um proxy adequado para mostrar atividade real.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  PlaneLanding,
  Clock,
  Info,
  MapPin,
  Plane,
  ArrowRight,
  Radio,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  getPTAirport,
  PT_AIRPORTS,
  airportBbox,
} from "@/lib/aviacao/pt-airports";
import Link from "next/link";

export const revalidate = 60;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = { params: Promise<{ iata: string }> };

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  return PT_AIRPORTS.map((a) => ({ iata: a.iata.toLowerCase() }));
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getArrivals(lat: number, lng: number) {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h window
  const bbox = airportBbox(lat, lng, 30);

  // Aeronaves a baixa altitude ou em terra perto do aeroporto = chegadas/pousadas
  const [airborne, onGround] = await Promise.all([
    // Em aproximação: voando baixo (<3000 ft) nas proximidades
    prisma.aircraftPosition.findMany({
      where: {
        createdAt: { gte: since },
        onGround: false,
        latitude: { gte: bbox.minLat, lte: bbox.maxLat },
        longitude: { gte: bbox.minLng, lte: bbox.maxLng },
        altitude: { lte: 3000 },
        callsign: { not: null },
      },
      select: {
        id: true,
        callsign: true,
        altitude: true,
        velocity: true,
        verticalRate: true,
        heading: true,
        originCountry: true,
        onGround: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      distinct: ["callsign"],
      take: 30,
    }),
    // Em terra: acabaram de aterrar
    prisma.aircraftPosition.findMany({
      where: {
        createdAt: { gte: since },
        onGround: true,
        latitude: { gte: bbox.minLat, lte: bbox.maxLat },
        longitude: { gte: bbox.minLng, lte: bbox.maxLng },
        callsign: { not: null },
      },
      select: {
        id: true,
        callsign: true,
        altitude: true,
        velocity: true,
        verticalRate: true,
        heading: true,
        originCountry: true,
        onGround: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      distinct: ["callsign"],
      take: 30,
    }),
  ]);

  return { airborne, onGround };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusLabel(onGround: boolean, altitude: number | null, verticalRate: number | null) {
  if (onGround) return { label: "Aterrou", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" };
  if (verticalRate !== null && verticalRate < -100) return { label: "Em aproximação", color: "text-tl-600 dark:text-tl-400", bg: "bg-tl-50 dark:bg-tl-900/20" };
  return { label: "Área aeroporto", color: "text-gray-500 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-800" };
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { iata } = await params;
  const airport = getPTAirport(iata);
  if (!airport) return { title: "Aeroporto não encontrado" };

  // Exact keyword targeting per airport
  const keywordMap: Record<string, string[]> = {
    LIS: [
      "chegadas aeroporto lisboa",
      "chegada aeroporto lisboa",
      "aeroporto lisboa chegadas",
      "aeroporto de lisboa chegadas",
      "chegadas lisboa aeroporto humberto delgado",
    ],
    OPO: [
      "chegadas aeroporto porto",
      "chegada aeroporto porto",
      "chegadas porto aeroporto",
      "aeroporto porto chegadas",
    ],
    FNC: [
      "chegadas aeroporto madeira",
      "chegada aeroporto madeira",
      "aeroporto madeira chegadas",
      "chegadas funchal aeroporto",
    ],
  };

  const title = `Chegadas ${airport.namePt} ao vivo · voos a aterrar hoje`;
  const description = `Painel de chegadas ao vivo no ${airport.namePt} (${airport.iata}). Aeronaves em aproximação e aterradas hoje. Dados ADS-B em tempo real via OpenSky Network.`;

  return {
    title,
    description,
    keywords: [
      ...(keywordMap[airport.iata] ?? []),
      `chegadas ${airport.city.toLowerCase()}`,
      "chegadas aeroporto hoje",
      "voos a aterrar",
    ],
    alternates: {
      canonical: `${BASE_URL}/aviacao/aeroportos/${iata.toLowerCase()}/chegadas`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/aviacao/aeroportos/${iata.toLowerCase()}/chegadas`,
      siteName: "trafico.live",
      locale: "pt_PT",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ChegadasPage({ params }: Props) {
  const { iata } = await params;
  const airport = getPTAirport(iata);
  if (!airport) notFound();

  const { airborne, onGround } = await getArrivals(
    airport.latitude,
    airport.longitude
  );

  const allFlights = [
    ...onGround.map((f) => ({ ...f, _type: "ground" as const })),
    ...airborne.map((f) => ({ ...f, _type: "airborne" as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const slug = airport.iata.toLowerCase();
  const now = new Date();

  // Schema: ItemList of flights
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Chegadas ${airport.namePt} — hoje ${now.toLocaleDateString("pt-PT")}`,
    description: `Lista de voos a chegar ao ${airport.namePt} hoje. Dados ADS-B em tempo real.`,
    url: `${BASE_URL}/aviacao/aeroportos/${slug}/chegadas`,
    inLanguage: "pt",
    numberOfItems: allFlights.length,
    itemListElement: allFlights.slice(0, 20).map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: f.callsign ?? "N/D",
      description: `${f.onGround ? "Aterrou" : "Em aproximação"} — ${f.originCountry ?? ""}`,
    })),
  };

  return (
    <>
      <StructuredData data={itemListSchema} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Início", href: "/" },
            { name: "Aviação", href: "/aviacao" },
            { name: "Aeroportos", href: "/aviacao/aeroportos" },
            { name: airport.iata, href: `/aviacao/aeroportos/${slug}` },
            { name: "Chegadas", href: `/aviacao/aeroportos/${slug}/chegadas` },
          ]}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                              */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-tl-50 dark:bg-tl-900/30 flex items-center justify-center">
              <PlaneLanding className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
              {airport.iata} · Chegadas ao vivo
            </span>
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Chegadas aeroporto {airport.city} ao vivo
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Voos a aterrar hoje no {airport.namePt} ({airport.iata}). Atualizado a cada 15
            minutos via ADS-B OpenSky Network.
          </p>

          {/* Live status bar */}
          <div className="flex flex-wrap items-center gap-4 mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-green-500 animate-pulse" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-mono font-semibold">{onGround.length}</span> aterradas ·{" "}
                <span className="font-mono font-semibold">{airborne.length}</span> em aproximação
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 ml-auto">
              <Clock className="w-3.5 h-3.5" />
              Atualizado às {formatTime(now)}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Flight board                                                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-heading font-bold text-gray-900 dark:text-gray-100 text-base">
              Painel de chegadas — {now.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            <span className="text-xs text-gray-400">janela 2h</span>
          </div>

          {allFlights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <Plane className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Sem dados ADS-B disponíveis de momento.</p>
              <p className="text-xs mt-1">OpenSky atualiza a cada 15 minutos.</p>
            </div>
          ) : (
            <>
              {/* Table header — desktop */}
              <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.2fr] gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                <span>Voo</span>
                <span>País origem</span>
                <span>Altitude</span>
                <span>Velocidade</span>
                <span>Hora</span>
                <span>Estado</span>
              </div>

              <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                {allFlights.map((flight) => {
                  const status = statusLabel(
                    flight.onGround,
                    flight.altitude,
                    flight.verticalRate ?? null
                  );
                  return (
                    <li
                      key={flight.id}
                      className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.2fr] gap-1 sm:gap-3 px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      {/* Flight ID */}
                      <div className="flex items-center gap-2">
                        <Plane className="w-3.5 h-3.5 text-tl-500 dark:text-tl-400 flex-shrink-0" />
                        <span className="font-mono font-semibold text-gray-900 dark:text-gray-100 text-sm">
                          {flight.callsign}
                        </span>
                      </div>

                      {/* Country */}
                      <span className="text-sm text-gray-600 dark:text-gray-300 sm:flex items-center">
                        <span className="sm:hidden text-xs text-gray-400 mr-1">País: </span>
                        {flight.originCountry ?? "—"}
                      </span>

                      {/* Altitude */}
                      <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                        <span className="sm:hidden text-xs text-gray-400 mr-1">Alt: </span>
                        {flight.altitude != null ? `${flight.altitude.toLocaleString("pt-PT")} ft` : "—"}
                      </span>

                      {/* Velocity */}
                      <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                        <span className="sm:hidden text-xs text-gray-400 mr-1">Vel: </span>
                        {flight.velocity != null ? `${Math.round(flight.velocity)} kt` : "—"}
                      </span>

                      {/* Time */}
                      <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                        <span className="sm:hidden text-xs text-gray-400 mr-1">Hora: </span>
                        {formatTime(new Date(flight.createdAt))}
                      </span>

                      {/* Status */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold w-fit ${status.color} ${status.bg}`}
                      >
                        {status.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Cross-links                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section className="flex flex-wrap gap-3">
          <Link
            href={`/aviacao/aeroportos/${slug}/partidas`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
          >
            Partidas {airport.iata}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/aviacao/cancelados"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
          >
            Voos cancelados hoje
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={`/aviacao/aeroportos/${slug}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
          >
            Info {airport.namePt}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* Attribution */}
        <footer className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-4">
          <Info className="w-3 h-3 flex-shrink-0" />
          Dados ADS-B: OpenSky Network (CC BY 4.0). Aeronaves na área do aeroporto (raio 30 km).
          Atualização a cada 15 minutos. O callsign ADS-B pode diferir do número de voo IATA.
        </footer>
      </div>
    </>
  );
}
