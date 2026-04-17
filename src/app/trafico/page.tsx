import type { Metadata } from "next";
import {
  AlertTriangle,
  MapPin,
  Activity,
  Camera,
  Fuel,
  Radio,
  Gauge,
  Construction,
  Map as MapIcon,
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
import { TraficoHeroMap } from "./TraficoHeroMap";

export const revalidate = 120;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const TRAFFIC_CITIES: Record<string, { name: string; province: string }> = {
  madrid: { name: "Madrid", province: "Madrid" },
  barcelona: { name: "Barcelona", province: "Barcelona" },
  valencia: { name: "Valencia", province: "Valencia" },
  sevilla: { name: "Sevilla", province: "Sevilla" },
  malaga: { name: "Málaga", province: "Málaga" },
  zaragoza: { name: "Zaragoza", province: "Zaragoza" },
  bilbao: { name: "Bilbao", province: "Vizcaya" },
  alicante: { name: "Alicante", province: "Alicante" },
  murcia: { name: "Murcia", province: "Murcia" },
  granada: { name: "Granada", province: "Granada" },
};

export const metadata: Metadata = {
  title: "Tráfico en España — Incidencias DGT, cámaras y sensores en vivo",
  description:
    "Estado del tráfico vial en tiempo real: incidencias DGT, retenciones, obras, cámaras y sensores. Cobertura nacional + ciudades: Madrid, Barcelona, Valencia, Sevilla…",
  alternates: { canonical: `${BASE_URL}/trafico` },
  openGraph: {
    title: "Tráfico en España — DGT en vivo",
    description:
      "Incidencias DGT, cámaras, sensores y obras. Actualización cada 2 minutos.",
    url: `${BASE_URL}/trafico`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

async function getHubData() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [
    totalIncidents,
    incidentsByProvince,
    camerasCount,
    radarsCount,
    roadworksCount,
    recentSevere,
    citySensors,
  ] = await Promise.all([
    prisma.trafficIncident.count({ where: { isActive: true } }),
    prisma.trafficIncident.groupBy({
      by: ["province"],
      where: { isActive: true },
      _count: true,
    }),
    prisma.camera.count({ where: { isActive: true } }),
    prisma.radar.count(),
    prisma.roadworksZone.count({ where: { isActive: true } }),
    prisma.trafficIncident.findMany({
      where: { isActive: true, severity: "HIGH" },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: { id: true, description: true, roadNumber: true, province: true, severity: true },
    }),
    prisma.cityTrafficSensor.count().catch(() => 0),
  ]);

  const provinceMap = new Map<string, number>(
    incidentsByProvince
      .filter((r) => r.province)
      .map((r) => [r.province as string, r._count])
  );

  return {
    totalIncidents,
    provinceMap,
    camerasCount,
    radarsCount,
    roadworksCount,
    recentSevere,
    citySensors,
    since24h,
  };
}

const FAQ_ITEMS = [
  {
    question: "¿Qué datos de tráfico muestra trafico.live?",
    answer:
      "Agregamos los datos oficiales de la DGT (DATEX II — incidencias, obras, cámaras, radares, paneles), las redes municipales de Madrid (informo.madrid.es), Barcelona (bcn.cat/transit), Valencia (ODS) y Zaragoza, además de los mapas de tráfico del SCT y del Gobierno Vasco. Todo en tiempo real con ciclos de 2 a 5 minutos.",
  },
  {
    question: "¿Con qué frecuencia se actualizan las incidencias?",
    answer:
      "Las incidencias DGT y las redes autonómicas (Cataluña, País Vasco) se consultan cada 2 minutos. Los sensores municipales de tráfico se actualizan cada 3–5 minutos. Las cámaras se refrescan automáticamente al abrirlas; los snapshots históricos se almacenan 48 h.",
  },
  {
    question: "¿Qué significa cada nivel de gravedad?",
    answer:
      "La DGT usa tres niveles: LOW (incidencia leve, sin afectación relevante), MEDIUM (incidencia con retenciones o afectación parcial) y HIGH (incidencia grave, corte de vía o afectación severa). trafico.live mantiene la misma clasificación con codificación de colores (verde, ámbar, rojo).",
  },
  {
    question: "¿Puedo consultar cámaras en directo?",
    answer:
      "Sí. /camaras reúne ~1.500 cámaras DGT y autonómicas. Mostramos los snapshots más recientes con timestamp. Algunas cámaras emiten en circuito cerrado y no son públicas; en tal caso se indica como “sin disponibilidad”.",
  },
  {
    question: "¿Cubrís todas las vías o solo autopistas?",
    answer:
      "Cubrimos las 165.000 km de la red viaria española: autopistas (AP), autovías (A), nacionales (N), carreteras autonómicas (CA, CV, CM…) y diputaciones provinciales. La densidad de sensores es mayor en vías de alta capacidad y accesos urbanos; en vías secundarias las incidencias se publican según las reporte el puesto de la DGT.",
  },
];

export default async function TraficoHubPage() {
  const data = await getHubData();

  const breadcrumbs = [{ name: "Tráfico", href: "/trafico" }];

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: "Red viaria de España",
    description:
      "165.000 km de vías nacionales, autonómicas y locales gestionados por la DGT y las comunidades autónomas.",
    url: `${BASE_URL}/trafico`,
    geo: { "@type": "GeoShape", box: "35.9 -9.3 43.8 4.3" },
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tráfico en España",
    url: `${BASE_URL}/trafico`,
    inLanguage: "es",
    about: { "@type": "Place", name: "España" },
    publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  };

  const ticker: TickerItem[] = [
    { id: "incidents", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Incidencias DGT activas", value: data.totalIncidents, tone: data.totalIncidents > 200 ? "warning" : "default" },
    { id: "cameras", icon: <Camera className="w-3.5 h-3.5" />, label: "Cámaras activas", value: data.camerasCount },
    { id: "roadworks", icon: <Construction className="w-3.5 h-3.5" />, label: "Obras activas", value: data.roadworksCount },
    { id: "radars", icon: <Gauge className="w-3.5 h-3.5" />, label: "Radares", value: data.radarsCount.toLocaleString("es-ES") },
    ...data.recentSevere.map((i): TickerItem => ({
      id: `sev-${i.id}`,
      icon: <Radio className="w-3.5 h-3.5" />,
      label: `${i.roadNumber ?? "Vía"} · ${i.province ?? ""}`,
      tone: "danger",
    })),
  ];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
          <Activity className="w-4 h-4" />
          trafico.live · Carretera
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Tráfico en España
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Incidencias DGT, cámaras en directo, radares, obras y sensores de tráfico urbano en
          Madrid, Barcelona, Valencia y Zaragoza. Actualización cada 2–5 minutos.
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          <ButtonLink href="/trafico/mapa" variant="primary" icon={<MapIcon className="w-4 h-4" />}>
            Mapa completo
          </ButtonLink>
          <ButtonLink href="/incidencias" variant="secondary">
            Ver incidencias
          </ButtonLink>
          <ButtonLink href="/camaras" variant="ghost">
            Cámaras
          </ButtonLink>
        </div>
      </div>
      <TraficoHeroMap />
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Incidencias activas" value={data.totalIncidents.toLocaleString("es-ES")} hint="DGT DATEX II" icon={AlertTriangle} accent={data.totalIncidents > 200 ? "tl-amber" : "tl"} />
      <StatCard label="Cámaras" value={data.camerasCount.toLocaleString("es-ES")} hint="DGT + autonómicas" icon={Camera} accent="tl" />
      <StatCard label="Radares" value={data.radarsCount.toLocaleString("es-ES")} hint="fijos y móviles" icon={Gauge} accent="tl" />
      <StatCard label="Obras" value={data.roadworksCount.toLocaleString("es-ES")} hint="conos conectados" icon={Construction} accent="tl" />
    </div>
  );

  const sections = [
    {
      id: "ciudades",
      title: "Tráfico por ciudad",
      description: "Las 10 principales áreas metropolitanas con monitorización específica.",
      content: (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(TRAFFIC_CITIES).map(([slug, city]) => {
            const count = data.provinceMap.get(city.province) ?? 0;
            return (
              <ButtonLink
                key={slug}
                href={`/trafico/${slug}`}
                variant="secondary"
                className="w-full !justify-between"
              >
                <span>{city.name}</span>
                <span className={`text-[11px] font-data font-semibold ${count > 0 ? "text-tl-amber-500" : "text-gray-400"}`}>
                  {count > 0 ? `${count}` : "—"}
                </span>
              </ButtonLink>
            );
          })}
        </div>
      ),
    },
    {
      id: "alertas-graves",
      title: "Alertas graves en curso",
      description: "Incidencias de nivel HIGH con corte de vía o afectación severa.",
      content:
        data.recentSevere.length > 0 ? (
          <ul className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {data.recentSevere.map((i) => (
              <li key={i.id} className="flex items-start gap-3 px-5 py-4">
                <AlertTriangle className="w-4 h-4 text-signal-red mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {i.roadNumber ?? "Vía sin identificar"} · {i.province ?? "España"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                    {i.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sin alertas graves activas en este momento.
          </p>
        ),
    },
    {
      id: "infraestructura",
      title: "Infraestructura y datos",
      description: "Cámaras, radares, obras y sensores urbanos en tiempo real.",
      content: (
        <RelatedLinks
          columns={3}
          title=""
          items={[
            { title: "Incidencias", description: "Retenciones, accidentes, obras", href: "/incidencias", icon: AlertTriangle },
            { title: "Cámaras", description: "~1.500 cámaras DGT + autonómicas", href: "/camaras", icon: Camera },
            { title: "Radares", description: "Fijos, tramo y móviles", href: "/radares", icon: Gauge },
            { title: "Carreteras", description: "Red viaria por vía e IMD", href: "/carreteras", icon: MapPin },
            { title: "Estaciones de aforo", description: "14.400 estaciones con IMD", href: "/estaciones-aforo", icon: MapIcon },
            { title: "Intensidad", description: "Sensores Madrid cada 5 min", href: "/intensidad", icon: Activity },
          ]}
        />
      ),
    },
  ];

  const faq = <FAQAccordion items={FAQ_ITEMS} title="Preguntas frecuentes — tráfico vial" />;

  return (
    <>
      <StructuredData data={[placeSchema, collectionSchema]} />
      <VerticalHub
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        hero={hero}
        ticker={<TickerStrip items={ticker} label="Datos DGT en vivo" />}
        stats={stats}
        sections={sections}
        faq={faq}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <RelatedLinks
          columns={3}
          items={[
            { title: "Gasolineras", description: "Precios MINETUR y tendencia diaria", href: "/gasolineras", icon: Fuel },
            { title: "Red ferroviaria", description: "Trenes en vivo y alertas Renfe", href: "/trenes", icon: MapPin },
            { title: "Calidad del aire", description: "Índice ICA por estación MITECO", href: "/calidad-aire", icon: Activity },
          ]}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Fuentes: DGT (DATEX II), SCT Cataluña, Gobierno Vasco, Ayuntamientos de Madrid,
          Barcelona, Valencia y Zaragoza.
        </p>
      </div>
    </>
  );
}
