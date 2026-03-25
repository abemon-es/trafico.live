import { Metadata } from "next";
import Link from "next/link";
import {
  Ban,
  Truck,
  AlertCircle,
  MapPin,
  ChevronRight,
  Clock,
  Ruler,
  Scale,
  AlertTriangle,
  Leaf,
  Zap,
  CalendarDays,
  Shield,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

export const revalidate = 3600;

const CURRENT_YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: `Restricciones de Circulación en España ${CURRENT_YEAR} | trafico.live`,
  description:
    "Restricciones de circulación en España: vehículos pesados, Zonas de Bajas Emisiones (ZBE), túneles, restricciones estacionales y por meteorología adversa. Datos oficiales DGT.",
  keywords: [
    "restricciones circulación",
    "restricciones camiones España",
    "restricciones vehículos pesados",
    "ZBE zonas bajas emisiones",
    "restricciones tráfico festivos",
    "restricciones transporte pesado DGT",
    "restricciones domingos camiones",
    "limitaciones circulación España",
  ],
  openGraph: {
    title: `Restricciones de Circulación en España ${CURRENT_YEAR} | trafico.live`,
    description:
      "Todas las restricciones de circulación en España: camiones, ZBE, túneles y festivos. Datos oficiales DGT actualizados.",
  },
  alternates: {
    canonical: "https://trafico.live/restricciones",
  },
};

const HEAVY_VEHICLE_RESTRICTIONS = {
  general:
    "Vehículos de más de 7.500 kg MMA están prohibidos de circular los domingos y festivos de 8:00 a 24:00 y vísperas de festivo de 15:00 a 24:00, en las vías de la Red de Carreteras del Estado.",
  exceptions: [
    "Vehículos de servicios públicos esenciales",
    "Vehículos con mercancías perecederas",
    "Mudanzas autorizadas",
    "Transporte de ganado vivo",
  ],
  specialPeriods: [
    {
      period: "Semana Santa",
      dates: "27 mar - 6 abr",
      extraRestrictions:
        "Restricciones ampliadas a vehículos de +3.500 kg en itinerarios principales",
    },
    {
      period: "Verano",
      dates: "Jul - Ago (viernes)",
      extraRestrictions:
        "Viernes de 14:00 a 22:00 en principales autopistas y autovías",
    },
  ],
};

const TUNNEL_RESTRICTIONS = [
  {
    name: "Túnel de Somport",
    road: "N-330",
    height: "4,5 m",
    width: "2,5 m",
    weight: null,
    notes: "Mercancías peligrosas: regulación específica ADR",
  },
  {
    name: "Túnel del Cadí",
    road: "C-16",
    height: "4,5 m",
    width: null,
    weight: null,
    notes: "Peaje obligatorio. Cierre ante condiciones adversas.",
  },
  {
    name: "Túnel de Bielsa",
    road: "A-138",
    height: null,
    width: null,
    weight: "19 t",
    notes: "Cerrado en condiciones meteorológicas adversas",
  },
  {
    name: "Túnel de Viella",
    road: "N-230",
    height: "4,5 m",
    width: null,
    weight: null,
    notes: "Alternativa en superficie puede cerrarse por nieve",
  },
];

const FAQ_ITEMS = [
  {
    question: "¿Qué días no pueden circular los camiones en España?",
    answer:
      "Los vehículos de más de 7.500 kg MMA tienen prohibida la circulación todos los domingos y festivos nacionales de 8:00 a 24:00, y las vísperas de festivo de 15:00 a 24:00 en la Red de Carreteras del Estado. Durante Semana Santa y el período estival (julio-agosto), estas restricciones se amplían también a los viernes de 14:00 a 22:00 en principales autopistas y autovías.",
  },
  {
    question: "¿Qué es una Zona de Bajas Emisiones (ZBE)?",
    answer:
      "Una Zona de Bajas Emisiones es un área urbana donde se restringe el acceso de vehículos con mayor nivel de emisiones, basándose en el distintivo ambiental de la DGT: 0 emisiones (eléctrico/hidrogeno), ECO (híbrido enchufable/gas), C (gasolina Euro 4+, diésel Euro 6), B (gasolina Euro 3, diésel Euro 5) y sin distintivo. Cada municipio puede establecer sus propias normas dentro del marco legal.",
  },
  {
    question: "¿Puedo circular con un camión con mercancías perecederas en festivo?",
    answer:
      "Sí. Los vehículos que transporten mercancías perecederas están exentos de las restricciones de circulación para vehículos pesados en domingos y festivos, siempre que dispongan de la autorización correspondiente y cumplan la normativa de transportes. También están exentos los vehículos de servicios públicos esenciales, mudanzas autorizadas y transporte de ganado vivo.",
  },
];

export default async function RestriccionesPage() {
  const zbeZones = await prisma.zBEZone.findMany({
    orderBy: { cityName: "asc" },
    select: {
      id: true,
      name: true,
      cityName: true,
      restrictions: true,
      activeAllYear: true,
      effectiveFrom: true,
    },
  });

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Restricciones", href: "/restricciones" },
            ]}
          />

          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <Ban className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Restricciones de Circulación
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                  En España existen varios tipos de restricciones de circulación: para{" "}
                  <strong>vehículos pesados</strong> en domingos y festivos, acceso a{" "}
                  <strong>Zonas de Bajas Emisiones</strong> (ZBE) según el distintivo ambiental,
                  limitaciones en <strong>túneles</strong> y restricciones por{" "}
                  <strong>meteorología adversa</strong> en puertos de montaña.
                </p>
              </div>
            </div>
          </div>

          {/* Heavy vehicle restrictions */}
          <section className="mb-8" aria-labelledby="heading-heavy">
            <h2 id="heading-heavy" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Restricciones para vehículos pesados
            </h2>

            {/* Main rule */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-red-100 p-5 mb-4">
              <div className="flex items-start gap-3 mb-4">
                <Truck className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Norma general</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                    {HEAVY_VEHICLE_RESTRICTIONS.general}
                  </p>
                </div>
              </div>

              {/* Schedule visual */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-semibold text-red-800">
                      Domingos y festivos
                    </span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-400">08:00 – 24:00</p>
                </div>
                <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg p-3 border border-tl-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-tl-amber-600 dark:text-tl-amber-400" />
                    <span className="text-sm font-semibold text-tl-amber-800">
                      Vísperas de festivo
                    </span>
                  </div>
                  <p className="text-sm text-tl-amber-700 dark:text-tl-amber-300">15:00 – 24:00</p>
                </div>
              </div>

              {/* Exceptions */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Excepciones</h4>
                <ul className="space-y-1">
                  {HEAVY_VEHICLE_RESTRICTIONS.exceptions.map((exc) => (
                    <li key={exc} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="w-1.5 h-1.5 bg-tl-50 dark:bg-tl-900/200 rounded-full flex-shrink-0" />
                      {exc}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Special periods */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {HEAVY_VEHICLE_RESTRICTIONS.specialPeriods.map((sp) => (
                <div
                  key={sp.period}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-tl-amber-100 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-tl-amber-600 dark:text-tl-amber-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{sp.period}</h3>
                  </div>
                  <p className="text-xs text-tl-600 dark:text-tl-400 font-medium mb-2">{sp.dates}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{sp.extraRestrictions}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Consulta el calendario completo de restricciones en{" "}
              <Link
                href="/operaciones"
                className="text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 hover:underline"
              >
                Operaciones Especiales
              </Link>{" "}
              y las restricciones para profesionales en{" "}
              <Link
                href="/profesional/restricciones"
                className="text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 hover:underline"
              >
                portal profesional
              </Link>
              .
            </div>
          </section>

          {/* ZBE Zones */}
          <section className="mb-8" aria-labelledby="heading-zbe">
            <h2 id="heading-zbe" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Zonas de Bajas Emisiones (ZBE)
            </h2>

            <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg p-4 mb-5 flex items-start gap-3">
              <Leaf className="w-5 h-5 text-tl-600 dark:text-tl-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-tl-800 dark:text-tl-200">
                  {zbeZones.length} zonas ZBE registradas en España
                </h3>
                <p className="text-sm text-tl-700 dark:text-tl-300 mt-0.5">
                  Los municipios de más de 50.000 habitantes están obligados a implantar ZBE
                  según la Ley de Cambio Climático. Verifica el distintivo ambiental de tu
                  vehículo antes de circular por áreas urbanas.
                </p>
              </div>
            </div>

            {zbeZones.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {zbeZones.map((zone) => (
                  <Link
                    key={zone.id}
                    href="/zbe"
                    className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 hover:border-tl-300 hover:shadow-md transition-all group block"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:text-tl-400 transition-colors line-clamp-1">
                        {zone.name}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-tl-500 transition-colors flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{zone.cityName}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          zone.activeAllYear
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100"
                            : "bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-600 dark:text-tl-amber-400 border border-tl-amber-100"
                        }`}
                      >
                        {zone.activeAllYear ? "Todo el año" : "Períodos limitados"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No hay zonas ZBE cargadas en la base de datos actualmente.
                </p>
                <Link
                  href="/zbe"
                  className="inline-flex items-center gap-1 mt-3 text-tl-600 dark:text-tl-400 text-sm hover:underline"
                >
                  Ver más sobre ZBE <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </section>

          {/* Tunnel restrictions */}
          <section className="mb-8" aria-labelledby="heading-tunnels">
            <h2 id="heading-tunnels" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Restricciones en túneles
            </h2>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-center">
                <Ruler className="w-5 h-5 text-tl-600 dark:text-tl-400 mx-auto mb-1.5" />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Altura</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Gálibo vertical</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-center">
                <Scale className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 mx-auto mb-1.5" />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Peso</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tonelaje máximo</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-center">
                <Ruler className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto mb-1.5 rotate-90" />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Anchura</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Límite lateral</p>
              </div>
            </div>

            <div className="space-y-3">
              {TUNNEL_RESTRICTIONS.map((t) => (
                <div
                  key={t.name}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t.name}</h3>
                      <p className="text-sm text-tl-600 dark:text-tl-400 font-medium">{t.road}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {t.height && (
                      <span className="text-xs bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 border border-tl-100 px-2 py-1 rounded-lg font-medium">
                        Altura máx: {t.height}
                      </span>
                    )}
                    {t.width && (
                      <span className="text-xs bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 border border-tl-100 px-2 py-1 rounded-lg font-medium">
                        Anchura máx: {t.width}
                      </span>
                    )}
                    {t.weight && (
                      <span className="text-xs bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-700 dark:text-tl-amber-300 border border-tl-amber-100 px-2 py-1 rounded-lg font-medium">
                        Tonelaje máx: {t.weight}
                      </span>
                    )}
                  </div>
                  {t.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.notes}</p>
                  )}
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Datos orientativos. Consulta siempre la información oficial del gestor de
              cada infraestructura antes de circular con vehículos especiales.
            </p>
          </section>

          <RelatedLinks
            links={[
              {
                title: "Operaciones Especiales",
                description: "Calendario DGT 2026: Semana Santa, verano...",
                href: "/operaciones",
                icon: <CalendarDays className="w-5 h-5" />,
              },
              {
                title: "Portal Profesional",
                description: "Restricciones y datos para transportistas",
                href: "/profesional/restricciones",
                icon: <Truck className="w-5 h-5" />,
              },
              {
                title: "ZBE y Carga Eléctrica",
                description: "Zonas de Bajas Emisiones y puntos de carga EV",
                href: "/zbe",
                icon: <Zap className="w-5 h-5" />,
              },
              {
                title: "Puntos Negros",
                description: "Tramos de concentración de accidentes (TCA)",
                href: "/puntos-negros",
                icon: <Shield className="w-5 h-5" />,
              },
            ]}
          />

          {/* FAQ */}
          <section aria-labelledby="heading-faq">
            <h2 id="heading-faq" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas frecuentes sobre restricciones
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.question}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{item.question}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
