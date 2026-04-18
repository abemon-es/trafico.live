/**
 * /recursos/guia-multimodal
 * Lead magnet: Guía multimodal de España 2026
 *
 * SEO target: "guía transporte multimodal España", "cómo viajar en tren avión coche España"
 * Server Component — SSG with daily revalidation
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { NewsletterHero } from "@/components/newsletter/NewsletterHero";
import { Train, Plane, Anchor, Bus, Car, BarChart3, ExternalLink, Clock, Euro, Leaf, ArrowRight } from "lucide-react";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://trafico.live";
const CANONICAL = `${BASE_URL}/recursos/guia-multimodal`;
const LAST_UPDATED = "2026-04-17";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Guía multimodal de España 2026: tren, avión, ferry, autobús y coche",
  description:
    "Compara los cinco modos de transporte en España: velocidad, precio, huella de carbono y comodidad. Con la comparativa Madrid-Barcelona por cada modo y herramientas de trafico.live.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "Guía multimodal de España 2026: tren, avión, ferry, autobús y coche",
    description:
      "Todo lo que necesitas saber para elegir el transporte más inteligente en España. Comparativa real Madrid-Barcelona en 5 modos.",
    url: CANONICAL,
    type: "article",
    images: [
      {
        url: `${BASE_URL}/recursos/guia-multimodal/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "Guía multimodal España 2026 — trafico.live",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Guía multimodal de España 2026",
    description: "Tren, avión, ferry, autobús y coche. Comparativa real y herramientas en vivo.",
  },
};

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Guía multimodal de España 2026: tren, avión, ferry, autobús y coche",
  description:
    "Compara los cinco modos de transporte en España con datos reales de 2026: velocidad, precio, emisiones y comodidad. Incluye comparativa Madrid-Barcelona.",
  url: CANONICAL,
  datePublished: "2026-04-17",
  dateModified: LAST_UPDATED,
  author: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  publisher: {
    "@type": "Organization",
    name: "trafico.live",
    logo: { "@type": "ImageObject", url: `${BASE_URL}/logo.png` },
  },
  inLanguage: "es",
  about: [
    { "@type": "Thing", name: "Transporte multimodal" },
    { "@type": "Thing", name: "Ferrocarril en España" },
    { "@type": "Thing", name: "Aviación comercial" },
  ],
};

// ---------------------------------------------------------------------------
// TOC data
// ---------------------------------------------------------------------------

const TOC_SECTIONS = [
  { id: "tren", label: "Tren: cuándo conviene (y cuándo no)", icon: Train },
  { id: "avion", label: "Avión: rutas interiores y enlaces con islas", icon: Plane },
  { id: "ferry", label: "Ferry: Baleares, Canarias y rutas UK", icon: Anchor },
  { id: "autobus", label: "Autobús: la red más densa de Europa", icon: Bus },
  { id: "coche", label: "Coche: peajes, combustible y tiempos", icon: Car },
  { id: "comparativa", label: "Comparativa: Madrid ↔ Barcelona, 5 modos", icon: BarChart3 },
  { id: "herramientas", label: "Herramientas trafico.live que te ayudan", icon: ArrowRight },
];

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SectionHeading({
  id,
  icon: Icon,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="flex items-center gap-3 font-heading text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-12 mb-5 scroll-mt-24"
    >
      <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-tl-50 dark:bg-tl-900/50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-tl-600 dark:text-tl-400" />
      </span>
      {children}
    </h2>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-5 rounded-lg border-l-4 border-tl-500 bg-tl-50 dark:bg-tl-950/40 px-5 py-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      {children}
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-tl-100 dark:border-tl-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-tl-50 dark:bg-tl-900/50">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left font-semibold text-tl-700 dark:text-tl-300 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-t border-tl-100 dark:border-tl-800 even:bg-tl-50/40 dark:even:bg-tl-950/20"
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs sm:text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GuiaMultimodalPage() {
  return (
    <>
      <StructuredData data={articleSchema} />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Recursos", href: "/recursos" },
            { name: "Guía multimodal 2026", href: "/recursos/guia-multimodal" },
          ]}
        />

        {/* Header */}
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-3">
            Guía · Actualizada {LAST_UPDATED}
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-4">
            Guía multimodal de España 2026: tren, avión, ferry, autobús y coche
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            ¿Cuál es la mejor opción para tu próximo viaje? Esta guía compara los cinco grandes
            modos de transporte en España con datos reales de 2026: tiempos de puerta a puerta,
            precio medio, huella de carbono y comodidad. Al final encontrarás la comparativa
            definitiva para el corredor más transitado del país: Madrid-Barcelona.
          </p>
        </header>

        {/* Newsletter Hero — TOP */}
        <NewsletterHero
          source="guia-multimodal"
          leadMagnet="guia-multimodal"
          headline="Recibe actualizaciones de esta guía cada semana"
          pitch="El resumen de trafico.live llega cada lunes con datos frescos de tráfico, trenes, vuelos y combustible."
          layout="banner"
        />

        {/* Table of Contents */}
        <nav
          aria-label="Tabla de contenidos"
          className="my-8 rounded-xl border border-tl-100 dark:border-tl-800 bg-white dark:bg-gray-900/50 p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Contenidos
          </p>
          <ol className="space-y-1.5">
            {TOC_SECTIONS.map(({ id, label, icon: Icon }, i) => (
              <li key={id} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-tl-100 dark:bg-tl-800 text-tl-700 dark:text-tl-300 text-xs flex items-center justify-center font-semibold flex-shrink-0">
                  {i + 1}
                </span>
                <a
                  href={`#${id}`}
                  className="text-tl-600 dark:text-tl-400 hover:text-tl-800 dark:hover:text-tl-200 transition-colors hover:underline"
                >
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ---------------------------------------------------------------- */}
        {/* SECTION 1 — TREN                                                 */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="tren" icon={Train}>
          Tren: cuándo conviene (y cuándo no)
        </SectionHeading>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          España dispone de la red de alta velocidad más extensa de Europa occidental: más de
          3.700 km de vía de ancho UIC operativos en 2026, conectando Madrid con Barcelona,
          Sevilla, Valencia, Málaga, Alicante, Cádiz, Bilbao, San Sebastián y A Coruña entre otras
          ciudades. El AVE y sus variantes (Alvia, Avant, Avlo) cubren distancias de 200 a 700 km
          en condiciones muy competitivas con el avión cuando se cuenta el tiempo de desplazamiento
          hasta el aeropuerto y los trámites de seguridad.
        </p>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          La regla de oro del ferrocarril español es la <strong>ventana 2-4 horas</strong>: en
          trayectos donde el tren tarda entre 2 y 4 horas, el avión pierde por tiempo total cuando
          se suma el check-in (mínimo 45 min), el traslado al aeropuerto y la recogida de equipaje.
          Por encima de 5 horas de tren, el avión recupera la ventaja, salvo que el origen o
          destino no tenga aeropuerto cercano.
        </p>

        <InfoBox>
          <strong>Cuándo conviene el tren:</strong> Madrid-Barcelona (2h 30 min AVE), Madrid-Sevilla
          (2h 20 min), Madrid-Valencia (1h 40 min), Madrid-Bilbao (5h Alvia). Precio AVE con
          anticipación: desde 14 € en Avlo hasta 90 € en AVE flexible.
        </InfoBox>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          Las <Link href="/trenes/cercanias" className="text-tl-600 hover:underline">redes de Cercanías</Link>{" "}
          (12 operativas en 2026) son indispensables para la movilidad metropolitana: Madrid
          mueve unos 600.000 viajeros/día, Barcelona supera los 400.000. Son la columna vertebral
          del transporte diario en las grandes áreas urbanas, con tarifas desde 1,00 € en las
          zonas con abono gratuito subvencionado.
        </p>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          El talón de Aquiles del ferrocarril español es la <strong>puntualidad en media y
          larga distancia</strong>: los datos de{" "}
          <Link href="/trenes" className="text-tl-600 hover:underline">trafico.live</Link> sobre
          la flota en tiempo real muestran que en picos de demanda vacacional los retrasos
          medios superan los 12 minutos, con algunos servicios MD y Regional acumulando hasta
          45 minutos. Si el tren es crítico para un vuelo de conexión, prevé siempre margen.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* SECTION 2 — AVIÓN                                                */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="avion" icon={Plane}>
          Avión: rutas interiores y enlaces con islas
        </SectionHeading>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          La aviación interior española ha recuperado prácticamente todos los niveles previos a
          la pandemia. Los 42 aeropuertos gestionados por AENA registraron en 2025 más de
          210 millones de pasajeros totales, con las rutas Madrid-Barcelona (el corredor más
          transitado de Europa en 2023-2025), Madrid-Palma, Barcelona-Tenerife Sur y
          Madrid-Gran Canaria entre las más operadas.
        </p>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          Para viajar al <strong>archipiélago canario y balear</strong> el avión es, en la mayoría
          de casos, la única alternativa práctica cuando la relación tiempo/precio es prioritaria.
          El ferry a Canarias desde Huelva o Cádiz tarda entre 28 y 46 horas según el operador y
          el barco; el vuelo, entre 2h 10 min (Las Palmas) y 2h 45 min (Tenerife Norte) desde
          Madrid. Para Baleares, el ferry desde Barcelona o Valencia se vuelve competitivo en
          precio cuando hay grupos o cuando se lleva vehículo.
        </p>

        <InfoBox>
          <strong>Consejo de precio:</strong> las tarifas de vuelos domésticos bajan
          significativamente 6-8 semanas antes del vuelo y vuelven a subir en los últimos 10 días.
          El algoritmo de búsqueda ideal es: reservar con 45-50 días de antelación para destinos
          peninsulares, y 60-70 días para Canarias en temporada alta (diciembre-enero y julio-agosto).
        </InfoBox>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          Las <strong>emisiones de CO₂</strong> son el punto débil del avión: un trayecto
          Barcelona-Madrid en AVE genera aproximadamente 5,6 kg de CO₂ por pasajero; el mismo
          trayecto en avión produce entre 50 y 85 kg según el factor de carga. Para los viajeros
          con objetivos de descarbonización, el tren de alta velocidad es la única alternativa
          real en rutas donde existe.
        </p>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          Puedes seguir las posiciones en directo de aeronaves sobre España en la página de{" "}
          <Link href="/aviacion" className="text-tl-600 hover:underline">aviación de trafico.live</Link>,
          con datos de OpenSky actualizados cada 15 minutos, y consultar estadísticas históricas
          de los{" "}
          <Link href="/aviacion" className="text-tl-600 hover:underline">42 aeropuertos AENA</Link>.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* SECTION 3 — FERRY                                                */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="ferry" icon={Anchor}>
          Ferry: Baleares, Canarias y rutas UK
        </SectionHeading>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          El transporte marítimo de pasajeros en España mueve alrededor de 30 millones de
          viajeros anuales, la inmensa mayoría en las conexiones con Baleares y Canarias. Los
          principales operadores de ferry —Trasmediterránea (Naviera Armas), Baleària, Fred. Olsen
          y FRS— ofrecen una red densa con salidas diarias o casi diarias desde los puertos
          peninsulares de Barcelona, Valencia, Denia, Almería, Huelva y Cádiz.
        </p>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          <strong>Baleares desde Barcelona:</strong> La ruta Barcelona-Palma de Mallorca con
          fast ferry dura entre 3h 40 min y 4h 30 min según el buque; el ferry convencional
          nocturno (cabina) tarda entre 7 y 8 horas pero permite descansar y llegar con el coche.
          Con un grupo de cuatro personas o más, el ferry resulta claramente más económico que
          cuatro billetes de avión más el alquiler de coche en destino.
        </p>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          <strong>Ruta UK (Santander/Bilbao → Portsmouth/Plymouth):</strong> Brittany Ferries opera
          dos rutas de larga distancia que conectan la cornisa cantábrica con el sur de Inglaterra.
          Son especialmente populares entre familias que evitan el Eurotúnel o el Canal de la
          Mancha, y para quienes viajan desde el norte de España ahorrando horas de conducción
          por Francia. La duración oscila entre 24 y 36 horas según el trayecto.
        </p>

        <InfoBox>
          <strong>Cuándo el ferry gana al avión:</strong> cuando viajas con vehículo propio,
          cuando el grupo supera 4 personas, cuando el destino es rural (sin aeropuerto cercano)
          o cuando prefieres la experiencia de viaje lento. El ferry también es el modo de menor
          estrés para familias con niños pequeños.
        </InfoBox>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          Consulta posiciones de buques en tiempo real —incluyendo los ferrys en ruta— en la
          sección{" "}
          <Link href="/maritimo" className="text-tl-600 hover:underline">marítima de trafico.live</Link>,
          con datos AIS de más de 10 millones de posiciones diarias y las rutas de ferry
          principales con horarios.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* SECTION 4 — AUTOBÚS                                              */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="autobus" icon={Bus}>
          Autobús: la red más densa de Europa
        </SectionHeading>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          España tiene una de las redes de autobús interurbano más extensas del mundo: más de
          1.000 operadores, miles de líneas y cobertura casi universal del territorio, incluidas
          muchas zonas rurales sin tren. El autobús largo recorrido se ha consolidado además como
          la opción más económica para viajeros sin urgencia horaria: Madrid-Barcelona desde 6 €,
          Madrid-Sevilla desde 8 € con operadores como Alsa, Flixbus o Avanza.
        </p>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          Su gran fortaleza es la <strong>capilaridad</strong>: llega a municipios de 200
          habitantes donde no hay estación de tren ni aeropuerto. Para viajes de menos de
          200 km hacia destinos secundarios (capitales de provincia, núcleos rurales), el
          autobús suele ser la única alternativa al coche privado, con frecuencias de 2 a 6
          expediciones diarias.
        </p>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          El transporte público urbano —metro, tranvía, autobús urbano— está experimentando
          una expansión notable. Puedes consultar operadores, rutas y paradas de más de 15
          redes metropolitanas (incluyendo Metro de Madrid, Barcelona, Bilbao, EMT Madrid,
          Ouigo y FGC) en la sección de{" "}
          <Link href="/transporte-publico" className="text-tl-600 hover:underline">
            transporte público de trafico.live
          </Link>.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* SECTION 5 — COCHE                                                */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="coche" icon={Car}>
          Coche: peajes, combustible y tiempos
        </SectionHeading>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          El vehículo privado sigue siendo el modo dominante en España: según los datos del INE
          para 2025, más del 62% de los desplazamientos interurbanos se realizan en coche. Su
          ventaja es la flexibilidad total: horario a elección, capacidad de carga, acceso a
          destinos sin transporte público y coste marginal bajo cuando el coche ya está amortizado.
        </p>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          El <strong>coste real</strong> del coche es, sin embargo, mucho mayor de lo que muchos
          conductores calculan. Usando los valores medios de 2026 (gasolina 95 a 1,62 €/l,
          gasóleo a 1,51 €/l según CNMC), un vehículo con consumo medio de 6,5 l/100 km genera
          un coste de combustible de aproximadamente 10,5 c€/km. Sumando peajes (en la autopista
          A-2 Madrid-Zaragoza el peaje ronda los 23 € en un turismo), desgaste y seguro, el
          coste total por kilómetro supera frecuentemente los 0,18 €/km.
        </p>

        <InfoBox>
          <strong>Peajes en 2026:</strong> la red de autopistas de peaje está en proceso de
          reducción —varias AP han perdido la concesión y pasado a ser de libre circulación— pero
          los ejes AP-7 (litoral mediterráneo), AP-6/AP-61 (Madrid-Burgos) y las radiales de
          Madrid mantienen tarifas. Consulta los precios actualizados de carburante en más de
          10.000 gasolineras en{" "}
          <Link href="/carreteras" className="text-tl-600 hover:underline">carreteras</Link>{" "}
          y{" "}
          <Link href="/combustible" className="text-tl-600 hover:underline">combustible</Link>{" "}
          de trafico.live.
        </InfoBox>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          Las <strong>Zonas de Bajas Emisiones (ZBE)</strong> en Madrid, Barcelona, Valencia,
          Sevilla y otras ciudades están limitando la circulación de vehículos sin etiqueta
          ambiental en el centro urbano, especialmente en episodios de contaminación. Si tu
          vehículo no tiene etiqueta de la DGT (o tiene la D o B), comprueba las restricciones
          antes de entrar a cualquier ciudad grande.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* SECTION 6 — COMPARATIVA                                         */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="comparativa" icon={BarChart3}>
          Comparativa: Madrid ↔ Barcelona, 5 modos
        </SectionHeading>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          El corredor Madrid-Barcelona (aproximadamente 620 km por carretera, 505 km en línea
          recta) es el más analizado de España y uno de los más competitivos de Europa entre
          los modos de transporte. La siguiente tabla recoge datos medios para el año 2026,
          calculados de puerta a puerta desde el centro de Madrid (Sol/Gran Vía) hasta el centro
          de Barcelona (Plaza Cataluña).
        </p>

        <DataTable
          headers={["Modo", "Tiempo puerta-puerta", "Precio medio", "CO₂ por pax", "Comodidad"]}
          rows={[
            ["AVE / Avlo", "3h 00–3h 20 min", "14–90 €", "~6 kg", "★★★★★"],
            ["Avión", "3h 30–4h 20 min", "25–120 €", "55–85 kg", "★★★☆☆"],
            ["Autobús", "7h 00–8h 00 min", "6–18 €", "~28 kg", "★★★☆☆"],
            ["Coche", "5h 45–7h 00 min", "55–90 €", "~90 kg", "★★★★☆"],
            ["Ferry+tren", "No aplicable", "—", "—", "—"],
          ]}
        />

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          <strong>Conclusión:</strong> para un viajero individual en el corredor Madrid-Barcelona,
          el AVE/Avlo es claramente el modo ganador en la mayoría de circunstancias cuando se
          reserva con antelación suficiente. El avión solo supera al tren en precio cuando
          consigues una tarifa flash (inferiores a 20 €), pero el tiempo total puerta-puerta lo
          nivela o supera. El autobús es la opción para presupuesto ajustado y sin urgencia. El
          coche se justifica cuando viajan 3-4 personas o cuando el destino final está lejos del
          centro de Barcelona.
        </p>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          Para otros corredores la comparativa cambia significativamente. Madrid-Sevilla: el AVE
          (2h 20 min) es imbatible salvo en tarifas de último minuto de avión. Madrid-Valencia:
          el AVE (1h 40 min) no admite competencia. Madrid-Pamplona o Madrid-Logroño: el Alvia
          (3-4h) compite de tú a tú con el avión. En rutas sin alta velocidad como Sevilla-Bilbao
          o Barcelona-A Coruña, el avión o incluso el coche/autobús pueden ser más eficientes.
        </p>

        {/* ---------------------------------------------------------------- */}
        {/* SECTION 7 — HERRAMIENTAS                                        */}
        {/* ---------------------------------------------------------------- */}
        <SectionHeading id="herramientas" icon={ArrowRight}>
          Herramientas trafico.live que te ayudan
        </SectionHeading>

        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          trafico.live agrega datos en tiempo real de más de 20 fuentes oficiales (DGT, AEMET,
          Renfe, CNMC, OpenSky, aisstream.io, MITECO, AENA, MobilityData y otras) para ofrecerte
          una visión completa de la movilidad en España. Estas son las secciones más útiles para
          planificar y ejecutar tus viajes:
        </p>

        <div className="my-6 grid gap-3 sm:grid-cols-2">
          {[
            {
              href: "/trenes",
              icon: Train,
              title: "Trenes en directo",
              desc: "~115 trenes de largo recorrido en el mapa, alertas Renfe y puntualidad por marca.",
            },
            {
              href: "/aviacion",
              icon: Plane,
              title: "Aviación",
              desc: "Aeronaves sobre España en tiempo real (OpenSky) y estadísticas de 42 aeropuertos AENA.",
            },
            {
              href: "/maritimo",
              icon: Anchor,
              title: "Marítimo",
              desc: "Posiciones AIS de buques, rutas de ferry y 197 puertos españoles.",
            },
            {
              href: "/transporte-publico",
              icon: Bus,
              title: "Transporte público",
              desc: "Metro, autobús y tranvía: 15+ operadores, rutas y paradas GTFS.",
            },
            {
              href: "/combustible",
              icon: Euro,
              title: "Combustible",
              desc: "Precios en más de 10.000 gasolineras, histórico CNMC desde 2016.",
            },
            {
              href: "/calidad-aire",
              icon: Leaf,
              title: "Calidad del aire",
              desc: "Índice ICA de MITECO en 565 estaciones, actualizado cada hora.",
            },
          ].map(({ href, icon: Icon, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex gap-3 rounded-xl border border-tl-100 dark:border-tl-800 p-4 hover:border-tl-300 dark:hover:border-tl-600 hover:bg-tl-50 dark:hover:bg-tl-950/40 transition-colors"
            >
              <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-tl-50 dark:bg-tl-900/50 flex items-center justify-center group-hover:bg-tl-100 dark:group-hover:bg-tl-800/50 transition-colors">
                <Icon className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              </span>
              <div>
                <strong className="text-sm font-semibold text-gray-900 dark:text-gray-100 block mb-0.5">
                  {title}
                </strong>
                <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {desc}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Newsletter Hero — BOTTOM */}
        <NewsletterHero
          source="guia-multimodal"
          leadMagnet="guia-multimodal"
          layout="banner"
        />

        {/* Sources */}
        <footer className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Fuentes de datos
          </h3>
          <ul className="space-y-1 text-xs text-gray-400 dark:text-gray-500">
            {[
              "DGT — Dirección General de Tráfico (incidencias, velocidades, accidentalidad)",
              "Renfe — GTFS estático y GTFS-RT (posiciones, alertas, retrasos)",
              "MINETUR / CNMC — Precios de carburantes (histórico desde 2016)",
              "OpenSky Network — Posiciones ADS-B de aeronaves sobre España",
              "aisstream.io — Rastreo AIS de embarcaciones (tiempo real)",
              "AENA — Estadísticas de tráfico aeroportuario (Eurostat AVIA_PAOA)",
              "MITECO — Índice ICA de calidad del aire (506 estaciones)",
              "INE — Estadísticas de transporte modal (Encuesta de Movilidad 2025)",
              "Ministerio de Transportes — Aforos IMD, matrices O-D BigData",
            ].map((src) => (
              <li key={src} className="flex items-start gap-1.5">
                <span className="mt-0.5 text-tl-400">·</span>
                <span>{src}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Última actualización: {LAST_UPDATED}. Los precios y tiempos indicados son valores medios
            orientativos y pueden variar según la fecha, operador y disponibilidad.
          </p>
        </footer>
      </main>
    </>
  );
}
