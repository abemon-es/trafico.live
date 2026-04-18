import Link from "next/link";
import prisma from "@/lib/db";
import { Gauge, AlertTriangle, Route, Shield, Car } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "Límites de Velocidad en España | Carreteras DGT",
  description:
    "Guía completa de límites de velocidad en España por tipo de vía: autopistas (120 km/h), autovías (120), carreteras convencionales (90), zonas urbanas (50) y zonas residenciales (20-30). Datos oficiales DGT.",
  path: "/carreteras/limites-velocidad",
  keywords: [
    "límites velocidad España",
    "velocidad máxima autopista",
    "velocidad máxima autovía",
    "velocidad máxima carretera convencional",
    "velocidad máxima zona urbana",
    "DGT velocidad",
  ],
});

const GENERIC_LIMITS = [
  {
    type: "Autopista (AP)",
    maxSpeed: 120,
    minSpeed: 60,
    description: "Vías de alta capacidad con control de accesos y peaje",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-200 dark:border-purple-800",
  },
  {
    type: "Autovía (A)",
    maxSpeed: 120,
    minSpeed: 60,
    description: "Vías de alta capacidad sin peaje, con separación de sentidos",
    color: "text-tl-600 dark:text-tl-400",
    bg: "bg-tl-50 dark:bg-tl-900/20",
    border: "border-tl-200 dark:border-tl-800",
  },
  {
    type: "Carretera convencional (N / C / ...)",
    maxSpeed: 90,
    minSpeed: null,
    description: "Carreteras de un carril por sentido sin separación física",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
  },
  {
    type: "Vía interurbana de 2+ carriles",
    maxSpeed: 100,
    minSpeed: null,
    description: "Carreteras convencionales con dos o más carriles por sentido",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-800",
  },
  {
    type: "Zona urbana",
    maxSpeed: 50,
    minSpeed: null,
    description: "Vías dentro de población (tramos urbanos señalizados)",
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-200 dark:border-yellow-800",
  },
  {
    type: "Calle residencial / zona 30",
    maxSpeed: 30,
    minSpeed: null,
    description: "Calles urbanas de plataforma única o con señal zona 30",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    type: "Zona 20",
    maxSpeed: 20,
    minSpeed: null,
    description: "Entornos colegios, peatonalizadas o plataformas compartidas",
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
  },
];

const VEHICLE_LIMITS = [
  { vehicle: "Turismos / motocicletas", ap: 120, conv: 90, urbana: 50 },
  { vehicle: "Camiones > 3.500 kg", ap: 90, conv: 80, urbana: 50 },
  { vehicle: "Autobuses", ap: 100, conv: 90, urbana: 50 },
  { vehicle: "Vehículos articulados", ap: 80, conv: 70, urbana: 50 },
  { vehicle: "Motos < 125 cc (< 2 años carné)", ap: 100, conv: 80, urbana: 50 },
];

export default async function LimitesVelocidadPage() {
  // Aggregate speed limit counts from DB (generic stats only)
  const [totalLimits, byLimit] = await Promise.all([
    prisma.speedLimit.count(),
    prisma.speedLimit.groupBy({
      by: ["speedLimit"],
      _count: true,
      orderBy: { speedLimit: "asc" },
    }),
  ]);

  const faqItems = [
    {
      question: "¿Cuál es la velocidad máxima en autopistas y autovías en España?",
      answer:
        "La velocidad máxima genérica en autopistas (AP) y autovías (A) es de 120 km/h para turismos y motocicletas. Los camiones de más de 3.500 kg tienen un límite de 90 km/h en autopistas. La velocidad mínima en estas vías es de 60 km/h.",
    },
    {
      question: "¿A cuánto se puede circular en carretera convencional?",
      answer:
        "En carreteras convencionales (con un carril por sentido), la velocidad máxima genérica es de 90 km/h. En las que tienen dos o más carriles por sentido sin separación física, el límite sube a 100 km/h. Si hay señalización específica que indique otro límite, esta prevalece siempre.",
    },
    {
      question: "¿Qué velocidad máxima se aplica en ciudad?",
      answer:
        "En zonas urbanas el límite genérico es de 50 km/h. Las calles de plataforma única (calzada y acera al mismo nivel) o las señalizadas como zona 30 tienen un máximo de 30 km/h. Las entradas de colegios, zonas peatonalizadas compartidas y «zona 20» reducen el límite a 20 km/h.",
    },
    {
      question: "¿Puede la DGT instalar límites inferiores a los genéricos?",
      answer:
        "Sí. La DGT y las administraciones de carreteras pueden fijar límites especiales (señalización vertical o paneles de mensaje variable) por condiciones de la vía, densidad de tráfico, proximidad a poblaciones, condiciones meteorológicas adversas o tramos con alto índice de accidentalidad. Esos límites prevalecen sobre los genéricos.",
    },
    {
      question: "¿Qué pasa si hay lluvia o niebla? ¿Cambia el límite?",
      answer:
        "La normativa no establece automáticamente un límite inferior por lluvia, pero obliga al conductor a adaptar la velocidad a las condiciones de la vía. Además, algunos paneles de mensaje variable (PMV) de la DGT y la comunidad autónoma de Madrid reducen el límite a 80 km/h en tramos de acceso a Madrid cuando llueve o hay niebla.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Carreteras", href: "/carreteras" },
            { name: "Límites de velocidad", href: "/carreteras/limites-velocidad" },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Gauge className="w-8 h-8 text-tl-600 dark:text-tl-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Límites de velocidad en España
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl text-lg">
            Guía completa de los límites de velocidad vigentes según el tipo de vía y categoría de
            vehículo. Datos basados en el Reglamento General de Circulación (RGC) y las señales
            verticales de la DGT.
          </p>
        </div>

        {/* Stats Row */}
        {totalLimits > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <div className="font-data text-2xl font-bold text-tl-600 dark:text-tl-400">
                {totalLimits.toLocaleString("es-ES")}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Segmentos con límite registrado</div>
            </div>
            {byLimit.slice(0, 3).map((row) => (
              <div
                key={row.speedLimit}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="font-data text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {row.speedLimit} km/h
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {row._count.toLocaleString("es-ES")} segmentos
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generic limits by road type */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Route className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            Velocidades máximas genéricas por tipo de vía
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            Los límites genéricos son los que se aplican cuando no existe señalización específica que indique
            otro valor. La señal siempre prevalece sobre el genérico.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GENERIC_LIMITS.map((row) => (
              <div
                key={row.type}
                className={`${row.bg} border ${row.border} rounded-xl p-5 flex items-start gap-4`}
              >
                <div className={`text-3xl font-data font-bold ${row.color} flex-shrink-0 w-16 text-right`}>
                  {row.maxSpeed}
                </div>
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wide ${row.color} mb-0.5`}>km/h</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{row.type}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{row.description}</div>
                  {row.minSpeed && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Velocidad mínima: {row.minSpeed} km/h
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Limits by vehicle category */}
        <section className="mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <Car className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            Velocidades por categoría de vehículo
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            Velocidades máximas en km/h según categoría de vehículo y tipo de vía (Art. 48 RGC).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left font-semibold text-gray-700 dark:text-gray-300 py-2 pr-4">Categoría</th>
                  <th className="text-center font-semibold text-purple-700 dark:text-purple-300 py-2 px-3">Autopista / Autovía</th>
                  <th className="text-center font-semibold text-red-700 dark:text-red-300 py-2 px-3">Conv. un carril</th>
                  <th className="text-center font-semibold text-yellow-700 dark:text-yellow-300 py-2 px-3">Zona urbana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {VEHICLE_LIMITS.map((row) => (
                  <tr key={row.vehicle} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-2.5 pr-4 text-gray-800 dark:text-gray-200">{row.vehicle}</td>
                    <td className="py-2.5 px-3 text-center font-data font-semibold text-gray-900 dark:text-gray-100">
                      {row.ap}
                    </td>
                    <td className="py-2.5 px-3 text-center font-data font-semibold text-gray-900 dark:text-gray-100">
                      {row.conv}
                    </td>
                    <td className="py-2.5 px-3 text-center font-data font-semibold text-gray-900 dark:text-gray-100">
                      {row.urbana}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Fuente: Art. 48 Reglamento General de Circulación (RD 1428/2003). Comprueba siempre la señalización vigente.
          </p>
        </section>

        {/* Special zones */}
        <section className="mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Límites especiales y condicionales
          </h2>
          <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300 mt-4">
            <li className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Obras en calzada:</strong> La DGT puede reducir el límite con señalización temporal. Se
                sanciona el exceso aunque las obras estén fuera del horario laboral.
              </span>
            </li>
            <li className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Paneles de mensaje variable (PMV):</strong> El límite indicado en un PMV sustituye al
                genérico y al de la señal fija. Es obligatorio y sancionable.
              </span>
            </li>
            <li className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Accesos a Madrid (M-30 y radiales) con lluvia:</strong> Los paneles activan
                automáticamente 80 km/h cuando detectan precipitación.
              </span>
            </li>
            <li className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Noveles (&lt; 2 años de carné):</strong> Límite de 100 km/h en autopistas/autovías y 80
                km/h en vías convencionales, independientemente de los genéricos.
              </span>
            </li>
            <li className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Remolques y caravanas:</strong> El límite máximo en cualquier vía interurbana baja a
                80 km/h cuando el vehículo arrastra remolque superior a 750 kg.
              </span>
            </li>
          </ul>
        </section>

        {/* FAQ */}
        <FAQAccordion items={faqItems} className="mb-8" />

        {/* Related Links */}
        <RelatedLinks
          links={[
            {
              title: "Radares DGT",
              description: "Mapa completo de radares fijos, de tramo y móviles en España",
              href: "/radares",
              icon: <Gauge className="w-5 h-5" />,
            },
            {
              title: "Etiqueta ambiental",
              description: "Zonas de bajas emisiones y etiquetas DGT",
              href: "/etiqueta-ambiental",
              icon: <Shield className="w-5 h-5" />,
            },
            {
              title: "Puntos negros",
              description: "Tramos de alta concentración de accidentes en España",
              href: "/carreteras/puntos-negros",
              icon: <AlertTriangle className="w-5 h-5" />,
            },
            {
              title: "Detectores de tráfico",
              description: "Red de estaciones de aforo y detectores en tiempo real",
              href: "/carreteras/detectores",
              icon: <Route className="w-5 h-5" />,
            },
          ]}
        />
      </main>
    </div>
  );
}
