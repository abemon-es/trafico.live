import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Radar, MapPin, Gauge, ArrowRight, Navigation, Shield } from "lucide-react";

export const revalidate = 86400;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  FIXED: { label: "Radar Fijo", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  SECTION: { label: "Radar de Tramo", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  MOBILE_ZONE: { label: "Zona Radar Móvil", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  TRAFFIC_LIGHT: { label: "Radar de Semáforo", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};
const DIR_LABELS: Record<string, string> = { ASCENDING: "Sentido creciente", DESCENDING: "Sentido decreciente", BOTH: "Ambos sentidos", UNKNOWN: "Desconocido" };

type Props = { params: Promise<{ id: string }> };

async function getData(id: string) {
  const radar = await prisma.radar.findUnique({ where: { id } });
  if (!radar) return null;
  const nearby = await prisma.radar.findMany({ where: { roadNumber: radar.roadNumber, id: { not: radar.id }, isActive: true }, orderBy: { kmPoint: "asc" }, take: 5, select: { id: true, radarId: true, type: true, kmPoint: true, speedLimit: true } });
  return { radar, nearby };
}

export async function generateStaticParams() {
  const radars = await prisma.radar.findMany({ where: { isActive: true }, select: { id: true }, take: 500 });
  return radars.map((r) => ({ id: r.id }));
}
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getData(id);
  if (!data) return { title: "Radar no encontrado" };
  const { radar } = data;
  const t = TYPE_LABELS[radar.type]?.label || radar.type;
  const title = `${t} en ${radar.roadNumber} km ${Number(radar.kmPoint).toFixed(1)}${radar.speedLimit ? ` — ${radar.speedLimit} km/h` : ""} | ${radar.provinceName || "España"}`;
  const description = `${t} en la ${radar.roadNumber}, pk ${Number(radar.kmPoint).toFixed(1)}. ${radar.speedLimit ? `Límite: ${radar.speedLimit} km/h.` : ""} ${radar.provinceName || "España"}. Datos DGT.`;
  return { title, description, alternates: { canonical: `${BASE_URL}/radares/radar/${id}` } };
}

export default async function RadarDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getData(id);
  if (!data) notFound();
  const { radar, nearby } = data;
  const typeInfo = TYPE_LABELS[radar.type] || { label: radar.type, color: "bg-gray-100 text-gray-800" };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Place", name: `${typeInfo.label} — ${radar.roadNumber} km ${Number(radar.kmPoint).toFixed(1)}`, geo: { "@type": "GeoCoordinates", latitude: Number(radar.latitude), longitude: Number(radar.longitude) } }) }} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: "Radares", href: "/radares" }, { name: radar.roadNumber, href: `/radares/${encodeURIComponent(radar.roadNumber)}` }, { name: `Radar ${radar.radarId}`, href: `/radares/radar/${id}` }]} />
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${typeInfo.color}`}><Radar className="w-3.5 h-3.5 mr-1" />{typeInfo.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${radar.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-200 text-gray-600"}`}>{radar.isActive ? "Activo" : "Inactivo"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{typeInfo.label} en {radar.roadNumber} — km {Number(radar.kmPoint).toFixed(1)}</h1>
          {radar.provinceName && <p className="mt-1 text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><MapPin className="w-4 h-4" />{radar.provinceName}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {radar.speedLimit && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full border-4 border-red-500 flex items-center justify-center mb-2"><span className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-data">{radar.speedLimit}</span></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Límite km/h</p>
            </div>
          )}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <Gauge className="w-5 h-5 text-tl-600 dark:text-tl-400 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Carretera</p>
            <p className="font-bold text-gray-900 dark:text-gray-100">{radar.roadNumber}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">km <span className="font-data">{Number(radar.kmPoint).toFixed(1)}</span></p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <Navigation className="w-5 h-5 text-tl-600 dark:text-tl-400 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Sentido</p>
            <p className="font-bold text-gray-900 dark:text-gray-100">{radar.direction ? DIR_LABELS[radar.direction] : "No especificado"}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-data">{Number(radar.latitude).toFixed(5)}, {Number(radar.longitude).toFixed(5)}</p>
          </div>
        </div>
        {radar.type === "SECTION" && radar.avgSpeedPartner && (
          <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800/50 rounded-xl p-4 mb-8">
            <p className="text-sm text-tl-amber-800 dark:text-tl-amber-300"><Shield className="w-4 h-4 inline mr-1" />Radar de tramo — pareja: <span className="font-data font-semibold">{radar.avgSpeedPartner}</span></p>
          </div>
        )}
        {nearby.length > 0 && (
          <section className="mb-8"><div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Otros radares en la {radar.roadNumber}</h2>
            <div className="space-y-2">{nearby.map((r) => (
              <Link key={r.id} href={`/radares/radar/${r.id}`} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950 hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_LABELS[r.type]?.color || ""}`}>{TYPE_LABELS[r.type]?.label || r.type}</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">km <span className="font-data">{Number(r.kmPoint).toFixed(1)}</span></span>
                </div>
                <div className="flex items-center gap-2">{r.speedLimit && <span className="font-data text-sm font-bold text-red-600 dark:text-red-400">{r.speedLimit} km/h</span>}<ArrowRight className="w-4 h-4 text-gray-400" /></div>
              </Link>
            ))}</div>
          </div></section>
        )}
        <section><div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Más información</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href={`/radares/${encodeURIComponent(radar.roadNumber)}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"><Radar className="w-5 h-5 text-tl-600 dark:text-tl-400" /><div><p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Radares en {radar.roadNumber}</p><p className="text-xs text-gray-500 dark:text-gray-400">Ver todos</p></div></Link>
            {radar.province && <Link href={`/radares/provincia/${radar.province}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"><MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" /><div><p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Radares en {radar.provinceName}</p><p className="text-xs text-gray-500 dark:text-gray-400">Por provincia</p></div></Link>}
          </div>
        </div></section>
      </main>
    </div>
  );
}
