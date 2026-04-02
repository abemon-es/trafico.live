import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Building2, Route, ArrowRight, ChevronRight } from "lucide-react";

export const revalidate = 86400;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Operator slug → display name + description
const OPERATORS: Record<string, { name: string; description: string }> = {
  abertis: { name: "Abertis", description: "Mayor concesionaria de autopistas de España. Gestiona la AP-6, AP-51, AP-61 y AP-68 a través de sus filiales Iberpistas y Avasa." },
  seitt: { name: "SEITT", description: "Sociedad Estatal de Infraestructuras del Transporte Terrestre. Gestiona las radiales de Madrid (R-2, R-3/R-5, R-4), M-12, AP-36 y AP-41 con tarifas por kilómetro." },
  itinere: { name: "Itínere", description: "Grupo concesionario que gestiona la AP-9 (Audasa), AP-66 (Aucalsa) y autopistas gallegas (AG-55, AG-57) a través de sus filiales." },
  acega: { name: "Acega", description: "Concesionaria de la AP-53 Santiago – Alto de Santo Domingo, la autopista que conecta Santiago con la A-52 hacia Ourense." },
};

type Props = { params: Promise<{ slug: string }> };

function operatorSlugFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("abertis") || lower.includes("iberpistas") || lower.includes("avasa") || lower.includes("aulesa") || lower.includes("aucat")) return "abertis";
  if (lower.includes("seitt")) return "seitt";
  if (lower.includes("itínere") || lower.includes("itinere") || lower.includes("audasa") || lower.includes("aucalsa") || lower.includes("autoestradas")) return "itinere";
  if (lower.includes("acega")) return "acega";
  return lower.replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
}

async function getData(slug: string) {
  const info = OPERATORS[slug];
  if (!info) return null;

  const allRoads = await prisma.tollRoad.findMany({
    include: { segments: { orderBy: { sortOrder: "asc" } } },
    orderBy: { maxPrice: "desc" },
  });

  const roads = allRoads.filter((r) => operatorSlugFromName(r.operator) === slug);
  if (roads.length === 0) return null;

  const totalKm = roads.reduce((sum, r) => sum + Number(r.totalKm), 0);
  const otherOperators = Object.entries(OPERATORS)
    .filter(([s]) => s !== slug)
    .map(([s, o]) => ({ slug: s, name: o.name }));

  return { info, roads, totalKm, otherOperators };
}

export async function generateStaticParams() {
  return Object.keys(OPERATORS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getData(slug);
  if (!data) return { title: "Operador no encontrado" };
  const { info, roads } = data;
  const title = `Autopistas de ${info.name} — ${roads.length} Peajes en España`;
  const description = `${info.name} gestiona ${roads.length} autopistas de peaje en España. Tarifas actualizadas y tramos con precios detallados.`;
  return { title, description, alternates: { canonical: `${BASE_URL}/peajes/operador/${slug}` } };
}

function fmt(n: number | { toNumber?: () => number }, d = 2) {
  const v = typeof n === "object" && n.toNumber ? n.toNumber() : Number(n);
  return v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default async function OperatorPage({ params }: Props) {
  const { slug } = await params;
  const data = await getData(slug);
  if (!data) notFound();
  const { info, roads, totalKm, otherOperators } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Peajes", href: "/peajes" },
          { name: info.name, href: `/peajes/operador/${slug}` },
        ]} />

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            <span className="text-sm text-tl-600 dark:text-tl-400 font-medium">Operador</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Autopistas de {info.name}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">{info.description}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{roads.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Autopistas</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{fmt(totalKm, 0)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">km totales</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-tl-amber-700 dark:text-tl-amber-300 font-data">{fmt(Math.max(...roads.map((r) => Number(r.maxPrice))))}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Peaje máx. (€)</p>
          </div>
        </div>

        {/* Road list */}
        <section className="mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Autopistas gestionadas por {info.name}
            </h2>
            <div className="space-y-3">
              {roads.map((r) => (
                <Link key={r.id} href={`/peajes/${r.slug}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-950 hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-tl-amber-100 text-tl-amber-700 dark:bg-tl-amber-900/30 dark:text-tl-amber-300">
                        <Route className="w-3 h-3" /> {r.id}
                      </span>
                      {r.isSeitt && <span className="px-2 py-0.5 rounded-full text-xs bg-tl-100 text-tl-700 dark:bg-tl-900/30 dark:text-tl-400">SEITT</span>}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.fromCity} → {r.toCity} · {fmt(r.totalKm, 0)} km</p>
                    {r.expires && <p className="text-xs text-gray-400 mt-0.5">Concesión hasta {r.expires}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-data font-bold text-tl-amber-700 dark:text-tl-amber-300">{fmt(r.maxPrice)}€</p>
                      <p className="text-xs text-gray-400">{r.segments.length} tramos</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Other operators */}
        <section className="mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Otros operadores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {otherOperators.map((o) => (
                <Link key={o.slug} href={`/peajes/operador/${o.slug}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950 hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors">
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{o.name}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <Link href="/peajes" className="flex items-center justify-between bg-tl-600 hover:bg-tl-700 text-white rounded-xl p-4 transition-colors">
          <div className="flex items-center gap-3"><Route className="w-6 h-6" /><p className="font-semibold">Todos los peajes de España</p></div>
          <ChevronRight className="w-5 h-5" />
        </Link>
      </main>
    </div>
  );
}
