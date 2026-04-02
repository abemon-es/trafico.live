import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Camera, MapPin, Route, Clock, ArrowRight, CheckCircle, XCircle } from "lucide-react";

export const revalidate = 3600;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
type Props = { params: Promise<{ id: string }> };

async function getData(id: string) {
  const camera = await prisma.camera.findUnique({ where: { id } });
  if (!camera) return null;
  const nearby = await prisma.camera.findMany({
    where: { id: { not: camera.id }, isActive: true, OR: [...(camera.roadNumber ? [{ roadNumber: camera.roadNumber }] : []), ...(camera.province ? [{ province: camera.province }] : [])] },
    take: 5, select: { id: true, name: true, roadNumber: true, kmPoint: true, provinceName: true },
  });
  return { camera, nearby };
}

export async function generateStaticParams() {
  const cameras = await prisma.camera.findMany({ where: { isActive: true }, select: { id: true }, take: 200 });
  return cameras.map((c) => ({ id: c.id }));
}
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getData(id);
  if (!data) return { title: "Cámara no encontrada" };
  const { camera } = data;
  const title = `Cámara DGT ${camera.name}${camera.roadNumber ? ` — ${camera.roadNumber}` : ""} | ${camera.provinceName || "España"}`;
  const description = `Imagen en directo de la cámara ${camera.name}${camera.roadNumber ? ` en la ${camera.roadNumber}` : ""}. ${camera.provinceName || "España"}. DGT.`;
  return { title, description, alternates: { canonical: `${BASE_URL}/camaras/camara/${id}` }, openGraph: { title, description, ...(camera.thumbnailUrl ? { images: [{ url: camera.thumbnailUrl }] } : {}) } };
}

export default async function CameraDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getData(id);
  if (!data) notFound();
  const { camera, nearby } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ name: "Inicio", href: "/" }, { name: "Cámaras", href: "/camaras" }, ...(camera.provinceName ? [{ name: camera.provinceName, href: `/provincias/${camera.province}` }] : []), { name: camera.name, href: `/camaras/camara/${id}` }]} />
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            {camera.isActive ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3" />Activa</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-600"><XCircle className="w-3 h-3" />Inactiva</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{camera.name}</h1>
          {camera.provinceName && <p className="mt-1 text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><MapPin className="w-4 h-4" />{camera.provinceName}</p>}
        </div>
        {camera.thumbnailUrl && (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-8 border border-gray-200 dark:border-gray-800">
            <img src={camera.thumbnailUrl} alt={`Cámara de tráfico ${camera.name}`} className="w-full h-full object-cover" loading="eager" />
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">DGT · Actualización periódica</div>
          </div>
        )}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Información</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {camera.roadNumber && <div><dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Route className="w-3.5 h-3.5" />Carretera</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">{camera.roadNumber}</dd></div>}
            {camera.kmPoint && <div><dt className="text-xs text-gray-500 dark:text-gray-400">Punto kilométrico</dt><dd className="font-semibold text-gray-900 dark:text-gray-100 font-data">{Number(camera.kmPoint).toFixed(1)}</dd></div>}
            {camera.provinceName && <div><dt className="text-xs text-gray-500 dark:text-gray-400">Provincia</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">{camera.provinceName}</dd></div>}
            <div><dt className="text-xs text-gray-500 dark:text-gray-400"><Clock className="w-3.5 h-3.5 inline" /> Última actualización</dt><dd className="text-sm text-gray-900 dark:text-gray-100">{camera.lastUpdated.toLocaleDateString("es-ES")}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-gray-500 dark:text-gray-400">Coordenadas</dt><dd className="font-data text-sm text-gray-600 dark:text-gray-400">{Number(camera.latitude).toFixed(5)}, {Number(camera.longitude).toFixed(5)}</dd></div>
          </dl>
        </div>
        {nearby.length > 0 && (
          <section className="mb-8"><div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cámaras cercanas</h2>
            <div className="space-y-2">{nearby.map((c) => (
              <Link key={c.id} href={`/camaras/camara/${c.id}`} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950 hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors">
                <div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{c.roadNumber && `${c.roadNumber} `}{c.kmPoint && `km ${Number(c.kmPoint).toFixed(1)} `}{c.provinceName && `· ${c.provinceName}`}</p></div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}</div>
          </div></section>
        )}
        <section><div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Más información</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {camera.roadNumber && <Link href={`/camaras/carretera/${encodeURIComponent(camera.roadNumber)}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"><Camera className="w-5 h-5 text-tl-600 dark:text-tl-400" /><div><p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Cámaras en {camera.roadNumber}</p><p className="text-xs text-gray-500 dark:text-gray-400">Ver todas</p></div></Link>}
            {camera.provinceName && <Link href={`/provincias/${camera.province}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"><MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" /><div><p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Tráfico en {camera.provinceName}</p><p className="text-xs text-gray-500 dark:text-gray-400">Cámaras, radares e incidencias</p></div></Link>}
          </div>
        </div></section>
      </main>
    </div>
  );
}
