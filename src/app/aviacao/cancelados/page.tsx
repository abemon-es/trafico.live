/**
 * /aviacao/cancelados — Voos cancelados hoje (PT)
 *
 * TARGET KEYWORDS:
 *   "voos cancelados hoje" 1.600/KD 0
 *   "voos cancelados madeira hoje" 1.900/KD 0 · CPC €8,17 (alta intenção)
 *   "voos cancelados tap hoje" 590/KD 0
 *
 * Nota: OpenSky ADS-B não fornece estado "cancelado" explícito.
 * A página explica isso claramente e oferece fontes alternativas
 * (ANA.pt, TAP, FlightAware) + CTA de reclamação (afiliado).
 * O valor SEO está na landing resolver o intent — audiência em
 * emergência (Madeira, disrupções) com CPC €8,17.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  Info,
  Plane,
  Radio,
  MapPin,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { PT_HUB_AIRPORTS, PT_AIRPORTS, airportBbox } from "@/lib/aviacao/pt-airports";

export const revalidate = 120;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Data — count aeronaves por aeroporto (proxy de atividade)
// ---------------------------------------------------------------------------

async function getActivityByAirport() {
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const results = await Promise.all(
    PT_AIRPORTS.filter((a) => ["LIS", "OPO", "FNC", "FAO", "PDL"].includes(a.iata)).map(
      async (airport) => {
        const bbox = airportBbox(airport.latitude, airport.longitude, 30);
        const count = await prisma.aircraftPosition.count({
          where: {
            createdAt: { gte: since },
            latitude: { gte: bbox.minLat, lte: bbox.maxLat },
            longitude: { gte: bbox.minLng, lte: bbox.maxLng },
          },
        });
        return { airport, count };
      }
    )
  );
  return results;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Voos cancelados hoje em Portugal · Verificar cancelamentos | trafico.live",
  description:
    "Verifique voos cancelados hoje nos aeroportos portugueses — Lisboa, Porto, Madeira e Faro. Como reclamar indemnização por voo cancelado ao abrigo do Regulamento CE 261/2004.",
  keywords: [
    "voos cancelados hoje",
    "voos cancelados madeira hoje",
    "voos cancelados tap hoje",
    "voo cancelado lisboa",
    "reclamar voo cancelado",
    "indemnização voo cancelado",
    "ce 261/2004",
  ],
  alternates: { canonical: `${BASE_URL}/aviacao/cancelados` },
  openGraph: {
    title: "Voos cancelados hoje em Portugal",
    description:
      "Verificar cancelamentos de voos em Lisboa, Porto, Madeira. Como reclamar compensação CE 261/2004.",
    url: `${BASE_URL}/aviacao/cancelados`,
    siteName: "trafico.live",
    locale: "pt_PT",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Static source links
// ---------------------------------------------------------------------------

const FLIGHT_SOURCES = [
  {
    name: "ANA Aeroportos — Chegadas/Partidas",
    url: "https://www.ana.pt/pt/lis/voos/chegadas",
    description: "Painel oficial ANA com estado atual de todos os voos (inclui cancelados)",
  },
  {
    name: "FlightAware — Portugal",
    url: "https://www.flightaware.com/live/country/PRT",
    description: "Radar global com filtro de cancelamentos e atrasos em tempo real",
  },
  {
    name: "TAP Air Portugal — Estado do voo",
    url: "https://www.flytap.com/pt-pt/gerir-a-minha-viagem/estado-do-voo",
    description: "Estado em tempo real de voos TAP, atrasos e cancelamentos",
  },
  {
    name: "Flightradar24",
    url: "https://www.flightradar24.com/",
    description: "Radar ADS-B global com informação de voos em tempo real",
  },
];

const CLAIM_SOURCES = [
  {
    name: "AirHelp (afiliado)",
    url: "https://www.airhelp.com/pt/",
    description: "Reclamação automática — sem taxa inicial, cobramos só se ganhar",
    affiliate: true,
  },
  {
    name: "ANAC — Reclamações",
    url: "https://www.anac.pt/vPT/Generico/Passageiros/Reclamacoes/Paginas/Reclamacoes.aspx",
    description: "Autoridade Nacional de Aviação Civil — formulário oficial",
    affiliate: false,
  },
  {
    name: "Portal da Queixa",
    url: "https://portaldaqueixa.com/",
    description: "Plataforma portuguesa de reclamações de consumidores",
    affiliate: false,
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CanceladosPage() {
  const activityData = await getActivityByAirport();
  const now = new Date();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "pt",
    mainEntity: [
      {
        "@type": "Question",
        name: "Tenho direito a indemnização por voo cancelado?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sim, ao abrigo do Regulamento CE 261/2004, tem direito a compensação entre €250 e €600 dependendo da distância do voo, se o cancelamento foi comunicado com menos de 14 dias de antecedência e a companhia não apresentar circunstâncias extraordinárias.",
        },
      },
      {
        "@type": "Question",
        name: "Como verificar se o meu voo foi cancelado?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Consulte o painel de chegadas/partidas ANA em ana.pt, o site da companhia aérea, ou use o FlightAware/Flightradar24. Os dados ADS-B não incluem estado de cancelamento — são apenas posições de aeronaves em voo.",
        },
      },
      {
        "@type": "Question",
        name: "O que fazer se o meu voo da Madeira for cancelado?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Solicite imediatamente à companhia aérea transporte alternativo ou reembolso. Guarde todos os comprovativos. Se não houver solução imediata, tem direito a refeições e alojamento. Pode reclamar compensação CE 261/2004 até 3 anos depois.",
        },
      },
    ],
  };

  return (
    <>
      <StructuredData data={faqSchema} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Início", href: "/" },
            { name: "Aviação", href: "/aviacao" },
            { name: "Voos cancelados", href: "/aviacao/cancelados" },
          ]}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                              */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">
              Disrupções · Hoje
            </span>
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Voos cancelados hoje em Portugal
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl">
            Verifique cancelamentos de voos nos aeroportos portugueses e saiba como
            reclamar indemnização ao abrigo do Regulamento CE 261/2004.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Atividade por aeroporto (proxy ADS-B)                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-4 h-4 text-green-500 animate-pulse" />
            <h2 className="font-heading font-bold text-gray-900 dark:text-gray-100 text-base">
              Atividade ADS-B por aeroporto — últimas 3 horas
            </h2>
          </div>

          <div className="bg-tl-amber-50 dark:bg-tl-amber-900/10 rounded-xl border border-tl-amber-200 dark:border-tl-amber-800/30 p-4 mb-4 text-sm text-tl-amber-700 dark:text-tl-amber-300">
            <strong>Nota:</strong> Os dados ADS-B mostram aeronaves em voo — não incluem
            estado de cancelamento. Para confirmação oficial de cancelamentos, consulte as
            fontes abaixo.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activityData.map(({ airport, count }) => (
              <div
                key={airport.iata}
                className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm px-2 py-0.5 rounded bg-tl-100 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300">
                      {airport.iata}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {airport.city}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-lg text-gray-900 dark:text-gray-100">
                    {count}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  aeronaves detectadas (raio 30 km)
                </p>
                <div className="flex flex-col gap-1">
                  <Link
                    href={`/aviacao/aeroportos/${airport.iata.toLowerCase()}/chegadas`}
                    className="flex items-center justify-between text-xs text-tl-600 dark:text-tl-400 hover:underline"
                  >
                    Ver chegadas ao vivo
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  <Link
                    href={`/aviacao/aeroportos/${airport.iata.toLowerCase()}/partidas`}
                    className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 hover:underline"
                  >
                    Ver partidas ao vivo
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Fontes oficiais para verificar cancelamentos                      */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-heading font-bold text-gray-900 dark:text-gray-100 text-xl mb-4">
            Verificar cancelamentos — fontes oficiais
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FLIGHT_SOURCES.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 hover:bg-tl-50/50 dark:hover:bg-tl-900/10 transition-all group"
              >
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors">
                    {source.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {source.description}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-tl-500 flex-shrink-0 mt-0.5 transition-colors" />
              </a>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Reclamar voo cancelado — CTA afiliado (alta CPC Madeira)          */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="font-heading font-bold text-gray-900 dark:text-gray-100 text-xl">
              Reclamar voo cancelado
            </h2>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none mb-6 text-gray-700 dark:text-gray-300">
            <p>
              Ao abrigo do <strong>Regulamento CE 261/2004</strong>, tem direito a
              compensação entre <strong>€250 e €600</strong> se o seu voo foi cancelado com
              menos de 14 dias de antecedência e a companhia não invocar circunstâncias
              extraordinárias (condições meteorológicas extremas, greve, etc.).
            </p>
            <ul className="text-sm space-y-1">
              <li>Voos até 1.500 km — €250 por passageiro</li>
              <li>Voos entre 1.500 km e 3.500 km — €400 por passageiro</li>
              <li>Voos acima de 3.500 km — €600 por passageiro</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CLAIM_SOURCES.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel={source.affiliate ? "noopener noreferrer sponsored" : "noopener noreferrer"}
                className={`flex flex-col gap-2 p-4 rounded-xl border transition-all group ${
                  source.affiliate
                    ? "border-red-200 dark:border-red-700 bg-white dark:bg-gray-900 hover:border-red-400 dark:hover:border-red-500"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {source.name}
                  </p>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {source.description}
                </p>
                {source.affiliate && (
                  <span className="text-[10px] text-gray-400">* link de parceiro</span>
                )}
              </a>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* FAQ sobre CE 261/2004                                             */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
          <h2 className="font-heading font-bold text-gray-900 dark:text-gray-100 text-xl">
            Perguntas frequentes sobre voos cancelados
          </h2>
          {[
            {
              q: "Tenho direito a indemnização por voo cancelado?",
              a: "Sim, ao abrigo do Regulamento CE 261/2004, tem direito a compensação entre €250 e €600 dependendo da distância do voo, se o cancelamento foi comunicado com menos de 14 dias de antecedência e a companhia não apresentar circunstâncias extraordinárias.",
            },
            {
              q: "O que fazer se o voo da Madeira for cancelado?",
              a: "Solicite imediatamente à companhia aérea transporte alternativo ou reembolso. Guarde todos os comprovativos (cartão de embarque, emails). Se não houver solução imediata, tem direito a refeições, alojamento e comunicação. Pode reclamar compensação até 3 anos depois.",
            },
            {
              q: "Como verificar se o meu voo foi cancelado?",
              a: "Consulte o painel oficial ANA em ana.pt, o site da sua companhia aérea, ou use o FlightAware/Flightradar24. Os dados ADS-B desta página mostram aeronaves em voo — não incluem estado de cancelamento.",
            },
            {
              q: "Cancelamentos por mau tempo dão direito a compensação?",
              a: "Não. Condições meteorológicas extremas são consideradas 'circunstâncias extraordinárias' ao abrigo do CE 261/2004. No entanto, mesmo nesses casos tem direito a refeições, alojamento e reembolso ou alternativa de transporte.",
            },
          ].map((item, i) => (
            <details key={i} className="group border-b border-gray-100 dark:border-gray-800 last:border-0 pb-4 last:pb-0">
              <summary className="flex items-center justify-between cursor-pointer py-1 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-tl-600 dark:hover:text-tl-400 list-none">
                {item.q}
                <ArrowRight className="w-4 h-4 text-gray-400 rotate-90 group-open:-rotate-90 transition-transform flex-shrink-0 ml-2" />
              </summary>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 pl-0">
                {item.a}
              </p>
            </details>
          ))}
        </section>

        {/* Cross-links per airport */}
        <section>
          <h2 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-base mb-3">
            Consultar por aeroporto
          </h2>
          <div className="flex flex-wrap gap-2">
            {PT_AIRPORTS.filter((a) => a.isAna).map((a) => (
              <Link
                key={a.iata}
                href={`/aviacao/aeroportos/${a.iata.toLowerCase()}/chegadas`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-tl-50 dark:hover:bg-tl-900/20 border border-gray-200 dark:border-gray-700 hover:border-tl-300 dark:hover:border-tl-700 text-sm text-gray-700 dark:text-gray-300 hover:text-tl-700 dark:hover:text-tl-300 transition-all"
              >
                <Plane className="w-3.5 h-3.5" />
                {a.iata} · {a.city}
              </Link>
            ))}
          </div>
        </section>

        {/* Attribution */}
        <footer className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-4">
          <Info className="w-3 h-3 flex-shrink-0" />
          Dados ADS-B: OpenSky Network (CC BY 4.0). Informação de cancelamentos: ANA Aeroportos, companhias aéreas.
          Regulamento: CE 261/2004 do Parlamento Europeu.
        </footer>
      </div>
    </>
  );
}
