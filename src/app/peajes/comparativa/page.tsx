import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { GitCompareArrows, Route, ArrowRight, Clock, Calculator, ChevronRight } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Comparativa Peaje vs Ruta Gratuita — Autopistas de España 2026",
  description: "Compara todas las autopistas de peaje con su alternativa gratuita: precio, distancia, tiempo extra y coste por minuto ahorrado. ¿Merece la pena pagar el peaje?",
  alternates: { canonical: `${BASE_URL}/peajes/comparativa` },
  openGraph: { title: "Peaje vs Ruta Gratis — ¿Merece la pena?", description: "Comparativa completa de 17 autopistas de pago con su alternativa gratuita.", locale: "es_ES" },
};

export const revalidate = 86400;

function fmt(n: number | { toNumber?: () => number }, d = 2) {
  const v = typeof n === "object" && n.toNumber ? n.toNumber() : Number(n);
  return v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default async function ComparativaPage() {
  const roads = await prisma.tollRoad.findMany({
    where: { freeAltRoad: { not: null } },
    orderBy: { maxPrice: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Peajes", href: "/peajes" },
          { name: "Comparativa", href: "/peajes/comparativa" },
        ]} />

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
            Peaje vs Ruta Gratuita
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
            ¿Merece la pena pagar el peaje? Comparativa de las {roads.length} autopistas de pago
            con su alternativa gratuita: precio, distancia extra y tiempo adicional.
          </p>
        </div>

        {/* Comparison table */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Autopista</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Peaje</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Alternativa gratis</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">km peaje</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">km gratis</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">+Tiempo</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">€/min ahorrado</th>
                </tr>
              </thead>
              <tbody>
                {roads.map((r) => {
                  const costPerMin = r.freeAltExtraMin && r.freeAltExtraMin > 0
                    ? Number(r.maxPrice) / r.freeAltExtraMin
                    : null;
                  return (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800/50 last:border-0 hover:bg-tl-50/50 dark:hover:bg-tl-900/10 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/peajes/${r.slug}`} className="group">
                          <span className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors">{r.id}</span>
                          <br />
                          <span className="text-xs text-gray-500 dark:text-gray-400">{r.fromCity} → {r.toCity}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-right font-data font-bold text-tl-amber-700 dark:text-tl-amber-300">
                        {fmt(r.maxPrice)}€
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                        {r.freeAltRoad}
                      </td>
                      <td className="py-3 px-3 text-right font-data text-gray-600 dark:text-gray-400">
                        {fmt(r.totalKm, 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-data text-gray-600 dark:text-gray-400">
                        {r.freeAltKm ? fmt(r.freeAltKm, 0) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {r.freeAltExtraMin ? (
                          <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span className="font-data">+{r.freeAltExtraMin} min</span>
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {costPerMin !== null ? (
                          <span className={`font-data font-semibold ${costPerMin > 0.5 ? "text-red-600 dark:text-red-400" : costPerMin > 0.25 ? "text-tl-amber-600 dark:text-tl-amber-400" : "text-green-600 dark:text-green-400"}`}>
                            {fmt(costPerMin, 2)}€
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <GitCompareArrows className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            Cómo interpretar la tabla
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold text-green-600 dark:text-green-400 mb-1">{"< 0,25 €/min"}</p>
              <p className="text-gray-600 dark:text-gray-400">El peaje no compensa: la alternativa gratuita añade poco tiempo y el ahorro por minuto es bajo.</p>
            </div>
            <div>
              <p className="font-semibold text-tl-amber-600 dark:text-tl-amber-400 mb-1">0,25 – 0,50 €/min</p>
              <p className="text-gray-600 dark:text-gray-400">Depende de la urgencia: el peaje ahorra tiempo moderado a un coste razonable.</p>
            </div>
            <div>
              <p className="font-semibold text-red-600 dark:text-red-400 mb-1">{"> 0,50 €/min"}</p>
              <p className="text-gray-600 dark:text-gray-400">El peaje es caro por minuto ahorrado: solo merece la pena con prisa o en trayectos largos.</p>
            </div>
          </div>
        </div>

        {/* SEO content */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8 prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 not-prose mb-3">¿Merece la pena pagar el peaje?</h2>
          <p>
            La decisión depende de tres factores: el precio del peaje, el tiempo extra de la alternativa
            gratuita, y el número de pasajeros (que reparten el coste). La métrica clave es el
            <strong> coste por minuto ahorrado</strong>: cuánto pagas por cada minuto que te ahorras
            tomando la autopista de peaje.
          </p>
          <p>
            Por ejemplo, si la AP-68 cuesta 22,65€ y la alternativa gratuita (A-68/N-232) añade 35 minutos,
            estás pagando 0,65€ por cada minuto ahorrado. Con 4 pasajeros, baja a 0,16€/min — un precio
            razonable para un viaje largo.
          </p>
          <p>
            En general, las radiales de Madrid (R-2, R-3, R-4) ofrecen buena relación calidad-precio
            porque las autovías paralelas (A-2, A-3, A-4) suelen estar congestionadas en hora punta.
            En cambio, la AP-41 Madrid–Toledo casi nunca merece la pena porque la A-42 gratuita
            es apenas 10 minutos más lenta.
          </p>
        </div>

        <Link href="/calculadora" className="flex items-center justify-between bg-tl-600 hover:bg-tl-700 text-white rounded-xl p-4 transition-colors">
          <div className="flex items-center gap-3"><Calculator className="w-6 h-6" /><p className="font-semibold">Calcula combustible + peaje de tu ruta</p></div>
          <ChevronRight className="w-5 h-5" />
        </Link>
      </main>
    </div>
  );
}
