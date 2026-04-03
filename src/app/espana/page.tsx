import { Metadata } from "next";
import Link from "next/link";
import EspanaContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 600; // ISR: regenerate every 10 minutes

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Tráfico en España | Comunidades Autónomas | Tráfico España",
  description:
    "Estado del tráfico en tiempo real en las 17 comunidades autónomas de España. Balizas V16, incidencias y estadísticas de siniestralidad vial.",
  alternates: {
    canonical: `${BASE_URL}/espana`,
  },
  openGraph: {
    title: "Tráfico en España - Todas las Comunidades",
    description: "Estado del tráfico en tiempo real en todas las comunidades autónomas",
  },
};

// Static community list for SSR — keeps H1 and navigation links visible to crawlers
// independently of client-side SWR hydration.
const COMMUNITIES = [
  { name: "Andalucía", slug: "andalucia" },
  { name: "Aragón", slug: "aragon" },
  { name: "Asturias", slug: "asturias" },
  { name: "Baleares", slug: "baleares" },
  { name: "Canarias", slug: "canarias" },
  { name: "Cantabria", slug: "cantabria" },
  { name: "Castilla-La Mancha", slug: "castilla-la-mancha" },
  { name: "Castilla y León", slug: "castilla-y-leon" },
  { name: "Cataluña", slug: "cataluna" },
  { name: "Comunidad de Madrid", slug: "comunidad-de-madrid" },
  { name: "Comunidad Valenciana", slug: "comunidad-valenciana" },
  { name: "Extremadura", slug: "extremadura" },
  { name: "Galicia", slug: "galicia" },
  { name: "La Rioja", slug: "la-rioja" },
  { name: "Murcia", slug: "murcia" },
  { name: "Navarra", slug: "navarra" },
  { name: "País Vasco", slug: "pais-vasco" },
];

export default function EspanaPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Server-rendered header — always visible to crawlers before JS loads */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "España", href: "/espana" },
        ]} />
        <h1 className="mt-4 text-3xl font-heading font-bold text-gray-900">
          Tráfico en España
        </h1>
        <p className="mt-2 mb-6 text-gray-600 max-w-3xl">
          Estado del tráfico en tiempo real en las 17 comunidades autónomas de España.
          Incidencias activas, balizas V16, cámaras de la DGT y estadísticas de
          siniestralidad actualizadas.
        </p>
        {/* SEO intro */}
        <section className="mt-6 mb-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            <strong className="text-gray-900">trafico.live</strong> ofrece información de tráfico en tiempo real
            para toda España, incluyendo las 17 comunidades autónomas y más de 8.000 municipios.
            Consulta incidencias activas de la DGT, cámaras de tráfico, radares de velocidad,
            precios de combustible actualizados y puntos de recarga para vehículos eléctricos.
            Todos los datos provienen de fuentes oficiales y se actualizan automáticamente.
          </p>
        </section>
        {/* Static community links grid — crawlable internal links, shown before JS hydrates */}
        <nav aria-label="Comunidades autónomas de España">
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6 list-none p-0 m-0">
            {COMMUNITIES.map((community) => (
              <li key={community.slug}>
                <Link
                  href={`/espana/${community.slug}`}
                  className="block px-4 py-3 rounded-xl bg-white shadow-sm border border-gray-200 text-sm font-medium text-gray-700 hover:border-tl-300 hover:text-tl-600 hover:shadow-md transition-all"
                >
                  {community.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Client component with live SWR data — real-time stats, counts, and full interactive grid */}
      <EspanaContent />
    </div>
  );
}
