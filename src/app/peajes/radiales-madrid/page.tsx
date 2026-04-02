import { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Route, Clock, Calculator, ChevronRight, CreditCard } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Peajes Radiales de Madrid (R-2, R-3, R-4, R-5, M-12) — Tarifas 2026",
  description: "Tarifas actualizadas de las radiales de Madrid: R-2, R-3/R-5, R-4, M-12, AP-36 y AP-41. Gestionadas por SEITT. Gratuitas de 00:00 a 06:00. Precio por km con y sin Tag.",
  alternates: { canonical: `${BASE_URL}/peajes/radiales-madrid` },
};

const RATES = {
  ligeros: { tag: 0.0827, cash: 0.0927 },
  pesados1: { tag: 0.1194, cash: 0.1298 },
  pesados2: { tag: 0.1671, cash: 0.1854 },
};

const ROADS = [
  { id: "R-2", route: "Madrid (M-40) → Guadalajara", km: 42, slug: "r-2" },
  { id: "R-3", route: "Madrid (M-40) → Arganda del Rey", km: 25, slug: "r-3" },
  { id: "R-5", route: "Madrid (M-40) → Navalcarnero", km: 30, slug: "r-5" },
  { id: "R-4", route: "Madrid (M-50) → Ocaña", km: 52, slug: "r-4" },
  { id: "M-12", route: "M-40 → Aeropuerto T4", km: 9, slug: "m-12" },
  { id: "AP-36", route: "Ocaña → La Roda", km: 177, slug: "ap-36" },
  { id: "AP-41", route: "Madrid (M-40) → Toledo", km: 60, slug: "ap-41" },
];

function fmt(n: number, d = 4) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPrice(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RadialesMadridPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: "Peajes", href: "/peajes" }, { name: "Radiales Madrid", href: "/peajes/radiales-madrid" }]} />

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">Peajes Radiales de Madrid</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
            Las radiales de Madrid (R-2, R-3/R-5, R-4) y las autopistas AP-36, AP-41 y M-12 están gestionadas por SEITT con tarifa por kilómetro. Gratuitas de 00:00 a 06:00.
          </p>
        </div>

        {/* Rate card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-tl-600 dark:text-tl-400" /> Tarifas por kilómetro (2026)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Con Tag</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Sin Tag</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Ahorro Tag</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-800/50">
                  <td className="py-3 text-gray-900 dark:text-gray-100">Ligeros (turismos)</td>
                  <td className="py-3 text-right font-data font-bold text-tl-amber-700 dark:text-tl-amber-300">{fmt(RATES.ligeros.tag)} €/km</td>
                  <td className="py-3 text-right font-data text-gray-600 dark:text-gray-400">{fmt(RATES.ligeros.cash)} €/km</td>
                  <td className="py-3 text-right text-green-600 dark:text-green-400 text-xs">{((1 - RATES.ligeros.tag / RATES.ligeros.cash) * 100).toFixed(0)}%</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800/50">
                  <td className="py-3 text-gray-900 dark:text-gray-100">Pesados I (2 ejes)</td>
                  <td className="py-3 text-right font-data font-bold text-tl-amber-700 dark:text-tl-amber-300">{fmt(RATES.pesados1.tag)} €/km</td>
                  <td className="py-3 text-right font-data text-gray-600 dark:text-gray-400">{fmt(RATES.pesados1.cash)} €/km</td>
                  <td className="py-3 text-right text-green-600 dark:text-green-400 text-xs">{((1 - RATES.pesados1.tag / RATES.pesados1.cash) * 100).toFixed(0)}%</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-900 dark:text-gray-100">Pesados II (3+ ejes)</td>
                  <td className="py-3 text-right font-data font-bold text-tl-amber-700 dark:text-tl-amber-300">{fmt(RATES.pesados2.tag)} €/km</td>
                  <td className="py-3 text-right font-data text-gray-600 dark:text-gray-400">{fmt(RATES.pesados2.cash)} €/km</td>
                  <td className="py-3 text-right text-green-600 dark:text-green-400 text-xs">{((1 - RATES.pesados2.tag / RATES.pesados2.cash) * 100).toFixed(0)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-tl-600 dark:text-tl-400">
            <Clock className="w-4 h-4" />
            <span>Gratuitas de 00:00 a 06:00 todos los días</span>
          </div>
        </div>

        {/* Road list */}
        <section className="mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Autopistas SEITT</h2>
            <div className="space-y-3">
              {ROADS.map((r) => {
                const price = r.km * RATES.ligeros.tag;
                return (
                  <Link key={r.id} href={`/peajes/${r.slug}`}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-950 hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{r.id}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{r.route} · {r.km} km</p>
                    </div>
                    <div className="text-right">
                      <p className="font-data font-bold text-tl-amber-700 dark:text-tl-amber-300">{fmtPrice(price)}€</p>
                      <p className="text-xs text-gray-400">con Tag</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* SEO content */}
        <section className="mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 not-prose mb-3">Las radiales de Madrid: historia y estado actual</h2>
            <p>Las autopistas radiales de Madrid (R-2, R-3, R-4, R-5) fueron construidas entre 2000 y 2004 como alternativa a las autovías congestionadas. Tras la quiebra de sus concesionarias originales, SEITT asumió la gestión.</p>
            <p>Desde entonces, las tarifas son más económicas que las autopistas concesionarias tradicionales, con una tarifa fija por kilómetro que se actualiza anualmente. El uso de Tag (telepeaje) ofrece un descuento del 11% sobre la tarifa de efectivo.</p>
            <p>Junto a las radiales, SEITT gestiona también la M-12 (acceso al aeropuerto de Barajas), la AP-36 (Ocaña–La Roda) y la AP-41 (Madrid–Toledo). Todas comparten la misma estructura tarifaria y el horario gratuito nocturno.</p>
          </div>
        </section>

        <Link href="/calculadora" className="flex items-center justify-between bg-tl-600 hover:bg-tl-700 text-white rounded-xl p-4 transition-colors">
          <div className="flex items-center gap-3"><Calculator className="w-6 h-6" /><p className="font-semibold">Calculadora de coste de ruta</p></div>
          <ChevronRight className="w-5 h-5" />
        </Link>
      </main>
    </div>
  );
}
