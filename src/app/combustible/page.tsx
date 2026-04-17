import type { Metadata } from "next";
import {
  Fuel,
  TrendingDown,
  TrendingUp,
  Zap,
  Droplets,
  MapPin,
  Map as MapIcon,
  Anchor,
  BatteryCharging,
} from "lucide-react";
import prisma from "@/lib/db";
import { VerticalHub } from "@/components/ui/VerticalHub";
import { StatCard } from "@/components/ui/StatCard";
import { TickerStrip, type TickerItem } from "@/components/ui/TickerStrip";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { ButtonLink } from "@/components/ui/Button";
import { StructuredData } from "@/components/seo/StructuredData";
import { CombustibleHeroMap } from "./CombustibleHeroMap";

export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Combustible en España — Gasolina, diésel, GLP, GNC y cargadores eléctricos",
  description:
    "Precios oficiales de MINETUR por carburante (gasoleo A, 95E5, 98E5, GLP, GNC, hidrógeno) y ~13.500 puntos de recarga eléctrica. Histórico diario CNMC desde 2016.",
  alternates: { canonical: `${BASE_URL}/combustible` },
  openGraph: {
    title: "Combustible en España — MINETUR + recarga EV",
    description:
      "Gasolina, diésel, GLP, GNC, hidrógeno y cargadores eléctricos en tiempo real.",
    url: `${BASE_URL}/combustible`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

async function getHubData() {
  const [
    totalStations,
    stationsOpen24h,
    totalChargers,
    avgDiesel,
    avgGasolina,
    cheapestDiesel,
    cheapestGasolina,
    maritimeStations,
  ] = await Promise.all([
    prisma.gasStation.count(),
    prisma.gasStation.count({ where: { is24h: true } }),
    prisma.eVCharger.count(),
    prisma.gasStation.aggregate({
      _avg: { priceGasoleoA: true },
      where: { priceGasoleoA: { not: null } },
    }),
    prisma.gasStation.aggregate({
      _avg: { priceGasolina95E5: true },
      where: { priceGasolina95E5: { not: null } },
    }),
    prisma.gasStation.findMany({
      where: { priceGasoleoA: { not: null } },
      orderBy: { priceGasoleoA: "asc" },
      take: 5,
      select: { id: true, name: true, locality: true, provinceName: true, priceGasoleoA: true },
    }),
    prisma.gasStation.findMany({
      where: { priceGasolina95E5: { not: null } },
      orderBy: { priceGasolina95E5: "asc" },
      take: 5,
      select: { id: true, name: true, locality: true, provinceName: true, priceGasolina95E5: true },
    }),
    prisma.maritimeStation.count(),
  ]);

  return {
    totalStations,
    stationsOpen24h,
    totalChargers,
    avgDiesel: Number(avgDiesel._avg.priceGasoleoA ?? 0),
    avgGasolina: Number(avgGasolina._avg.priceGasolina95E5 ?? 0),
    cheapestDiesel,
    cheapestGasolina,
    maritimeStations,
  };
}

const FAQ_ITEMS = [
  {
    question: "¿De dónde vienen los precios de combustible?",
    answer:
      "Todos los precios provienen del Ministerio de Industria (MINETUR), que publica el precio oficial vigente en cada estación vía su API de datos abiertos. Los precios se actualizan cada 30 minutos desde las estaciones que reportan al ministerio (obligatorio para estaciones con ventas al público).",
  },
  {
    question: "¿Tenéis histórico de precios?",
    answer:
      "Sí. Guardamos histórico diario desde 2016 a nivel provincial (CNMC) y desde 2024 a nivel estación individual. La sección /gasolineras/historico muestra tendencias a 7, 30 y 90 días con comparativa anual.",
  },
  {
    question: "¿Qué tipos de combustible se incluyen?",
    answer:
      "13 combustibles: gasolina 95 E5/E10, gasolina 98 E5/E10, diésel A, diésel B (agrícola), diésel premium, nuevo diésel A biodiésel, GLP (autogas), GNC, GNL, hidrógeno, AdBlue y bioetanol. Además integramos precios marítimos MITERD (gasoil A marítimo, gasoil B pesca, gasolina 95 náutica).",
  },
  {
    question: "¿Cómo se integran los cargadores eléctricos?",
    answer:
      "Integramos ~13.500 puntos de recarga de la base MITECO + aportaciones directas de operadores (Iberdrola, Endesa X, Wallbox, Tesla, IONITY). Para cada punto: potencia kW, conector, estado operativo y tarifa cuando se publique. Las redes privadas solo aparecen si publican datos abiertos.",
  },
  {
    question: "¿Hay descuentos o subvenciones vigentes?",
    answer:
      "Desde 2023 no hay bonificaciones generales al carburante (finalizaron las ayudas de 20 cent/L). Sí se mantienen bonificaciones autonómicas (p. ej. Baleares, Canarias, ITS Ceuta/Melilla). Consulta /gasolineras/baratas para ver las 50 estaciones más baratas en tiempo real.",
  },
];

export default async function CombustibleHubPage() {
  const data = await getHubData();

  const breadcrumbs = [{ name: "Combustible", href: "/combustible" }];

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: "España — red de estaciones y recarga",
    description:
      "Estaciones de servicio, puntos de recarga eléctrica y estaciones marítimas en España.",
    url: `${BASE_URL}/combustible`,
    geo: { "@type": "GeoShape", box: "27.6 -18.3 43.8 4.3" },
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Combustible y recarga en España",
    url: `${BASE_URL}/combustible`,
    inLanguage: "es",
    about: { "@type": "Place", name: "España" },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  };

  const ticker: TickerItem[] = [
    { id: "stations", icon: <Fuel className="w-3.5 h-3.5" />, label: "Estaciones terrestres", value: data.totalStations.toLocaleString("es-ES") },
    { id: "24h", icon: <Fuel className="w-3.5 h-3.5" />, label: "Abiertas 24 h", value: data.stationsOpen24h.toLocaleString("es-ES") },
    { id: "chargers", icon: <BatteryCharging className="w-3.5 h-3.5" />, label: "Puntos de recarga", value: data.totalChargers.toLocaleString("es-ES") },
    { id: "diesel", icon: <Droplets className="w-3.5 h-3.5" />, label: "Diésel medio", value: `${data.avgDiesel.toFixed(3)} €/L` },
    { id: "gasolina", icon: <Droplets className="w-3.5 h-3.5" />, label: "Gasolina 95 media", value: `${data.avgGasolina.toFixed(3)} €/L` },
    { id: "maritime", icon: <Anchor className="w-3.5 h-3.5" />, label: "Estaciones náuticas", value: data.maritimeStations },
  ];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-amber-500">
          <Fuel className="w-4 h-4" />
          trafico.live · Combustible
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Precios de combustible y recarga en España
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          {data.totalStations.toLocaleString("es-ES")} estaciones de servicio,{" "}
          {data.totalChargers.toLocaleString("es-ES")} puntos de recarga eléctrica y {" "}
          {data.maritimeStations} estaciones náuticas. Precios oficiales actualizados cada 30
          minutos desde MINETUR.
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          <ButtonLink href="/gasolineras/mapa" variant="primary" icon={<MapIcon className="w-4 h-4" />}>
            Mapa completo
          </ButtonLink>
          <ButtonLink href="/gasolineras/baratas" variant="secondary">
            Las más baratas
          </ButtonLink>
          <ButtonLink href="/cargadores" variant="ghost">
            Puntos de recarga
          </ButtonLink>
        </div>
      </div>
      <CombustibleHeroMap />
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Diésel medio" value={`${data.avgDiesel.toFixed(3)}`} hint="€/L · MINETUR" icon={Droplets} accent="tl-amber" />
      <StatCard label="Gasolina 95" value={`${data.avgGasolina.toFixed(3)}`} hint="€/L · MINETUR" icon={Droplets} accent="tl-amber" />
      <StatCard label="Estaciones" value={data.totalStations.toLocaleString("es-ES")} hint={`${data.stationsOpen24h} abiertas 24h`} icon={Fuel} accent="tl-amber" />
      <StatCard label="Recarga EV" value={data.totalChargers.toLocaleString("es-ES")} hint="puntos MITECO" icon={BatteryCharging} accent="tl" />
    </div>
  );

  const sections = [
    {
      id: "diesel-baratos",
      title: "Diésel más barato ahora",
      description: "Estaciones con precio oficial mínimo según el último reporte MINETUR.",
      content: (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
          {data.cheapestDiesel.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4">
              <span className="w-7 h-7 rounded-full bg-tl-amber-100 dark:bg-tl-amber-900/30 text-tl-amber-700 dark:text-tl-amber-400 font-data font-bold text-sm inline-flex items-center justify-center">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                  {s.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {[s.locality, s.provinceName].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="text-right font-data font-semibold text-tl-amber-700 dark:text-tl-amber-400">
                {s.priceGasoleoA ? `${Number(s.priceGasoleoA).toFixed(3)} €` : "—"}
                <p className="text-[10px] text-gray-400 font-normal">/ L</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "gasolina-baratas",
      title: "Gasolina 95 más barata",
      description: "Top-5 estaciones con 95 octanos E5 al precio más bajo.",
      content: (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
          {data.cheapestGasolina.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4">
              <span className="w-7 h-7 rounded-full bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-400 font-data font-bold text-sm inline-flex items-center justify-center">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                  {s.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {[s.locality, s.provinceName].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="text-right font-data font-semibold text-tl-700 dark:text-tl-400">
                {s.priceGasolina95E5 ? `${Number(s.priceGasolina95E5).toFixed(3)} €` : "—"}
                <p className="text-[10px] text-gray-400 font-normal">/ L</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "categorias",
      title: "Explorar por categoría",
      description: "Secciones especializadas de la sección combustible.",
      content: (
        <RelatedLinks
          columns={3}
          title=""
          items={[
            { title: "Las 50 más baratas", description: "Ranking nacional actualizado", href: "/gasolineras/baratas", icon: TrendingDown },
            { title: "Precios por marca", description: "Repsol, Cepsa, BP, Shell…", href: "/gasolineras/marcas", icon: Fuel },
            { title: "Histórico de precios", description: "Evolución diaria desde 2016", href: "/gasolineras/historico", icon: TrendingUp },
            { title: "Por tipo de carburante", description: "Diésel, 95, GLP, GNC, hidrógeno", href: "/gasolineras/tipo", icon: Droplets },
            { title: "Marítimas", description: "Combustible náutico MITERD", href: "/gasolineras/maritimas", icon: Anchor },
            { title: "Cargadores EV", description: "~13.500 puntos de recarga", href: "/cargadores", icon: Zap },
          ]}
        />
      ),
    },
  ];

  const faq = <FAQAccordion items={FAQ_ITEMS} title="Preguntas frecuentes — combustible y recarga" />;

  return (
    <>
      <StructuredData data={[placeSchema, collectionSchema]} />
      <VerticalHub
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        hero={hero}
        ticker={<TickerStrip items={ticker} label="Precios MINETUR" />}
        stats={stats}
        sections={sections}
        faq={faq}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <RelatedLinks
          columns={3}
          items={[
            { title: "Tráfico en carretera", description: "Incidencias y retenciones DGT", href: "/trafico", icon: MapPin },
            { title: "Marítimo", description: "Estaciones náuticas y alertas costeras", href: "/maritimo", icon: Anchor },
            { title: "Meteorología", description: "AEMET — impacto en rutas", href: "/meteo", icon: MapPin },
          ]}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Fuentes: MINETUR (precios), CNMC (histórico), MITECO (puntos de recarga), MITERD
          (combustible marítimo).
        </p>
      </div>
    </>
  );
}
