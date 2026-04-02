import Link from "next/link";

interface Article {
  category: string;
  categoryColor: string;
  title: string;
  description: string;
  href: string;
}

const ARTICLES: Article[] = [
  {
    category: "Informe diario",
    categoryColor: "text-tl-600",
    title: "Tráfico hoy: miércoles 2 de abril",
    description: "342 incidencias activas, 12 retenciones. Alertas en Galicia y el litoral norte.",
    href: "/blog/trafico-hoy-2-abril",
  },
  {
    category: "Análisis",
    categoryColor: "text-tl-amber-500",
    title: "El diésel cae un 3% en marzo",
    description: "Estaciones más baratas de España y evolución mensual del precio del combustible.",
    href: "/blog/diesel-marzo-2025",
  },
  {
    category: "Seguridad vial",
    categoryColor: "text-signal-red",
    title: "50 puntos negros 2025",
    description: "Accidentalidad histórica por tramo. Los tramos con mayor siniestralidad en la red.",
    href: "/blog/puntos-negros-2025",
  },
  {
    category: "Movilidad",
    categoryColor: "text-signal-green",
    title: "ZBE Madrid: cambios en abril",
    description: "Nuevas restricciones de acceso a Madrid Central y Madrid 360 a partir de abril.",
    href: "/blog/zbe-madrid-abril-2025",
  },
];

export function EditorialSection() {
  return (
    <section className="py-18 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-widest text-tl-600 mb-1">
              Publicaciones
            </p>
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
              Análisis y noticias
            </h2>
          </div>
          <Link
            href="/blog"
            className="text-xs font-medium text-tl-600 hover:text-tl-700 dark:text-tl-400 dark:hover:text-tl-300 whitespace-nowrap"
          >
            Ver todas &rarr;
          </Link>
        </div>

        {/* 4-column article grid — 1px gap pattern */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          {ARTICLES.map((article) => (
            <Link
              key={article.title}
              href={article.href}
              className="bg-white dark:bg-gray-900 p-5 flex flex-col hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <p
                className={`font-heading text-xs font-semibold uppercase tracking-wider mb-2 ${article.categoryColor}`}
              >
                {article.category}
              </p>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug mb-1.5">
                {article.title}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                {article.description}
              </p>
            </Link>
          ))}
        </div>

        {/* SEO paragraph */}
        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-3xl">
          trafico.live publica informes diarios de tráfico, análisis de precios de combustible, reportajes de seguridad vial y noticias sobre movilidad urbana y zonas de bajas emisiones. Nuestro contenido se genera a partir de datos oficiales de la DGT, AEMET y el Ministerio de Transportes.
        </p>
      </div>
    </section>
  );
}
