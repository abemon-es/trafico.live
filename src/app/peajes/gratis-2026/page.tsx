import { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Route, Calendar, ChevronRight, PartyPopper } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Autopistas que Serán Gratis en 2026 — Peajes que Desaparecen",
  description: "La AP-68 (Bilbao–Zaragoza) dejará de ser de peaje en noviembre de 2026. Lista completa de autopistas liberalizadas y próximas concesiones que expiran.",
  alternates: { canonical: `${BASE_URL}/peajes/gratis-2026` },
  openGraph: { title: "Autopistas Gratis en 2026", description: "La AP-68 deja de tener peaje en noviembre de 2026.", locale: "es_ES" },
};

const FREED_ROADS = [
  { road: "AP-1", route: "Burgos – Armiñón", year: 2018, km: 84 },
  { road: "AP-4", route: "Sevilla – Cádiz", year: 2019, km: 94 },
  { road: "AP-7", route: "Tarragona – La Jonquera", year: 2021, km: 224 },
  { road: "AP-7", route: "Tarragona – Valencia – Alicante", year: 2019, km: 352 },
  { road: "AP-2", route: "Zaragoza – Mediterráneo", year: 2021, km: 215 },
  { road: "AP-7", route: "Circunvalación de Alicante", year: 2025, km: 15 },
];

const EXPIRING_2026 = [
  { road: "AP-68", route: "Bilbao – Zaragoza", date: "Noviembre 2026", km: 295, price: "22,65€", operator: "Avasa (Abertis)" },
];

const EXPIRING_FUTURE = [
  { road: "AP-6/AP-51/AP-61", expires: "2029", route: "Madrid – Adanero – Ávila – Segovia" },
  { road: "AP-46", expires: "2044", route: "Málaga – Alto de las Pedrizas" },
  { road: "AP-9", expires: "2048", route: "Ferrol – Portugal" },
  { road: "AP-66", expires: "2050", route: "León – Campomanes" },
  { road: "AP-7 Costa del Sol", expires: "2054", route: "Málaga – Guadiaro" },
  { road: "AP-71", expires: "2055", route: "León – Astorga" },
];

export default function PeajesGratis2026Page() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: "Peajes", href: "/peajes" }, { name: "Gratis 2026", href: "/peajes/gratis-2026" }]} />

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">Autopistas que Serán Gratis en 2026</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
            La AP-68 (Bilbao – Zaragoza) será la próxima autopista en perder su peaje tras el fin de la concesión en noviembre de 2026. Estas son todas las autopistas ya liberalizadas y las que aún quedan por liberalizar.
          </p>
        </div>

        {/* AP-68 highlight */}
        <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800/50 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <PartyPopper className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
            <h2 className="text-lg font-semibold text-tl-amber-900 dark:text-tl-amber-300">Próxima autopista gratis</h2>
          </div>
          {EXPIRING_2026.map((r) => (
            <div key={r.road}>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{r.road}: {r.route}</p>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{r.km} km · Peaje actual: <span className="font-data font-bold text-tl-amber-700 dark:text-tl-amber-300">{r.price}</span> · Operador: {r.operator}</p>
              <p className="text-tl-amber-800 dark:text-tl-amber-300 font-semibold mt-2 flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Será gratuita a partir de {r.date}</p>
            </div>
          ))}
        </div>

        {/* Already freed */}
        <section className="mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Autopistas ya liberalizadas</h2>
            <div className="space-y-3">
              {FREED_ROADS.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/10">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{r.road}: {r.route}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.km} km</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">Gratis desde {r.year}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Future expirations */}
        <section className="mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Próximas concesiones por expirar</h2>
            <div className="space-y-3">
              {EXPIRING_FUTURE.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{r.road}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.route}</p>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-data">{r.expires}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SEO content */}
        <section className="mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 not-prose mb-3">¿Por qué se liberalizan las autopistas?</h2>
            <p>Las autopistas de peaje en España son concesiones temporales otorgadas a empresas privadas para su construcción, mantenimiento y explotación. Cuando la concesión expira, la autopista revierte al Estado y pasa a ser gratuita.</p>
            <p>En los últimos años, varias concesiones importantes han expirado: la AP-1 (2018), AP-4 (2019), tramos de la AP-7 (2019-2021) y la AP-2 (2021). El próximo hito es la AP-68 Bilbao–Zaragoza en noviembre de 2026.</p>
            <p>Las autopistas gestionadas por SEITT (radiales de Madrid, AP-36, AP-41) tienen concesiones hasta 2032 y no se espera su liberalización antes de esa fecha.</p>
          </div>
        </section>

        <Link href="/peajes" className="flex items-center justify-between bg-tl-600 hover:bg-tl-700 text-white rounded-xl p-4 transition-colors">
          <div className="flex items-center gap-3"><Route className="w-6 h-6" /><p className="font-semibold">Ver todos los peajes actuales</p></div>
          <ChevronRight className="w-5 h-5" />
        </Link>
      </main>
    </div>
  );
}
