import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData, generateFAQSchema } from "@/components/seo/StructuredData";
import { Route, MapPin, Clock, Building2, Calculator, ArrowRight, ChevronRight, GitCompareArrows } from "lucide-react";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = { params: Promise<{ road: string }> };

async function getData(slug: string) {
  const tollRoad = await prisma.tollRoad.findUnique({
    where: { slug },
    include: { segments: { orderBy: { sortOrder: "asc" } } },
  });
  if (!tollRoad) return null;

  // Other toll roads for "see also"
  const otherRoads = await prisma.tollRoad.findMany({
    where: { id: { not: tollRoad.id } },
    select: { id: true, slug: true, name: true, maxPrice: true, operator: true },
    orderBy: { maxPrice: "desc" },
    take: 5,
  });

  return { tollRoad, otherRoads };
}

export async function generateStaticParams() {
  const roads = await prisma.tollRoad.findMany({ select: { slug: true } });
  return roads.map((r) => ({ road: r.slug }));
}
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { road } = await params;
  const data = await getData(road);
  if (!data) return { title: "Peaje no encontrado" };
  const { tollRoad: r } = data;
  const title = `Peaje ${r.id} ${r.fromCity} – ${r.toCity} — Tarifas ${r.year} | trafico.live`;
  const description = `Tarifa del peaje ${r.id} (${r.fromCity} – ${r.toCity}): ${Number(r.maxPrice).toFixed(2)}€ vehículos ligeros. Operador: ${r.operator}. ${r.segments.length} tramos con precios detallados.${r.expires ? ` Concesión hasta ${r.expires}.` : ""}`;
  return {
    title, description,
    alternates: { canonical: `${BASE_URL}/peajes/${r.slug}` },
    openGraph: { title, description, url: `${BASE_URL}/peajes/${r.slug}`, locale: "es_ES" },
  };
}

function fmt(n: number | { toNumber?: () => number }, decimals = 2): string {
  const v = typeof n === "object" && n.toNumber ? n.toNumber() : Number(n);
  return v.toLocaleString("es-ES", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default async function TollRoadDetailPage({ params }: Props) {
  const { road } = await params;
  const data = await getData(road);
  if (!data) notFound();
  const { tollRoad: r, otherRoads } = data;

  const faqData = generateFAQSchema({
    questions: [
      {
        question: `¿Cuánto cuesta el peaje de la ${r.id}?`,
        answer: `El peaje completo de la ${r.id} (${r.fromCity} – ${r.toCity}, ${fmt(r.totalKm, 0)} km) cuesta ${fmt(r.maxPrice)}€ para vehículos ligeros con Tag. ${r.segments.length > 1 ? `También se puede pagar por tramos parciales desde ${fmt(r.minPrice)}€.` : ""}`,
      },
      {
        question: `¿Quién gestiona la ${r.id}?`,
        answer: `La ${r.id} está gestionada por ${r.operator}.${r.expires ? ` La concesión expira en ${r.expires}.` : ""}${r.isSeitt ? " Es gratuita de 00:00 a 06:00." : ""}`,
      },
    ],
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={faqData} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Peajes", href: "/peajes" },
          { name: r.id, href: `/peajes/${r.slug}` },
        ]} />

        {/* Hero */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-tl-amber-100 text-tl-amber-700 dark:bg-tl-amber-900/30 dark:text-tl-amber-300">
              <Route className="w-3.5 h-3.5" /> {r.id}
            </span>
            {r.isSeitt && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-tl-100 text-tl-700 dark:bg-tl-900/30 dark:text-tl-400">SEITT</span>
            )}
            {r.expires && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                <Clock className="w-3 h-3" /> Expira: {r.expires}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Peaje {r.id}: {r.fromCity} – {r.toCity}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {fmt(r.totalKm, 0)} km · Operador: {r.operator} · Tarifa {r.year} para vehículos ligeros
          </p>
        </div>

        {/* Price hero card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Precio recorrido completo (Tag)</p>
          <p className="text-4xl font-bold text-tl-amber-700 dark:text-tl-amber-300 font-data">{fmt(r.maxPrice)}€</p>
          <p className="text-sm text-gray-400 mt-1">{r.fromCity} → {r.toCity} · {fmt(r.totalKm, 0)} km</p>
          {r.isSeitt && (
            <p className="mt-3 text-sm text-tl-600 dark:text-tl-400">
              Gratuita de 00:00 a 06:00
            </p>
          )}
        </div>

        {/* Segment table */}
        {r.segments.length > 0 && (
          <section className="mb-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Tarifas por tramo
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tramo</th>
                      <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">km</th>
                      <th className="text-right py-2 pl-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Precio</th>
                      <th className="text-right py-2 pl-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">€/km</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.segments.map((s, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800/50 last:border-0">
                        <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                          {s.fromPoint} → {s.toPoint}
                        </td>
                        <td className="py-3 px-4 text-right font-data text-gray-600 dark:text-gray-400">
                          {fmt(s.km, 0)}
                        </td>
                        <td className="py-3 pl-4 text-right font-data font-bold text-tl-amber-700 dark:text-tl-amber-300">
                          {fmt(s.priceLigeros)}€
                        </td>
                        <td className="py-3 pl-4 text-right font-data text-gray-400 text-xs">
                          {fmt(Number(s.priceLigeros) / Number(s.km), 4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Info card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Información</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Operador</dt>
              <dd className="font-semibold text-gray-900 dark:text-gray-100">{r.operator}</dd>
            </div>
            {r.expires && (
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Fin concesión</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">{r.expires}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Recorrido total</dt>
              <dd className="font-semibold text-gray-900 dark:text-gray-100 font-data">{fmt(r.totalKm, 0)} km</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Coste por km</dt>
              <dd className="font-semibold text-gray-900 dark:text-gray-100 font-data">{fmt(Number(r.maxPrice) / Number(r.totalKm), 4)} €/km</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Fuente</dt>
              <dd className="text-sm text-gray-600 dark:text-gray-400">{r.source}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Año tarifas</dt>
              <dd className="font-semibold text-gray-900 dark:text-gray-100 font-data">{r.year}</dd>
            </div>
          </dl>
        </div>

        {/* Free alternative */}
        {r.freeAltRoad && (
          <section className="mb-8">
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <GitCompareArrows className="w-5 h-5 text-green-600 dark:text-green-400" />
                Alternativa gratuita
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-green-100 dark:border-green-800/30">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ruta gratuita</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{r.freeAltRoad}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-green-100 dark:border-green-800/30">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Distancia</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 font-data">{fmt(r.freeAltKm!, 0)} km</p>
                  <p className="text-xs text-gray-400">vs {fmt(r.totalKm, 0)} km peaje</p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-green-100 dark:border-green-800/30">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tiempo extra</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 font-data">+{r.freeAltExtraMin} min</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Ahorras {fmt(r.maxPrice)}€</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{r.freeAltDesc}</p>
            </div>
          </section>
        )}

        {/* CTA calculadora */}
        <Link href={`/calculadora`}
          className="flex items-center justify-between bg-tl-600 hover:bg-tl-700 text-white rounded-xl p-4 mb-8 transition-colors">
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6" />
            <div>
              <p className="font-semibold">Calcula el coste total de tu ruta</p>
              <p className="text-sm text-tl-200">Combustible + peaje de la {r.id}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5" />
        </Link>

        {/* Other toll roads */}
        {otherRoads.length > 0 && (
          <section className="mb-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Otras autopistas de peaje</h2>
              <div className="space-y-2">
                {otherRoads.map((o) => (
                  <Link key={o.id} href={`/peajes/${o.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950 hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{o.id}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{o.operator}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-data text-sm font-bold text-tl-amber-700 dark:text-tl-amber-300">{fmt(o.maxPrice)}€</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Related */}
        <section>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Más información</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/peajes" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors">
                <Route className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                <div><p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Todos los peajes</p><p className="text-xs text-gray-500 dark:text-gray-400">Directorio completo de España</p></div>
              </Link>
              <Link href="/peajes/gratis-2026" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors">
                <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                <div><p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Autopistas gratis en 2026</p><p className="text-xs text-gray-500 dark:text-gray-400">Concesiones que expiran</p></div>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
