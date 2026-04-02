import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Zap, MapPin, Clock, CreditCard, Plug, Building2, Battery, ArrowRight } from "lucide-react";

export const revalidate = 86400;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const CT: Record<string, string> = { AC_TYPE1: "Tipo 1 (AC)", AC_TYPE2: "Tipo 2 (AC)", DC_CHADEMO: "CHAdeMO (DC)", DC_CCS: "CCS Combo (DC)", DC_CCS2: "CCS2 (DC)", TESLA: "Tesla", SCHUKO: "Schuko", OTHER: "Otro" };
type Props = { params: Promise<{ id: string }> };

async function getData(id: string) {
  const charger = await prisma.eVCharger.findUnique({ where: { id } });
  if (!charger) return null;
  const nearby = await prisma.eVCharger.findMany({
    where: { id: { not: charger.id }, isPublic: true, OR: [...(charger.city ? [{ city: charger.city }] : []), ...(charger.province ? [{ province: charger.province }] : [])] },
    take: 5, select: { id: true, name: true, city: true, powerKw: true, operator: true },
  });
  return { charger, nearby };
}

export async function generateStaticParams() {
  const chargers = await prisma.eVCharger.findMany({ where: { isPublic: true }, select: { id: true }, take: 300 });
  return chargers.map((c) => ({ id: c.id }));
}
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getData(id);
  if (!data) return { title: "Cargador no encontrado" };
  const { charger } = data;
  const pw = charger.powerKw ? ` — ${Number(charger.powerKw)} kW` : "";
  const title = `Cargador EV ${charger.name}${pw} | ${charger.city || charger.provinceName || "España"}`;
  const types = charger.chargerTypes.map((t) => CT[t] || t).join(", ");
  const description = `Punto de carga ${charger.name}${charger.address ? ` en ${charger.address}` : ""}. ${charger.operator ? `${charger.operator}.` : ""} ${types ? `Conectores: ${types}.` : ""} ${charger.is24h ? "24h." : ""}`;
  return { title, description, alternates: { canonical: `${BASE_URL}/carga-ev/punto/${id}` } };
}

function PowerBadge({ kw }: { kw: number }) {
  const color = kw > 50 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : kw >= 22 ? "bg-tl-amber-100 text-tl-amber-700 dark:bg-tl-amber-900/30 dark:text-tl-amber-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  const label = kw > 50 ? "Carga rápida" : kw >= 22 ? "Semi-rápida" : "Carga lenta";
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}><Battery className="w-3.5 h-3.5" />{kw} kW · {label}</span>;
}

export default async function ChargerDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getData(id);
  if (!data) notFound();
  const { charger, nearby } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "LocalBusiness", name: charger.name, ...(charger.address && { address: { "@type": "PostalAddress", streetAddress: charger.address, addressLocality: charger.city, addressRegion: charger.provinceName } }), geo: { "@type": "GeoCoordinates", latitude: Number(charger.latitude), longitude: Number(charger.longitude) } }) }} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: "Carga EV", href: "/carga-ev" }, ...(charger.city ? [{ name: charger.city, href: `/carga-ev/${charger.city.toLowerCase().replace(/\s+/g, "-")}` }] : []), { name: charger.name, href: `/carga-ev/punto/${id}` }]} />
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {charger.powerKw && <PowerBadge kw={Number(charger.powerKw)} />}
            <span className={`px-2 py-0.5 rounded-full text-xs ${charger.isPublic ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-200 text-gray-600"}`}>{charger.isPublic ? "Público" : "Privado"}</span>
            {charger.is24h && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-tl-100 text-tl-700 dark:bg-tl-900/30 dark:text-tl-400"><Clock className="w-3 h-3" />24h</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{charger.name}</h1>
          {charger.operator && <p className="mt-1 text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Building2 className="w-4 h-4" />{charger.operator}{charger.network && <span className="text-gray-400"> · {charger.network}</span>}</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Ubicación y detalles</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {charger.address && <div className="sm:col-span-2"><dt className="text-xs text-gray-500 dark:text-gray-400"><MapPin className="w-3.5 h-3.5 inline" /> Dirección</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">{charger.address}</dd></div>}
            {charger.city && <div><dt className="text-xs text-gray-500 dark:text-gray-400">Ciudad</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">{charger.city}</dd></div>}
            {charger.provinceName && <div><dt className="text-xs text-gray-500 dark:text-gray-400">Provincia</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">{charger.provinceName}</dd></div>}
            {charger.connectors && <div><dt className="text-xs text-gray-500 dark:text-gray-400"><Plug className="w-3.5 h-3.5 inline" /> Conectores</dt><dd className="font-semibold text-gray-900 dark:text-gray-100 font-data">{charger.connectors}</dd></div>}
            <div><dt className="text-xs text-gray-500 dark:text-gray-400">Coordenadas</dt><dd className="font-data text-sm text-gray-600 dark:text-gray-400">{Number(charger.latitude).toFixed(5)}, {Number(charger.longitude).toFixed(5)}</dd></div>
          </dl>
        </div>
        {charger.chargerTypes.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tipos de conector</h2>
            <div className="flex flex-wrap gap-2">{charger.chargerTypes.map((t) => <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800/50"><Plug className="w-3.5 h-3.5" />{CT[t] || t}</span>)}</div>
          </div>
        )}
        {charger.paymentMethods.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-tl-600 dark:text-tl-400" />Métodos de pago</h2>
            <div className="flex flex-wrap gap-2">{charger.paymentMethods.map((m) => <span key={m} className="px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{m}</span>)}</div>
          </div>
        )}
        {nearby.length > 0 && (
          <section className="mb-8"><div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cargadores cercanos</h2>
            <div className="space-y-2">{nearby.map((c) => (
              <Link key={c.id} href={`/carga-ev/punto/${c.id}`} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950 hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors">
                <div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{c.operator && `${c.operator} · `}{c.city}{c.powerKw && <span className="font-data ml-1">{Number(c.powerKw)} kW</span>}</p></div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}</div>
          </div></section>
        )}
        <section><div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Más información</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/carga-ev/cerca" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"><Zap className="w-5 h-5 text-tl-600 dark:text-tl-400" /><div><p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Cargadores cerca de ti</p><p className="text-xs text-gray-500 dark:text-gray-400">Por geolocalización</p></div></Link>
            <Link href="/gasolineras" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"><MapPin className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" /><div><p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Gasolineras</p><p className="text-xs text-gray-500 dark:text-gray-400">Precios de combustible</p></div></Link>
          </div>
        </div></section>
      </main>
    </div>
  );
}
