/**
 * /aviacao/aeroportos/[iata] — Detalhe aeroporto Portugal (PT locale)
 *
 * Server component (ISR revalidate=300). Mostra informação completa:
 * hero IATA/ICAO, contadores de aeronaves, links chegadas/partidas,
 * parking (placeholder ANA), aluguer carro (placeholder DiscoverCars),
 * FAQ em PT-PT + JSON-LD Airport.
 *
 * Usa catálogo estático PT_AIRPORTS — sem Prisma para aeroportos PT
 * (não estão na tabela Airport que é exclusiva AENA/ES).
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Plane,
  MapPin,
  ArrowRight,
  Info,
  PlaneTakeoff,
  PlaneLanding,
  Car,
  ParkingCircle,
  HelpCircle,
  Navigation,
  Clock,
  ExternalLink,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import {
  getPTAirport,
  PT_AIRPORTS,
  airportBbox,
  REGION_LABELS,
} from "@/lib/aviacao/pt-airports";

export const revalidate = 300;
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

async function getNearbyAircraftCount(lat: number, lng: number) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const bbox = airportBbox(lat, lng, 30);
  return prisma.aircraftPosition.count({
    where: {
      createdAt: { gte: since },
      latitude: { gte: bbox.minLat, lte: bbox.maxLat },
      longitude: { gte: bbox.minLng, lte: bbox.maxLng },
    },
  });
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { iata } = await params;
  const airport = getPTAirport(iata);
  if (!airport) return { title: "Aeroporto não encontrado" };

  const title = `${airport.namePt} (${airport.iata}) — Chegadas, Partidas e Info ao vivo`;
  const description = `Informação completa sobre o ${airport.namePt} em ${airport.city}. Chegadas e partidas ao vivo, parking ANA, aluguer de carro e dados operacionais.`;

  return {
    title,
    description,
    keywords: [
      `aeroporto ${airport.city.toLowerCase()}`,
      `${airport.namePt.toLowerCase()}`,
      `chegadas aeroporto ${airport.city.toLowerCase()}`,
      `partidas aeroporto ${airport.city.toLowerCase()}`,
      `aeroporto ${airport.iata.toLowerCase()}`,
      "ANA aeroportos",
    ],
    alternates: {
      canonical: `${BASE_URL}/aviacao/aeroportos/${airport.iata.toLowerCase()}`,
    },
    openGraph: {
      title: `${airport.namePt} (${airport.iata})`,
      description,
      url: `${BASE_URL}/aviacao/aeroportos/${airport.iata.toLowerCase()}`,
      siteName: "trafico.live",
      locale: "pt_PT",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AeroportoDetailPage({ params }: Props) {
  const { iata } = await params;
  const airport = getPTAirport(iata);
  if (!airport) notFound();

  const nearbyCount = await getNearbyAircraftCount(
    airport.latitude,
    airport.longitude
  );

  const slug = airport.iata.toLowerCase();

  const faqItems = [
    {
      question: `Como chegar ao ${airport.namePt}?`,
      answer: `O ${airport.namePt} está localizado em ${airport.city}. Consulte os transportes públicos locais e as opções de taxi/TVDE disponíveis na área. O estacionamento ANA está disponível no aeroporto.`,
    },
    {
      question: "Onde estão as chegadas ao vivo?",
      answer: `Pode ver o painel de chegadas ao vivo em tempo real na nossa página de chegadas do ${airport.namePt}. Os dados ADS-B são atualizados a cada 15 minutos via OpenSky Network.`,
    },
    {
      question: "Como alugar um carro neste aeroporto?",
      answer: `As principais empresas de aluguer de viaturas (Hertz, Europcar, Budget, Enterprise, DiscoverCars) têm balcões no ${airport.namePt}. Reserve com antecedência para melhores preços.`,
    },
    {
      question: `Qual é o código IATA do ${airport.namePt}?`,
      answer: `O código IATA é ${airport.iata} e o código ICAO é ${airport.icao}. O código IATA é utilizado nos bilhetes de avião; o ICAO é utilizado em operações técnicas de aviação.`,
    },
  ];

  const airportSchema = {
    "@context": "https://schema.org",
    "@type": "Airport",
    name: airport.name,
    iataCode: airport.iata,
    icaoCode: airport.icao,
    description: `${airport.namePt} — aeroporto em ${airport.city}, Portugal.`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: airport.latitude,
      longitude: airport.longitude,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: airport.city,
      addressCountry: "PT",
    },
    url: `${BASE_URL}/aviacao/aeroportos/${slug}`,
    inLanguage: "pt",
    ...(airport.website && { sameAs: airport.website }),
  };

  return (
    <>
      <StructuredData data={airportSchema} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Início", href: "/" },
            { name: "Aviação", href: "/aviacao" },
            { name: "Aeroportos", href: "/aviacao/aeroportos" },
            { name: airport.iata, href: `/aviacao/aeroportos/${slug}` },
          ]}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* ---------------------------------------------------------------- */}
        {/* 1. Hero                                                           */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-tl-50 dark:bg-tl-900/30 flex items-center justify-center">
                  <Plane className="w-6 h-6 text-tl-600 dark:text-tl-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold px-3 py-1 rounded-lg bg-tl-100 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300">
                    {airport.iata}
                  </span>
                  <span className="font-mono text-sm font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {airport.icao}
                  </span>
                  {airport.isAna && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-700 dark:text-tl-amber-300 border border-tl-amber-200 dark:border-tl-amber-800">
                      ANA
                    </span>
                  )}
                </div>
              </div>

              <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {airport.namePt}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {airport.city} · {REGION_LABELS[airport.region]}
                </span>
                <span className="flex items-center gap-1">
                  <Navigation className="w-4 h-4" />
                  <span className="font-mono">
                    {airport.latitude.toFixed(4)}N, {airport.longitude.toFixed(4)}
                    {airport.longitude >= 0 ? "E" : "W"}
                  </span>
                </span>
                {airport.elevation > 0 && (
                  <span className="font-mono">{airport.elevation} ft</span>
                )}
              </div>

              {airport.website && (
                <a
                  href={airport.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-tl-600 dark:text-tl-400 hover:underline mt-2"
                >
                  Site oficial ANA
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Live aircraft badge */}
            <div className="flex-shrink-0">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-center min-w-[140px]">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Aeronaves próximas
                  </span>
                </div>
                <div className="font-mono text-4xl font-bold text-tl-600 dark:text-tl-400">
                  {nearbyCount.toLocaleString("pt-PT")}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  raio 30 km / última hora
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 2. Chegadas / Partidas — acesso rápido                           */}
        {/* ---------------------------------------------------------------- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href={`/aviacao/aeroportos/${slug}/chegadas`}
            className="group flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-tl-400 dark:hover:border-tl-600 p-6 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-tl-50 dark:bg-tl-900/30 flex items-center justify-center group-hover:bg-tl-100 dark:group-hover:bg-tl-900/50 transition-colors">
                <PlaneLanding className="w-6 h-6 text-tl-600 dark:text-tl-400" />
              </div>
              <div>
                <p className="font-heading font-bold text-gray-900 dark:text-gray-100">
                  Chegadas ao vivo
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Painel em tempo real
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-tl-500 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href={`/aviacao/aeroportos/${slug}/partidas`}
            className="group flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-tl-400 dark:hover:border-tl-600 p-6 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center group-hover:bg-gray-100 dark:group-hover:bg-gray-800 transition-colors">
                <PlaneTakeoff className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-heading font-bold text-gray-900 dark:text-gray-100">
                  Partidas ao vivo
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Painel em tempo real
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-tl-500 group-hover:translate-x-1 transition-all" />
          </Link>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 3. Serviços — Parking + Aluguer carro (placeholders afiliados)   */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
            Serviços no aeroporto
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Parking */}
            <div className="flex flex-col gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4">
              <div className="flex items-center gap-2">
                <ParkingCircle className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  Parque de estacionamento
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Estacionamento oficial ANA disponível no aeroporto. Reserve com antecedência
                para melhores tarifas.
              </p>
              {airport.website ? (
                <a
                  href={`${airport.website}/estacionamento`}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-tl-600 dark:text-tl-400 hover:underline"
                >
                  Ver tarifas ANA
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-xs text-gray-400">Em breve</span>
              )}
            </div>

            {/* Aluguer carro */}
            <div className="flex flex-col gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 p-4">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  Aluguer de carro
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Compare preços das principais rent-a-car com recolha no aeroporto. Hertz,
                Europcar, Budget e mais.
              </p>
              {/* Affiliate placeholder — DiscoverCars */}
              <a
                href={`https://www.discovercars.com/portugal/${airport.city.toLowerCase()}-airport`}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-tl-amber-600 dark:text-tl-amber-400 hover:underline"
              >
                Comparar preços
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 4. Info operacional                                               */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
            Informação operacional
          </h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Código IATA
              </dt>
              <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                {airport.iata}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Código ICAO
              </dt>
              <dd className="font-mono font-bold text-gray-900 dark:text-gray-100">
                {airport.icao}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Cidade
              </dt>
              <dd className="text-gray-900 dark:text-gray-100">{airport.city}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Região
              </dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {REGION_LABELS[airport.region]}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Elevação
              </dt>
              <dd className="font-mono text-gray-900 dark:text-gray-100">
                {airport.elevation} ft
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Operador
              </dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {airport.isAna ? "ANA Aeroportos" : "Outro"}
              </dd>
            </div>
          </dl>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 5. FAQ                                                            */}
        {/* ---------------------------------------------------------------- */}
        <FAQAccordion
          items={faqItems}
          title={`Perguntas frequentes — ${airport.namePt}`}
        />

        {/* Attribution */}
        <footer className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-4">
          <Info className="w-3 h-3 flex-shrink-0" />
          Fontes: ANA Aeroportos de Portugal, OpenSky Network (ADS-B, CC BY 4.0), OurAirports.
          Posições de aeronaves atualizadas a cada 15 minutos.
        </footer>
      </div>
    </>
  );
}
