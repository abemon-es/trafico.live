/**
 * /aviacao — Hub de Aviação Portugal (PT locale)
 *
 * Target keywords:
 *   "voos em tempo real" 12.100/KD 7
 *   "radar avioes" — via /aviacao/mapa
 *   Cluster C13 PT: chegadas/partidas Lisboa, Porto, Madeira
 *
 * Estrutura idêntica a /aviacion (ES) mas 100% PT-PT.
 * Hard-coded PT text — sem infraestrutura i18n nova.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  Plane,
  PlaneTakeoff,
  MapPin,
  Users,
  Radio,
  BarChart3,
  Navigation,
  Info,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { StructuredData } from "@/components/seo/StructuredData";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { VerticalHub } from "@/components/ui/VerticalHub";
import { StatCard } from "@/components/ui/StatCard";
import { TickerStrip, type TickerItem } from "@/components/ui/TickerStrip";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { ButtonLink } from "@/components/ui/Button";
import { AviationHeroMap } from "@/app/aviacion/AviationHeroMap";
import { PT_HUB_AIRPORTS, PT_BBOX } from "@/lib/aviacao/pt-airports";

export const revalidate = 180;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getHubData() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [airborne, onGround] = await Promise.all([
    prisma.aircraftPosition.count({
      where: {
        createdAt: { gte: oneHourAgo },
        onGround: false,
        latitude: { gte: PT_BBOX.minLat, lte: PT_BBOX.maxLat },
        longitude: { gte: PT_BBOX.minLng, lte: PT_BBOX.maxLng },
      },
    }),
    prisma.aircraftPosition.count({
      where: {
        createdAt: { gte: oneHourAgo },
        onGround: true,
        latitude: { gte: PT_BBOX.minLat, lte: PT_BBOX.maxLat },
        longitude: { gte: PT_BBOX.minLng, lte: PT_BBOX.maxLng },
      },
    }),
  ]);

  return { airborne, onGround };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Voos em tempo real sobre Portugal · Radar ADS-B | trafico.live",
  description:
    "Radar de aviões em tempo real sobre o espaço aéreo português. Posições ADS-B OpenSky, chegadas e partidas Lisboa, Porto e Madeira ao vivo.",
  keywords: [
    "voos em tempo real",
    "radar avioes portugal",
    "chegadas aeroporto lisboa",
    "partidas aeroporto porto",
    "chegadas aeroporto madeira",
    "ADS-B portugal",
    "aeroportos ANA",
    "voos direto",
  ],
  alternates: {
    canonical: `${BASE_URL}/aviacao`,
    languages: {
      "pt-PT": `${BASE_URL}/aviacao`,
      "es-ES": `${BASE_URL}/aviacion`,
    },
  },
  openGraph: {
    title: "Voos em tempo real sobre Portugal · Radar ADS-B",
    description:
      "Radar de aviões em tempo real. Posições ADS-B sobre o espaço aéreo português, chegadas e partidas ao vivo.",
    url: `${BASE_URL}/aviacao`,
    siteName: "trafico.live",
    locale: "pt_PT",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

const FAQ_ITEMS = [
  {
    question: "De onde vêm as posições das aeronaves?",
    answer:
      "As posições ADS-B provêm da rede OpenSky Network, uma rede colaborativa de recetores terrestres com licença Creative Commons (CC BY 4.0). O nosso coletor consulta a API OpenSky a cada 15 minutos, limitado ao espaço aéreo português.",
  },
  {
    question: "O que é a ANA Aeroportos?",
    answer:
      "ANA – Aeroportos de Portugal gere os principais aeroportos nacionais, incluindo Lisboa (LIS), Porto (OPO), Faro (FAO) e a Madeira (FNC). Faz parte do grupo VINCI Airports desde 2012.",
  },
  {
    question: "Por que razão alguns aviões não aparecem no mapa?",
    answer:
      "Nem todas as aeronaves emitem ADS-B ou são visíveis para os recetores OpenSky. Helicópteros, aviação geral e militar podem emitir noutras frequências ou com o transponder desligado. Os voos comerciais regulares têm a melhor cobertura.",
  },
  {
    question: "Com que frequência são atualizados os dados de chegadas?",
    answer:
      "As posições ADS-B são atualizadas a cada 15 minutos. Para chegadas e partidas em tempo real recomendamos combinar o radar com a informação ANA / FlightAware para maior precisão de horários.",
  },
  {
    question: "O que é o código IATA de um aeroporto?",
    answer:
      "O código IATA é um código de 3 letras utilizado nos bilhetes de avião — LIS para Lisboa, OPO para Porto, FNC para a Madeira. O código ICAO (4 letras) é utilizado em operações de aviação técnica: LPPT, LPPR, LPMA.",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AviacacoHubPage() {
  const data = await getHubData();

  const breadcrumbs = [{ name: "Aviação", href: "/aviacao" }];

  // Structured data
  const mapSchema = {
    "@context": "https://schema.org",
    "@type": "Map",
    name: "Radar de voos em tempo real — Portugal",
    description:
      "Mapa interativo com posições ADS-B de aeronaves sobre o espaço aéreo português, atualizado a cada 15 minutos a partir do OpenSky Network.",
    url: `${BASE_URL}/aviacao`,
    inLanguage: "pt",
  };

  const dataFeedSchema = {
    "@context": "https://schema.org",
    "@type": "DataFeed",
    name: "Posições ADS-B aeronaves sobre Portugal",
    description:
      "Feed de posições ADS-B em tempo real de aeronaves sobre o espaço aéreo português. Fonte: OpenSky Network (CC BY 4.0).",
    url: `${BASE_URL}/api/aviacion`,
    encodingFormat: "application/geo+json",
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: {
      "@type": "Organization",
      name: "OpenSky Network",
      url: "https://opensky-network.org",
    },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
    dateModified: new Date().toISOString(),
    inLanguage: "pt",
  };

  const ticker: TickerItem[] = [
    {
      id: "airborne",
      icon: <PlaneTakeoff className="w-3.5 h-3.5" />,
      label: "Em voo agora",
      value: data.airborne.toLocaleString("pt-PT"),
    },
    {
      id: "airports",
      icon: <MapPin className="w-3.5 h-3.5" />,
      label: "Aeroportos ANA",
      value: "10",
    },
    ...PT_HUB_AIRPORTS.map((a) => ({
      id: `airport-${a.iata}`,
      icon: <Plane className="w-3.5 h-3.5" />,
      label: `${a.iata} · ${a.namePt}`,
      value: a.city,
    })),
  ];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
          <Plane className="w-4 h-4" />
          trafico.live · Aviação Portugal
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Radar de voos em tempo real
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Posições ADS-B de aeronaves sobre o espaço aéreo português em tempo real.
          Chegadas e partidas ao vivo em Lisboa, Porto, Madeira e Açores. Dados CC-BY 4.0
          via OpenSky Network.
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          <ButtonLink
            href="/aviacao/aeroportos/lis/chegadas"
            variant="primary"
            icon={<Navigation className="w-4 h-4" />}
          >
            Chegadas Lisboa
          </ButtonLink>
          <ButtonLink href="/aviacao/aeroportos/opo/chegadas" variant="secondary">
            Chegadas Porto
          </ButtonLink>
          <ButtonLink href="/aviacao/aeroportos/fnc/chegadas" variant="secondary">
            Chegadas Madeira
          </ButtonLink>
          <ButtonLink href="/aviacao/cancelados" variant="ghost">
            Voos cancelados
          </ButtonLink>
        </div>
      </div>
      <div className="h-[500px] md:h-[600px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
        <AviationHeroMap />
      </div>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Em voo agora"
        value={data.airborne.toLocaleString("pt-PT")}
        hint="última hora · espaço PT"
        icon={PlaneTakeoff}
        accent="tl"
      />
      <StatCard
        label="Em terra"
        value={data.onGround.toLocaleString("pt-PT")}
        hint="última hora"
        icon={MapPin}
        accent="tl"
      />
      <StatCard
        label="Aeroportos ANA"
        value="10"
        hint="rede nacional"
        icon={Users}
        accent="tl"
      />
      <StatCard
        label="Estimativa voos/dia"
        value={Math.round((data.airborne + data.onGround) * 1.4).toLocaleString("pt-PT")}
        hint="estimativa"
        icon={BarChart3}
        accent="tl"
      />
    </div>
  );

  const sections = [
    {
      id: "aeroportos-principais",
      title: "Aeroportos principais",
      description: "Lisboa, Porto e Madeira — chegadas e partidas ao vivo.",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PT_HUB_AIRPORTS.map((a) => (
            <div
              key={a.iata}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold px-3 py-1 rounded-lg bg-tl-100 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300">
                  {a.iata}
                </span>
                {a.isAna && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-700 dark:text-tl-amber-300 border border-tl-amber-200 dark:border-tl-amber-800">
                    ANA
                  </span>
                )}
              </div>
              <div>
                <p className="font-heading font-bold text-gray-900 dark:text-gray-100 text-sm">
                  {a.namePt}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{a.city}</p>
              </div>
              <div className="flex flex-col gap-1.5 mt-auto">
                <Link
                  href={`/aviacao/aeroportos/${a.iata.toLowerCase()}/chegadas`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-tl-50 dark:bg-tl-900/20 hover:bg-tl-100 dark:hover:bg-tl-900/40 transition-colors text-sm font-medium text-tl-700 dark:text-tl-300"
                >
                  <span>Chegadas ao vivo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/aviacao/aeroportos/${a.iata.toLowerCase()}/partidas`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <span>Partidas ao vivo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/aviacao/aeroportos/${a.iata.toLowerCase()}`}
                  className="text-xs text-center text-gray-400 hover:text-tl-600 dark:hover:text-tl-400 transition-colors mt-1"
                >
                  Info aeroporto →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "radar",
      title: "Aeronaves em tempo real",
      description: "Posições ADS-B captadas pelo OpenSky sobre o espaço aéreo português.",
      content: (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <Radio className="w-4 h-4 text-green-500 animate-pulse" />
            <span>
              <span className="font-data font-semibold">
                {data.airborne.toLocaleString("pt-PT")}
              </span>{" "}
              aeronaves em voo,{" "}
              <span className="font-data font-semibold">
                {data.onGround.toLocaleString("pt-PT")}
              </span>{" "}
              em terra
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/aviacao/cancelados" variant="ghost">
              Voos cancelados
            </ButtonLink>
          </div>
        </div>
      ),
    },
    {
      id: "outros-aeroportos",
      title: "Outros aeroportos",
      description: "Rede completa de aeroportos em Portugal — Açores e Madeira incluídos.",
      content: (
        <RelatedLinks
          columns={3}
          title=""
          items={[
            {
              title: "FAO · Faro",
              description: "Algarve — Portugal Continental",
              href: "/aviacao/aeroportos/fao",
              icon: Plane,
            },
            {
              title: "PDL · Ponta Delgada",
              description: "Açores — João Paulo II",
              href: "/aviacao/aeroportos/pdl",
              icon: Plane,
            },
            {
              title: "TER · Terceira",
              description: "Açores — Lajes",
              href: "/aviacao/aeroportos/ter",
              icon: Plane,
            },
            {
              title: "HOR · Horta",
              description: "Açores — Faial",
              href: "/aviacao/aeroportos/hor",
              icon: Plane,
            },
            {
              title: "Todos os aeroportos",
              description: "Catálogo completo Portugal",
              href: "/aviacao/aeroportos",
              icon: MapPin,
            },
          ]}
        />
      ),
    },
  ];

  const faq = (
    <FAQAccordion items={FAQ_ITEMS} title="Perguntas frequentes — aviação Portugal" />
  );

  return (
    <>
      <StructuredData data={[mapSchema, dataFeedSchema]} />
      <VerticalHub
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        hero={hero}
        ticker={<TickerStrip items={ticker} label="Dados aéreos em direto" />}
        stats={stats}
        sections={sections}
        faq={faq}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <RelatedLinks
          columns={3}
          items={[
            {
              title: "Voos cancelados hoje",
              description: "Filtro de cancelamentos por aeroporto",
              href: "/aviacao/cancelados",
              icon: Plane,
            },
            {
              title: "Aviação Espanha",
              description: "Radar ADS-B · aeropuertos AENA",
              href: "/aviacion",
              icon: MapPin,
            },
            {
              title: "Tráfico marítimo",
              description: "AIS em direto · portos e ferries",
              href: "/maritimo",
              icon: MapPin,
            },
          ]}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          Fontes: OpenSky Network (ADS-B, CC-BY 4.0), ANA Aeroportos de Portugal, OurAirports.
        </p>
      </div>
    </>
  );
}
