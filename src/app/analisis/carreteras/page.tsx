import type { Metadata } from "next";
import Link from "next/link";
import {
  Route,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { VerticalHub } from "@/components/ui/VerticalHub";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Análisis de tráfico por carretera — IMD autopistas y autovías España",
  description:
    "Intensidad Media Diaria (IMD), porcentaje de vehículos pesados y evolución anual en las principales autopistas, autovías y carreteras nacionales de España. Datos del Ministerio de Transportes.",
  alternates: { canonical: `${BASE_URL}/analisis/carreteras` },
  openGraph: {
    title: "Análisis IMD por carretera — trafico.live",
    description:
      "IMD, tráfico pesado y tendencias en A-1, A-2, AP-7, N-1 y más de 200 carreteras de la red estatal española.",
    url: `${BASE_URL}/analisis/carreteras`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// Major Spanish state roads grouped by type
const AUTOPISTAS = [
  { id: "AP-1", desc: "Burgos — País Vasco" },
  { id: "AP-2", desc: "Zaragoza — Barcelona" },
  { id: "AP-4", desc: "Sevilla — Cádiz" },
  { id: "AP-6", desc: "Madrid — Segovia" },
  { id: "AP-7", desc: "Mediterráneo (Girona — Algeciras)" },
  { id: "AP-8", desc: "Bilbao — Behobia" },
  { id: "AP-9", desc: "Ferrol — Vigo" },
  { id: "AP-36", desc: "Ocaña — La Roda" },
  { id: "AP-41", desc: "Madrid — Toledo" },
  { id: "AP-46", desc: "Málaga — Estepona" },
  { id: "AP-51", desc: "Ávila — Villacastín" },
  { id: "AP-61", desc: "San Rafael — Segovia" },
  { id: "AP-68", desc: "Bilbao — Zaragoza" },
  { id: "AP-71", desc: "León — Campomanes" },
];

const AUTOVIAS_A = [
  { id: "A-1", desc: "Madrid — Burgos — Irún" },
  { id: "A-2", desc: "Madrid — Barcelona" },
  { id: "A-3", desc: "Madrid — Valencia" },
  { id: "A-4", desc: "Madrid — Cádiz" },
  { id: "A-5", desc: "Madrid — Badajoz" },
  { id: "A-6", desc: "Madrid — A Coruña" },
  { id: "A-7", desc: "Algeciras — Barcelona" },
  { id: "A-8", desc: "Cantabria — Galicia" },
  { id: "A-10", desc: "Extremadura (Plasencia — Coria)" },
  { id: "A-11", desc: "Soria — Valladolid — Burgos" },
  { id: "A-12", desc: "Logroño — Pamplona" },
  { id: "A-13", desc: "Badajoz — Cáceres" },
  { id: "A-14", desc: "Lleida — Montgarri" },
  { id: "A-15", desc: "Pamplona — Logroño" },
  { id: "A-21", desc: "Pamplona — Huesca — Jaca" },
  { id: "A-23", desc: "Zaragoza — Huesca — Jaca" },
  { id: "A-26", desc: "Lugo — Pontevedra" },
  { id: "A-30", desc: "Cartagena — Albacete" },
  { id: "A-31", desc: "Albacete — Alicante" },
  { id: "A-42", desc: "Madrid — Toledo" },
  { id: "A-43", desc: "Ocaña — Ciudad Real" },
  { id: "A-44", desc: "Jaén — Motril" },
  { id: "A-45", desc: "Córdoba — Málaga" },
  { id: "A-48", desc: "Algeciras — Huelva" },
  { id: "A-49", desc: "Sevilla — Portugal" },
  { id: "A-52", desc: "Ourense — Benavente" },
  { id: "A-55", desc: "A Coruña — Pontevedra" },
  { id: "A-57", desc: "Pontevedra — Cañiza" },
  { id: "A-62", desc: "Valladolid — Portugal" },
  { id: "A-63", desc: "Burgos — Aguilar de Campoo" },
  { id: "A-65", desc: "Palencia — León" },
  { id: "A-66", desc: "Gijón — Sevilla (Ruta de la Plata)" },
  { id: "A-67", desc: "Palencia — Cantabria" },
  { id: "A-68", desc: "Zaragoza — Bilbao" },
  { id: "A-71", desc: "Sahagún — Mayorga" },
  { id: "A-72", desc: "Zamora — Tordesillas" },
  { id: "A-73", desc: "Burgos — Aguilar de Campoo" },
  { id: "A-76", desc: "Ponferrada — Ourense" },
  { id: "A-77", desc: "Tui — frontera Portugal" },
  { id: "A-92", desc: "Granada — Sevilla" },
];

const NACIONALES = [
  { id: "N-1", desc: "Madrid — Irún" },
  { id: "N-2", desc: "Madrid — Barcelona" },
  { id: "N-3", desc: "Madrid — Valencia" },
  { id: "N-4", desc: "Madrid — Cádiz" },
  { id: "N-5", desc: "Madrid — Badajoz" },
  { id: "N-6", desc: "Madrid — A Coruña" },
  { id: "N-120", desc: "Logroño — Vigo" },
  { id: "N-122", desc: "Tordesillas — Zaragoza" },
  { id: "N-232", desc: "Vinaròs — Bilbao" },
  { id: "N-330", desc: "Somport — Alicante" },
  { id: "N-340", desc: "Cádiz — Barcelona" },
  { id: "N-401", desc: "Madrid — Ciudad Real" },
  { id: "N-420", desc: "Córdoba — Tarragona" },
];

const FAQ_ITEMS = [
  {
    question: "¿Qué es la IMD y por qué es importante?",
    answer:
      "La Intensidad Media Diaria (IMD) mide el número promedio de vehículos que circulan por un tramo de carretera en un día. Es el indicador principal para planificar inversiones en infraestructura, dimensionar servicios de emergencia y evaluar el impacto ambiental y la seguridad vial de cada corredor.",
  },
  {
    question: "¿Cómo se obtienen los datos de IMD?",
    answer:
      "El Ministerio de Transportes publica anualmente el Mapa de Tráfico con los datos de IMD recogidos por las estaciones de aforo permanentes instaladas en la red de carreteras del Estado. Los datos se descargan del ArcGIS REST API del Ministerio y se enriquecen con la geometría de cada tramo para generar visualizaciones interactivas.",
  },
  {
    question: "¿Está incluida la red autonómica?",
    answer:
      "Actualmente solo están disponibles las carreteras de titularidad estatal (autopistas A-, AP-, autovías y carreteras N-). Las redes autonómicas tienen sus propios sistemas de aforo y se incluirán progresivamente en la plataforma.",
  },
  {
    question: "¿Con qué frecuencia cambia el tráfico en una carretera?",
    answer:
      "La IMD se calcula como media anual, por lo que su variación interanual es moderada. Sin embargo, el tráfico en una misma carretera varía mucho a lo largo del día, de la semana y del año: autopistas de acceso a la playa pueden cuadruplicar su IMD en agosto respecto a enero.",
  },
  {
    question: "¿Puedo descargar los datos de IMD?",
    answer:
      "Sí, los datos de tráfico del Ministerio son públicos y descargables en el Mapa de Tráfico del Ministerio de Transportes. A través de la API de trafico.live también puedes acceder a los datos en formato JSON para los tramos indexados.",
  },
];

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Análisis de tráfico por carretera — IMD autopistas y autovías",
  url: `${BASE_URL}/analisis/carreteras`,
  inLanguage: "es",
  about: { "@type": "Place", name: "España" },
  publisher: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  itemListElement: [...AUTOPISTAS, ...AUTOVIAS_A, ...NACIONALES].map((r, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: r.id,
    url: `${BASE_URL}/analisis/carreteras/${r.id.toLowerCase().replace("/", "-")}`,
  })),
};

function RoadCard({ id, desc }: { id: string; desc: string }) {
  const slug = id.toLowerCase().replace("/", "-");
  return (
    <Link
      href={`/analisis/carreteras/${slug}`}
      className="group flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-tl-400 dark:hover:border-tl-500 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-600"
    >
      <span className="text-sm font-bold text-tl-700 dark:text-tl-300 font-data group-hover:text-tl-800 dark:group-hover:text-tl-200">
        {id}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{desc}</span>
    </Link>
  );
}

export default function AnalisisCarreterasHubPage() {
  const breadcrumbs = [
    { name: "Análisis", href: "/analisis" },
    { name: "Análisis por carretera", href: "/analisis/carreteras" },
  ];

  const hero = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
          <Route className="w-4 h-4" />
          trafico.live · Análisis · Carreteras
        </span>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-gray-50 leading-tight">
          Análisis por carretera
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Intensidad Media Diaria (IMD), porcentaje de vehículos pesados y evolución interanual
          en las principales autopistas, autovías y carreteras nacionales de la red estatal
          española. Datos del Ministerio de Transportes actualizados anualmente.
        </p>
      </div>
    </div>
  );

  const sections = [
    {
      id: "autopistas",
      title: "Autopistas de peaje (AP-)",
      description: `${AUTOPISTAS.length} autopistas con datos de IMD disponibles.`,
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {AUTOPISTAS.map((r) => (
            <RoadCard key={r.id} {...r} />
          ))}
        </div>
      ),
    },
    {
      id: "autovias",
      title: "Autovías (A-)",
      description: `${AUTOVIAS_A.length} autovías de la red estatal.`,
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {AUTOVIAS_A.map((r) => (
            <RoadCard key={r.id} {...r} />
          ))}
        </div>
      ),
    },
    {
      id: "nacionales",
      title: "Carreteras nacionales (N-)",
      description: `${NACIONALES.length} carreteras nacionales principales.`,
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {NACIONALES.map((r) => (
            <RoadCard key={r.id} {...r} />
          ))}
        </div>
      ),
    },
    {
      id: "related",
      title: "También te puede interesar",
      description: "Más herramientas de análisis relacionadas.",
      content: (
        <RelatedLinks
          columns={3}
          title=""
          items={[
            {
              title: "Accidentes por provincia",
              description: "Siniestralidad histórica en las 52 provincias. DGT 2011-2024.",
              href: "/analisis/accidentes",
              icon: AlertTriangle,
            },
            {
              title: "Estaciones de aforo",
              description: "Mapa interactivo de 14.400+ estaciones de medición de tráfico.",
              href: "/estaciones-aforo",
              icon: MapPin,
            },
            {
              title: "Intensidad nacional",
              description: "IMD comparativa por provincia, carretera y año.",
              href: "/intensidad",
              icon: TrendingUp,
            },
          ]}
        />
      ),
    },
  ];

  const faq = (
    <FAQAccordion items={FAQ_ITEMS} title="Preguntas frecuentes — análisis por carretera" />
  );

  return (
    <>
      <StructuredData data={[collectionSchema]} />
      <VerticalHub
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        hero={hero}
        sections={sections}
        faq={faq}
      />
    </>
  );
}
