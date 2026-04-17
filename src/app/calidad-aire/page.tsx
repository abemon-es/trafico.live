import type { Metadata } from "next";
import {
  Wind,
  MapPin,
  Activity,
  AlertTriangle,
  Map as MapIcon,
  CheckCircle2,
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
import { CalidadAireHeroMap } from "./CalidadAireHeroMap";

export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Calidad del Aire España — Índice ICA MITECO en tiempo real",
  description:
    "Índice ICA (MITECO) por estación: NO₂, PM10, PM2.5, O₃, SO₂, CO. 565 estaciones de la Red Nacional de Vigilancia + extensiones CCAA (Madrid, Cataluña, Euskadi, Andalucía).",
  alternates: { canonical: `${BASE_URL}/calidad-aire` },
  openGraph: {
    title: "Calidad del Aire España — ICA en vivo",
    description: "Contaminación atmosférica en tiempo real. 565 estaciones MITECO.",
    url: `${BASE_URL}/calidad-aire`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

async function getHubData() {
  const since1h = new Date(Date.now() - 60 * 60 * 1000);

  const [totalStations, provinceGroups, latestReadings] = await Promise.all([
    prisma.airQualityStation.count(),
    prisma.airQualityStation.groupBy({
      by: ["province"],
      where: { province: { not: null } },
      _count: true,
    }),
    prisma.airQualityReading.findMany({
      where: { createdAt: { gte: since1h }, ica: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { ica: true, no2: true, pm10: true, pm25: true, o3: true, stationId: true },
    }),
  ]);

  const icaBuckets = [0, 0, 0, 0, 0, 0, 0];
  for (const r of latestReadings) {
    if (r.ica !== null && r.ica !== undefined && r.ica >= 1 && r.ica <= 6) icaBuckets[r.ica] += 1;
  }

  const totalRated = icaBuckets.slice(1).reduce((s, v) => s + v, 0);
  const goodPct = totalRated > 0 ? ((icaBuckets[1] + icaBuckets[2]) / totalRated) * 100 : 0;
  const badPct =
    totalRated > 0 ? ((icaBuckets[4] + icaBuckets[5] + icaBuckets[6]) / totalRated) * 100 : 0;

  // Worst stations (top 5 by ICA number in last hour)
  const byStation = new Map<string, number>();
  for (const r of latestReadings) {
    if (r.ica !== null && r.ica !== undefined) {
      const prev = byStation.get(r.stationId) ?? 0;
      if (r.ica > prev) byStation.set(r.stationId, r.ica);
    }
  }
  const worstIds = [...byStation.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  const worstStations =
    worstIds.length > 0
      ? await prisma.airQualityStation.findMany({
          where: { id: { in: worstIds } },
          select: { id: true, name: true, city: true, province: true },
        })
      : [];

  return {
    totalStations,
    provinceCount: provinceGroups.length,
    icaBuckets,
    totalRated,
    goodPct,
    badPct,
    worstStations,
    readingsCount: latestReadings.length,
  };
}

const ICA_LABELS = ["—", "Buena", "Razonable", "Moderada", "Mala", "Muy mala", "Extremadamente mala"];
const ICA_COLORS = [
  "text-gray-400",
  "text-signal-green",
  "text-tl-amber-400",
  "text-tl-amber-500",
  "text-signal-red",
  "text-purple-500",
  "text-purple-700",
];

const FAQ_ITEMS = [
  {
    question: "¿Qué es el índice ICA?",
    answer:
      "El ICA (Índice de Calidad del Aire) es un número del 1 al 6 definido por el Ministerio para la Transición Ecológica (MITECO) que resume en una escala única los niveles de NO₂, PM10, PM2.5, O₃ y SO₂ medidos en una estación. 1 = Buena · 2 = Razonable · 3 = Moderada · 4 = Mala · 5 = Muy mala · 6 = Extremadamente mala.",
  },
  {
    question: "¿De qué red de estaciones se obtienen los datos?",
    answer:
      "La Red Nacional de Vigilancia del MITECO cuenta con 565 estaciones: urbanas de tráfico, de fondo urbano/suburbano/rural, industriales y estaciones de referencia. Publicamos datos adicionales de las redes autonómicas de Madrid (20 min), Cataluña (diario), Euskadi y Andalucía.",
  },
  {
    question: "¿Con qué frecuencia se actualiza?",
    answer:
      "El feed principal (ica.miteco.es/datos/ica-ultima-hora.csv) se actualiza cada hora — licencia CC-BY 4.0. La Comunidad de Madrid publica cada 20 minutos y el resto de CCAA con cadencias específicas. Mantenemos las últimas 72 horas en caliente y el histórico completo en caliente reducida.",
  },
  {
    question: "¿Qué contaminantes se miden?",
    answer:
      "NO₂ (dióxido de nitrógeno), PM10 (partículas < 10 µm), PM2.5 (partículas < 2.5 µm), O₃ (ozono), SO₂ (dióxido de azufre) y CO (monóxido de carbono). No todas las estaciones miden todos los contaminantes; la estación de referencia más completa es Madrid Plaza Elíptica.",
  },
  {
    question: "¿Qué hacer cuando el ICA es malo?",
    answer:
      "Si una estación cercana reporta ICA ≥ 4 (mala), grupos sensibles (asma, EPOC, niños, mayores) deben evitar el ejercicio al aire libre y ventilar menos. En nivel 5-6 (muy mala / extremadamente mala) las recomendaciones sanitarias aplican a toda la población. Consulta el protocolo anti-contaminación de tu municipio para medidas de restricción del tráfico.",
  },
];

export default async function CalidadAireHubPage() {
  const data = await getHubData();

  const breadcrumbs = [{ name: "Calidad del aire", href: "/calidad-aire" }];

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: "España — Red Nacional de Vigilancia de la Calidad del Aire",
    description: "565 estaciones MITECO + redes autonómicas de Madrid, Cataluña, Euskadi y Andalucía.",
    url: `${BASE_URL}/calidad-aire`,
    geo: { "@type": "GeoShape", box: "27.6 -18.3 43.8 4.3" },
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Calidad del Aire en España",
    url: `${BASE_URL}/calidad-aire`,
    inLanguage: "es",
    about: { "@type": "Place", name: "España" },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  };

  const ticker: TickerItem[] = [
    { id: "stations", icon: <MapPin className="w-3.5 h-3.5" />, label: "Estaciones totales", value: data.totalStations },
    { id: "good", icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Calidad buena/razonable", value: `${data.goodPct.toFixed(0)}%`, tone: "positive" },
    { id: "bad", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Mala/muy mala", value: `${data.badPct.toFixed(0)}%`, tone: data.badPct > 20 ? "danger" : "warning" },
    { id: "provinces", icon: <MapPin className="w-3.5 h-3.5" />, label: "Provincias cubiertas", value: data.provinceCount },
    { id: "readings", icon: <Activity className="w-3.5 h-3.5" />, label: "Lecturas última hora", value: data.readingsCount.toLocaleString("es-ES") },
  ];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-sea-600 dark:text-tl-sea-400">
          <Wind className="w-4 h-4" />
          trafico.live · Calidad del aire
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Calidad del aire en España
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Índice ICA (MITECO) en {data.totalStations} estaciones de la Red Nacional de Vigilancia +
          redes autonómicas. NO₂, PM10, PM2.5, O₃, SO₂ y CO con actualización horaria.
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          <ButtonLink href="/calidad-aire/provincia" variant="primary" icon={<MapIcon className="w-4 h-4" />}>
            Ver por provincia
          </ButtonLink>
          <ButtonLink href="/calidad-aire/estacion" variant="secondary">
            Directorio estaciones
          </ButtonLink>
          <ButtonLink href="/meteo" variant="ghost">
            Meteorología
          </ButtonLink>
        </div>
      </div>
      <CalidadAireHeroMap />
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Estaciones" value={data.totalStations.toLocaleString("es-ES")} hint="MITECO + CCAA" icon={MapPin} accent="tl-sea" />
      <StatCard label="Buena/razonable" value={`${data.goodPct.toFixed(0)}%`} hint="ICA 1-2" icon={CheckCircle2} accent="tl" />
      <StatCard label="Mala/muy mala" value={`${data.badPct.toFixed(0)}%`} hint="ICA 4-6" icon={AlertTriangle} accent={data.badPct > 20 ? "tl-amber" : "tl"} />
      <StatCard label="Lecturas (1h)" value={data.readingsCount.toLocaleString("es-ES")} hint="frescas" icon={Activity} accent="tl-sea" />
    </div>
  );

  const sections = [
    {
      id: "distribucion",
      title: "Distribución por nivel ICA",
      description: "Porcentaje de estaciones por nivel en la última hora.",
      content: (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((lvl) => {
            const count = data.icaBuckets[lvl] ?? 0;
            const pct = data.totalRated > 0 ? (count / data.totalRated) * 100 : 0;
            return (
              <div
                key={lvl}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center"
              >
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${ICA_COLORS[lvl]}`}>
                  {ICA_LABELS[lvl]}
                </p>
                <p className="mt-1 text-2xl font-data font-semibold text-gray-900 dark:text-gray-100">
                  {count}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{pct.toFixed(0)}%</p>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      id: "peores",
      title: "Estaciones con peor ICA ahora",
      description: "Estaciones con el índice ICA más elevado en la última hora.",
      content:
        data.worstStations.length > 0 ? (
          <ul className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {data.worstStations.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-4">
                <AlertTriangle className="w-4 h-4 text-signal-red shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {s.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {[s.city, s.province].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sin datos suficientes en la última hora.
          </p>
        ),
    },
    {
      id: "pollutants",
      title: "Contaminantes medidos",
      description: "Seis contaminantes principales con validez legal según Directiva 2008/50/CE.",
      content: (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { name: "NO₂", desc: "Dióxido de nitrógeno · tráfico rodado" },
            { name: "PM10", desc: "Partículas < 10 µm" },
            { name: "PM2.5", desc: "Partículas finas < 2.5 µm" },
            { name: "O₃", desc: "Ozono troposférico" },
            { name: "SO₂", desc: "Dióxido de azufre · industria" },
            { name: "CO", desc: "Monóxido de carbono" },
          ].map((p) => (
            <div
              key={p.name}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
            >
              <p className="font-data text-xl font-semibold text-gray-900 dark:text-gray-100">
                {p.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{p.desc}</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const faq = <FAQAccordion items={FAQ_ITEMS} title="Preguntas frecuentes — calidad del aire" />;

  return (
    <>
      <StructuredData data={[placeSchema, collectionSchema]} />
      <VerticalHub
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        hero={hero}
        ticker={<TickerStrip items={ticker} label="Calidad del aire en vivo" />}
        stats={stats}
        sections={sections}
        faq={faq}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <RelatedLinks
          columns={3}
          items={[
            { title: "Meteorología", description: "AEMET — alertas y clima histórico", href: "/meteo", icon: Wind },
            { title: "Tráfico vial", description: "Impacto de los protocolos anti-contaminación", href: "/trafico", icon: MapPin },
            { title: "Transporte público", description: "Alternativa al coche privado", href: "/transporte-publico", icon: MapPin },
          ]}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Fuentes: MITECO (ica.miteco.es — CC-BY 4.0), Comunidad de Madrid, Generalitat de
          Catalunya, Gobierno Vasco, Junta de Andalucía.
        </p>
      </div>
    </>
  );
}
