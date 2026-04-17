import type { Metadata } from "next";
import Link from "next/link";
import {
  Plane,
  PlaneTakeoff,
  MapPin,
  Users,
  Radio,
  BarChart3,
  Globe,
  Navigation,
  Info,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { VerticalHub } from "@/components/ui/VerticalHub";
import { StatCard } from "@/components/ui/StatCard";
import { TickerStrip, type TickerItem } from "@/components/ui/TickerStrip";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { ButtonLink } from "@/components/ui/Button";
import { StructuredData } from "@/components/seo/StructuredData";
import { AviationHeroMap } from "./AviationHeroMap";

export const revalidate = 180;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Tráfico aéreo en España — Aeronaves en vivo y aeropuertos AENA",
  description:
    "Aeronaves sobre el espacio aéreo español en tiempo real (OpenSky), 46 aeropuertos AENA, estadísticas de pasajeros Eurostat y rutas principales.",
  alternates: { canonical: `${BASE_URL}/aviacion` },
  openGraph: {
    title: "Tráfico aéreo España — OpenSky y AENA",
    description: "Aeronaves en vuelo, aeropuertos AENA y estadísticas de pasajeros.",
    url: `${BASE_URL}/aviacion`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

async function getHubData() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [aenaCount, totalAirports, airborne, onGround, totalPaxAgg, topAirports] = await Promise.all([
    prisma.airport.count({ where: { isAena: true } }),
    prisma.airport.count(),
    prisma.aircraftPosition.count({
      where: { createdAt: { gte: oneHourAgo }, onGround: false },
    }),
    prisma.aircraftPosition.count({
      where: { createdAt: { gte: oneHourAgo }, onGround: true },
    }),
    prisma.airportStatistic.aggregate({
      where: { metric: "pax", periodType: "yearly" },
      _sum: { value: true },
      _max: { periodStart: true },
    }),
    prisma.airport.findMany({
      where: { isAena: true },
      include: {
        statistics: {
          where: { metric: "pax", periodType: "monthly" },
          orderBy: { periodStart: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
      take: 40,
    }),
  ]);

  const sortedAirports = topAirports
    .map((a) => ({
      id: a.id,
      iata: a.iata,
      icao: a.icao,
      name: a.name,
      city: a.city,
      pax: a.statistics[0] ? Number(a.statistics[0].value) : null,
    }))
    .sort((a, b) => (b.pax ?? -1) - (a.pax ?? -1))
    .slice(0, 6);

  return {
    aenaCount,
    totalAirports,
    airborne,
    onGround,
    totalPaxAnnual: totalPaxAgg._sum.value ? Number(totalPaxAgg._sum.value) : null,
    topAirports: sortedAirports,
  };
}

const FAQ_ITEMS = [
  {
    question: "¿De dónde provienen las posiciones de aeronaves?",
    answer:
      "Las posiciones ADS-B proceden del OpenSky Network, una red colaborativa de receptores terrestres bajo licencia Creative Commons (CC BY 4.0). Nuestro colector consulta la API de OpenSky cada 15 minutos limitado al espacio aéreo español.",
  },
  {
    question: "¿Qué es AENA y cuántos aeropuertos gestiona?",
    answer:
      "AENA (Aeropuertos Españoles y Navegación Aérea) es la entidad gestora del 99 % del tráfico aéreo comercial en España. Opera 46 aeropuertos y 2 helipuertos, siendo el mayor operador aeroportuario del mundo por volumen de pasajeros.",
  },
  {
    question: "¿Por qué algunas aeronaves no aparecen en el mapa?",
    answer:
      "No todas las aeronaves emiten ADS-B o están visibles para los receptores de OpenSky. Helicópteros, aviación general y militar pueden emitir en otras frecuencias o con transpondedor apagado. Los vuelos comerciales regulares son los que mejor cobertura tienen.",
  },
  {
    question: "¿Qué son los códigos IATA e ICAO?",
    answer:
      "IATA es un código de 3 letras usado en billetes (MAD, BCN). ICAO es un código de 4 letras usado en aviación técnica (LEMD, LEBL). Ambos identifican el mismo aeropuerto pero en contextos distintos: IATA para pasajeros, ICAO para operaciones.",
  },
  {
    question: "¿Con qué frecuencia se actualizan las estadísticas de pasajeros?",
    answer:
      "Las estadísticas mensuales provienen de AENA Aeropuertos y se publican aproximadamente con dos semanas de retraso. Las series anuales se completan con datos Eurostat AVIA_PAOA. La base se sincroniza una vez al día.",
  },
];

export default async function AviacionHubPage() {
  const data = await getHubData();

  const breadcrumbs = [{ name: "Aviación", href: "/aviacion" }];

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: "Espacio aéreo y aeropuertos de España",
    description: "Espacio aéreo controlado por ENAIRE y red AENA de aeropuertos.",
    url: `${BASE_URL}/aviacion`,
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Aviación en España",
    url: `${BASE_URL}/aviacion`,
    inLanguage: "es",
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  };

  const ticker: TickerItem[] = [
    { id: "airborne", icon: <PlaneTakeoff className="w-3.5 h-3.5" />, label: "En vuelo ahora", value: data.airborne.toLocaleString("es-ES") },
    { id: "aena", icon: <MapPin className="w-3.5 h-3.5" />, label: "Aeropuertos AENA", value: data.aenaCount },
    { id: "pax", icon: <Users className="w-3.5 h-3.5" />, label: "Pasajeros/año", value: data.totalPaxAnnual ? `${(data.totalPaxAnnual / 1_000_000).toFixed(0)}M` : "—" },
    ...data.topAirports.slice(0, 5).map((a) => ({
      id: `airport-${a.id}`,
      icon: <Plane className="w-3.5 h-3.5" />,
      label: `${a.iata ?? a.icao} · ${a.name}`,
      value: a.pax ? `${(a.pax / 1_000_000).toFixed(1)}M pax` : "—",
    })),
  ];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
          <Plane className="w-4 h-4" />
          trafico.live · Aviación
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Tráfico aéreo en España
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Aeronaves sobre el espacio aéreo español en tiempo real (OpenSky), catálogo AENA
          y estadísticas de pasajeros. Datos ADS-B bajo licencia CC-BY 4.0.
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          <ButtonLink href="/aviacion/mapa" variant="primary" icon={<Navigation className="w-4 h-4" />}>
            Abrir mapa completo
          </ButtonLink>
          <ButtonLink href="/aviacion/aeropuertos" variant="secondary">
            Aeropuertos AENA
          </ButtonLink>
          <ButtonLink href="/vuelos" variant="ghost">
            Tracker de vuelos
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
      <StatCard label="En vuelo ahora" value={data.airborne.toLocaleString("es-ES")} hint="última hora" icon={PlaneTakeoff} accent="tl" />
      <StatCard label="Aeropuertos AENA" value={data.aenaCount} hint={`de ${data.totalAirports} en catálogo`} icon={MapPin} accent="tl" />
      <StatCard label="Pasajeros/año" value={data.totalPaxAnnual ? `${(data.totalPaxAnnual / 1_000_000).toFixed(0)}M` : "—"} hint="último anuario" icon={Users} accent="tl" />
      <StatCard label="Vuelos/día" value={Math.round((data.airborne + data.onGround) * 1.2).toLocaleString("es-ES")} hint="estimación" icon={BarChart3} accent="tl" />
    </div>
  );

  const sections = [
    {
      id: "vuelos",
      title: "Aeronaves en tiempo real",
      description: "Posiciones ADS-B captadas por OpenSky sobre el espacio aéreo español.",
      content: (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <Radio className="w-4 h-4 text-signal-green animate-pulse" />
            <span>
              <span className="font-data font-semibold">{data.airborne.toLocaleString("es-ES")}</span>{" "}
              aeronaves airborne, {data.onGround.toLocaleString("es-ES")} en tierra
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/vuelos" variant="primary">Tracker live</ButtonLink>
            <ButtonLink href="/aviacion/mapa" variant="ghost">Mapa del tráfico aéreo</ButtonLink>
          </div>
        </div>
      ),
    },
    {
      id: "aeropuertos",
      title: "Aeropuertos AENA",
      description: `Catálogo de ${data.aenaCount} aeropuertos comerciales de la red AENA.`,
      content: (
        <RelatedLinks
          columns={3}
          title=""
          items={data.topAirports.slice(0, 6).map((a) => ({
            title: `${a.iata ?? a.icao} · ${a.name}`,
            description: a.pax ? `${(a.pax / 1_000_000).toFixed(1)}M pax último mes` : (a.city ?? ""),
            href: `/aviacion/aeropuertos/${a.id}`,
            icon: Plane,
          }))}
        />
      ),
    },
    {
      id: "rutas",
      title: "Rutas principales",
      description: "Top rutas domésticas e internacionales por volumen de pasajeros.",
      content: (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Madrid-Barcelona lidera el puente aéreo europeo con más de 2,5M pasajeros/año.
            Las rutas a Canarias y Baleares son, en conjunto, la red de vuelos regulares más
            densa de España, con frecuencia horaria en temporada alta.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/aviacion/aeropuertos" variant="secondary">Estadísticas por aeropuerto</ButtonLink>
            <ButtonLink href="https://www.aena.es" target="_blank" rel="noreferrer" variant="ghost">Fuente AENA</ButtonLink>
          </div>
        </div>
      ),
    },
  ];

  const faq = <FAQAccordion items={FAQ_ITEMS} title="Preguntas frecuentes — aviación" />;

  return (
    <>
      <StructuredData data={[placeSchema, collectionSchema]} />
      <VerticalHub
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        hero={hero}
        ticker={<TickerStrip items={ticker} label="Datos aéreos en vivo" />}
        stats={stats}
        sections={sections}
        faq={faq}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <RelatedLinks
          columns={3}
          items={[
            { title: "Tráfico marítimo", description: "AIS en vivo, puertos y ferries", href: "/maritimo", icon: MapPin },
            { title: "Red ferroviaria", description: "AVE, Alvia y Cercanías en vivo", href: "/trenes", icon: MapPin },
            { title: "Tráfico por carretera", description: "Incidencias DGT en tiempo real", href: "/trafico", icon: MapPin },
          ]}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          Fuentes: OpenSky Network (ADS-B, CC-BY 4.0), AENA Aeropuertos (catálogo + estadísticas), Eurostat AVIA_PAOA (series anuales), OurAirports (geometría de pistas).
        </p>
      </div>
    </>
  );
}
