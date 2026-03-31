import { Metadata } from "next";
import Link from "next/link";
import EspanaContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

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
    <>
      {/* Server-rendered header — always visible to crawlers before JS loads */}
      <div className="bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
          <Breadcrumbs items={[
            { name: "Inicio", href: "/" },
            { name: "España", href: "/espana" },
          ]} />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Tráfico en España
          </h1>
          <p className="mt-2 mb-6 text-gray-600 dark:text-gray-400 max-w-3xl">
            Estado del tráfico en tiempo real en las 17 comunidades autónomas de España.
            Incidencias activas, balizas V16, cámaras de la DGT y estadísticas de
            siniestralidad actualizadas.
          </p>
          {/* Static community links grid — crawlable internal links, shown before JS hydrates */}
          <nav aria-label="Comunidades autónomas de España">
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-6 list-none p-0 m-0">
              {COMMUNITIES.map((community) => (
                <li key={community.slug}>
                  <Link
                    href={`/comunidad-autonoma/${community.slug}`}
                    className="block px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
                  >
                    {community.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Client component with live SWR data — real-time stats, counts, and full interactive grid */}
      <EspanaContent />
    </>
  );
}
